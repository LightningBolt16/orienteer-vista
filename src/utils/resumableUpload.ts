import * as tus from 'tus-js-client';
import { supabase } from '@/integrations/supabase/client';

interface UploadOptions {
  bucketName: string;
  fileName: string;
  file: File;
  onProgress?: (percentage: number) => void;
}

export async function uploadLargeFile({
  bucketName,
  fileName,
  file,
  onProgress,
}: UploadOptions): Promise<{ path: string } | { error: Error }> {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;

  if (!accessToken) {
    return { error: new Error('Not authenticated') };
  }

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: bucketName,
        objectName: fileName,
        contentType: file.type || 'image/tiff',
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // Must be 6MB for Supabase
      onError: (error) => {
        console.error('Resumable upload failed:', error);
        reject({ error: new Error(error.message) });
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
        onProgress?.(percentage);
      },
      onSuccess: () => {
        resolve({ path: fileName });
      },
    });

    upload.start();
  });
}
