import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export async function cacheCoverImage(seriesId: string, imageUrl: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform() || !imageUrl) return null;

  try {
    const filename = `cover_${seriesId}.jpg`;
    
    // Check if it already exists
    try {
      const stat = await Filesystem.stat({
        path: `covers/${filename}`,
        directory: Directory.Cache
      });
      return Capacitor.convertFileSrc(stat.uri);
    } catch (e) {
      // File doesn't exist, proceed to download
    }

    // Ensure directory exists
    try {
      await Filesystem.mkdir({
        path: 'covers',
        directory: Directory.Cache,
        recursive: true
      });
    } catch (e) {
      // Might already exist
    }

    const fullPath = `covers/${filename}`;

    const { uri: absolutePath } = await Filesystem.getUri({
      path: fullPath,
      directory: Directory.Cache
    });

    const { FileTransfer } = await import('@capacitor/file-transfer');
    
    await FileTransfer.downloadFile({
      url: imageUrl,
      path: absolutePath,
    });

    // Check if it successfully downloaded
    const resultStat = await Filesystem.stat({
      path: fullPath,
      directory: Directory.Cache
    });
    return Capacitor.convertFileSrc(resultStat.uri);
  } catch (error) {
    console.error('Failed to cache cover image:', error);
    return null;
  }
}

export async function getCachedCoverUri(seriesId: string): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  
  try {
    const filename = `cover_${seriesId}.jpg`;
    const stat = await Filesystem.stat({
      path: `covers/${filename}`,
      directory: Directory.Cache
    });
    return Capacitor.convertFileSrc(stat.uri);
  } catch (e) {
    return null;
  }
}
