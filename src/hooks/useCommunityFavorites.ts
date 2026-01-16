import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

interface FavoriteMap {
  id: string;
  name: string;
}

export function useCommunityFavorites() {
  const { user } = useUser();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteMaps, setFavoriteMaps] = useState<FavoriteMap[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user?.id) {
      setFavorites([]);
      setFavoriteMaps([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('community_map_favorites')
        .select(`
          route_map_id,
          route_maps!inner (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching favorites:', error);
        return;
      }

      const favoriteIds = data?.map((f: any) => f.route_map_id) || [];
      const maps = data?.map((f: any) => ({
        id: f.route_maps.id,
        name: f.route_maps.name,
      })) || [];

      setFavorites(favoriteIds);
      setFavoriteMaps(maps);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (mapId: string, mapName: string) => {
    if (!user?.id) return;

    const isFav = favorites.includes(mapId);

    if (isFav) {
      // Remove favorite
      const { error } = await supabase
        .from('community_map_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('route_map_id', mapId);

      if (!error) {
        setFavorites(prev => prev.filter(id => id !== mapId));
        setFavoriteMaps(prev => prev.filter(m => m.id !== mapId));
      }
    } else {
      // Add favorite
      const { error } = await supabase
        .from('community_map_favorites')
        .insert({ user_id: user.id, route_map_id: mapId });

      if (!error) {
        setFavorites(prev => [...prev, mapId]);
        setFavoriteMaps(prev => [...prev, { id: mapId, name: mapName }]);
      }
    }
  }, [user?.id, favorites]);

  const isFavorite = useCallback((mapId: string) => {
    return favorites.includes(mapId);
  }, [favorites]);

  return { 
    favorites, 
    favoriteMaps, 
    toggleFavorite, 
    isFavorite, 
    fetchFavorites,
    loading 
  };
}
