import React, { useState, useRef } from 'react';
import { Eye, EyeOff, Pencil, Check, X, Image, Flag, MapPin, Trash2, Loader2 } from 'lucide-react';
import { convertTifToDataUrl } from '@/utils/tifUtils';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getPresignedUrls, uploadToR2 } from '@/utils/r2Upload';
import { useUser } from '@/context/UserContext';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const COUNTRIES = [
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
];

const MAP_TYPES = [
  { value: 'forest', label: 'Forest' },
  { value: 'sprint', label: 'Sprint' },
  { value: 'urban', label: 'Urban' },
  { value: 'park', label: 'Park' },
];

export { COUNTRIES, MAP_TYPES };

export interface AdminMapItem {
  id: string;
  name: string;
  is_hidden: boolean;
  is_public: boolean;
  map_category: string | null;
  country_code: string | null;
  map_type?: string | null;
  logo_path?: string | null;
  location_name?: string | null;
  description?: string | null;
  created_at?: string | null;
}

interface AdminMapCardProps {
  map: AdminMapItem;
  table: 'route_maps' | 'route_finder_maps' | 'route_navigator_maps';
  onUpdate: () => void;
  showDelete?: boolean;
}

const AdminMapCard: React.FC<AdminMapCardProps> = ({ map, table, onUpdate, showDelete = true }) => {
  const { user } = useUser();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(map.name);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bwInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBw, setUploadingBw] = useState(false);
  const [uploadingColor, setUploadingColor] = useState(false);

  const toggleVisibility = async () => {
    const { error } = await supabase
      .from(table)
      .update({ is_hidden: !map.is_hidden })
      .eq('id', map.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: map.is_hidden ? 'Map visible' : 'Map hidden' });
      onUpdate();
    }
  };

  const saveName = async () => {
    if (!name.trim() || name === map.name) {
      setEditing(false);
      setName(map.name);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from(table).update({ name: name.trim() }).eq('id', map.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setEditing(false);
      onUpdate();
    }
  };

  const updateField = async (field: string, value: string | null) => {
    const { error } = await supabase.from(table).update({ [field]: value }).eq('id', map.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || table !== 'route_maps') return;

    const ext = file.name.split('.').pop();
    const path = `admin/${map.id}.${ext}`;
    const { error: upErr } = await supabase.storage.from('map-logos').upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' });
      return;
    }
    await updateField('logo_path', path);
    toast({ title: 'Logo updated' });
  };

  const MAX_UPLOAD_SIZE = 500 * 1024 * 1024; // 500MB

  const handleBwUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || table !== 'route_maps' || !user) return;
    setUploadingBw(true);
    try {
      const isTiff = file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff');
      
      // Upload source file to R2
      const urls = await getPresignedUrls(user.id, `admin-bw-${map.id}`);
      await uploadToR2(urls.bw_presigned_url, file);
      
      // Update route_maps with R2 key
      const updateData: Record<string, any> = { bw_r2_key: urls.bw_key };
      
      // Generate browser-friendly preview and upload to route-images bucket
      let previewBlob: Blob;
      if (isTiff) {
        // Convert TIFF to PNG via canvas
        const dataUrl = await convertTifToDataUrl(file);
        const resp = await fetch(dataUrl);
        previewBlob = await resp.blob();
      } else {
        previewBlob = file;
      }
      const ext = isTiff ? 'png' : file.name.split('.').pop();
      const path = `bw/${map.id}.${ext}`;
      await supabase.storage.from('route-images').upload(path, previewBlob, { upsert: true, contentType: isTiff ? 'image/png' : file.type });
      const { data: urlData } = supabase.storage.from('route-images').getPublicUrl(path);
      updateData.impassability_image_url = urlData.publicUrl;
      
      await supabase.from(table).update(updateData).eq('id', map.id);
      toast({ title: 'B&W impassability image uploaded' });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingBw(false);
      if (bwInputRef.current) bwInputRef.current.value = '';
    }
  };

  const handleColorUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || table !== 'route_maps' || !user) return;
    setUploadingColor(true);
    try {
      const isTiff = file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff');
      
      // Upload source file to R2
      const urls = await getPresignedUrls(user.id, `admin-color-${map.id}`);
      await uploadToR2(urls.color_presigned_url, file);
      
      // Update route_maps with R2 key
      const updateData: Record<string, any> = { color_r2_key: urls.color_key };
      
      // Generate browser-friendly preview and upload to route-images bucket
      let previewBlob: Blob;
      if (isTiff) {
        const dataUrl = await convertTifToDataUrl(file);
        const resp = await fetch(dataUrl);
        previewBlob = await resp.blob();
      } else {
        previewBlob = file;
      }
      const ext = isTiff ? 'png' : file.name.split('.').pop();
      const path = `color/${map.id}.${ext}`;
      await supabase.storage.from('route-images').upload(path, previewBlob, { upsert: true, contentType: isTiff ? 'image/png' : file.type });
      const { data: urlData } = supabase.storage.from('route-images').getPublicUrl(path);
      updateData.color_image_url = urlData.publicUrl;
      
      await supabase.from(table).update(updateData).eq('id', map.id);
      toast({ title: 'Color map image uploaded' });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingColor(false);
      if (colorInputRef.current) colorInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (table === 'route_maps') {
        const { error: riErr } = await supabase.from('route_images').delete().eq('map_id', map.id);
        if (riErr) throw new Error(`Failed to delete route images: ${riErr.message}`);
      } else if (table === 'route_finder_maps') {
        // Delete attempts referencing these challenges first
        const { data: cIds } = await supabase.from('route_finder_challenges').select('id').eq('map_id', map.id);
        if (cIds && cIds.length > 0) {
          const { error: aErr } = await supabase.from('route_finder_attempts').delete().in('challenge_id', cIds.map(c => c.id));
          if (aErr) console.warn('Failed to delete finder attempts:', aErr.message);
        }
        const { error: cErr } = await supabase.from('route_finder_challenges').delete().eq('map_id', map.id);
        if (cErr) throw new Error(`Failed to delete finder challenges: ${cErr.message}`);
      } else if (table === 'route_navigator_maps') {
        // Delete attempts referencing these challenges first
        const { data: cIds } = await supabase.from('route_navigator_challenges').select('id').eq('map_id', map.id);
        if (cIds && cIds.length > 0) {
          const { error: aErr } = await supabase.from('route_navigator_attempts').delete().in('challenge_id', cIds.map(c => c.id));
          if (aErr) console.warn('Failed to delete navigator attempts:', aErr.message);
        }
        const { error: cErr } = await supabase.from('route_navigator_challenges').delete().eq('map_id', map.id);
        if (cErr) throw new Error(`Failed to delete navigator challenges: ${cErr.message}`);
      }
      const { error } = await supabase.from(table).delete().eq('id', map.id);
      if (error) throw error;
      toast({ title: 'Deleted', description: `${map.name} has been deleted.` });
      onUpdate();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete map', variant: 'destructive' });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const countryInfo = COUNTRIES.find(c => c.code === map.country_code);

  return (
    <>
      <div className={`flex items-center gap-3 p-3 rounded-lg border ${map.is_hidden ? 'bg-muted/50 border-dashed' : 'bg-card'}`}>
        {map.is_hidden ? (
          <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <Eye className="h-4 w-4 text-primary shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-7 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveName} disabled={saving}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(false); setName(map.name); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`font-medium text-sm truncate ${map.is_hidden ? 'text-muted-foreground' : ''}`}>
                {map.name}
              </span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)}>
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {countryInfo && (
              <span className="text-xs text-muted-foreground">{countryInfo.flag} {countryInfo.code}</span>
            )}
            {map.map_category && (
              <Badge variant="outline" className="text-xs py-0 h-5">{map.map_category}</Badge>
            )}
            {map.location_name && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />{map.location_name}
              </span>
            )}
            {map.created_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(map.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <Select
          value={map.country_code || ''}
          onValueChange={(val) => updateField('country_code', val || null)}
        >
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(c => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-1 text-xs">{c.flag} {c.code}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {'map_type' in map && table === 'route_maps' && (
          <Select
            value={(map as any).map_type || 'forest'}
            onValueChange={(val) => updateField('map_type', val)}
          >
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAP_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {table === 'route_maps' && (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => logoInputRef.current?.click()} title="Upload logo">
              {map.logo_path ? <Image className="h-4 w-4 text-primary" /> : <Flag className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Button
              size="sm"
              variant={(map as any).impassability_image_url ? 'outline' : 'ghost'}
              className="h-8 text-xs"
              onClick={() => bwInputRef.current?.click()}
              disabled={uploadingBw}
              title="Upload B&W impassability image"
            >
              {uploadingBw ? <Loader2 className="h-3 w-3 animate-spin" /> : (map as any).impassability_image_url ? '✓ B&W' : 'B&W'}
            </Button>
            <input ref={bwInputRef} type="file" accept="image/png,image/tiff" className="hidden" onChange={handleBwUpload} />
            <Button
              size="sm"
              variant={(map as any).color_image_url ? 'outline' : 'ghost'}
              className="h-8 text-xs"
              onClick={() => colorInputRef.current?.click()}
              disabled={uploadingColor}
              title="Upload full color map image"
            >
              {uploadingColor ? <Loader2 className="h-3 w-3 animate-spin" /> : (map as any).color_image_url ? '✓ Color' : 'Color'}
            </Button>
            <input ref={colorInputRef} type="file" accept="image/*" className="hidden" onChange={handleColorUpload} />
          </>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{map.is_hidden ? 'Hidden' : 'Visible'}</span>
          <Switch checked={!map.is_hidden} onCheckedChange={toggleVisibility} />
        </div>

        {showDelete && (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{map.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this map and all its associated routes/challenges. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminMapCard;
