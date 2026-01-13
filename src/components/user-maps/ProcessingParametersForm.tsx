import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { ProcessingParameters, DEFAULT_PROCESSING_PARAMETERS } from '@/hooks/useUserMaps';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Regular user limits
const USER_LIMITS = {
  maxOutputRoutes: 100,
  maxCandidatePairs: 50000,
  maxAlternateRoutes: 1,
  maxRandomPoints: 1000,
};

// Pro/Admin limits (effectively unlimited for practical purposes)
const PRO_LIMITS = {
  maxOutputRoutes: 500,
  maxCandidatePairs: 100000,
  maxAlternateRoutes: 3,
  maxRandomPoints: 5000,
};

interface ProcessingParametersFormProps {
  parameters: ProcessingParameters;
  onChange: (parameters: ProcessingParameters) => void;
  hasPro?: boolean;
}

const ProcessingParametersForm: React.FC<ProcessingParametersFormProps> = ({
  parameters,
  onChange,
  hasPro = false,
}) => {
  const limits = hasPro ? PRO_LIMITS : USER_LIMITS;

  const updateParam = <K extends keyof ProcessingParameters>(
    key: K,
    value: ProcessingParameters[K]
  ) => {
    onChange({ ...parameters, [key]: value });
  };

  const LimitBadge = ({ locked }: { locked: boolean }) => {
    if (hasPro || !locked) return null;
    return (
      <Badge variant="secondary" className="ml-2 text-xs">
        <Lock className="h-3 w-3 mr-1" />
        Pro Only
      </Badge>
    );
  };

  // Locked slider component for non-pro users - shows partial progress
  const LockedSlider = ({ 
    label, 
    value, 
    proMax 
  }: { 
    label: string; 
    value: number | string; 
    proMax: number;
  }) => {
    // Show slider at ~40% to indicate limited access
    const displayPercent = 40;
    return (
      <div className="space-y-2 opacity-60">
        <div className="flex items-center gap-2">
          <Label>{label}: {value}</Label>
          <Badge variant="secondary" className="text-xs">
            <Lock className="h-3 w-3 mr-1" />
            Pro Only
          </Badge>
        </div>
        <div className="relative">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary/50 rounded-full" 
              style={{ width: `${displayPercent}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Pro users can adjust this setting (up to {proMax})
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="w-full">
        {/* Alternate Routes - New section for multi-route support */}
        <AccordionItem value="alternate-routes">
          <AccordionTrigger>
            Route Options
            {!hasPro && <LimitBadge locked />}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="num_alternate_routes">
                  Alternate Routes per Image
                </Label>
                {!hasPro && (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked
                  </Badge>
                )}
              </div>
              <Select
                value={String(parameters.num_alternate_routes || 1)}
                onValueChange={(v) => updateParam('num_alternate_routes', parseInt(v) as 1 | 2 | 3)}
                disabled={!hasPro}
              >
                <SelectTrigger className={!hasPro ? 'opacity-60' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 alternate (2 arrows)</SelectItem>
                  {hasPro && (
                    <>
                      <SelectItem value="2">2 alternates (3 arrows)</SelectItem>
                      <SelectItem value="3">3 alternates (4 arrows)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Number of incorrect route alternatives shown alongside the correct route.
                {!hasPro && ' Request pro access to unlock 2-3 alternates.'}
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="point-generation">
          <AccordionTrigger>
            Point Generation
            {!hasPro && (parameters.num_random_points || 0) >= USER_LIMITS.maxRandomPoints && (
              <Badge variant="secondary" className="ml-2 text-xs">Max</Badge>
            )}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="num_random_points">
                  Random Points: {parameters.num_random_points}
                </Label>
                {!hasPro && (parameters.num_random_points || 0) >= USER_LIMITS.maxRandomPoints && (
                  <Badge variant="secondary" className="text-xs">Max</Badge>
                )}
              </div>
              <Slider
                id="num_random_points"
                min={100}
                max={limits.maxRandomPoints}
                step={100}
                value={[Math.min(parameters.num_random_points || DEFAULT_PROCESSING_PARAMETERS.num_random_points!, limits.maxRandomPoints)]}
                onValueChange={([v]) => updateParam('num_random_points', v)}
              />
              <p className="text-xs text-muted-foreground">
                {hasPro
                  ? 'Number of random points to generate for route finding'
                  : `Limited to ${USER_LIMITS.maxRandomPoints.toLocaleString()} for regular users. Request pro for up to ${PRO_LIMITS.maxRandomPoints.toLocaleString()}.`
                }
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="candidate-selection">
          <AccordionTrigger>Candidate Selection</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="candidate_min_dist">
                Min Distance: {parameters.candidate_min_dist}m
              </Label>
              <Slider
                id="candidate_min_dist"
                min={100}
                max={1000}
                step={50}
                value={[parameters.candidate_min_dist || DEFAULT_PROCESSING_PARAMETERS.candidate_min_dist!]}
                onValueChange={([v]) => updateParam('candidate_min_dist', v)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="candidate_max_dist">
                Max Distance: {parameters.candidate_max_dist}m
              </Label>
              <Slider
                id="candidate_max_dist"
                min={500}
                max={5000}
                step={100}
                value={[parameters.candidate_max_dist || DEFAULT_PROCESSING_PARAMETERS.candidate_max_dist!]}
                onValueChange={([v]) => updateParam('candidate_max_dist', v)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="max_candidate_pairs">
                  Max Candidate Pairs: {parameters.max_candidate_pairs?.toLocaleString()}
                </Label>
                {!hasPro && (parameters.max_candidate_pairs || 0) >= USER_LIMITS.maxCandidatePairs && (
                  <Badge variant="secondary" className="text-xs">Max</Badge>
                )}
              </div>
              <Slider
                id="max_candidate_pairs"
                min={1000}
                max={limits.maxCandidatePairs}
                step={1000}
                value={[Math.min(parameters.max_candidate_pairs || DEFAULT_PROCESSING_PARAMETERS.max_candidate_pairs!, limits.maxCandidatePairs)]}
                onValueChange={([v]) => updateParam('max_candidate_pairs', v)}
              />
              <p className="text-xs text-muted-foreground">
                {hasPro 
                  ? 'Maximum pairs to evaluate (higher = more options but slower)'
                  : `Limited to ${USER_LIMITS.maxCandidatePairs.toLocaleString()} for regular users. Request pro for up to ${PRO_LIMITS.maxCandidatePairs.toLocaleString()}.`
                }
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="output">
          <AccordionTrigger>Output Settings</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="num_output_routes">
                  Number of Routes: {parameters.num_output_routes}
                </Label>
                {!hasPro && (parameters.num_output_routes || 0) >= USER_LIMITS.maxOutputRoutes && (
                  <Badge variant="secondary" className="text-xs">Max</Badge>
                )}
              </div>
              <Slider
                id="num_output_routes"
                min={10}
                max={limits.maxOutputRoutes}
                step={10}
                value={[Math.min(parameters.num_output_routes || DEFAULT_PROCESSING_PARAMETERS.num_output_routes!, limits.maxOutputRoutes)]}
                onValueChange={([v]) => updateParam('num_output_routes', v)}
              />
              <p className="text-xs text-muted-foreground">
                {hasPro
                  ? 'Number of route images to generate'
                  : `Limited to ${USER_LIMITS.maxOutputRoutes} for regular users. Request pro for up to ${PRO_LIMITS.maxOutputRoutes}.`
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_overlap_percent">
                Max Overlap: {Math.round((parameters.max_overlap_percent || 0.2) * 100)}%
              </Label>
              <Slider
                id="max_overlap_percent"
                min={5}
                max={50}
                step={5}
                value={[Math.round((parameters.max_overlap_percent || DEFAULT_PROCESSING_PARAMETERS.max_overlap_percent!) * 100)]}
                onValueChange={([v]) => updateParam('max_overlap_percent', v / 100)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum overlap between routes to ensure variety
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_size">Batch Size</Label>
              <Input
                id="batch_size"
                type="number"
                min={5}
                max={100}
                value={parameters.batch_size || DEFAULT_PROCESSING_PARAMETERS.batch_size}
                onChange={(e) => updateParam('batch_size', parseInt(e.target.value) || DEFAULT_PROCESSING_PARAMETERS.batch_size)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="visuals">
          <AccordionTrigger>
            Visual Settings
            {!hasPro && <LimitBadge locked />}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {hasPro ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="zoom_margin">Zoom Margin: {parameters.zoom_margin}px</Label>
                  <Slider
                    id="zoom_margin"
                    min={20}
                    max={200}
                    step={10}
                    value={[parameters.zoom_margin || DEFAULT_PROCESSING_PARAMETERS.zoom_margin!]}
                    onValueChange={([v]) => updateParam('zoom_margin', v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marker_radius">Marker Radius: {parameters.marker_radius}px</Label>
                  <Slider
                    id="marker_radius"
                    min={20}
                    max={100}
                    step={5}
                    value={[parameters.marker_radius || DEFAULT_PROCESSING_PARAMETERS.marker_radius!]}
                    onValueChange={([v]) => updateParam('marker_radius', v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="line_width">Line Width: {parameters.line_width}px</Label>
                  <Slider
                    id="line_width"
                    min={2}
                    max={20}
                    step={1}
                    value={[parameters.line_width || DEFAULT_PROCESSING_PARAMETERS.line_width!]}
                    onValueChange={([v]) => updateParam('line_width', v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="line_alpha">Line Opacity: {Math.round((parameters.line_alpha || 0.6) * 100)}%</Label>
                  <Slider
                    id="line_alpha"
                    min={20}
                    max={100}
                    step={10}
                    value={[Math.round((parameters.line_alpha || DEFAULT_PROCESSING_PARAMETERS.line_alpha!) * 100)]}
                    onValueChange={([v]) => updateParam('line_alpha', v / 100)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <LockedSlider label="Zoom Margin" value={`${DEFAULT_PROCESSING_PARAMETERS.zoom_margin}px`} proMax={200} />
                <LockedSlider label="Marker Radius" value={`${DEFAULT_PROCESSING_PARAMETERS.marker_radius}px`} proMax={100} />
                <LockedSlider label="Line Width" value={`${DEFAULT_PROCESSING_PARAMETERS.line_width}px`} proMax={20} />
                <LockedSlider label="Line Opacity" value={`${Math.round((DEFAULT_PROCESSING_PARAMETERS.line_alpha || 0.6) * 100)}%`} proMax={100} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="corridor">
          <AccordionTrigger>
            Corridor Settings
            {!hasPro && <LimitBadge locked />}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {hasPro ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="corridor_base_width">Base Width: {parameters.corridor_base_width}px</Label>
                  <Slider
                    id="corridor_base_width"
                    min={20}
                    max={150}
                    step={10}
                    value={[parameters.corridor_base_width || DEFAULT_PROCESSING_PARAMETERS.corridor_base_width!]}
                    onValueChange={([v]) => updateParam('corridor_base_width', v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="corridor_scale_factor">Scale Factor: {parameters.corridor_scale_factor}</Label>
                  <Slider
                    id="corridor_scale_factor"
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={[parameters.corridor_scale_factor || DEFAULT_PROCESSING_PARAMETERS.corridor_scale_factor!]}
                    onValueChange={([v]) => updateParam('corridor_scale_factor', v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smoothing_window">Smoothing Window</Label>
                  <Input
                    id="smoothing_window"
                    type="number"
                    min={1}
                    max={20}
                    value={parameters.smoothing_window || DEFAULT_PROCESSING_PARAMETERS.smoothing_window}
                    onChange={(e) => updateParam('smoothing_window', parseInt(e.target.value) || DEFAULT_PROCESSING_PARAMETERS.smoothing_window)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <LockedSlider label="Base Width" value={`${DEFAULT_PROCESSING_PARAMETERS.corridor_base_width}px`} proMax={150} />
                <LockedSlider label="Scale Factor" value={DEFAULT_PROCESSING_PARAMETERS.corridor_scale_factor || 0.5} proMax={1} />
                <LockedSlider label="Smoothing Window" value={DEFAULT_PROCESSING_PARAMETERS.smoothing_window || 5} proMax={20} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ProcessingParametersForm;
