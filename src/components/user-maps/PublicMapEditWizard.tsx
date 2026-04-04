import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Loader2, Check, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';
import { toast } from '@/components/ui/use-toast';
import ImpassabilityPaintCanvas from './ImpassabilityPaintCanvas';
import ImpassableDrawingCanvas from './ImpassableDrawingCanvas';
import ROIDrawingCanvas from './ROIDrawingCanvas';
import ProcessingParametersForm from './ProcessingParametersForm';
import RouteFinderParametersForm, { RouteFinderParameters, DEFAULT_ROUTE_FINDER_PARAMETERS } from './RouteFinderParametersForm';
import { ProcessingParameters, DEFAULT_PROCESSING_PARAMETERS } from '@/hooks/useUserMaps';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { uploadMapFilesToR2 } from '@/utils/r2Upload';
import { resolveColorPreview, resolveBwPreview } from '@/utils/r2Preview';

interface PublicMap {
  id: string;
  name: string;
  source_map_id: string | null;
  impassability_image_url: string | null;
  color_image_url: string | null;
  color_r2_key: string | null;
  bw_r2_key: string | null;
  country_code: string | null;
  description: string | null;
}

interface ImpassableArea {
  points: Array<{ x: number; y: number }>;
}

interface ImpassableLine {
  start: { x: number; y: number };
  end: { x: number; y: number };
}

type WizardStep = 'select' | 'paint' | 'annotations' | 'roi' | 'parameters' | 'submit';
type ProcessingMode = 'route_choice' | 'route_finder' | 'both';

interface Point {
  x: number;
  y: number;
}

// Sub-component with URL pre-validation for B&W paint step
const PaintStep: React.FC<{ imageUrl: string; onExport: (blob: Blob) => void; editedBwBlob: Blob | null }> = ({ imageUrl, onExport, editedBwBlob }) => {
  const [urlValid, setUrlValid] = useState<boolean | null>(null);

  useEffect(() => {
    setUrlValid(null);
    fetch(imageUrl, { method: 'HEAD', mode: 'cors' })
      .then(res => setUrlValid(res.ok))
      .catch(() => setUrlValid(false));
  }, [imageUrl]);

  if (urlValid === null) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Checking image availability...</span>
      </div>
    );
  }

  if (urlValid === false) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
          <p className="text-sm text-destructive">
            Failed to load the B&W impassability image. The image may not have been uploaded yet or is inaccessible. You can skip this step.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Paint or erase black pixels on the impassability map. Black areas will be treated as impassable terrain.
      </p>
      <ImpassabilityPaintCanvas imageUrl={imageUrl} onExport={onExport} />
      {editedBwBlob && (
        <p className="text-sm text-green-600">✓ B&W edits captured ({(editedBwBlob.size / 1024).toFixed(0)} KB)</p>
      )}
    </div>
  );
};

interface PublicMapEditWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

