import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, X, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import orienteeringControlFlag from '@/assets/orienteering-control-flag.png';

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
  favorites: string[];
  onToggleFavorite: (mapId: string, mapName: string) => void;
}

const CommunityMapBrowser: React.FC<CommunityMapBrowserProps> = ({ 
  onSelectMap, 
  selectedMapName,
  favorites,
  onToggleFavorite
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

  const isFavorite = (mapId: string) => favorites.includes(mapId);

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

    // Add markers for each community map - filter invalid coordinates
    const validMaps = communityMaps.filter(cm => 
      !isNaN(cm.latitude) && !isNaN(cm.longitude) && 
      cm.latitude !== 0 && cm.longitude !== 0 &&
      Math.abs(cm.latitude) <= 90 && Math.abs(cm.longitude) <= 180
    );
    
    validMaps.forEach((cm) => {
      if (!map.current) return;
      
      const isSelected = selectedMapName === cm.name;
      const isFav = isFavorite(cm.id);
      
      // Create container element
      const el = document.createElement('div');
      el.className = 'community-map-marker';
      el.style.cursor = 'pointer';
      el.style.position = 'relative';
      el.style.width = '28px';
      el.style.height = '28px';
      
      // Create image element for the control flag
      const img = document.createElement('img');
      img.src = orienteeringControlFlag;
      img.alt = cm.name;
      img.style.cssText = `
        width: 28px;
        height: 28px;
        transition: transform 0.15s ease-out;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        border-radius: 4px;
        ${isSelected ? 'outline: 2px solid #22c55e; outline-offset: 2px;' : ''}
      `;
      
      el.appendChild(img);

      // Add favorite indicator if favorited
      if (isFav) {
        const starIndicator = document.createElement('div');
        starIndicator.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#facc15" stroke="#facc15" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
        starIndicator.style.cssText = `
          position: absolute;
          top: -4px;
          right: -4px;
          background: white;
          border-radius: 50%;
          padding: 2px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        `;
        el.appendChild(starIndicator);
      }
      
      // Apply hover effect to the IMAGE, not the container
      el.addEventListener('mouseenter', () => {
        img.style.transform = 'scale(1.2)';
        setHoveredMap(cm);
      });
      
      el.addEventListener('mouseleave', () => {
        img.style.transform = 'scale(1)';
        setHoveredMap(null);
      });
      
      el.addEventListener('click', () => {
        onSelectMap(cm.name);
        setShowMap(false);
      });

      // Use bottom-center anchor so marker stays fixed at the coordinate point
      const marker = new mapboxgl.Marker({ 
        element: el, 
        anchor: 'bottom'
      })
        .setLngLat([cm.longitude, cm.latitude])
        .addTo(map.current);
      
      markers.current.push(marker);
    });

    // Fit bounds to show all markers (use validMaps)
    if (validMaps.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      validMaps.forEach(cm => bounds.extend([cm.longitude, cm.latitude]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 6 });
    }

    return () => {
      markers.current.forEach(m => m.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [showMap, communityMaps, selectedMapName, onSelectMap, mapboxToken, favorites]);

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
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(hoveredMap.id, hoveredMap.name);
              }}
              className="flex-shrink-0 h-8 w-8 p-0"
              title={isFavorite(hoveredMap.id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star 
                className={`h-5 w-5 ${isFavorite(hoveredMap.id) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
              />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityMapBrowser;
