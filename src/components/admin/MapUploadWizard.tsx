import React, { useState, useCallback } from 'react';
import { Upload, CheckCircle, XCircle, Loader2, FolderOpen, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMapUpload } from '@/hooks/useMapUpload';
import { toast } from '@/components/ui/use-toast';

interface FolderValidation {
  isValid: boolean;
  mapName: string;
  csvFile: File | null;
  images16_9: File[];
  images9_16: File[];
  parsedRoutes: Array<{
    candidateIndex: number;
    mainSide: string;
    mainLength: number;
    altLength: number;
  }>;
  errors: string[];
}

const MapUploadWizard: React.FC = () => {
  const [step, setStep] = useState<'select' | 'validate' | 'upload' | 'complete'>('select');
  const [validation, setValidation] = useState<FolderValidation | null>(null);
  const { progress, validateFolder, uploadMap, reset } = useMapUpload();

  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStep('validate');
    const result = await validateFolder(files);
    setValidation(result);
  }, [validateFolder]);

  const handleUpload = useCallback(async () => {
    if (!validation || !validation.isValid) return;

    setStep('upload');
    try {
      await uploadMap(validation);
      setStep('complete');
      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${validation.mapName} with ${validation.parsedRoutes.length} routes.`
      });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  }, [validation, uploadMap]);

  const handleReset = useCallback(() => {
    setStep('select');
    setValidation(null);
    reset();
  }, [reset]);

  const progressPercentage = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {['select', 'validate', 'upload', 'complete'].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === s 
                ? 'bg-primary text-primary-foreground' 
                : ['select', 'validate', 'upload', 'complete'].indexOf(step) > i
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            {i < 3 && <div className="w-12 h-0.5 bg-muted" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step: Select Folder */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Select Map Folder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Select a folder with the following structure:
              </p>
              <pre className="text-xs text-left bg-muted p-3 rounded-md mb-4 inline-block">
{`{MapName}/
  ├── 16_9/
  │   └── candidate_1.webp ... candidate_N.webp
  ├── 9_16/
  │   └── candidate_1.webp ... candidate_N.webp
  └── {MapName}.csv`}
              </pre>
              <div>
                <input
                  type="file"
                  id="folder-input"
                  className="hidden"
                  {...{ webkitdirectory: '', directory: '' } as any}
                  onChange={handleFolderSelect}
                />
                <Button onClick={() => document.getElementById('folder-input')?.click()}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Select Folder
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Validate */}
      {step === 'validate' && validation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validation.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              Validation {validation.isValid ? 'Passed' : 'Failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="h-4 w-4" />
                  <span className="font-medium">Map Name</span>
                </div>
                <p className="text-lg">{validation.mapName}</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">CSV Routes</span>
                </div>
                <p className="text-lg">{validation.parsedRoutes.length} routes</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="h-4 w-4" />
                  <span className="font-medium">16:9 Images</span>
                </div>
                <p className="text-lg">{validation.images16_9.length} files</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Image className="h-4 w-4" />
                  <span className="font-medium">9:16 Images</span>
                </div>
                <p className="text-lg">{validation.images9_16.length} files</p>
              </div>
            </div>

            {validation.errors.length > 0 && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="font-medium text-destructive mb-2">Errors:</p>
                <ul className="list-disc list-inside text-sm text-destructive">
                  {validation.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.parsedRoutes.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">CSV Preview (first 5 routes):</p>
                <div className="text-xs overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left">
                        <th className="pr-4">ID</th>
                        <th className="pr-4">Side</th>
                        <th className="pr-4">Main Length</th>
                        <th className="pr-4">Alt Length</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validation.parsedRoutes.slice(0, 5).map((route) => (
                        <tr key={route.candidateIndex}>
                          <td className="pr-4">{route.candidateIndex}</td>
                          <td className="pr-4">{route.mainSide}</td>
                          <td className="pr-4">{route.mainLength.toFixed(1)}</td>
                          <td className="pr-4">{route.altLength.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>
                Back
              </Button>
              <Button 
                onClick={handleUpload} 
                disabled={!validation.isValid}
              >
                Start Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Upload Progress */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressPercentage} className="h-3" />
            <p className="text-sm text-muted-foreground">{progress.message}</p>
            
            {progress.stage === 'error' && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive">{progress.message}</p>
                <Button variant="outline" onClick={handleReset} className="mt-2">
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Upload Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{progress.message}</p>
            
            <div className="flex gap-2">
              <Button onClick={handleReset}>
                Upload Another Map
              </Button>
              <Button variant="outline" asChild>
                <a href="/route-game">Test Routes</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MapUploadWizard;
