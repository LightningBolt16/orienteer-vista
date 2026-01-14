import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { RouteData, MapSource, getAvailableMaps, fetchRouteDataForMap } from '@/utils/routeDataUtils';
import { supabase } from '@/integrations/supabase/client';

interface CachedRouteData {
  routes: RouteData[];
  maps: MapSource[];
  lastFetched: number;
}

interface RouteCacheContextType {
  desktopCache: CachedRouteData | null;
  mobileCache: CachedRouteData | null;
  isPreloading: boolean;
  getRoutesForMap: (mapId: string | null, isMobile: boolean) => Promise<{ routes: RouteData[]; maps: MapSource[] }>;
}

const RouteCacheContext = createContext<RouteCacheContextType | undefined>(undefined);

export const RouteCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [desktopCache, setDesktopCache] = useState<CachedRouteData | null>(null);
  const [mobileCache, setMobileCache] = useState<CachedRouteData | null>(null);
  const [isPreloading, setIsPreloading] = useState(true);

  // Preload all routes on mount
  useEffect(() => {
    const preloadRoutes = async () => {
      console.log('Preloading routes...');
      setIsPreloading(true);
      
      try {
        // Get current user to include their private maps
        const { data: { user } } = await supabase.auth.getUser();
        const allMaps = await getAvailableMaps(user?.id);
        
        // Load desktop routes (16:9) - include all maps since routes exist in both aspects
        const desktopRoutes: RouteData[] = [];
        for (const mapSource of allMaps) {
          const routes = await fetchRouteDataForMap(mapSource);
          // Filter routes by aspect ratio for desktop
          const filteredRoutes = routes.filter(r => !r.imagePath || r.imagePath.includes('16_9') || !r.imagePath.includes('9_16'));
          desktopRoutes.push(...filteredRoutes);
        }
        setDesktopCache({
          routes: desktopRoutes,
          maps: allMaps,
          lastFetched: Date.now()
        });
        console.log(`Preloaded ${desktopRoutes.length} desktop routes`);

        // Load mobile routes (9:16) - include all maps since routes exist in both aspects
        const mobileRoutes: RouteData[] = [];
        for (const mapSource of allMaps) {
          const routes = await fetchRouteDataForMap(mapSource);
          // Filter routes by aspect ratio for mobile
          const filteredRoutes = routes.filter(r => r.imagePath && r.imagePath.includes('9_16'));
          mobileRoutes.push(...filteredRoutes);
        }
        setMobileCache({
          routes: mobileRoutes,
          maps: allMaps,
          lastFetched: Date.now()
        });
        console.log(`Preloaded ${mobileRoutes.length} mobile routes`);
        
      } catch (error) {
        console.error('Error preloading routes:', error);
      } finally {
        setIsPreloading(false);
      }
    };

    preloadRoutes();
  }, []);

  const getRoutesForMap = useCallback(async (
    mapId: string | null, 
    isMobile: boolean
  ): Promise<{ routes: RouteData[]; maps: MapSource[] }> => {
    const cache = isMobile ? mobileCache : desktopCache;
    
    if (!cache) {
      // If cache not ready, fetch directly
      const allMaps = await getAvailableMaps();
      const aspect = isMobile ? '9_16' : '16_9';
      const filteredMaps = allMaps.filter(map => map.aspect === aspect);
      
      const allRoutes: RouteData[] = [];
      for (const mapSource of filteredMaps) {
        const routes = await fetchRouteDataForMap(mapSource);
        allRoutes.push(...routes);
      }
      
      if (mapId && mapId !== 'all') {
        const mapRoutes = allRoutes.filter(r => r.mapName?.toLowerCase() === mapId.toLowerCase());
        return { routes: mapRoutes.sort(() => Math.random() - 0.5), maps: filteredMaps };
      }
      
      return { routes: allRoutes.sort(() => Math.random() - 0.5), maps: filteredMaps };
    }

    // Use cached data
    if (mapId && mapId !== 'all') {
      const mapRoutes = cache.routes.filter(r => r.mapName?.toLowerCase() === mapId.toLowerCase());
      return { routes: [...mapRoutes].sort(() => Math.random() - 0.5), maps: cache.maps };
    }

    return { routes: [...cache.routes].sort(() => Math.random() - 0.5), maps: cache.maps };
  }, [desktopCache, mobileCache]);

  return (
    <RouteCacheContext.Provider value={{ desktopCache, mobileCache, isPreloading, getRoutesForMap }}>
      {children}
    </RouteCacheContext.Provider>
  );
};

export const useRouteCache = (): RouteCacheContextType => {
  const context = useContext(RouteCacheContext);
  if (context === undefined) {
    throw new Error('useRouteCache must be used within a RouteCacheProvider');
  }
  return context;
};
