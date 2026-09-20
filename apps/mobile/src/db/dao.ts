import { getDB } from './connection';

export interface Series {
  id: string;
  slug: string;
  title: string;
  cover?: string | null;
  synopsis?: string | null;
  author?: string | null;
  artist?: string | null;
  status?: string | null;
  type?: string | null;
  genres?: string | null;
  bookmarked: boolean;
  updatedAt: number;
}

export const SeriesDAO = {
  async getAllBookmarked(): Promise<Series[]> {
    const db = await getDB();
    const res = await db.query('SELECT * FROM series WHERE bookmarked = 1 ORDER BY updatedAt DESC');
    return res.values?.map(row => ({
      ...row,
      bookmarked: row.bookmarked === 1,
    })) as Series[] || [];
  },

  async getAll(limit: number = 50): Promise<Series[]> {
    const db = await getDB();
    const res = await db.query('SELECT * FROM series ORDER BY updatedAt DESC LIMIT ?', [limit]);
    return res.values?.map(row => ({
      ...row,
      bookmarked: row.bookmarked === 1,
    })) as Series[] || [];
  },

  async search(query: string, limit: number = 50): Promise<Series[]> {
    const db = await getDB();
    const res = await db.query('SELECT * FROM series WHERE title LIKE ? ORDER BY updatedAt DESC LIMIT ?', [`%${query}%`, limit]);
    return res.values?.map(row => ({
      ...row,
      bookmarked: row.bookmarked === 1,
    })) as Series[] || [];
  },

  async upsert(series: Series): Promise<void> {
    const db = await getDB();
    const sql = `
      INSERT INTO series (id, slug, title, cover, synopsis, author, artist, status, type, genres, bookmarked, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        title = excluded.title,
        cover = excluded.cover,
        synopsis = excluded.synopsis,
        author = excluded.author,
        artist = excluded.artist,
        status = excluded.status,
        type = excluded.type,
        genres = excluded.genres,
        updatedAt = excluded.updatedAt
    `;
    const values = [
      series.id, series.slug, series.title, series.cover, series.synopsis, 
      series.author, series.artist, series.status, series.type, series.genres, 
      series.bookmarked ? 1 : 0, series.updatedAt
    ];
    await db.run(sql, values);
  },

  async toggleBookmark(id: string, isBookmarked: boolean): Promise<void> {
    const db = await getDB();
    await db.run('UPDATE series SET bookmarked = ?, updatedAt = ? WHERE id = ?', [isBookmarked ? 1 : 0, Date.now(), id]);
  },
  
  async getById(id: string): Promise<Series | null> {
    const db = await getDB();
    const res = await db.query('SELECT * FROM series WHERE id = ?', [id]);
    if (res.values && res.values.length > 0) {
      const row = res.values[0];
      return { ...row, bookmarked: row.bookmarked === 1 } as Series;
    }
    return null;
  },

  async getBySlug(slug: string): Promise<Series | null> {
    const db = await getDB();
    const res = await db.query('SELECT * FROM series WHERE slug = ?', [slug]);
    if (res.values && res.values.length > 0) {
      const row = res.values[0];
      return { ...row, bookmarked: row.bookmarked === 1 } as Series;
    }
    return null;
  }
};

export interface Chapter {
  id: string;
  seriesId: string;
  title?: string | null;
  chapterNumber?: number | null;
  slug?: string | null;
  totalPages?: number | null;
  publishedAt?: string | null;
  downloadStatus?: string | null;
  localFilePath?: string | null;
  read: boolean;
  readingProgress: number;
  updatedAt: number;
}

export const ChapterDAO = {
  async getBySeriesId(seriesId: string): Promise<Chapter[]> {
    const db = await getDB();
    const res = await db.query('SELECT * FROM chapter WHERE seriesId = ? ORDER BY chapterNumber DESC', [seriesId]);
    return res.values?.map(row => ({
      ...row,
      read: row.read === 1,
    })) as Chapter[] || [];
  },

  async upsert(chapter: Chapter): Promise<void> {
    const db = await getDB();
    const sql = `
      INSERT INTO chapter (id, seriesId, title, chapterNumber, slug, totalPages, publishedAt, downloadStatus, localFilePath, read, readingProgress, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        chapterNumber = excluded.chapterNumber,
        slug = excluded.slug,
        totalPages = excluded.totalPages,
        publishedAt = excluded.publishedAt,
        downloadStatus = excluded.downloadStatus,
        localFilePath = excluded.localFilePath,
        updatedAt = excluded.updatedAt
    `;
    const values = [
      chapter.id, chapter.seriesId, chapter.title, chapter.chapterNumber, chapter.slug,
      chapter.totalPages, chapter.publishedAt, chapter.downloadStatus, chapter.localFilePath,
      chapter.read ? 1 : 0, chapter.readingProgress, chapter.updatedAt
    ];
    await db.run(sql, values);
  }
};
