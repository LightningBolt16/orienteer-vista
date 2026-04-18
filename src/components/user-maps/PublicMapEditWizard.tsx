import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Loader2, Check, Search, AlertTriangle, RefreshCw } from 'lucide-react';
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
  preview_status: string | null;
}

type EditorReadiness =
  | 'ready_full'
  | 'ready_color_only'
  | 'source_present_preview_missing'
  | 'unavailable';

function readinessOf(map: PublicMap): EditorReadiness {
  const hasColorPreview = !!map.color_image_url;
  const hasBwPreview = !!map.impassability_image_url;
  const hasBwSource = !!map.bw_r2_key;
  const hasColorSource = !!map.color_r2_key || hasColorPreview;

  if (hasColorPreview && hasBwPreview) return 'ready_full';
  if (hasColorPreview && !hasBwSource) return 'ready_color_only';
  if (hasColorSource || hasBwSource) return 'source_present_preview_missing';
  return 'unavailable';
}

function readinessLabel(r: EditorReadiness): { text: string; cls: string } {
  switch (r) {
    case 'ready_full':
      return { text: 'Full editing available', cls: 'text-green-600' };
    case 'ready_color_only':
      return { text: 'Color editing only', cls: 'text-blue-600' };
    case 'source_present_preview_missing':
      return { text: 'Preview missing — needs regeneration', cls: 'text-amber-600' };
    case 'unavailable':
      return { text: 'Not editable', cls: 'text-red-500' };
  }
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
  const [regeneratingMapId, setRegeneratingMapId] = useState<string | null>(null);

  // Cloning
  const [clonedMapId, setClonedMapId] = useState<string | null>(null);
  const [cloning, setCloning] = useState(false);

  // Resolved editor assets (server-side only — no client TIFF conversion, no route_images fallback)
  const [colorPreviewUrl, setColorPreviewUrl] = useState<string | null>(null);
  const [bwPreviewUrl, setBwPreviewUrl] = useState<string | null>(null);
  const [editorReadiness, setEditorReadiness] = useState<EditorReadiness>('unavailable');

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

  const loadPublicMaps = useCallback(async () => {
    setLoadingMaps(true);
    try {
      const { data, error } = await supabase
        .from('route_maps')
        .select('id, name, source_map_id, impassability_image_url, color_image_url, color_r2_key, bw_r2_key, country_code, description, preview_status')
        .eq('is_public', true)
        .order('name');
      if (error) throw error;
      setPublicMaps((data || []) as PublicMap[]);
    } catch (err) {
      console.error('Failed to load public maps:', err);
    } finally {
      setLoadingMaps(false);
    }
  }, []);

  useEffect(() => {
    loadPublicMaps();
  }, [loadPublicMaps]);

  const filteredMaps = publicMaps.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectMap = (map: PublicMap) => {
    if (readinessOf(map) === 'unavailable') return;
    setSelectedMap(map);
  };

  const handleRegeneratePreviews = async (map: PublicMap) => {
    setRegeneratingMapId(map.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-map-previews', {
        body: { route_map_id: map.id },
      });
      if (error) throw new Error(error.message || 'Failed to start regeneration');
      toast({
        title: 'Preview generation started',
        description: data?.message || 'This usually takes under a minute. Refresh shortly.',
      });
      // Poll once after a short delay to refresh the UI
      setTimeout(() => loadPublicMaps(), 8000);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRegeneratingMapId(null);
    }
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
      const colorUrl: string | null = data.color_image_url || null;
      const bwUrl: string | null = data.impassability_image_url || null;
      const status: EditorReadiness = data.editor_status || 'unavailable';

      setColorPreviewUrl(colorUrl);
      setBwPreviewUrl(bwUrl);
      setEditorReadiness(status);

      // Decide which step to enter based on real readiness
      if (status === 'ready_full' && bwUrl) {
        setStep('paint');
      } else if (status === 'ready_color_only' && colorUrl) {
        setStep('annotations');
      } else if (status === 'source_present_preview_missing') {
        toast({
          title: 'Previews not ready',
          description: 'This map has source files but no editor previews. Click "Regenerate previews" on the selection list and try again in ~1 minute.',
          variant: 'destructive',
        });
        setCloning(false);
        return;
      } else {
        toast({
          title: 'Map not editable',
          description: 'No editor assets available for this map.',
          variant: 'destructive',
        });
        setCloning(false);
        return;
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
      const updateData: Record<string, any> = { status: 'pending' };
      if (roiCoordinates.length >= 3) updateData.roi_coordinates = roiCoordinates;
      if (hasAnnotations) updateData.impassable_annotations = { areas: impassableAreas, lines: impassableLines };
      updateData.processing_parameters = parameters;

      await supabase.from('user_maps' as any).update(updateData as any).eq('id', clonedMapId);

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
              .update({ r2_bw_key: urls.bw_key, bw_tif_path: urls.bw_key } as any)
              .eq('id', clonedMapId);
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (processingMode === 'route_choice' || processingMode === 'both') {
          await supabase.functions.invoke('trigger-map-processing', { body: { map_id: clonedMapId } });
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

  // Steps depend on real readiness — paint only appears when full editing is possible
  const getSteps = (): { key: WizardStep; label: string }[] => {
    const base: { key: WizardStep; label: string }[] = [{ key: 'select', label: 'Select Map' }];
    if (editorReadiness === 'ready_full') {
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
  const currentStepIndex = steps.findIndex((s) => s.key === step);
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
      case 'select':
        return !!selectedMap && readinessOf(selectedMap) !== 'unavailable' && readinessOf(selectedMap) !== 'source_present_preview_missing';
      case 'paint': return true;
      case 'annotations': return true;
      case 'roi': return roiCoordinates.length >= 3;
      case 'parameters': return true;
      case 'submit': return !isSubmitting && !isSubmitted;
      default: return false;
    }
  };

  const renderBwStep = () => {
    if (!bwPreviewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg gap-2">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No B&W editor preview is available for this map.</p>
          <p className="text-xs text-muted-foreground">Click "Next" to skip this step.</p>
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
    if (!colorPreviewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-muted rounded-lg gap-2">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No color editor preview available for this map.</p>
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
                {filteredMaps.map((map) => {
                  const readiness = readinessOf(map);
                  const label = readinessLabel(readiness);
                  const isUnavailable = readiness === 'unavailable';
                  const needsRegen = readiness === 'source_present_preview_missing';
                  const isSelected = selectedMap?.id === map.id;
                  return (
                    <div
                      key={map.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isUnavailable
                          ? 'border-border opacity-50 cursor-not-allowed'
                          : isSelected
                            ? 'border-primary bg-primary/5 cursor-pointer'
                            : 'border-border hover:border-primary/50 cursor-pointer'
                      }`}
                      onClick={() => !isUnavailable && handleSelectMap(map)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{map.name}</p>
                          {map.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{map.description}</p>
                          )}
                          <div className="flex gap-2 mt-1 flex-wrap items-center">
                            {map.country_code && (
                              <span className="text-xs text-muted-foreground">{map.country_code}</span>
                            )}
                            <span className={`text-xs ${label.cls}`}>{label.text}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {needsRegen && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegeneratePreviews(map);
                              }}
                              disabled={regeneratingMapId === map.id}
                              className="h-7 text-xs"
                            >
                              {regeneratingMapId === map.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Regenerate
                                </>
                              )}
                            </Button>
                          )}
                          {isSelected && <Check className="h-5 w-5 text-primary" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
              <ProcessingParametersForm parameters={parameters} onChange={setParameters} />
            )}
            {(processingMode === 'route_finder' || processingMode === 'both') && (
              <RouteFinderParametersForm parameters={routeFinderParameters} onChange={setRouteFinderParameters} />
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
            <Button onClick={handleCloneAndProceed} disabled={!canProceed() || cloning || !user}>
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
