import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Map, Route, Clock, CheckCircle2, XCircle, Loader2, Trash2, RefreshCw, Crown,
  Globe, Lock, AlertTriangle, Pencil, Check, X, Eye, EyeOff, Image, MapPin, Flag, Play,
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useUserMaps, UserMap } from '@/hooks/useUserMaps';
import { useAdmin } from '@/hooks/useAdmin';
import UserMapUploadWizard from '@/components/user-maps/UserMapUploadWizard';
import PublicMapEditWizard from '@/components/user-maps/PublicMapEditWizard';
import AdminRequestDialog from '@/components/user-maps/AdminRequestDialog';
import RecoverMapButton from '@/components/user-maps/RecoverMapButton';
import { supabase } from '@/integrations/supabase/client';
import { useProAccess } from '@/hooks/useProAccess';
import { toast } from '@/components/ui/use-toast';
import { COUNTRIES, MAP_TYPES } from '@/components/admin/AdminMapCard';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STALE_THRESHOLD_MS = 10 * 60 * 1000;

interface ResultMap {
  id: string;
  name: string;
  is_public: boolean;
  is_hidden: boolean;
  map_category: string | null;
  country_code: string | null;
  location_name: string | null;
  description: string | null;
  logo_path?: string | null;
  map_type?: string | null;
  source_map_id: string | null;
  created_at: string;
}

