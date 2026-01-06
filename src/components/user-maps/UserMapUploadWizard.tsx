import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Upload, Check, Loader2, HelpCircle } from 'lucide-react';
import TifFileUploader from './TifFileUploader';
import ROIDrawingCanvas from './ROIDrawingCanvas';
import ProcessingParametersForm from './ProcessingParametersForm';
import OCADInstructionsDialog from './OCADInstructionsDialog';
import { useUserMaps, ProcessingParameters, DEFAULT_PROCESSING_PARAMETERS } from '@/hooks/useUserMaps';
import { supabase } from '@/integrations/supabase/client';
import { convertTifToDataUrl } from '@/utils/tifUtils';

const INSTRUCTIONS_SEEN_KEY = 'ocad_instructions_seen';

type WizardStep = 'upload' | 'roi' | 'parameters' | 'submit';

interface Point {
  x: number;
  y: number;
}

interface UserMapUploadWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

const UserMapUploadWizard: React.FC<UserMapUploadWizardProps> = ({
  onComplete,
  onCancel,
}) => {
  const { uploadUserMap, uploading } = useUserMaps();
  
  const [step, setStep] = useState<WizardStep>('upload');
  const [mapName, setMapName] = useState('');
  const [colorTifFile, setColorTifFile] = useState<File | null>(null);
  const [bwTifFile, setBwTifFile] = useState<File | null>(null);
  const [roiCoordinates, setRoiCoordinates] = useState<Point[]>([]);
  const [parameters, setParameters] = useState<ProcessingParameters>(DEFAULT_PROCESSING_PARAMETERS);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [colorTifPreviewUrl, setColorTifPreviewUrl] = useState<string | null>(null);
  const [isConvertingTif, setIsConvertingTif] = useState(false);
  const [tifConversionError, setTifConversionError] = useState<string | null>(null);
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);

  // Show instructions dialog for first-time users
  useEffect(() => {
    const hasSeenInstructions = localStorage.getItem(INSTRUCTIONS_SEEN_KEY);
    if (!hasSeenInstructions) {
      setShowInstructionsDialog(true);
    }
  }, []);

  const handleInstructionsConfirm = () => {
    localStorage.setItem(INSTRUCTIONS_SEEN_KEY, 'true');
  };

  // Convert TIF to displayable image when file is selected
  useEffect(() => {
    const convertTif = async () => {
      if (!colorTifFile) {
        setColorTifPreviewUrl(null);
        return;
      }
      
      setIsConvertingTif(true);
      setTifConversionError(null);
      
      try {
        const dataUrl = await convertTifToDataUrl(colorTifFile);
        setColorTifPreviewUrl(dataUrl);
      } catch (error) {
        console.error('Failed to convert TIF:', error);
        setTifConversionError('Failed to preview TIF file. The file may be corrupted or in an unsupported format.');
      } finally {
        setIsConvertingTif(false);
      }
    };
    
    convertTif();
  }, [colorTifFile]);

  const steps: { key: WizardStep; label: string }[] = [
    { key: 'upload', label: 'Upload Files' },
    { key: 'roi', label: 'Draw ROI' },
    { key: 'parameters', label: 'Configure' },
    { key: 'submit', label: 'Submit' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (step) {
      case 'upload':
        return mapName.trim().length > 0 && colorTifFile && bwTifFile;
      case 'roi':
        return roiCoordinates.length >= 3;
      case 'parameters':
        return true;
      case 'submit':
        return !uploading && !isSubmitted;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].key);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].key);
    }
  };

  const handleSubmit = async () => {
    if (!colorTifFile || !bwTifFile || roiCoordinates.length < 3) return;

    const result = await uploadUserMap({
      name: mapName,
      colorTifFile,
      bwTifFile,
      roiCoordinates,
      processingParameters: parameters,
    });

    if (result) {
      // Trigger processing via edge function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.functions.invoke('trigger-map-processing', {
            body: { map_id: result.id },
          });
          console.log('Processing triggered for map:', result.id);
        }
      } catch (triggerError) {
        console.error('Failed to trigger processing:', triggerError);
        // Don't fail the upload, processing can be triggered manually or via polling
      }

      setIsSubmitted(true);
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'upload':
        return (
          <div className="space-y-6">
            {/* Help Button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInstructionsDialog(true)}
                className="gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                How to get TIF files from OCAD
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapName">Map Name</Label>
              <Input
                id="mapName"
                placeholder="Enter a name for your map"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <TifFileUploader
                label="Color Map (TIF)"
                description="Full-color orienteering map"
                selectedFile={colorTifFile}
                onFileSelected={setColorTifFile}
                onClear={() => setColorTifFile(null)}
              />
              <TifFileUploader
                label="Impassable Features Map (TIF)"
                description="Black & white impassable features"
                selectedFile={bwTifFile}
                onFileSelected={setBwTifFile}
                onClear={() => setBwTifFile(null)}
              />
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
              <p className="font-medium mb-2">File Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Both files must be TIF/TIFF format exported from OCAD</li>
                <li>Both files must be exported at <strong>508 dpi</strong> resolution</li>
                <li>Both files should cover the same area ("Entire Map")</li>
                <li>Maximum file size: 500MB each</li>
              </ul>
            </div>
          </div>
        );

      case 'roi':
        return (
          <div className="space-y-4">
            {isConvertingTif ? (
              <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Converting TIF for preview...</p>
              </div>
            ) : tifConversionError ? (
              <div className="flex flex-col items-center justify-center h-64 bg-destructive/10 rounded-lg p-4">
                <p className="text-destructive text-center">{tifConversionError}</p>
              </div>
            ) : colorTifPreviewUrl ? (
              <ROIDrawingCanvas
                imageUrl={colorTifPreviewUrl}
                onComplete={setRoiCoordinates}
                initialCoordinates={roiCoordinates}
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <p className="text-muted-foreground">No image available</p>
              </div>
            )}
          </div>
        );

      case 'parameters':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Customize the route generation parameters. Default values work well for most maps.
            </p>
            <ProcessingParametersForm
              parameters={parameters}
              onChange={setParameters}
            />
          </div>
        );

      case 'submit':
        return (
          <div className="space-y-6">
            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-medium mb-2">Map Submitted Successfully!</h3>
                <p className="text-sm text-muted-foreground">
                  Your map has been queued for processing. You'll be notified when routes are ready.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Map Name</p>
                      <p className="font-medium">{mapName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ROI Points</p>
                      <p className="font-medium">{roiCoordinates.length} points</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Color Map</p>
                      <p className="font-medium truncate">{colorTifFile?.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">B&W Map</p>
                      <p className="font-medium truncate">{bwTifFile?.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Routes to Generate</p>
                      <p className="font-medium">{parameters.num_output_routes}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Distance Range</p>
                      <p className="font-medium">{parameters.candidate_min_dist}m - {parameters.candidate_max_dist}m</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    <strong>Note:</strong> Route processing may take several minutes depending on map size and parameters. 
                    You'll be notified when processing is complete.
                  </p>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit for Processing
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <OCADInstructionsDialog
        open={showInstructionsDialog}
        onOpenChange={setShowInstructionsDialog}
        onConfirm={handleInstructionsConfirm}
      />
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Upload Custom Map</CardTitle>
          <CardDescription>
            Upload your orienteering map files and configure route generation
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            {steps.map((s, index) => (
              <span
                key={s.key}
                className={index <= currentStepIndex ? 'text-primary font-medium' : 'text-muted-foreground'}
              >
                {s.label}
              </span>
            ))}
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Step Content */}
        {renderStepContent()}

        {/* Navigation */}
        {!isSubmitted && step !== 'submit' && (
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={currentStepIndex === 0 ? onCancel : handleBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {currentStepIndex === 0 ? 'Cancel' : 'Back'}
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
};

export default UserMapUploadWizard;
