/**
 * Utilities for uploading files directly to Cloudflare R2 using presigned URLs
 */

export interface PresignedUrlResponse {
  upload_id: string;
  color_presigned_url: string;
  color_key: string;
  bw_presigned_url: string;
  bw_key: string;
  bucket: string;
}

/**
 * Get presigned URLs for uploading TIF files to R2
 */
export async function getPresignedUrls(
  userId: string,
  mapName: string
): Promise<PresignedUrlResponse> {
  const endpoint = import.meta.env.VITE_R2_PRESIGNED_ENDPOINT;
  
  if (!endpoint) {
    throw new Error('R2 presigned endpoint not configured. Set VITE_R2_PRESIGNED_ENDPOINT.');
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, map_name: mapName }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get presigned URLs: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Upload a file directly to R2 using a presigned URL
 * Supports progress tracking for large files
 */
export async function uploadToR2(
  presignedUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress?.(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', 'image/tiff');
    xhr.send(file);
  });
}

/**
 * Upload both color and B&W TIF files to R2
 * Returns the R2 keys for both files
 */
export async function uploadMapFilesToR2(
  userId: string,
  mapName: string,
  colorFile: File,
  bwFile: File,
  onProgress?: (colorPercent: number, bwPercent: number) => void
): Promise<{
  uploadId: string;
  colorKey: string;
  bwKey: string;
  bucket: string;
}> {
  // Step 1: Get presigned URLs from Modal
  const urls = await getPresignedUrls(userId, mapName);

  let colorProgress = 0;
  let bwProgress = 0;

  const updateProgress = () => {
    onProgress?.(colorProgress, bwProgress);
  };

  // Step 2: Upload both files in parallel
  await Promise.all([
    uploadToR2(urls.color_presigned_url, colorFile, (p) => {
      colorProgress = p;
      updateProgress();
    }),
    uploadToR2(urls.bw_presigned_url, bwFile, (p) => {
      bwProgress = p;
      updateProgress();
    }),
  ]);

  return {
    uploadId: urls.upload_id,
    colorKey: urls.color_key,
    bwKey: urls.bw_key,
    bucket: urls.bucket,
  };
}
