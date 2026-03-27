import React, { useState, useCallback } from 'react';
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { computeOptimalLength, DecisionPoint, Branch } from '@/utils/routeNavigatorUtils';

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

interface RawNode {
  id: number;
  x?: number;
  y?: number;
  r?: number;
  c?: number;
  branches: {
    to_macro: number;
    path: Array<{ r?: number; c?: number; x?: number; y?: number }>;
  }[];
}

interface RawChallenge {
  challenge_id: number;
  start: { x: number; y: number };
  finish: { x: number; y: number };
  bbox: { min_x: number; max_x: number; min_y: number; max_y: number };
  correct_node_sequence: number[];
}

interface MergedChallenge {
  challenge_id: number;
  start: { x: number; y: number };
  finish: { x: number; y: number };
  bbox: { min_x: number; max_x: number; min_y: number; max_y: number };
  decision_points: DecisionPoint[];
  optimal_length: number;
}

/** Convert r/c path points to x/y */
function convertPath(path: Array<{ r?: number; c?: number; x?: number; y?: number }>): { x: number; y: number }[] {
  return path.map(p => ({
    x: p.x ?? p.c ?? 0,
    y: p.y ?? p.r ?? 0,
  }));
}

/** Merge decision_points graph + challenges_routing into per-challenge decision_points with is_correct */
function mergeData(nodes: RawNode[], challenges: RawChallenge[]): MergedChallenge[] {
  // Build node lookup
  const nodeMap = new Map<number, RawNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const results: MergedChallenge[] = [];
  const warnings: string[] = [];

  for (const ch of challenges) {
    const seq = ch.correct_node_sequence;
    if (!seq || seq.length < 2) {
      warnings.push(`Challenge ${ch.challenge_id}: sequence too short`);
      continue;
    }

    // Build set of correct edges: nodeA -> nodeB
    const correctEdges = new Set<string>();
    for (let i = 0; i < seq.length - 1; i++) {
      correctEdges.add(`${seq[i]}->${seq[i + 1]}`);
    }

    // Collect all nodes that are in the correct sequence
    const seqNodeIds = new Set(seq);

    // Also collect all nodes reachable from sequence nodes (for wrong turns)
    const relevantNodeIds = new Set<number>(seqNodeIds);
    for (const nodeId of seqNodeIds) {
      const node = nodeMap.get(nodeId);
      if (node) {
        for (const b of node.branches) {
          relevantNodeIds.add(b.to_macro);
        }
      }
    }

    // Build decision points for this challenge
    const dp: DecisionPoint[] = [];
    for (const nodeId of relevantNodeIds) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      const branches: Branch[] = node.branches.map(b => ({
        to_macro: b.to_macro,
        path: convertPath(b.path),
        is_correct: correctEdges.has(`${nodeId}->${b.to_macro}`),
      }));

      dp.push({
        id: nodeId,
        x: node.x ?? node.c ?? 0,
        y: node.y ?? node.r ?? 0,
        branches,
      });
    }

    const start = ch.start;
    const finish = ch.finish;

    results.push({
      challenge_id: ch.challenge_id,
      start,
      finish,
      bbox: ch.bbox,
      decision_points: dp,
      optimal_length: computeOptimalLength(dp, start, finish),
    });
  }

  if (warnings.length > 0) {
    console.warn('Merge warnings:', warnings);
  }

  return results;
}

type Step = 'select' | 'configure' | 'uploading' | 'complete';

const RouteNavigatorUploadWizard: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('select');
  const [dpFile, setDpFile] = useState<File | null>(null);
  const [routingFile, setRoutingFile] = useState<File | null>(null);
  const [dpNodeCount, setDpNodeCount] = useState(0);
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [challenges, setChallenges] = useState<MergedChallenge[]>([]);
  const [mapName, setMapName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [imageWidth, setImageWidth] = useState<number>(0);
  const [imageHeight, setImageHeight] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rawNodes, setRawNodes] = useState<RawNode[]>([]);
  const [rawChallenges, setRawChallenges] = useState<RawChallenge[]>([]);

  const handleDpFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const nodes: RawNode[] = JSON.parse(text);
      if (!Array.isArray(nodes)) throw new Error('Expected an array of nodes');
      setRawNodes(nodes);
      setDpNodeCount(nodes.length);
      setDpFile(file);
    } catch (err) {
      setError(`Decision points parse error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }, []);

  const handleRoutingFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const chs: RawChallenge[] = JSON.parse(text);
      if (!Array.isArray(chs)) throw new Error('Expected an array of challenges');
      setRawChallenges(chs);
      setRoutingFile(file);

      // Derive map name from filename
      const name = file.name.replace(/_challenges_routing\.json$/i, '').replace(/\.json$/i, '');
      setMapName(name);
    } catch (err) {
      setError(`Routing parse error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }, []);

  const handleMergeAndContinue = useCallback(() => {
    if (rawNodes.length === 0 || rawChallenges.length === 0) return;
    setError(null);
    try {
      const merged = mergeData(rawNodes, rawChallenges);
      if (merged.length === 0) throw new Error('No valid challenges after merge');
      setChallenges(merged);
      setStep('configure');
    } catch (err) {
      setError(`Merge error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }, [rawNodes, rawChallenges]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceImageFile(file);
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
              Upload two JSON files: the decision points graph and the challenges routing file.
            </p>

            <div>
              <Label htmlFor="nav-dp-json">Decision Points JSON (full graph)</Label>
              <Input
                id="nav-dp-json"
                type="file"
                accept=".json"
                onChange={handleDpFileSelect}
                className="mt-1"
              />
              {dpFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  ✓ {dpNodeCount} nodes loaded
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="nav-routing-json">Challenges Routing JSON</Label>
              <Input
                id="nav-routing-json"
                type="file"
                accept=".json"
                onChange={handleRoutingFileSelect}
                className="mt-1"
              />
              {routingFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  ✓ {rawChallenges.length} challenges loaded
                </p>
              )}
            </div>

            <Button
              onClick={handleMergeAndContinue}
              disabled={rawNodes.length === 0 || rawChallenges.length === 0}
              className="w-full gap-2"
            >
              Merge & Continue
            </Button>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle className="h-4 w-4" />
              Merged {challenges.length} challenges from {dpNodeCount} nodes
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
