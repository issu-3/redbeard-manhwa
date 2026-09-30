import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'redbeard-images';
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''; // e.g. https://pub-xxxx.r2.dev

export async function uploadToR2(filename: string, fileBuffer: Buffer | Uint8Array, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: filename,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2.send(command);

  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${filename}`;
  }
  return `${process.env.R2_ENDPOINT}/${BUCKET_NAME}/${filename}`;
}

export async function deleteFromR2(fileUrl: string) {
  try {
    let filename = fileUrl;
    if (R2_PUBLIC_URL && fileUrl.startsWith(R2_PUBLIC_URL)) {
      filename = fileUrl.replace(`${R2_PUBLIC_URL}/`, '');
    } else {
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
