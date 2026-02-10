import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Eye, EyeOff, Map, Route, ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MapItem {
  id: string;
  name: string;
  is_hidden: boolean;
  is_public: boolean;
  map_category: string | null;
}

const ManageMapVisibility: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [routeMaps, setRouteMaps] = useState<MapItem[]>([]);
  const [routeFinderMaps, setRouteFinderMaps] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) loadMaps();
  }, [isAdmin]);

  const loadMaps = async () => {
    setLoading(true);
    try {
      const [{ data: rm }, { data: rfm }] = await Promise.all([
        supabase.from('route_maps').select('id, name, is_hidden, is_public, map_category').order('name'),
        supabase.from('route_finder_maps').select('id, name, is_hidden, is_public, map_category').order('name'),
      ]);
      setRouteMaps((rm || []) as MapItem[]);
      setRouteFinderMaps((rfm || []) as MapItem[]);
    } catch (err) {
      console.error('Error loading maps:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (table: 'route_maps' | 'route_finder_maps', mapId: string, currentlyHidden: boolean) => {
    setUpdating(mapId);
    try {
      const { error } = await supabase
        .from(table)
        .update({ is_hidden: !currentlyHidden })
        .eq('id', mapId);

      if (error) throw error;

      const setter = table === 'route_maps' ? setRouteMaps : setRouteFinderMaps;
      setter(prev => prev.map(m => m.id === mapId ? { ...m, is_hidden: !currentlyHidden } : m));

      toast({
        title: !currentlyHidden ? 'Map hidden' : 'Map visible',
        description: !currentlyHidden
          ? 'This map is now hidden from players (still visible to admins).'
          : 'This map is now visible to all players.',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUpdating(null);
    }
  };

  const renderMapList = (maps: MapItem[], table: 'route_maps' | 'route_finder_maps') => {
    if (maps.length === 0) {
      return <p className="text-sm text-muted-foreground py-4 text-center">No maps found.</p>;
    }

    return (
      <div className="space-y-2">
        {maps.map(map => (
          <div
            key={map.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              map.is_hidden ? 'bg-muted/50 border-dashed' : 'bg-card'
            }`}
          >
            <div className="flex items-center gap-3">
              {map.is_hidden ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-primary" />
              )}
              <div>
                <span className={`font-medium text-sm ${map.is_hidden ? 'text-muted-foreground' : ''}`}>
                  {map.name}
                </span>
                <div className="flex gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {map.map_category || 'official'}
                  </span>
                  {!map.is_public && (
                    <span className="text-xs text-amber-600">private</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {map.is_hidden ? 'Hidden' : 'Visible'}
              </span>
              <Switch
                checked={!map.is_hidden}
                onCheckedChange={() => toggleVisibility(table, map.id, map.is_hidden)}
                disabled={updating === map.id}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (adminLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) return null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Manage Map Visibility</h1>
            <p className="text-sm text-muted-foreground">
              Hidden maps are only visible to admins. Toggle visibility to show or hide maps from players.
            </p>
          </div>
        </div>

        <Tabs defaultValue="route-choice">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="route-choice" className="gap-2">
              <Map className="h-4 w-4" />
              Route Choice ({routeMaps.length})
            </TabsTrigger>
            <TabsTrigger value="route-finder" className="gap-2">
              <Route className="h-4 w-4" />
              Route Finder ({routeFinderMaps.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="route-choice" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Route Choice Maps</CardTitle>
                <CardDescription>Maps used in the Route Choice game</CardDescription>
              </CardHeader>
              <CardContent>
                {renderMapList(routeMaps, 'route_maps')}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="route-finder" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Route Finder Maps</CardTitle>
                <CardDescription>Maps used in the Route Finder game</CardDescription>
              </CardHeader>
              <CardContent>
                {renderMapList(routeFinderMaps, 'route_finder_maps')}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ManageMapVisibility;
