import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Map, Route, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import AdminMapCard, { type AdminMapItem } from '@/components/admin/AdminMapCard';
import MapUploadWizard from '@/components/admin/MapUploadWizard';
import RouteFinderUploadWizard from '@/components/admin/RouteFinderUploadWizard';
import Layout from '@/components/Layout';

const AdminMapManager: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [routeMaps, setRouteMaps] = useState<AdminMapItem[]>([]);
  const [routeFinderMaps, setRouteFinderMaps] = useState<AdminMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRCUpload, setShowRCUpload] = useState(false);
  const [showRFUpload, setShowRFUpload] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) navigate('/');
  }, [isAdmin, adminLoading, navigate]);

  const loadMaps = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: rm }, { data: rfm }] = await Promise.all([
        supabase.from('route_maps')
          .select('id, name, is_hidden, is_public, map_category, country_code, map_type, logo_path, location_name, description, created_at')
          .or('map_category.eq.official,map_category.is.null')
          .order('name'),
        supabase.from('route_finder_maps')
          .select('id, name, is_hidden, is_public, map_category, country_code, location_name, description, created_at')
          .or('map_category.eq.official,map_category.is.null')
          .order('name'),
      ]);
      setRouteMaps((rm || []) as AdminMapItem[]);
      setRouteFinderMaps((rfm || []) as AdminMapItem[]);
    } catch (err) {
      console.error('Error loading maps:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadMaps();
  }, [isAdmin, loadMaps]);

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
      <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Admin Map Manager</h1>
            <p className="text-sm text-muted-foreground">
              Manage official maps — upload, rename, set visibility, logos and metadata.
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

          {/* Route Choice Tab */}
          <TabsContent value="route-choice" className="mt-4 space-y-4">
            {/* Upload section */}
            <div>
              <Button
                variant={showRCUpload ? 'secondary' : 'outline'}
                onClick={() => setShowRCUpload(!showRCUpload)}
                className="gap-2"
              >
                {showRCUpload ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showRCUpload ? 'Hide Upload' : 'Upload New Map'}
              </Button>
              {showRCUpload && (
                <div className="mt-4">
                  <MapUploadWizard />
                </div>
              )}
            </div>

            {/* Map list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Official Route Choice Maps</CardTitle>
                <CardDescription>Toggle visibility, rename, set country and type</CardDescription>
              </CardHeader>
              <CardContent>
                {routeMaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No official maps found.</p>
                ) : (
                  <div className="space-y-2">
                    {routeMaps.map(map => (
                      <AdminMapCard key={map.id} map={map} table="route_maps" onUpdate={loadMaps} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Route Finder Tab */}
          <TabsContent value="route-finder" className="mt-4 space-y-4">
            {/* Upload section */}
            <div>
              <Button
                variant={showRFUpload ? 'secondary' : 'outline'}
                onClick={() => setShowRFUpload(!showRFUpload)}
                className="gap-2"
              >
                {showRFUpload ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showRFUpload ? 'Hide Upload' : 'Upload New Map'}
              </Button>
              {showRFUpload && (
                <div className="mt-4">
                  <RouteFinderUploadWizard onComplete={() => { setShowRFUpload(false); loadMaps(); }} />
                </div>
              )}
            </div>

            {/* Map list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Official Route Finder Maps</CardTitle>
                <CardDescription>Toggle visibility, rename, set country</CardDescription>
              </CardHeader>
              <CardContent>
                {routeFinderMaps.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No official maps found.</p>
                ) : (
                  <div className="space-y-2">
                    {routeFinderMaps.map(map => (
                      <AdminMapCard key={map.id} map={map} table="route_finder_maps" onUpdate={loadMaps} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminMapManager;
