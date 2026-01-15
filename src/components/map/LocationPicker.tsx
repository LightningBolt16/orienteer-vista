import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LocationPickerProps {
  value?: { lat: number; lng: number; name?: string };
  onChange: (location: { lat: number; lng: number; name: string }) => void;
  className?: string;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange, className }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locationName, setLocationName] = useState(value?.name || '');

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: value ? [value.lng, value.lat] : [10, 50],
      zoom: value ? 8 : 2,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add marker if value exists
    if (value) {
      marker.current = new mapboxgl.Marker({ color: '#22c55e' })
        .setLngLat([value.lng, value.lat])
        .addTo(map.current);
    }

    // Click handler
    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      
      // Update or create marker
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else if (map.current) {
        marker.current = new mapboxgl.Marker({ color: '#22c55e' })
          .setLngLat([lng, lat])
          .addTo(map.current);
      }

      // Reverse geocode
      const name = await reverseGeocode(lat, lng);
      setLocationName(name);
      onChange({ lat, lng, name });
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update marker when value changes externally
  useEffect(() => {
    if (value && map.current) {
      if (marker.current) {
        marker.current.setLngLat([value.lng, value.lat]);
      } else {
        marker.current = new mapboxgl.Marker({ color: '#22c55e' })
          .setLngLat([value.lng, value.lat])
          .addTo(map.current);
      }
      map.current.flyTo({ center: [value.lng, value.lat], zoom: 8 });
      if (value.name) setLocationName(value.name);
    }
  }, [value?.lat, value?.lng]);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,region,country`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !MAPBOX_TOKEN) return;
    
    setSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.center;
        const name = feature.place_name;
        
        // Update map and marker
        if (map.current) {
          map.current.flyTo({ center: [lng, lat], zoom: 10 });
          
          if (marker.current) {
            marker.current.setLngLat([lng, lat]);
          } else {
            marker.current = new mapboxgl.Marker({ color: '#22c55e' })
              .setLngLat([lng, lat])
              .addTo(map.current);
          }
        }
        
        setLocationName(name);
        onChange({ lat, lng, name });
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className={`bg-muted rounded-lg p-4 text-center ${className}`}>
        <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Mapbox token not configured. Please add VITE_MAPBOX_TOKEN to enable location picking.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex gap-2 mb-2">
        <Input
          placeholder="Search for a location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleSearch}
          disabled={searching}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
      
      <div 
        ref={mapContainer} 
        className="w-full h-[250px] rounded-lg overflow-hidden border border-border"
      />
      
      {locationName && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="truncate">{locationName}</span>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground mt-1">
        Click on the map or search to select a location
      </p>
    </div>
  );
};

export default LocationPicker;
