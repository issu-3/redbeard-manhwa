import { Pool } from '@neondatabase/serverless';

export interface ChapterResolution {
  type: 'fallback' | 'image' | 'not_found';
  imageUrl?: string;
}

export async function resolveChapterImage(
  chapterId: string, 
  pageIndex: number, 
  connectionString: string
): Promise<ChapterResolution> {
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing');
  }

  const pool = new Pool({ connectionString });
  
  try {
    // 1. Get chapter metadata
    const chapterRes = await pool.query(
      `SELECT id, "downloadUrl", "sourceType" FROM chapters WHERE id = $1`,
      [chapterId]
    );

    if (chapterRes.rows.length === 0) {
      return { type: 'not_found' };
    }

    const chapter = chapterRes.rows[0];

    // If downloadUrl is present, it's a CBZ/ZIP/TeraBox chapter. Fallback to Phase 2/Vercel.
    if (chapter.downloadUrl) {
      return { type: 'fallback' };
    }

    // 2. Fetch the individual image URL
    // The Vercel route checks 1-indexed first, then 0-indexed fallback
    let imageRes = await pool.query(
      `SELECT "imageUrl" FROM chapter_images WHERE "chapterId" = $1 AND "pageNumber" = $2`,
      [chapterId, pageIndex + 1]
    );

    if (imageRes.rows.length === 0) {
      // Fallback to 0-indexed
      imageRes = await pool.query(
        `SELECT "imageUrl" FROM chapter_images WHERE "chapterId" = $1 AND "pageNumber" = $2`,
        [chapterId, pageIndex]
      );
    }

    if (imageRes.rows.length === 0) {
      return { type: 'not_found' };
    }

    return { 
      type: 'image',
      imageUrl: imageRes.rows[0].imageUrl 
    };

  } finally {
    // Need to close the pool to prevent hanging the worker
    await pool.end();
  }
}
