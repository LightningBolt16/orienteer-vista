import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calendar, Image, Layers, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ExistingMapInfo {
  id: string;
  name: string;
  createdAt: Date;
  routeCount: number;
  format: '1:1' | 'legacy';
  previewUrl: string | null;
}

interface NewMapInfo {
  name: string;
  routeCount: number;
  format: '1:1' | 'legacy';
  previewFile: File | null;
}

interface MapVersionComparisonProps {
  existingMapId: string;
  newMapName: string;
  newRouteCount: number;
  newFormat: '1:1' | 'legacy';
  newPreviewFile: File | null;
  onReplace: () => void;
  onRename: () => void;
  onCancel: () => void;
}

const STORAGE_URL = 'https://pldlmtuxqxszaajxtufx.supabase.co/storage/v1/object/public/route-images';

const MapVersionComparison: React.FC<MapVersionComparisonProps> = ({
  existingMapId,
  newMapName,
  newRouteCount,
  newFormat,
  newPreviewFile,
  onReplace,
  onRename,
  onCancel,
}) => {
  const [existingMap, setExistingMap] = useState<ExistingMapInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPreviewUrl, setNewPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchExistingMapInfo();
    
    // Create preview URL for new file
    if (newPreviewFile) {
      const url = URL.createObjectURL(newPreviewFile);
      setNewPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [existingMapId, newPreviewFile]);

  const fetchExistingMapInfo = async () => {
    setLoading(true);
    
    try {
      // Get map info
      const { data: mapData, error: mapError } = await supabase
        .from('route_maps')
        .select('id, name, created_at')
        .eq('id', existingMapId)
        .single();

      if (mapError || !mapData) {
        console.error('Failed to fetch existing map:', mapError);
        setLoading(false);
        return;
      }

      // Get route count and detect format
      const { data: routeData, error: routeError } = await supabase
        .from('route_images')
        .select('aspect_ratio, image_path')
        .eq('map_id', existingMapId);

      if (routeError) {
        console.error('Failed to fetch route images:', routeError);
      }

      const routes = routeData || [];
      
      // Detect format from aspect_ratio values
      const has1to1 = routes.some(r => r.aspect_ratio === '1:1');
      const format: '1:1' | 'legacy' = has1to1 ? '1:1' : 'legacy';
      
      // Count unique routes (for legacy format, routes are duplicated for each aspect)
      const uniqueRoutes = has1to1 
        ? routes.length 
        : routes.filter(r => r.aspect_ratio === '16:9' || r.aspect_ratio === '16_9').length;

      // Get first image for preview
      let previewUrl: string | null = null;
      if (routes.length > 0) {
        const firstRoute = routes[0];
        previewUrl = `${STORAGE_URL}/${firstRoute.image_path}`;
      }

      setExistingMap({
        id: mapData.id,
        name: mapData.name,
        createdAt: new Date(mapData.created_at),
        routeCount: uniqueRoutes,
        format,
        previewUrl,
      });
    } catch (error) {
      console.error('Error fetching existing map info:', error);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading comparison...</p>
        </CardContent>
      </Card>
    );
  }

  if (!existingMap) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Could not load existing map info.</p>
          <Button onClick={onCancel} variant="outline" className="mt-4">
            Go Back
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/50">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          Existing Map Found: "{existingMap.name}"
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Existing Map */}
          <div className="space-y-4">
            <h3 className="font-semibold text-center text-muted-foreground uppercase text-sm tracking-wide">
              Existing
            </h3>
            
            <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {existingMap.previewUrl ? (
                <img 
                  src={existingMap.previewUrl} 
                  alt="Existing map preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image className="h-12 w-12 text-muted-foreground/50" />
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span>{existingMap.routeCount} routes</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Created {format(existingMap.createdAt, 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-muted-foreground" />
                <span className={`px-2 py-0.5 rounded text-xs ${
                  existingMap.format === '1:1' 
                    ? 'bg-green-500/10 text-green-600' 
                    : 'bg-blue-500/10 text-blue-600'
                }`}>
                  Format: {existingMap.format === '1:1' ? 'Square (1:1)' : 'Legacy (16:9 + 9:16)'}
                </span>
              </div>
            </div>
          </div>

          {/* Arrow Separator */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* New Upload */}
          <div className="space-y-4">
            <h3 className="font-semibold text-center text-primary uppercase text-sm tracking-wide">
              New Upload
            </h3>
            
            <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center border-2 border-primary/30">
              {newPreviewUrl ? (
                <img 
                  src={newPreviewUrl} 
                  alt="New map preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image className="h-12 w-12 text-muted-foreground/50" />
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span>{newRouteCount} routes</span>
                {newRouteCount !== existingMap.routeCount && (
                  <span className={`text-xs ${
                    newRouteCount > existingMap.routeCount ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    ({newRouteCount > existingMap.routeCount ? '+' : ''}{newRouteCount - existingMap.routeCount})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-muted-foreground" />
                <span className={`px-2 py-0.5 rounded text-xs ${
                  newFormat === '1:1' 
                    ? 'bg-green-500/10 text-green-600' 
                    : 'bg-blue-500/10 text-blue-600'
                }`}>
                  Format: {newFormat === '1:1' ? 'Square (1:1)' : 'Legacy (16:9 + 9:16)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Prompt */}
        <div className="border-t border-border pt-6">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            What would you like to do?
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="destructive" 
              onClick={onReplace}
              className="flex-1 sm:flex-none"
            >
              Replace Existing
            </Button>
            <Button 
              variant="outline" 
              onClick={onRename}
              className="flex-1 sm:flex-none"
            >
              Upload as New Name
            </Button>
            <Button 
              variant="ghost" 
              onClick={onCancel}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapVersionComparison;
