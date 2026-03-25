import React, { useState, useCallback } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { computeOptimalLength, DecisionPoint } from '@/utils/routeNavigatorUtils';

const COUNTRIES = [
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
];

interface ParsedChallenge {
  challenge_id: number;
  start: { x: number; y: number };
  finish: { x: number; y: number };
  bbox: { min_x: number; max_x: number; min_y: number; max_y: number };
  decision_points: DecisionPoint[];
  optimal_length?: number;
}

type Step = 'select' | 'configure' | 'uploading' | 'complete';

const RouteNavigatorUploadWizard: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('select');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [challenges, setChallenges] = useState<ParsedChallenge[]>([]);
  const [mapName, setMapName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [imageWidth, setImageWidth] = useState<number>(0);
  const [imageHeight, setImageHeight] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleJsonSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const arr = Array.isArray(raw) ? raw : [raw];

      const parsed: ParsedChallenge[] = arr.map((c: any) => {
        // Strip optimal_path, keep only decision_points
        const dp: DecisionPoint[] = (c.decision_points || []).map((d: any) => ({
          id: d.id,
          x: d.x,
          y: d.y,
          branches: (d.branches || []).map((b: any) => ({
            to_macro: b.to_macro,
            path: b.path || [],
            is_correct: b.is_correct || false,
          })),
        }));

        const start = { x: c.start?.x || 0, y: c.start?.y || 0 };
        const finish = { x: c.finish?.x || 0, y: c.finish?.y || 0 };

        return {
          challenge_id: c.challenge_id || c.challenge_index || 0,
          start,
          finish,
          bbox: c.bbox || { min_x: 0, max_x: 0, min_y: 0, max_y: 0 },
          decision_points: dp,
          optimal_length: c.optimal_length || computeOptimalLength(dp, start, finish),
        };
      });

      setChallenges(parsed);
      setJsonFile(file);

      // Derive map name from filename
      const name = file.name.replace(/_challenges_routing\.json$/i, '').replace(/\.json$/i, '');
      setMapName(name);
      setStep('configure');
    } catch (err) {
      setError(`Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceImageFile(file);

    // Read image dimensions
    const img = new Image();
    img.onload = () => {
      setImageWidth(img.naturalWidth);
      setImageHeight(img.naturalHeight);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!mapName || challenges.length === 0) return;
    setStep('uploading');
    setUploadProgress(0);

    try {
      // 1. Upload source image if provided
      let sourceImageUrl: string | null = null;
      if (sourceImageFile) {
        const ext = sourceImageFile.name.split('.').pop() || 'webp';
        const imagePath = `navigator/${mapName.toLowerCase()}/source.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('user-route-images')
          .upload(imagePath, sourceImageFile, { upsert: true, contentType: sourceImageFile.type });
        if (uploadErr) throw new Error(`Image upload failed: ${uploadErr.message}`);

        const { data: urlData } = supabase.storage.from('user-route-images').getPublicUrl(imagePath);
        sourceImageUrl = urlData.publicUrl;
      }
      setUploadProgress(10);

      // 2. Create map entry
      const { data: mapData, error: mapErr } = await supabase
        .from('route_navigator_maps')
        .insert({
          name: mapName,
          source_image_url: sourceImageUrl,
          image_width: imageWidth || null,
          image_height: imageHeight || null,
          map_category: 'official',
          is_public: true,
          is_hidden: false,
          country_code: countryCode || null,
        })
        .select('id')
        .single();

      if (mapErr) throw new Error(`Map creation failed: ${mapErr.message}`);
      setUploadProgress(20);

      // 3. Insert challenges in batches
      const mapId = mapData.id;
      const batchSize = 20;
      for (let i = 0; i < challenges.length; i += batchSize) {
        const batch = challenges.slice(i, i + batchSize).map((c) => ({
          map_id: mapId,
          challenge_index: c.challenge_id,
          start_x: c.start.x,
          start_y: c.start.y,
          finish_x: c.finish.x,
          finish_y: c.finish.y,
          bbox: c.bbox,
          decision_points: c.decision_points as any,
          optimal_length: c.optimal_length || null,
        }));

        const { error: insertErr } = await supabase
          .from('route_navigator_challenges')
          .insert(batch);
        if (insertErr) throw new Error(`Challenge insert failed: ${insertErr.message}`);

        setUploadProgress(20 + Math.round(((i + batchSize) / challenges.length) * 80));
      }

      setUploadProgress(100);
      setStep('complete');
      toast({ title: 'Upload complete', description: `${challenges.length} challenges uploaded for "${mapName}"` });
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('configure');
    }
  }, [mapName, challenges, sourceImageFile, imageWidth, imageHeight, countryCode, onComplete]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Upload Route Navigator Map</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
            <XCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the challenges routing JSON file (e.g. Matera_challenges_routing.json).
              The optimal_path arrays will be stripped automatically.
            </p>
            <div>
              <Label htmlFor="nav-json">Challenges JSON</Label>
              <Input
                id="nav-json"
                type="file"
                accept=".json"
                onChange={handleJsonSelect}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="h-4 w-4" />
              Parsed {challenges.length} challenges
            </div>

            <div>
              <Label>Map Name</Label>
              <Input value={mapName} onChange={(e) => setMapName(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label>Country</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nav-image">Source Map Image (full resolution)</Label>
              <Input
                id="nav-image"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="mt-1"
              />
              {imageWidth > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{imageWidth} × {imageHeight}px</p>
              )}
            </div>

            <Button onClick={handleUpload} disabled={!mapName || challenges.length === 0} className="w-full gap-2">
              <Upload className="h-4 w-4" />
              Upload {challenges.length} Challenges
            </Button>
          </div>
        )}

        {step === 'uploading' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Uploading...</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {step === 'complete' && (
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Upload complete! {challenges.length} challenges added.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RouteNavigatorUploadWizard;
