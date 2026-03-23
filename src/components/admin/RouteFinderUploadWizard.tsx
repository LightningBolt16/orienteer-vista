import React, { useState, useCallback } from 'react';
import { FolderOpen, Upload, CheckCircle, XCircle, Loader2, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const COUNTRIES = [
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
];

interface ChallengeData {
  challenge_index: number;
  graph_data: any;
  start_node_id: string;
  finish_node_id: string;
  optimal_path: any;
  optimal_length: number;
  base_image_path: string;
  answer_image_path: string;
  difficulty_score?: number;
  impassability_mask_path?: string;
  bbox_width?: number;
  bbox_height?: number;
  safe_zone?: { x: number; y: number; width: number; height: number };
}

interface FolderValidation {
  isValid: boolean;
  mapName: string;
  jsonFile: File | null;
  challenges: ChallengeData[];
  imageFiles: Map<string, File>; // filename -> File
  errors: string[];
}

type Step = 'select' | 'validate' | 'upload' | 'complete';

const RouteFinderUploadWizard: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('select');
  const [validation, setValidation] = useState<FolderValidation | null>(null);
  const [mapName, setMapName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });

  const validateFolder = useCallback(async (files: FileList) => {
    const result: FolderValidation = {
      isValid: false, mapName: '', jsonFile: null, challenges: [],
      imageFiles: new Map(), errors: [],
    };

    const fileArray = Array.from(files);
    
    // Find JSON file
    const jsonFiles = fileArray.filter(f => f.name.endsWith('.json') && f.name.includes('finder_challenges'));
    if (jsonFiles.length === 0) {
      result.errors.push('No *_finder_challenges.json file found');
    } else {
      result.jsonFile = jsonFiles[0];
      // Extract map name from JSON filename
      const match = jsonFiles[0].name.match(/^(.+?)_finder_challenges\.json$/);
      result.mapName = match ? match[1] : jsonFiles[0].name.replace('.json', '');
    }

    // Find image files in 1_1/ subdirectory
    const imageFiles = fileArray.filter(f => {
      const path = f.webkitRelativePath || f.name;
      return path.includes('1_1/') && (f.name.endsWith('.webp') || f.name.endsWith('.png'));
    });

    for (const file of imageFiles) {
      result.imageFiles.set(file.name, file);
    }

    // Parse JSON
    if (result.jsonFile) {
      try {
        const text = await result.jsonFile.text();
        const parsed = JSON.parse(text);
        const challenges = Array.isArray(parsed) ? parsed : parsed.challenges || [];
        result.challenges = challenges;

        // Validate each challenge has required fields
        for (const c of challenges) {
          if (!c.graph_data || !c.start_node_id || !c.finish_node_id || !c.optimal_path) {
            result.errors.push(`Challenge ${c.challenge_index}: missing required fields`);
          }
          // Check corresponding image files exist
          const baseName = c.base_image_path?.split('/').pop();
          const answerName = c.answer_image_path?.split('/').pop();
          if (baseName && !result.imageFiles.has(baseName)) {
            result.errors.push(`Missing image: ${baseName}`);
          }
          if (answerName && !result.imageFiles.has(answerName)) {
            result.errors.push(`Missing image: ${answerName}`);
          }
        }
      } catch (e) {
        result.errors.push('Failed to parse JSON file');
      }
    }

    result.isValid = result.errors.length === 0 && result.challenges.length > 0;
    return result;
  }, []);

  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const result = await validateFolder(files);
    setValidation(result);
    setMapName(result.mapName);
    setStep('validate');
  }, [validateFolder]);

  const handleUpload = useCallback(async () => {
    if (!validation || !validation.isValid) return;
    setStep('upload');

    const totalImages = validation.imageFiles.size;
    setProgress({ current: 0, total: totalImages + 2, message: 'Creating map record...' });

    try {
      // 1. Create route_finder_maps record
      const { data: rfMap, error: mapErr } = await supabase.from('route_finder_maps').insert({
        name: mapName.trim() || validation.mapName,
        is_public: true,
        map_category: 'official',
        country_code: countryCode || null,
        description: `Route Finder map with ${validation.challenges.length} challenges`,
      }).select().single();

      if (mapErr || !rfMap) throw mapErr || new Error('Failed to create map');
      setProgress(p => ({ ...p, current: 1, message: 'Uploading images...' }));

      // 2. Upload all images to route-images bucket
      let uploaded = 0;
      for (const [filename, file] of validation.imageFiles) {
        const storagePath = `${rfMap.id}/1_1/${filename}`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const contentType = filename.endsWith('.png') ? 'image/png' : 'image/webp';
        const { error: upErr } = await supabase.storage.from('user-route-images')
          .upload(storagePath, bytes, { contentType, upsert: true });
        if (upErr) console.error('Upload error for', filename, upErr);
        uploaded++;
        setProgress(p => ({ ...p, current: 1 + uploaded, message: `Uploading images... (${uploaded}/${totalImages})` }));
      }

      // 3. Insert challenges
      setProgress(p => ({ ...p, message: 'Saving challenges...' }));
      const challengeRecords = validation.challenges.map((c, i) => {
        // Rewrite image paths to point to storage
        const baseName = c.base_image_path?.split('/').pop() || `challenge_${i}_base.webp`;
        const answerName = c.answer_image_path?.split('/').pop() || `challenge_${i}_answer.webp`;
        const maskName = c.impassability_mask_path?.split('/').pop();

        return {
          map_id: rfMap.id,
          challenge_index: c.challenge_index ?? i,
          graph_data: c.graph_data,
          start_node_id: c.start_node_id,
          finish_node_id: c.finish_node_id,
          optimal_path: c.optimal_path,
          optimal_length: c.optimal_length,
          base_image_path: `${rfMap.id}/1_1/${baseName}`,
          answer_image_path: `${rfMap.id}/1_1/${answerName}`,
          aspect_ratio: '1_1',
          difficulty_score: c.difficulty_score || null,
          impassability_mask_path: maskName ? `${rfMap.id}/1_1/${maskName}` : null,
          bbox_width: c.bbox_width || null,
          bbox_height: c.bbox_height || null,
          safe_zone: c.safe_zone || null,
        };
      });

      const { error: insertErr } = await supabase.from('route_finder_challenges').insert(challengeRecords);
      if (insertErr) throw insertErr;

      setProgress({ current: totalImages + 2, total: totalImages + 2, message: 'Complete!' });
      setStep('complete');
      toast({ title: 'Upload Complete', description: `${validation.challenges.length} challenges uploaded for ${mapName}` });
    } catch (err: any) {
      console.error('Route Finder upload error:', err);
      toast({ title: 'Upload Failed', description: err.message || JSON.stringify(err), variant: 'destructive' });
      setStep('validate');
    }
  }, [validation, mapName, countryCode]);

  const handleReset = () => {
    setStep('select');
    setValidation(null);
    setMapName('');
    setCountryCode('');
    setProgress({ current: 0, total: 0, message: '' });
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-5 w-5" />
              Upload Route Finder Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-2">Select a Route Finder exports folder:</p>
              <pre className="text-xs bg-muted p-3 rounded-md inline-block text-left mb-4">
{`exports_finder/{MapName}/
  ├── 1_1/
  │   ├── challenge_0_base.webp
  │   ├── challenge_0_answer.webp
  │   └── ...
  └── {MapName}_finder_challenges.json`}
              </pre>
              <div>
                <input
                  type="file"
                  id="rf-folder-input"
                  className="hidden"
                  {...{ webkitdirectory: '', directory: '' } as any}
                  onChange={handleFolderSelect}
                />
                <Button onClick={() => document.getElementById('rf-folder-input')?.click()}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Select Folder
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'validate' && validation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {validation.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              Validation {validation.isValid ? 'Passed' : 'Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium text-sm">Challenges</span>
                </div>
                <p className="text-lg">{validation.challenges.length}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-1.5 mb-1">
                  <Image className="h-4 w-4" />
                  <span className="font-medium text-sm">Images</span>
                </div>
                <p className="text-lg">{validation.imageFiles.size}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <span className="font-medium text-sm">Safe Zones</span>
                <p className="text-lg">{validation.challenges.filter(c => c.safe_zone).length}</p>
              </div>
            </div>

            {validation.errors.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <ul className="list-disc list-inside text-sm text-destructive">
                  {validation.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                  {validation.errors.length > 10 && <li>...and {validation.errors.length - 10} more</li>}
                </ul>
              </div>
            )}

            {validation.isValid && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg border">
                <div className="space-y-1.5">
                  <Label>Map Name</Label>
                  <Input value={mapName} onChange={(e) => setMapName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="flex items-center gap-1">{c.flag} {c.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>Back</Button>
              <Button onClick={handleUpload} disabled={!validation.isValid}>Upload</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={pct} className="h-3" />
            <p className="text-sm text-muted-foreground">{progress.message}</p>
          </CardContent>
        </Card>
      )}

      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Upload Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={() => { handleReset(); onComplete?.(); }}>Upload Another</Button>
              <Button variant="outline" onClick={() => onComplete?.()}>Done</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RouteFinderUploadWizard;
