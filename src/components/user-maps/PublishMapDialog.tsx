import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Globe, Loader2, Upload, X, Image } from 'lucide-react';
import LocationPicker from '@/components/map/LocationPicker';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/context/UserContext';

interface PublishMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapId: string;
  mapName: string;
  onPublished: () => void;
}

interface LocationData {
  lat: number;
  lng: number;
  name: string;
}

const PublishMapDialog: React.FC<PublishMapDialogProps> = ({
  open,
  onOpenChange,
  mapId,
  mapName,
  onPublished,
}) => {
  const { user } = useUser();
  const [title, setTitle] = useState(mapName);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (PNG, JPG, etc.)',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Logo must be smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }
    
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const removeLogo = () => {
    setLogoFile(null);
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your map',
        variant: 'destructive',
      });
      return;
    }

    if (!location) {
      toast({
        title: 'Location required',
        description: 'Please select a location on the map',
        variant: 'destructive',
      });
      return;
    }

    setPublishing(true);
    try {
      // First, find the route_maps entry linked to this user_map
      const { data: routeMap, error: findError } = await supabase
        .from('route_maps')
        .select('id')
        .eq('source_map_id', mapId)
        .maybeSingle();

      if (findError) throw findError;

      if (!routeMap) {
        throw new Error('Route map not found. Please ensure the map has been processed.');
      }

      // Upload logo if provided
      let logoPath: string | null = null;
      if (logoFile && user) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${user.id}/${routeMap.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('map-logos')
          .upload(fileName, logoFile, { upsert: true });
        
        if (uploadError) {
          console.error('Logo upload error:', uploadError);
          throw new Error('Failed to upload logo');
        }
        
        logoPath = fileName;
      }

      // Update the route_maps entry to make it public
      const { error: updateError } = await supabase
        .from('route_maps')
        .update({
          name: title.trim(),
          description: description.trim() || null,
          is_public: true,
          map_category: 'community',
          latitude: location.lat,
          longitude: location.lng,
          location_name: location.name,
          ...(logoPath && { logo_path: logoPath }),
        })
        .eq('id', routeMap.id);

      if (updateError) throw updateError;

      toast({
        title: 'Map Published!',
        description: 'Your map is now available in the Community Maps section.',
      });

      onPublished();
      onOpenChange(false);
    } catch (error) {
      console.error('Error publishing map:', error);
      toast({
        title: 'Publishing failed',
        description: error instanceof Error ? error.message : 'Failed to publish map',
        variant: 'destructive',
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-500" />
            Share to Community
          </DialogTitle>
          <DialogDescription>
            Make your map available for other orienteers to practice with. 
            Once published, it will appear in the Community Maps section.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Map Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your map"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the terrain, difficulty, or any other relevant information..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Location *</Label>
            <LocationPicker
              value={location || undefined}
              onChange={setLocation}
            />
          </div>

          <div className="space-y-2">
            <Label>Map Logo (optional)</Label>
            <p className="text-xs text-muted-foreground">
              Add a logo or image to represent your map in the community browser
            </p>
            
            {logoPreview ? (
              <div className="relative w-24 h-24 rounded-lg border border-border overflow-hidden">
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="w-full h-full object-contain bg-muted"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <Image className="h-6 w-6" />
                <span className="text-xs">Add logo</span>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={publishing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePublish}
            disabled={publishing || !title.trim() || !location}
          >
            {publishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 mr-2" />
                Publish to Community
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PublishMapDialog;
