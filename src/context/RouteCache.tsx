import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { RouteData, MapSource, getAvailableMaps, getOfficialMaps, getUserPrivateMaps, getCommunityMaps, fetchRouteDataForMap } from '@/utils/routeDataUtils';
import { supabase } from '@/integrations/supabase/client';

interface CachedRouteData {
  routes: RouteData[];
  maps: MapSource[];
  lastFetched: number;
}

interface RouteCacheContextType {
  desktopCache: CachedRouteData | null;
  mobileCache: CachedRouteData | null;
  userMapsCache: CachedRouteData | null;
  communityMapsCache: CachedRouteData | null;
  isPreloading: boolean;
  getRoutesForMap: (mapId: string | null, isMobile: boolean) => Promise<{ routes: RouteData[]; maps: MapSource[] }>;
  getUserRoutes: (isMobile: boolean) => Promise<{ routes: RouteData[]; maps: MapSource[] }>;
  getCommunityRoutes: (mapId: string | null, isMobile: boolean) => Promise<{ routes: RouteData[]; maps: MapSource[] }>;
  officialMaps: MapSource[];
  userMaps: MapSource[];
  communityMaps: MapSource[];
}

const RouteCacheContext = createContext<RouteCacheContextType | undefined>(undefined);

export const RouteCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [desktopCache, setDesktopCache] = useState<CachedRouteData | null>(null);
  const [mobileCache, setMobileCache] = useState<CachedRouteData | null>(null);
  const [userMapsCache, setUserMapsCache] = useState<CachedRouteData | null>(null);
  const [communityMapsCache, setCommunityMapsCache] = useState<CachedRouteData | null>(null);
  const [isPreloading, setIsPreloading] = useState(true);
  const [officialMaps, setOfficialMaps] = useState<MapSource[]>([]);
  const [userMaps, setUserMaps] = useState<MapSource[]>([]);
  const [communityMaps, setCommunityMaps] = useState<MapSource[]>([]);

  // Preload all routes on mount
  useEffect(() => {
    const preloadRoutes = async () => {
      console.log('Preloading routes...');
      setIsPreloading(true);
      
      try {
        // Get current user to include their private maps
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get official maps only for the main game
        const officialMapsList = await getOfficialMaps();
        setOfficialMaps(officialMapsList);
        
        // Get user's private maps if logged in
        if (user?.id) {
          const userMapsList = await getUserPrivateMaps(user.id);
          setUserMaps(userMapsList);
        }
        
        // Get community maps
        const communityMapsList = await getCommunityMaps();
        setCommunityMaps(communityMapsList);
        
        // Load desktop routes (16:9) - ONLY official maps for "All Maps" mix
        const desktopRoutes: RouteData[] = [];
        for (const mapSource of officialMapsList) {
          const mapWithAspect = { ...mapSource, aspect: '16_9' as const };
          const routes = await fetchRouteDataForMap(mapWithAspect);
          desktopRoutes.push(...routes);
        }
        setDesktopCache({
          routes: desktopRoutes,
          maps: officialMapsList,
          lastFetched: Date.now()
        });
        console.log(`Preloaded ${desktopRoutes.length} desktop routes from ${officialMapsList.length} official maps`);

        // Load mobile routes (9:16) - ONLY official maps for "All Maps" mix
        const mobileRoutes: RouteData[] = [];
        for (const mapSource of officialMapsList) {
          const mapWithAspect = { ...mapSource, aspect: '9_16' as const };
          const routes = await fetchRouteDataForMap(mapWithAspect);
          mobileRoutes.push(...routes);
        }
        setMobileCache({
          routes: mobileRoutes,
          maps: officialMapsList,
          lastFetched: Date.now()
        });
        console.log(`Preloaded ${mobileRoutes.length} mobile routes from ${officialMapsList.length} official maps`);
        
      } catch (error) {
        console.error('Error preloading routes:', error);
      } finally {
        setIsPreloading(false);
      }
    };

    preloadRoutes();
  }, []);

  // Get routes for official maps (used in main game)
  const getRoutesForMap = useCallback(async (
    mapId: string | null, 
    isMobile: boolean
  ): Promise<{ routes: RouteData[]; maps: MapSource[] }> => {
    const cache = isMobile ? mobileCache : desktopCache;
    
    if (!cache) {
      // If cache not ready, fetch directly from official maps only
      const officialMapsList = await getOfficialMaps();
      const aspect = isMobile ? '9_16' : '16_9';
      
      const allRoutes: RouteData[] = [];
      for (const mapSource of officialMapsList) {
        const mapWithAspect = { ...mapSource, aspect };
        const routes = await fetchRouteDataForMap(mapWithAspect);
        allRoutes.push(...routes);
      }
      
      if (mapId && mapId !== 'all') {
        const mapRoutes = allRoutes.filter(r => r.mapName?.toLowerCase() === mapId.toLowerCase());
        return { routes: mapRoutes.sort(() => Math.random() - 0.5), maps: officialMapsList };
      }
      
      return { routes: allRoutes.sort(() => Math.random() - 0.5), maps: officialMapsList };
    }

    // Use cached data
    if (mapId && mapId !== 'all') {
      const mapRoutes = cache.routes.filter(r => r.mapName?.toLowerCase() === mapId.toLowerCase());
      return { routes: [...mapRoutes].sort(() => Math.random() - 0.5), maps: cache.maps };
    }

    return { routes: [...cache.routes].sort(() => Math.random() - 0.5), maps: cache.maps };
  }, [desktopCache, mobileCache]);

  // Get routes for user's private maps
  const getUserRoutes = useCallback(async (
    isMobile: boolean
  ): Promise<{ routes: RouteData[]; maps: MapSource[] }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      return { routes: [], maps: [] };
    }
    
    const userMapsList = await getUserPrivateMaps(user.id);
    const aspect = isMobile ? '9_16' : '16_9';
    
    const allRoutes: RouteData[] = [];
    for (const mapSource of userMapsList) {
      const mapWithAspect = { ...mapSource, aspect };
      const routes = await fetchRouteDataForMap(mapWithAspect);
      allRoutes.push(...routes);
    }
    
    return { routes: allRoutes.sort(() => Math.random() - 0.5), maps: userMapsList };
  }, []);

  // Get routes for community maps
  const getCommunityRoutes = useCallback(async (
    mapId: string | null,
    isMobile: boolean
  ): Promise<{ routes: RouteData[]; maps: MapSource[] }> => {
    const communityMapsList = await getCommunityMaps();
    const aspect = isMobile ? '9_16' : '16_9';
    
    const allRoutes: RouteData[] = [];
    for (const mapSource of communityMapsList) {
      const mapWithAspect = { ...mapSource, aspect };
      const routes = await fetchRouteDataForMap(mapWithAspect);
      allRoutes.push(...routes);
    }
    
    if (mapId && mapId !== 'all') {
      const mapRoutes = allRoutes.filter(r => r.mapName?.toLowerCase() === mapId.toLowerCase());
      return { routes: mapRoutes.sort(() => Math.random() - 0.5), maps: communityMapsList };
    }
    
    return { routes: allRoutes.sort(() => Math.random() - 0.5), maps: communityMapsList };
  }, []);

  return (
    <RouteCacheContext.Provider value={{ 
      desktopCache, 
      mobileCache, 
      userMapsCache,
      communityMapsCache,
      isPreloading, 
      getRoutesForMap,
      getUserRoutes,
      getCommunityRoutes,
      officialMaps,
      userMaps,
      communityMaps
    }}>
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
