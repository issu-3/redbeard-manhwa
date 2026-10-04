import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let endpoint = process.env.R2_ENDPOINT?.trim() || '';
if (endpoint.startsWith('"') && endpoint.endsWith('"')) {
  endpoint = endpoint.slice(1, -1);
}
if (!endpoint) {
  console.error('CRITICAL: R2_ENDPOINT is undefined or empty!');
}

const r2 = (() => {
  try {
    return new S3Client({
      region: 'auto',
      endpoint: endpoint || 'https://dummy.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() || 'dummy',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() || 'dummy',
      },
    });
  } catch (e) {
    console.error('CRITICAL: Failed to init S3Client:', e);
    // return a dummy object that will throw on use but pass types
    return { send: async () => { throw e; } } as any as S3Client;
  }
})();

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'redbeard';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''; // e.g. https://pub-xxxx.r2.dev

export async function uploadToR2(filename: string, fileBuffer: Buffer | Uint8Array, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2.send(command);

  // If public URL is set, return it. Otherwise, return just the key for caching/presigning later.
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${filename}`;
  }
  return filename;
}

export async function deleteFromR2(fileUrl: string) {
  try {
    let filename = fileUrl;
    if (R2_PUBLIC_URL && fileUrl.startsWith(R2_PUBLIC_URL)) {
      filename = fileUrl.replace(`${R2_PUBLIC_URL}/`, '');
    } else if (fileUrl.startsWith('http')) {
      const urlParts = fileUrl.split('/');
      filename = urlParts.slice(urlParts.findIndex(p => p === BUCKET_NAME) + 1).join('/');
    }

    if (fileUrl.includes('public.blob.vercel-storage.com')) {
      console.warn('Cannot delete Vercel Blob URL from R2:', fileUrl);
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
    });

    await r2.send(command);
  } catch (error) {
    console.error('Failed to delete object from R2:', error);
  }
}

export async function getPresignedR2Url(key: string, expiresIn = 3600) {
  try {
    let filename = key;
    if (R2_PUBLIC_URL && key.startsWith(R2_PUBLIC_URL)) {
      filename = key.replace(`${R2_PUBLIC_URL}/`, '');
    } else if (key.startsWith('http')) {
      const urlParts = key.split('/');
      filename = urlParts.slice(urlParts.findIndex(p => p === BUCKET_NAME) + 1).join('/');
    }

    if (R2_PUBLIC_URL) {
      return `${R2_PUBLIC_URL}/${filename}`;
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
    });
    
    return await getSignedUrl(r2, command, { expiresIn });
  } catch (error) {
    console.error('Failed to generate presigned URL for R2:', error);
    return null;
  }
}

// Function to check if a cached object exists and return its URL
export async function getCachedObjectUrl(key: string) {
  try {
    const headCommand = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    // This will throw if the object does not exist
    await r2.send(headCommand);
    
    if (R2_PUBLIC_URL) {
      return `${R2_PUBLIC_URL}/${key}`;
    }
    
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    return await getSignedUrl(r2, getCommand, { expiresIn: 3600 });
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.error('Error checking R2 cache:', error);
    return null;
  }
}