const PublicMapEditWizard: React.FC<PublicMapEditWizardProps> = ({ onComplete, onCancel }) => {
  const { user } = useUser();
  const [step, setStep] = useState<WizardStep>('select');

  // Map selection
  const [publicMaps, setPublicMaps] = useState<PublicMap[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMap, setSelectedMap] = useState<PublicMap | null>(null);

  // Cloning
  const [clonedMapId, setClonedMapId] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);

  // Paint state
  const [editedBwBlob, setEditedBwBlob] = useState<Blob | null>(null);

  // Annotations
  const [impassableAreas, setImpassableAreas] = useState<ImpassableArea[]>([]);
  const [impassableLines, setImpassableLines] = useState<ImpassableLine[]>([]);

  // ROI
  const [roiCoordinates, setRoiCoordinates] = useState<Point[]>([]);

  // Parameters
  const [parameters, setParameters] = useState<ProcessingParameters>(DEFAULT_PROCESSING_PARAMETERS);
  const [routeFinderParameters, setRouteFinderParameters] = useState<RouteFinderParameters>(DEFAULT_ROUTE_FINDER_PARAMETERS);
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('route_choice');

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Color map preview URL (for annotation/ROI steps)
  const [colorPreviewUrl, setColorPreviewUrl] = useState<string | null>(null);

  // Load public maps that have source_map_id (so we can clone their files)
  useEffect(() => {
    const loadPublicMaps = async () => {
      setLoadingMaps(true);
      try {
        const { data, error } = await supabase
          .from('route_maps')
          .select('id, name, source_map_id, impassability_image_url, country_code, description')
          .eq('is_public', true)
          .order('name');

        if (error) throw error;
        setPublicMaps((data || []) as PublicMap[]);
      } catch (err) {
        console.error('Failed to load public maps:', err);
      } finally {
        setLoadingMaps(false);
      }
    };
    loadPublicMaps();
  }, []);

  // Get a preview image for the selected map's color version
  useEffect(() => {
    if (!selectedMap) return;
    const loadPreview = async () => {
      // Priority 1: color_image_url uploaded by admin
      const { data: mapWithColor } = await supabase
        .from('route_maps')
        .select('color_image_url')
        .eq('id', selectedMap.id)
        .maybeSingle();

      if ((mapWithColor as any)?.color_image_url) {
        setColorPreviewUrl((mapWithColor as any).color_image_url);
        return;
      }

      // Priority 2: R2 color key from source user_maps
      if (selectedMap.source_map_id) {
        const { data: userMap } = await supabase
          .from('user_maps')
          .select('r2_color_key')
          .eq('id', selectedMap.source_map_id)
          .maybeSingle();
        
        if (userMap?.r2_color_key) {
          const r2PublicBase = 'https://pub-d72218e4aec146adb567299c2968aed4.r2.dev';
          setColorPreviewUrl(`${r2PublicBase}/${userMap.r2_color_key}`);
          return;
        }
      }
      
      // Fallback: use the first route image
      const { data: images } = await supabase
        .from('route_images')
        .select('image_path')
        .eq('map_id', selectedMap.id)
        .limit(1);

      if (images && images.length > 0) {
        const { data: urlData } = supabase.storage
          .from('route-images')
          .getPublicUrl(images[0].image_path);
        setColorPreviewUrl(urlData.publicUrl);
      }
    };
    loadPreview();
  }, [selectedMap]);

  const filteredMaps = publicMaps.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectMap = async (map: PublicMap) => {
    setSelectedMap(map);
  };

  const handleCloneAndProceed = async () => {
    if (!selectedMap || !user) return;
    setCloning(true);
    try {
      const { data, error } = await supabase.functions.invoke('clone-public-map', {
        body: { source_map_id: selectedMap.id },
      });

      if (error) throw new Error(error.message || 'Failed to clone map');

      setClonedMapId(data.user_map_id);

      // If map has impassability image, go to paint step
      if (selectedMap.impassability_image_url) {
        setStep('paint');
      } else {
        // Skip paint, go to annotations
        setStep('annotations');
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCloning(false);
    }
  };

  const handlePaintExport = useCallback((blob: Blob) => {
    setEditedBwBlob(blob);
    toast({ title: 'B&W edits saved', description: 'Your impassability edits have been captured.' });
  }, []);

  const handleSubmit = async () => {
    if (!clonedMapId || !user) return;
    setIsSubmitting(true);

    try {
      const hasAnnotations = impassableAreas.length > 0 || impassableLines.length > 0;

      // Update the cloned user_maps record with ROI and annotations
      const updateData: Record<string, any> = {
        status: 'pending',
      };

      if (roiCoordinates.length >= 3) {
        updateData.roi_coordinates = roiCoordinates;
      }
      if (hasAnnotations) {
        updateData.impassable_annotations = { areas: impassableAreas, lines: impassableLines };
      }
      updateData.processing_parameters = parameters;

      await supabase
        .from('user_maps' as any)
        .update(updateData as any)
        .eq('id', clonedMapId);

      // If we have an edited B&W blob, upload it to R2 replacing the cloned B&W file
      if (editedBwBlob) {
        // Upload the edited B&W as a new file via presigned URL
        const endpoint = import.meta.env.VITE_R2_PRESIGNED_ENDPOINT;
        if (endpoint) {
          const bwFile = new File([editedBwBlob], 'edited-bw.png', { type: 'image/png' });
          // Get presigned URL for just the BW file
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              user_id: user.id, 
              map_name: selectedMap?.name || 'edited',
              bw_only: true,
            }),
          });
          if (response.ok) {
            const urls = await response.json();
            // Upload edited BW
            await fetch(urls.bw_presigned_url, {
              method: 'PUT',
              headers: { 'Content-Type': 'image/png' },
              body: bwFile,
            });
            // Update the user_maps record with new BW key
            await supabase
              .from('user_maps' as any)
              .update({ 
                r2_bw_key: urls.bw_key, 
                bw_tif_path: urls.bw_key 
              } as any)
              .eq('id', clonedMapId);
          }
        }
      }

      // Trigger processing
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (processingMode === 'route_choice' || processingMode === 'both') {
          await supabase.functions.invoke('trigger-map-processing', {
            body: { map_id: clonedMapId },
          });
        }
        if (processingMode === 'route_finder' || processingMode === 'both') {
          await supabase.functions.invoke('trigger-route-finder-processing', {
            body: {
              map_id: clonedMapId,
              map_name: selectedMap?.name || 'Edited map',
              processing_parameters: routeFinderParameters,
            },
          });
        }
      }

      setIsSubmitted(true);
      toast({ title: 'Success', description: 'Map submitted for processing!' });
      setTimeout(() => onComplete?.(), 2000);
    } catch (err: any) {
      console.error('Submit error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to submit', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSteps = (): { key: WizardStep; label: string }[] => {
    const base: { key: WizardStep; label: string }[] = [
      { key: 'select', label: 'Select Map' },
    ];
    if (selectedMap?.impassability_image_url) {
      base.push({ key: 'paint', label: 'Edit Impassability' });
    }
    base.push(
      { key: 'annotations', label: 'Add Boundaries' },
      { key: 'roi', label: 'Draw ROI' },
      { key: 'parameters', label: 'Configure' },
      { key: 'submit', label: 'Submit' },
    );
    return base;
  };

  const steps = getSteps();
  const currentStepIndex = steps.findIndex(s => s.key === step);
  const progressPercent = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < steps.length) setStep(steps[nextIdx].key);
  };

  const cleanupClone = async () => {
    if (clonedMapId && !isSubmitted) {
      try {
        await supabase.from('user_maps').delete().eq('id', clonedMapId);
      } catch (e) {
        console.warn('Failed to cleanup cloned map:', e);
      }
      setClonedMapId(null);
    }
  };

  const handleBack = () => {
    const prevIdx = currentStepIndex - 1;
    if (prevIdx >= 0) {
      setStep(steps[prevIdx].key);
    } else {
      // Going back from first step = cancel
      cleanupClone().then(() => onCancel?.());
    }
  };

  const handleCancel = () => {
    cleanupClone().then(() => onCancel?.());
  };

  const canProceed = () => {
    switch (step) {
      case 'select': return !!selectedMap;
      case 'paint': return true;
      case 'annotations': return true;
      case 'roi': return roiCoordinates.length >= 3;
      case 'parameters': return true;
      case 'submit': return !isSubmitting && !isSubmitted;
      default: return false;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Edit Public Map</CardTitle>
        <Progress value={progressPercent} className="h-2" />
        <div className="flex gap-2 mt-2 flex-wrap">
          {steps.map((s, i) => (
            <span
              key={s.key}
              className={`text-xs px-2 py-1 rounded-full ${
                i === currentStepIndex
                  ? 'bg-primary text-primary-foreground'
                  : i < currentStepIndex
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s.label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step: Select Map */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search maps..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {loadingMaps ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredMaps.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No public maps available.
              </p>
            ) : (
              <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                {filteredMaps.map(map => (
                  <div
                    key={map.id}
                    onClick={() => handleSelectMap(map)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMap?.id === map.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">{map.name}</span>
                        {map.country_code && (
                          <span className="ml-2 text-xs text-muted-foreground">{map.country_code}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {map.impassability_image_url && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            B&W Editable
                          </span>
                        )}
                        {selectedMap?.id === map.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                    {map.description && (
                      <p className="text-xs text-muted-foreground mt-1">{map.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Paint B&W */}
        {step === 'paint' && selectedMap?.impassability_image_url && (
          <PaintStep
            imageUrl={selectedMap.impassability_image_url}
            onExport={handlePaintExport}
            editedBwBlob={editedBwBlob}
          />
        )}

        {/* Step: Annotations */}
        {step === 'annotations' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Optionally add boundary annotations (impassable areas/lines). This step is optional — click "Next" to skip.
            </p>
            {colorPreviewUrl ? (
              <ImpassableDrawingCanvas
                imageUrl={colorPreviewUrl}
                onAnnotationsChange={(areas, lines) => {
                  setImpassableAreas(areas);
                  setImpassableLines(lines);
                }}
                initialAreas={impassableAreas}
                initialLines={impassableLines}
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <p className="text-muted-foreground text-sm">No color preview available for this map</p>
              </div>
            )}
          </div>
        )}

        {/* Step: ROI */}
        {step === 'roi' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Draw a region of interest (ROI) polygon around the area you want to process.
            </p>
            {colorPreviewUrl ? (
              <ROIDrawingCanvas
                imageUrl={colorPreviewUrl}
                onComplete={setRoiCoordinates}
                initialCoordinates={roiCoordinates}
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                <p className="text-muted-foreground text-sm">No color preview available</p>
              </div>
            )}
          </div>
        )}

        {/* Step: Parameters */}
        {step === 'parameters' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">Processing Mode</Label>
              <RadioGroup value={processingMode} onValueChange={(v) => setProcessingMode(v as ProcessingMode)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="route_choice" id="pm-rc" />
                  <Label htmlFor="pm-rc">Route Choice</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="route_finder" id="pm-rf" />
                  <Label htmlFor="pm-rf">Route Finder</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="pm-both" />
                  <Label htmlFor="pm-both">Both</Label>
                </div>
              </RadioGroup>
            </div>

            {(processingMode === 'route_choice' || processingMode === 'both') && (
              <ProcessingParametersForm parameters={parameters} onChange={setParameters} />
            )}
            {(processingMode === 'route_finder' || processingMode === 'both') && (
              <RouteFinderParametersForm parameters={routeFinderParameters} onChange={setRouteFinderParameters} />
            )}
          </div>
        )}

        {/* Step: Submit */}
        {step === 'submit' && (
          <div className="space-y-4 text-center py-6">
            {isSubmitted ? (
              <div className="space-y-2">
                <Check className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold">Processing Started!</h3>
                <p className="text-sm text-muted-foreground">
                  Your edited map is now being processed. You'll see it in your maps once complete.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Ready to Submit</h3>
                <div className="text-left bg-muted rounded-lg p-4 space-y-2 text-sm">
                  <p><strong>Map:</strong> {selectedMap?.name}</p>
                  <p><strong>B&W Edits:</strong> {editedBwBlob ? 'Yes' : 'No'}</p>
                  <p><strong>Annotations:</strong> {impassableAreas.length} areas, {impassableLines.length} lines</p>
                  <p><strong>ROI Points:</strong> {roiCoordinates.length}</p>
                  <p><strong>Mode:</strong> {processingMode === 'both' ? 'Route Choice + Route Finder' : processingMode === 'route_choice' ? 'Route Choice' : 'Route Finder'}</p>
                </div>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Submit for Processing'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        {!isSubmitted && (
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={step === 'select' ? handleCancel : handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {step === 'select' ? 'Cancel' : 'Back'}
            </Button>
            {step === 'select' ? (
              <Button onClick={handleCloneAndProceed} disabled={!selectedMap || cloning}>
                {cloning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  <>
                    Start Editing
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            ) : step !== 'submit' ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PublicMapEditWizard;
