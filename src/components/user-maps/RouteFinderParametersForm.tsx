import React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';

export interface RouteFinderParameters {
  num_challenges?: number;
  min_route_length?: number;
  max_route_length?: number;
  graph_simplification_radius?: number;
  marker_padding?: number;
  route_padding?: number;
  marker_radius?: number;
  line_width?: number;
  num_random_points?: number;
}

export const DEFAULT_ROUTE_FINDER_PARAMETERS: RouteFinderParameters = {
  num_challenges: 20,
  min_route_length: 800,
  max_route_length: 2500,
  graph_simplification_radius: 300,
  marker_padding: 200,
  route_padding: 120,
  marker_radius: 40,
  line_width: 8,
  num_random_points: 1500,
};

// Regular user limits
const USER_LIMITS = {
  maxChallenges: 30,
  maxRandomPoints: 2000,
};

// Pro/Admin limits
const PRO_LIMITS = {
  maxChallenges: 100,
  maxRandomPoints: 5000,
};

interface RouteFinderParametersFormProps {
  parameters: RouteFinderParameters;
  onChange: (parameters: RouteFinderParameters) => void;
  hasPro?: boolean;
}

const RouteFinderParametersForm: React.FC<RouteFinderParametersFormProps> = ({
  parameters,
  onChange,
  hasPro = false,
}) => {
  const limits = hasPro ? PRO_LIMITS : USER_LIMITS;

  const updateParam = <K extends keyof RouteFinderParameters>(
    key: K,
    value: RouteFinderParameters[K]
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

  // Locked slider component for non-pro users
  const LockedSlider = ({ 
    label, 
    value, 
    proMax 
  }: { 
    label: string; 
    value: number | string; 
    proMax: number;
  }) => {
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
      <Accordion type="single" collapsible className="w-full" defaultValue="output">
        {/* Output Settings */}
        <AccordionItem value="output">
          <AccordionTrigger>Output Settings</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="num_challenges">
                  Number of Challenges: {parameters.num_challenges}
                </Label>
                {!hasPro && (parameters.num_challenges || 0) >= USER_LIMITS.maxChallenges && (
                  <Badge variant="secondary" className="text-xs">Max</Badge>
                )}
              </div>
              {hasPro ? (
                <Slider
                  id="num_challenges"
                  min={5}
                  max={PRO_LIMITS.maxChallenges}
                  step={5}
                  value={[parameters.num_challenges || DEFAULT_ROUTE_FINDER_PARAMETERS.num_challenges!]}
                  onValueChange={([v]) => updateParam('num_challenges', v)}
                />
              ) : (
                <div className="relative">
                  <Slider
                    id="num_challenges"
                    min={5}
                    max={PRO_LIMITS.maxChallenges}
                    step={5}
                    value={[Math.min(parameters.num_challenges || DEFAULT_ROUTE_FINDER_PARAMETERS.num_challenges!, USER_LIMITS.maxChallenges)]}
                    onValueChange={([v]) => updateParam('num_challenges', Math.min(v, USER_LIMITS.maxChallenges))}
                  />
                  <div 
                    className="absolute top-0 h-full border-l-2 border-dashed border-primary/60 pointer-events-none"
                    style={{ left: `${(USER_LIMITS.maxChallenges / PRO_LIMITS.maxChallenges) * 100}%` }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {hasPro
                  ? 'Number of drawing challenges to generate'
                  : `Limited to ${USER_LIMITS.maxChallenges}. Unlock up to ${PRO_LIMITS.maxChallenges} with Pro.`
                }
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="num_random_points">
                  Random Points: {parameters.num_random_points?.toLocaleString()}
                </Label>
                {!hasPro && (parameters.num_random_points || 0) >= USER_LIMITS.maxRandomPoints && (
                  <Badge variant="secondary" className="text-xs">Max</Badge>
                )}
              </div>
              {hasPro ? (
                <Slider
                  id="num_random_points"
                  min={500}
                  max={PRO_LIMITS.maxRandomPoints}
                  step={100}
                  value={[parameters.num_random_points || DEFAULT_ROUTE_FINDER_PARAMETERS.num_random_points!]}
                  onValueChange={([v]) => updateParam('num_random_points', v)}
                />
              ) : (
                <div className="relative">
                  <Slider
                    id="num_random_points"
                    min={500}
                    max={PRO_LIMITS.maxRandomPoints}
                    step={100}
                    value={[Math.min(parameters.num_random_points || DEFAULT_ROUTE_FINDER_PARAMETERS.num_random_points!, USER_LIMITS.maxRandomPoints)]}
                    onValueChange={([v]) => updateParam('num_random_points', Math.min(v, USER_LIMITS.maxRandomPoints))}
                  />
                  <div 
                    className="absolute top-0 h-full border-l-2 border-dashed border-primary/60 pointer-events-none"
                    style={{ left: `${(USER_LIMITS.maxRandomPoints / PRO_LIMITS.maxRandomPoints) * 100}%` }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {hasPro
                  ? 'Points used for skeleton graph generation (higher = more accurate routes)'
                  : `Limited to ${USER_LIMITS.maxRandomPoints.toLocaleString()}. Unlock up to ${PRO_LIMITS.maxRandomPoints.toLocaleString()} with Pro.`
                }
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Route Length Settings */}
        <AccordionItem value="route-length">
          <AccordionTrigger>Route Length</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="min_route_length">
                Minimum Route Length: {parameters.min_route_length}px
              </Label>
              <Slider
                id="min_route_length"
                min={400}
                max={1500}
                step={50}
                value={[parameters.min_route_length || DEFAULT_ROUTE_FINDER_PARAMETERS.min_route_length!]}
                onValueChange={([v]) => updateParam('min_route_length', v)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum pixel length for generated routes (shorter = easier challenges)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_route_length">
                Maximum Route Length: {parameters.max_route_length}px
              </Label>
              <Slider
                id="max_route_length"
                min={1000}
                max={5000}
                step={100}
                value={[parameters.max_route_length || DEFAULT_ROUTE_FINDER_PARAMETERS.max_route_length!]}
                onValueChange={([v]) => updateParam('max_route_length', v)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum pixel length for generated routes (longer = harder challenges)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="graph_simplification_radius">
                Graph Simplification: {parameters.graph_simplification_radius}px
              </Label>
              <Slider
                id="graph_simplification_radius"
                min={100}
                max={500}
                step={50}
                value={[parameters.graph_simplification_radius || DEFAULT_ROUTE_FINDER_PARAMETERS.graph_simplification_radius!]}
                onValueChange={([v]) => updateParam('graph_simplification_radius', v)}
              />
              <p className="text-xs text-muted-foreground">
                Radius for simplifying the navigation graph (higher = simpler paths)
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Visual Settings */}
        <AccordionItem value="visuals">
          <AccordionTrigger>
            Visual Settings
            {!hasPro && <LimitBadge locked />}
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            {hasPro ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="marker_padding">Marker Padding: {parameters.marker_padding}px</Label>
                  <Slider
                    id="marker_padding"
                    min={100}
                    max={400}
                    step={20}
                    value={[parameters.marker_padding || DEFAULT_ROUTE_FINDER_PARAMETERS.marker_padding!]}
                    onValueChange={([v]) => updateParam('marker_padding', v)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Padding around start/finish markers in exported images
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="route_padding">Route Padding: {parameters.route_padding}px</Label>
                  <Slider
                    id="route_padding"
                    min={50}
                    max={250}
                    step={10}
                    value={[parameters.route_padding || DEFAULT_ROUTE_FINDER_PARAMETERS.route_padding!]}
                    onValueChange={([v]) => updateParam('route_padding', v)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Padding around the route path in exported images
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marker_radius">Marker Radius: {parameters.marker_radius}px</Label>
                  <Slider
                    id="marker_radius"
                    min={20}
                    max={80}
                    step={5}
                    value={[parameters.marker_radius || DEFAULT_ROUTE_FINDER_PARAMETERS.marker_radius!]}
                    onValueChange={([v]) => updateParam('marker_radius', v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="line_width">Line Width: {parameters.line_width}px</Label>
                  <Slider
                    id="line_width"
                    min={4}
                    max={16}
                    step={1}
                    value={[parameters.line_width || DEFAULT_ROUTE_FINDER_PARAMETERS.line_width!]}
                    onValueChange={([v]) => updateParam('line_width', v)}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <LockedSlider label="Marker Padding" value={`${DEFAULT_ROUTE_FINDER_PARAMETERS.marker_padding}px`} proMax={400} />
                <LockedSlider label="Route Padding" value={`${DEFAULT_ROUTE_FINDER_PARAMETERS.route_padding}px`} proMax={250} />
                <LockedSlider label="Marker Radius" value={`${DEFAULT_ROUTE_FINDER_PARAMETERS.marker_radius}px`} proMax={80} />
                <LockedSlider label="Line Width" value={`${DEFAULT_ROUTE_FINDER_PARAMETERS.line_width}px`} proMax={16} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default RouteFinderParametersForm;
