import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Upload, Check, Loader2, HelpCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import TifFileUploader from './TifFileUploader';
import ROIDrawingCanvas from './ROIDrawingCanvas';
import ProcessingParametersForm from './ProcessingParametersForm';
import OCADInstructionsDialog from './OCADInstructionsDialog';
import ImpassableDrawingCanvas from './ImpassableDrawingCanvas';
import { useUserMaps, ProcessingParameters, DEFAULT_PROCESSING_PARAMETERS } from '@/hooks/useUserMaps';
import { useProAccess } from '@/hooks/useProAccess';
import { supabase } from '@/integrations/supabase/client';
import { convertTifToDataUrl, getTifDimensions, canDecodeTif } from '@/utils/tifUtils';
import { uploadMapFilesToR2 } from '@/utils/r2Upload';
import { applyAnnotationsToTif, ImpassableArea, ImpassableLine } from '@/utils/impassableAnnotations';

const INSTRUCTIONS_SEEN_KEY = 'ocad_instructions_seen';

type WizardStep = 'upload' | 'annotations' | 'roi' | 'parameters' | 'submit';

interface Point {
  x: number;
  y: number;
}

interface TifDimensions {
  width: number;
  height: number;
}

interface UserMapUploadWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

const UserMapUploadWizard: React.FC<UserMapUploadWizardProps> = ({
  onComplete,
  onCancel,
}) => {
  const { uploadUserMapR2, uploading } = useUserMaps();
  const { hasPro } = useProAccess();
  
  const [step, setStep] = useState<WizardStep>('upload');
  const [mapName, setMapName] = useState('');
  const [colorTifFile, setColorTifFile] = useState<File | null>(null);
  const [bwTifFile, setBwTifFile] = useState<File | null>(null);
  const [roiCoordinates, setRoiCoordinates] = useState<Point[]>([]);
  const [impassableAreas, setImpassableAreas] = useState<ImpassableArea[]>([]);
  const [impassableLines, setImpassableLines] = useState<ImpassableLine[]>([]);
  const [parameters, setParameters] = useState<ProcessingParameters>(DEFAULT_PROCESSING_PARAMETERS);
  const [isApplyingAnnotations, setIsApplyingAnnotations] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [colorTifPreviewUrl, setColorTifPreviewUrl] = useState<string | null>(null);
  const [isConvertingTif, setIsConvertingTif] = useState(false);
  const [tifConversionError, setTifConversionError] = useState<string | null>(null);
  const [showInstructionsDialog, setShowInstructionsDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ color: number; bw: number }>({ color: 0, bw: 0 });

  // Dimension validation state
  const [colorDimensions, setColorDimensions] = useState<TifDimensions | null>(null);
  const [bwDimensions, setBwDimensions] = useState<TifDimensions | null>(null);
  const [isValidatingDimensions, setIsValidatingDimensions] = useState(false);
  const [dimensionMismatch, setDimensionMismatch] = useState<string | null>(null);

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

  // Validate dimensions when both files are selected
  useEffect(() => {
    const validateDimensions = async () => {
      if (!colorTifFile || !bwTifFile) {
        setDimensionMismatch(null);
        setColorDimensions(null);
        setBwDimensions(null);
        return;
      }

      setIsValidatingDimensions(true);
      setDimensionMismatch(null);

      try {
        const [colorDims, bwDims] = await Promise.all([
          getTifDimensions(colorTifFile),
          getTifDimensions(bwTifFile),
        ]);

        setColorDimensions(colorDims);
        setBwDimensions(bwDims);

        if (colorDims.width !== bwDims.width || colorDims.height !== bwDims.height) {
          setDimensionMismatch(
            `Dimension mismatch! Color: ${colorDims.width}×${colorDims.height}, B&W: ${bwDims.width}×${bwDims.height}. Files must have identical pixel dimensions.`
          );
        }
      } catch (error) {
        console.error('Failed to validate dimensions:', error);
        setDimensionMismatch('Failed to read file dimensions. Please check your TIF files.');
      } finally {
        setIsValidatingDimensions(false);
      }
    };

    validateDimensions();
  }, [colorTifFile, bwTifFile]);

  // Convert TIF to displayable image when color file is selected
  useEffect(() => {
    const convertTif = async () => {
      if (!colorTifFile) {
        setColorTifPreviewUrl(null);
        return;
      }
      
      setIsConvertingTif(true);
      setTifConversionError(null);
      
      try {
        const colorUrl = await convertTifToDataUrl(colorTifFile);
        setColorTifPreviewUrl(colorUrl);
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
    { key: 'annotations', label: 'Add Impassable' },
    { key: 'roi', label: 'Draw ROI' },
    { key: 'parameters', label: 'Configure' },
    { key: 'submit', label: 'Submit' },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === step);
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (step) {
      case 'upload':
        return (
          mapName.trim().length > 0 &&
          colorTifFile &&
          bwTifFile &&
          !isValidatingDimensions &&
          !dimensionMismatch &&
          colorDimensions !== null &&
          bwDimensions !== null
        );
      case 'annotations':
        return true; // Optional step - always allow proceeding
      case 'roi':
        return roiCoordinates.length >= 3;
      case 'parameters':
        return true;
      case 'submit':
        return !uploading && !isSubmitted && !isApplyingAnnotations;
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
    if (!colorTifFile || !bwTifFile || roiCoordinates.length < 3 || !colorDimensions) return;

    setSubmitError(null);

    try {
      let finalColorFile: File = colorTifFile;
      let finalBwFile: File = bwTifFile;

      // Apply impassable annotations if any exist
      if (impassableAreas.length > 0 || impassableLines.length > 0) {
        setIsApplyingAnnotations(true);
        try {
          console.log(`Checking TIFF decodability before applying annotations...`);
          
          // Pre-check which files can be decoded
          const [colorDecodable, bwDecodable] = await Promise.all([
            canDecodeTif(colorTifFile),
            canDecodeTif(bwTifFile),
          ]);
          
          console.log('Decodability check:', { colorDecodable, bwDecodable });
          
          // If neither can be decoded, show error with fallback option
          if (!colorDecodable.success && !bwDecodable.success) {
            setSubmitError(
              `Cannot apply annotations: ${colorDecodable.error || bwDecodable.error}. ` +
              `You can continue without impassable markings.`
            );
            setIsApplyingAnnotations(false);
            return;
          }
          
          console.log(`Applying ${impassableAreas.length} areas and ${impassableLines.length} lines to maps...`);
          console.time('applyAnnotations');
          
          // Apply annotations only to decodable files
          const annotationPromises: Promise<File>[] = [];
          
          if (colorDecodable.success) {
            annotationPromises.push(
              applyAnnotationsToTif(colorTifFile, impassableAreas, impassableLines, '#CD0BCE')
            );
          } else {
            console.warn('Color TIF cannot be decoded, using original file');
            annotationPromises.push(Promise.resolve(colorTifFile));
          }
          
          if (bwDecodable.success) {
            annotationPromises.push(
              applyAnnotationsToTif(bwTifFile, impassableAreas, impassableLines, '#000000')
            );
          } else {
            console.warn('B&W TIF cannot be decoded, using original file');
            annotationPromises.push(Promise.resolve(bwTifFile));
          }
          
          const [annotatedColor, annotatedBw] = await Promise.all(annotationPromises);
          
          console.timeEnd('applyAnnotations');
          finalColorFile = annotatedColor;
          finalBwFile = annotatedBw;
          
          // Log which files were annotated
          const annotatedFiles = [
            colorDecodable.success ? 'color' : null,
            bwDecodable.success ? 'B&W' : null,
          ].filter(Boolean);
          
          console.log(`Annotations applied to: ${annotatedFiles.join(', ') || 'none'}`, {
            colorSize: annotatedColor.size,
            bwSize: annotatedBw.size,
          });
        } catch (annotationError) {
          console.error('Failed to apply annotations:', annotationError);
          const errorMessage = annotationError instanceof Error ? annotationError.message : 'Unknown error';
          setSubmitError(`Failed to apply annotations: ${errorMessage}`);
          setIsApplyingAnnotations(false);
          return;
        } finally {
          setIsApplyingAnnotations(false);
        }
      }

      const result = await uploadUserMapR2({
        name: mapName,
        colorTifFile: finalColorFile,
        bwTifFile: finalBwFile,
        roiCoordinates,
        processingParameters: parameters,
        dimensions: colorDimensions,
        onProgress: (color, bw) => setUploadProgress({ color, bw }),
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
        }

        setIsSubmitted(true);
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      }
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSubmitError(`Upload failed: ${errorMessage}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

            {/* Dimension Validation Status */}
            {colorTifFile && bwTifFile && (
              <div className={`p-4 rounded-lg border ${
                isValidatingDimensions 
                  ? 'bg-muted border-border'
                  : dimensionMismatch 
                    ? 'bg-destructive/10 border-destructive/30'
                    : 'bg-green-500/10 border-green-500/30'
              }`}>
                {isValidatingDimensions ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Validating dimensions...</span>
                  </div>
                ) : dimensionMismatch ? (
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Dimension Mismatch</p>
                      <p className="text-xs mt-1">{dimensionMismatch}</p>
                    </div>
                  </div>
                ) : colorDimensions ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <div>
                      <p className="text-sm font-medium">Dimensions Validated</p>
                      <p className="text-xs mt-0.5">
                        Both files: {colorDimensions.width.toLocaleString()} × {colorDimensions.height.toLocaleString()} pixels
                        {colorTifFile && bwTifFile && (
                          <span className="ml-2">
                            ({formatFileSize(colorTifFile.size)} + {formatFileSize(bwTifFile.size)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
              <p className="font-medium mb-2">File Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Both files must be TIF/TIFF format exported from OCAD</li>
                <li>Both files must be exported at <strong>508 dpi</strong> resolution</li>
                <li>Both files should cover the same area ("Entire Map")</li>
                <li><strong>Both files must have identical pixel dimensions</strong></li>
                <li>No file size limit - files upload directly to cloud storage</li>
              </ul>
            </div>
          </div>
        );

      case 'annotations':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mark any impassable areas or lines that should be added to the map. 
              This step is <strong>optional</strong> — click "Next" to skip if not needed.
            </p>
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
              <ImpassableDrawingCanvas
                imageUrl={colorTifPreviewUrl}
                onAnnotationsChange={(areas, lines) => {
                  setImpassableAreas(areas);
                  setImpassableLines(lines);
                }}
                initialAreas={impassableAreas}
                initialLines={impassableLines}
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <p className="text-muted-foreground">No image available</p>
              </div>
            )}
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
              hasPro={hasPro}
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
                      <p className="text-muted-foreground">Impassable Annotations</p>
                      <p className="font-medium">
                        {impassableAreas.length + impassableLines.length > 0
                          ? `${impassableAreas.length} area(s), ${impassableLines.length} line(s)`
                          : 'None'}
                      </p>
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

                {/* Annotation Progress */}
                {isApplyingAnnotations && (
                  <div className="space-y-3 bg-muted rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <p className="text-sm font-medium">Applying impassable annotations to maps...</p>
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {uploading && !isApplyingAnnotations && (
                  <div className="space-y-3 bg-muted rounded-lg p-4">
                    <p className="text-sm font-medium">Uploading files...</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16">Color:</span>
                        <Progress value={uploadProgress.color} className="flex-1" />
                        <span className="text-xs w-10">{uploadProgress.color}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-16">B&W:</span>
                        <Progress value={uploadProgress.bw} className="flex-1" />
                        <span className="text-xs w-10">{uploadProgress.bw}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Display with Fallback Option */}
                {submitError && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Submission Failed</p>
                        <p className="text-xs mt-1">{submitError}</p>
                      </div>
                    </div>
                    {/* If it's an annotation error, offer fallback */}
                    {submitError.includes('annotation') && (impassableAreas.length > 0 || impassableLines.length > 0) && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-destructive/20">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSubmitError(null)}
                          className="flex-1"
                        >
                          Try Again
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            // Clear annotations and submit without them
                            setImpassableAreas([]);
                            setImpassableLines([]);
                            setSubmitError(null);
                            // Wait a tick for state to update, then submit
                            setTimeout(() => handleSubmit(), 100);
                          }}
                          className="flex-1"
                        >
                          Continue Without Impassable Markings
                        </Button>
                      </div>
                    )}
                  </div>
                )}

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
                  disabled={uploading || isApplyingAnnotations}
                >
                  {isApplyingAnnotations ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying annotations...
                    </>
                  ) : uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading to cloud...
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
      
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Upload Your Map</CardTitle>
          <CardDescription>
            Upload TIF files exported from OCAD to generate routes for your map.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              {steps.map((s, i) => (
                <span
                  key={s.key}
                  className={`${i <= currentStepIndex ? 'text-primary font-medium' : ''}`}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation */}
          {step !== 'submit' && (
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={step === 'upload' ? onCancel : handleBack}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {step === 'upload' ? 'Cancel' : 'Back'}
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

          {step === 'submit' && !isSubmitted && !uploading && (
            <div className="flex justify-start pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default UserMapUploadWizard;
