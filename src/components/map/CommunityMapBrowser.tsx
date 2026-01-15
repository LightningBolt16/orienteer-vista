import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePublicConfig } from '@/hooks/usePublicConfig';

interface CommunityMap {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  location_name?: string;
}

interface CommunityMapBrowserProps {
  onSelectMap: (mapName: string) => void;
  selectedMapName?: string;
}

const CommunityMapBrowser: React.FC<CommunityMapBrowserProps> = ({ 
  onSelectMap, 
  selectedMapName 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [communityMaps, setCommunityMaps] = useState<CommunityMap[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [hoveredMap, setHoveredMap] = useState<CommunityMap | null>(null);
  
  const { config, loading, error, refetch } = usePublicConfig();
  const mapboxToken = config?.mapboxToken || '';

  useEffect(() => {
    fetchCommunityMaps();
  }, []);

  const fetchCommunityMaps = async () => {
    const { data, error } = await supabase
      .from('route_maps')
      .select('id, name, description, latitude, longitude, location_name')
      .eq('map_category', 'community')
      .eq('is_public', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (!error && data) {
      setCommunityMaps(data.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description || undefined,
        latitude: Number(m.latitude),
        longitude: Number(m.longitude),
        location_name: m.location_name || undefined,
      })));
    }
  };

  useEffect(() => {
    if (!showMap || !mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [15, 50],
      zoom: 2,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add markers for each community map
    communityMaps.forEach((cm) => {
      if (!map.current) return;
      
      const el = document.createElement('div');
      el.className = 'community-map-marker';
      el.style.cssText = `
        width: 24px;
        height: 24px;
        background: ${selectedMapName === cm.name ? '#22c55e' : '#3b82f6'};
        border: 2px solid white;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        transition: transform 0.2s;
      `;
      
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
        setHoveredMap(cm);
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        setHoveredMap(null);
      });
      
      el.addEventListener('click', () => {
        onSelectMap(cm.name);
        setShowMap(false);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([cm.longitude, cm.latitude])
        .addTo(map.current);
      
      markers.current.push(marker);
    });

    // Fit bounds to show all markers
    if (communityMaps.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      communityMaps.forEach(cm => bounds.extend([cm.longitude, cm.latitude]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 6 });
    }

    return () => {
      markers.current.forEach(m => m.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [showMap, communityMaps, selectedMapName, onSelectMap, mapboxToken]);

  // Don't render if loading or no token
  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">Loading map browser...</p>
      </div>
    );
  }

  if (error || !mapboxToken) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-2">
          Map browser unavailable
        </p>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!showMap) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setShowMap(true)}
        className="w-full"
      >
        <MapPin className="h-4 w-4 mr-2" />
        Browse on Map ({communityMaps.length} maps)
      </Button>
    );
  }

  return (
    <div className="relative rounded-lg border border-border overflow-hidden">
      <div className="absolute top-2 right-2 z-10">
        <Button 
          variant="secondary" 
          size="icon" 
          onClick={() => setShowMap(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div 
        ref={mapContainer} 
        className="w-full h-[300px]"
      />
      
      {hoveredMap && (
        <div className="absolute bottom-2 left-2 right-2 z-10 bg-background/95 backdrop-blur-sm rounded-lg p-3 border border-border">
          <h4 className="font-semibold text-sm">{hoveredMap.name}</h4>
          {hoveredMap.location_name && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {hoveredMap.location_name}
            </p>
          )}
          {hoveredMap.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {hoveredMap.description}
            </p>
          )}
          <p className="text-xs text-primary mt-1">Click to select</p>
        </div>
      )}
    </div>
  );
};

export default CommunityMapBrowser;
