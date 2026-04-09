import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Loader2, Check, Search, AlertTriangle } from 'lucide-react';
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
type AssetState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';

interface Point {
  x: number;
  y: number;
}

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

  // Preview URLs from server (browser-friendly, no TIFF)
  const [colorPreviewUrl, setColorPreviewUrl] = useState<string | null>(null);
  const [colorAssetState, setColorAssetState] = useState<AssetState>('idle');
  const [bwPreviewUrl, setBwPreviewUrl] = useState<string | null>(null);
  const [bwAssetState, setBwAssetState] = useState<AssetState>('idle');
  const [hasImpassability, setHasImpassability] = useState(false);

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

  // Load public maps
  useEffect(() => {
    const loadPublicMaps = async () => {
      setLoadingMaps(true);
      try {
        const { data, error } = await supabase
          .from('route_maps')
          .select('id, name, source_map_id, impassability_image_url, color_image_url, color_r2_key, bw_r2_key, country_code, description')
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

      // Use preview URLs directly from server response — these are browser-friendly
      const colorUrl = data.color_image_url || null;
      const bwUrl = data.impassability_image_url || null;
      const hasBw = data.has_impassability ?? !!bwUrl;

      // If no color preview from server, try route image fallback
      let finalColorUrl = colorUrl;
      if (!finalColorUrl) {
        const { data: images } = await supabase
          .from('route_images')
          .select('image_path')
          .eq('map_id', selectedMap.id)
          .limit(1);
        if (images && images.length > 0) {
          const { data: urlData } = supabase.storage.from('route-images').getPublicUrl(images[0].image_path);
          finalColorUrl = urlData.publicUrl;
        }
      }

      setColorPreviewUrl(finalColorUrl);
      setColorAssetState(finalColorUrl ? 'ready' : 'unavailable');
      setBwPreviewUrl(bwUrl);
      setBwAssetState(bwUrl ? 'ready' : 'unavailable');
      setHasImpassability(hasBw);

      if (hasBw && bwUrl) {
        setStep('paint');
      } else {
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

      // If we have an edited B&W blob, upload it to R2
      if (editedBwBlob) {
        const endpoint = import.meta.env.VITE_R2_PRESIGNED_ENDPOINT;
        if (endpoint) {
          const bwFile = new File([editedBwBlob], 'edited-bw.png', { type: 'image/png' });
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
            await fetch(urls.bw_presigned_url, {
              method: 'PUT',
              headers: { 'Content-Type': 'image/png' },
              body: bwFile,
            });
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
    if (hasImpassability && bwPreviewUrl) {
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

  const renderBwStep = () => {
    if (bwAssetState === 'loading') {
      return (
        <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading B&W image...</span>
        </div>
      );
    }
    if (bwAssetState === 'unavailable' || !bwPreviewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg gap-2">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">This map has no editable B&W impassability source.</p>
          <p className="text-xs text-muted-foreground">Click "Next" to skip this step.</p>
        </div>
      );
    }
    if (bwAssetState === 'error') {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg gap-2">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">Failed to load the B&W image.</p>
          <p className="text-xs text-muted-foreground">You can skip this step and continue.</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Paint or erase black pixels on the impassability map. Black areas will be treated as impassable terrain.
        </p>
        <ImpassabilityPaintCanvas imageUrl={bwPreviewUrl} onExport={handlePaintExport} />
        {editedBwBlob && (
          <p className="text-sm text-green-600">✓ B&W edits captured ({(editedBwBlob.size / 1024).toFixed(0)} KB)</p>
        )}
      </div>
    );
  };

  const renderColorCanvas = (children: (url: string) => React.ReactNode) => {
    if (colorAssetState === 'loading') {
      return (
        <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading map image...</span>
        </div>
      );
    }
    if (colorAssetState === 'unavailable' || colorAssetState === 'error' || !colorPreviewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg gap-2">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No color map image available for this map.</p>
          <p className="text-xs text-muted-foreground">Click "Next" to skip.</p>
        </div>
      );
    }
    return children(colorPreviewUrl);
  };

  const renderStepContent = () => {
    switch (step) {
      case 'select':
        return (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search maps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {loadingMaps ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredMaps.map((map) => (
                  <div
                    key={map.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedMap?.id === map.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleSelectMap(map)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{map.name}</p>
                        {map.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{map.description}</p>
                        )}
                        <div className="flex gap-2 mt-1">
                          {map.country_code && (
                            <span className="text-xs text-muted-foreground">{map.country_code}</span>
                          )}
                          {(map.impassability_image_url || map.bw_r2_key) && (
                            <span className="text-xs text-green-600">B&W available</span>
                          )}
                          {(map.color_image_url || map.color_r2_key) && (
                            <span className="text-xs text-blue-600">Color source</span>
                          )}
                        </div>
                      </div>
                      {selectedMap?.id === map.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
                {filteredMaps.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No maps found</p>
                )}
              </div>
            )}
          </div>
        );

      case 'paint':
        return renderBwStep();

      case 'annotations':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mark impassable areas or boundaries. This step is <strong>optional</strong>.
            </p>
            {renderColorCanvas((url) => (
              <ImpassableDrawingCanvas
                imageUrl={url}
                onAnnotationsChange={(areas, lines) => {
                  setImpassableAreas(areas);
                  setImpassableLines(lines);
                }}
                initialAreas={impassableAreas}
                initialLines={impassableLines}
              />
            ))}
          </div>
        );

      case 'roi':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Draw a region of interest to limit processing to a specific area.
            </p>
            {renderColorCanvas((url) => (
              <ROIDrawingCanvas
                imageUrl={url}
                onComplete={setRoiCoordinates}
                initialCoordinates={roiCoordinates}
              />
            ))}
          </div>
        );

      case 'parameters':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">Processing Mode</Label>
              <RadioGroup
                value={processingMode}
                onValueChange={(val) => setProcessingMode(val as ProcessingMode)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="route_choice" id="mode-rc" />
                  <Label htmlFor="mode-rc" className="cursor-pointer">Route Choice only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="route_finder" id="mode-rf" />
                  <Label htmlFor="mode-rf" className="cursor-pointer">Route Finder only</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="mode-both" />
                  <Label htmlFor="mode-both" className="cursor-pointer">Both</Label>
                </div>
              </RadioGroup>
            </div>

            {(processingMode === 'route_choice' || processingMode === 'both') && (
              <ProcessingParametersForm
                parameters={parameters}
                onChange={setParameters}
              />
            )}
            {(processingMode === 'route_finder' || processingMode === 'both') && (
              <RouteFinderParametersForm
                parameters={routeFinderParameters}
                onChange={setRouteFinderParameters}
              />
            )}
          </div>
        );

      case 'submit':
        return (
          <div className="space-y-4 text-center">
            {isSubmitted ? (
              <div className="py-8">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Map submitted for processing!</p>
                <p className="text-sm text-muted-foreground mt-1">You'll be notified when it's ready.</p>
              </div>
            ) : (
              <div className="py-8">
                <p className="text-lg font-medium mb-2">Ready to submit</p>
                <p className="text-sm text-muted-foreground">
                  Your edited map <strong>{selectedMap?.name}</strong> will be processed.
                </p>
                {editedBwBlob && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ B&W edits included ({(editedBwBlob.size / 1024).toFixed(0)} KB)
                  </p>
                )}
                {(impassableAreas.length > 0 || impassableLines.length > 0) && (
                  <p className="text-sm text-green-600">
                    ✓ {impassableAreas.length} boundaries, {impassableLines.length} lines
                  </p>
                )}
                {roiCoordinates.length >= 3 && (
                  <p className="text-sm text-green-600">
                    ✓ ROI with {roiCoordinates.length} points
                  </p>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Edit Public Map</CardTitle>
        <Progress value={progressPercent} className="mt-2" />
        <div className="flex gap-1 mt-2 flex-wrap">
          {steps.map((s, i) => (
            <span
              key={s.key}
              className={`text-xs px-2 py-0.5 rounded ${
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
      <CardContent>
        {renderStepContent()}

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={cloning}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {currentStepIndex === 0 ? 'Cancel' : 'Back'}
          </Button>

          {step === 'select' ? (
            <Button onClick={handleCloneAndProceed} disabled={!selectedMap || cloning || !user}>
              {cloning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  Start Editing
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          ) : step === 'submit' ? (
            <Button onClick={handleSubmit} disabled={!canProceed()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Submitting...
                </>
              ) : isSubmitted ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Done
                </>
              ) : (
                'Submit for Processing'
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PublicMapEditWizard;
