import React, { useState } from 'react';
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
import { Globe, Loader2 } from 'lucide-react';
import LocationPicker from '@/components/map/LocationPicker';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [title, setTitle] = useState(mapName);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [publishing, setPublishing] = useState(false);

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