const UserMaps: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const { userMaps, loading: sourceMapsLoading, fetchUserMaps, deleteUserMap } = useUserMaps();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { hasPro, loading: proLoading } = useProAccess();
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [showEditPublicMap, setShowEditPublicMap] = useState(false);
  const [showAdminRequest, setShowAdminRequest] = useState(false);
  const [deleteSourceMapId, setDeleteSourceMapId] = useState<string | null>(null);
  const [deleteResultMap, setDeleteResultMap] = useState<{ id: string; name: string; table: 'route_maps' | 'route_finder_maps' } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [routeChoiceMaps, setRouteChoiceMaps] = useState<ResultMap[]>([]);
  const [routeFinderMaps, setRouteFinderMaps] = useState<ResultMap[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);

  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const logoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (user) {
      fetchUserMaps();
      loadResultMaps();
    }
  }, [user]);

  const loadResultMaps = useCallback(async () => {
    if (!user) return;
    setLoadingResults(true);
    try {
      const [{ data: rc }, { data: rf }] = await Promise.all([
        supabase.from('route_maps')
          .select('id, name, is_public, is_hidden, map_category, country_code, location_name, description, logo_path, map_type, source_map_id, created_at')
          .eq('user_id', user.id)
          .or('map_category.eq.private,map_category.eq.community')
          .order('created_at', { ascending: false }),
        supabase.from('route_finder_maps')
          .select('id, name, is_public, is_hidden, map_category, country_code, location_name, description, source_map_id, created_at')
          .eq('user_id', user.id)
          .or('map_category.eq.private,map_category.eq.community')
          .order('created_at', { ascending: false }),
      ]);
      setRouteChoiceMaps((rc || []) as ResultMap[]);
      setRouteFinderMaps((rf || []) as ResultMap[]);
    } catch (err) {
      console.error('Error loading result maps:', err);
    } finally {
      setLoadingResults(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('user-maps-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_maps', filter: `user_id=eq.${user.id}` }, () => {
        fetchUserMaps();
        loadResultMaps();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchUserMaps, loadResultMaps]);

  useEffect(() => {
    if (!user) return;
    const processing = userMaps.filter(m => m.status === 'processing');
    if (processing.length === 0) return;
    const interval = setInterval(() => { fetchUserMaps(); loadResultMaps(); }, 30000);
    return () => clearInterval(interval);
  }, [user, userMaps, fetchUserMaps, loadResultMaps]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUserMaps(), loadResultMaps()]);
    setRefreshing(false);
  }, [fetchUserMaps, loadResultMaps]);

  const isMapStale = (map: UserMap): boolean => {
    if (map.status !== 'processing') return false;
    return Date.now() - new Date(map.updated_at).getTime() > STALE_THRESHOLD_MS;
  };

  const updateResultMap = async (table: 'route_maps' | 'route_finder_maps', id: string, data: Record<string, any>) => {
    const { error } = await supabase.from(table).update(data).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      loadResultMaps();
    }
    return error;
  };

  const saveName = async (table: 'route_maps' | 'route_finder_maps', id: string) => {
    if (!editNameValue.trim()) { setEditingName(null); return; }
    await updateResultMap(table, id, { name: editNameValue.trim() });
    setEditingName(null);
  };

  const toggleHidden = (table: 'route_maps' | 'route_finder_maps', map: ResultMap) => {
    if (map.map_category === 'community') {
      toast({ title: 'Cannot hide', description: 'Unpublish the map first to hide it.', variant: 'destructive' });
      return;
    }
    updateResultMap(table, map.id, { is_hidden: !map.is_hidden });
  };

  const publishToCommunity = (table: 'route_maps' | 'route_finder_maps', map: ResultMap) => {
    updateResultMap(table, map.id, { is_public: true, map_category: 'community', is_hidden: false });
    toast({ title: 'Published!', description: `${map.name} is now available in Community Maps.` });
  };

  const unpublishFromCommunity = (table: 'route_maps' | 'route_finder_maps', map: ResultMap) => {
    updateResultMap(table, map.id, { is_public: false, map_category: 'private' });
    toast({ title: 'Unpublished', description: `${map.name} is now private.` });
  };

  const handleDeleteSourceConfirm = async () => {
    if (deleteSourceMapId) {
      await deleteUserMap(deleteSourceMapId);
      setDeleteSourceMapId(null);
      loadResultMaps();
    }
  };

  const handleDeleteResultConfirm = async () => {
    if (!deleteResultMap) return;
    setDeleting(true);
    try {
      if (deleteResultMap.table === 'route_maps') {
        await supabase.from('route_images').delete().eq('map_id', deleteResultMap.id);
      } else {
        await supabase.from('route_finder_challenges').delete().eq('map_id', deleteResultMap.id);
      }
      const { error } = await supabase.from(deleteResultMap.table).delete().eq('id', deleteResultMap.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: `${deleteResultMap.name} has been deleted.` });
      loadResultMaps();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setDeleteResultMap(null);
    }
  };

  const handleLogoUpload = async (table: 'route_maps' | 'route_finder_maps', mapId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop();
    const path = `user/${mapId}.${ext}`;
    const { error: upErr } = await supabase.storage.from('map-logos').upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' });
      return;
    }
    await updateResultMap(table, mapId, { logo_path: path });
    toast({ title: 'Logo updated' });
  };

  const playMap = (table: 'route_maps' | 'route_finder_maps', map: ResultMap) => {
    if (table === 'route_maps') {
      const routeGameMapId = map.source_map_id || map.id;
      navigate(`/route-game?map=${encodeURIComponent(routeGameMapId)}`);
      return;
    }

    navigate(`/route-finder?map=${encodeURIComponent(map.id)}`);
  };

  if (userLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <Map className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in Required</h2>
            <p className="text-muted-foreground mb-4">Sign in to upload and manage your maps.</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showUploadWizard) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <UserMapUploadWizard
          onComplete={() => { setShowUploadWizard(false); fetchUserMaps(); loadResultMaps(); }}
          onCancel={() => setShowUploadWizard(false)}
        />
      </div>
    );
  }

  if (showEditPublicMap) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <PublicMapEditWizard
          onComplete={() => { setShowEditPublicMap(false); fetchUserMaps(); loadResultMaps(); }}
          onCancel={() => setShowEditPublicMap(false)}
        />
      </div>
    );
  }

  const renderMapCard = (map: ResultMap, table: 'route_maps' | 'route_finder_maps') => {
    const isCommunity = map.map_category === 'community';
    const isEditing = editingName === map.id;
    const isRouteChoice = table === 'route_maps';

    return (
      <Card key={map.id} className={map.is_hidden ? 'opacity-60' : ''}>
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left: name + badges */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-1 mb-1">
                  <Input
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && saveName(table, map.id)}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => saveName(table, map.id)}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingName(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm truncate">{map.name}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => { setEditingName(map.id); setEditNameValue(map.name); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {isCommunity ? (
                  <Badge className="bg-green-500/10 text-green-700 border-green-500/30">
                    <Globe className="h-3 w-3 mr-1" /> Published
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Lock className="h-3 w-3 mr-1" /> Private
                  </Badge>
                )}
                {map.is_hidden && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <EyeOff className="h-3 w-3 mr-1" /> Hidden
                  </Badge>
                )}
                {map.country_code && (() => {
                  const c = COUNTRIES.find(c => c.code === map.country_code);
                  return c ? <span className="text-xs text-muted-foreground">{c.flag} {c.code}</span> : null;
                })()}
                {map.map_type && isRouteChoice && (
                  <Badge variant="outline" className="text-xs py-0 h-5 capitalize">{map.map_type}</Badge>
                )}
                {map.location_name && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />{map.location_name}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(map.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {/* Country selector */}
              <Select
                value={map.country_code || ''}
                onValueChange={(val) => updateResultMap(table, map.id, { country_code: val || null })}
              >
                <SelectTrigger className="w-20 h-8 text-xs">
                  <SelectValue placeholder="🌍" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-1 text-xs">{c.flag} {c.code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Map type (route_maps only) */}
              {isRouteChoice && (
                <Select
                  value={map.map_type || 'forest'}
                  onValueChange={(val) => updateResultMap(table, map.id, { map_type: val })}
                >
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAP_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Logo upload (route_maps only) */}
              {isRouteChoice && (
                <>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => logoInputRefs.current[map.id]?.click()}>
                    {map.logo_path ? <Image className="h-4 w-4 text-primary" /> : <Flag className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <input
                    ref={el => { logoInputRefs.current[map.id] = el; }}
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleLogoUpload(table, map.id, e)}
                  />
                </>
              )}

              {/* Hide toggle (private only) */}
              {!isCommunity && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{map.is_hidden ? 'Hidden' : 'Visible'}</span>
                  <Switch checked={!map.is_hidden} onCheckedChange={() => toggleHidden(table, map)} />
                </div>
              )}

              {/* Publish / Unpublish */}
              {isCommunity ? (
                <Button size="sm" variant="outline" onClick={() => unpublishFromCommunity(table, map)}>
                  Make Private
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => publishToCommunity(table, map)} className="gap-1">
                  <Globe className="h-3 w-3" /> Publish
                </Button>
              )}

              {/* Play button */}
              <Button size="sm" variant="default" onClick={() => playMap(table, map)} className="gap-1">
                <Play className="h-3 w-3" /> Play
              </Button>

              {/* Delete */}
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteResultMap({ id: map.id, name: map.name, table })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const processingMaps = userMaps.filter(m => m.status === 'pending' || m.status === 'processing' || m.status === 'failed');

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Maps</h1>
          <p className="text-muted-foreground">Manage your orienteering maps</p>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin && !adminLoading && (
            <Button variant="outline" onClick={() => setShowAdminRequest(true)}>
              <Crown className="h-4 w-4 mr-2 text-yellow-500" />
              Request Admin
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowEditPublicMap(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Public Map
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowUploadWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Map
          </Button>
        </div>
      </div>

      {processingMaps.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processingMaps.map(map => (
                <div key={map.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{map.name}</span>
                    {map.status === 'pending' && <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>}
                    {map.status === 'processing' && <Badge><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processing</Badge>}
                    {map.status === 'failed' && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    {isMapStale(map) && user && (
                      <RecoverMapButton mapId={map.id} userId={user.id} onRecovered={() => { fetchUserMaps(); loadResultMaps(); }} />
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setDeleteSourceMapId(map.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="route-choice">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="route-choice" className="gap-2">
            <Map className="h-4 w-4" />
            Route Choice ({routeChoiceMaps.length})
          </TabsTrigger>
          <TabsTrigger value="route-finder" className="gap-2">
            <Route className="h-4 w-4" />
            Route Finder ({routeFinderMaps.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="route-choice" className="mt-4">
          {loadingResults ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : routeChoiceMaps.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Map className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No Route Choice maps yet. Upload a map to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {routeChoiceMaps.map(map => renderMapCard(map, 'route_maps'))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="route-finder" className="mt-4">
          {loadingResults ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : routeFinderMaps.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Route className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">No Route Finder maps yet. Upload a map to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {routeFinderMaps.map(map => renderMapCard(map, 'route_finder_maps'))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AdminRequestDialog open={showAdminRequest} onOpenChange={setShowAdminRequest} />

      {/* Delete source map dialog */}
      <AlertDialog open={!!deleteSourceMapId} onOpenChange={() => setDeleteSourceMapId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Source Map</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will delete the source files and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSourceConfirm} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete result map dialog */}
      <AlertDialog open={!!deleteResultMap} onOpenChange={() => setDeleteResultMap(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteResultMap?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this map and all its associated routes/challenges. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteResultConfirm} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserMaps;
