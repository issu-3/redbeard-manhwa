import { getDB } from './connection';
import { LibrarySeriesEntity } from '@/lib/local-library';

export class SeriesRepository {
  /**
   * Fetch library series for a specific user from SQLite
   */
  static async getLibrary(userId: string): Promise<LibrarySeriesEntity[]> {
    const db = await getDB();
    if (!db) return [];

    try {
      const result = await db.query(
        'SELECT * FROM series WHERE userId = ? AND inLibrary = 1 ORDER BY addedAt DESC',
        [userId]
      );

      if (!result.values) return [];

      return result.values.map(row => ({
        seriesId: row.serverSeriesId,
        title: row.title,
        slug: row.slug,
        coverImage: row.coverUrl,
        author: row.author,
        artist: row.artist,
        description: row.description,
        status: row.status,
        genres: row.genres ? JSON.parse(row.genres) : undefined,
      } as unknown as LibrarySeriesEntity));
    } catch (e) {
      console.error('Failed to get library from SQLite', e);
      return [];
    }
  }

  /**
   * Save a series to the library
   */
  static async saveToLibrary(userId: string, series: LibrarySeriesEntity): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
      const localId = `${userId}_${series.seriesId}`;
      const addedAt = Date.now();
      // @ts-ignore
      const genresStr = series.genres ? JSON.stringify(series.genres) : null;

      await db.run(
        `INSERT INTO series (
          localId, userId, serverSeriesId, title, slug, coverUrl, 
          author, artist, description, status, genres, inLibrary, addedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(userId, serverSeriesId) DO UPDATE SET
          inLibrary = 1,
          title = excluded.title,
          coverUrl = excluded.coverUrl,
          addedAt = excluded.addedAt`,
        [
          localId, userId, series.seriesId, series.title, series.slug, series.coverImage || null,
          // @ts-ignore
          series.author || null, series.artist || null, series.description || null,
          series.status || null, genresStr, addedAt
        ]
      );
    } catch (e) {
      console.error('Failed to save to library', e);
    }
  }

  /**
   * Remove series from library locally
   */
  static async removeFromLibrary(userId: string, serverSeriesId: string): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
      await db.run(
        'UPDATE series SET inLibrary = 0 WHERE userId = ? AND serverSeriesId = ?',
        [userId, serverSeriesId]
      );
    } catch (e) {
      console.error('Failed to remove from library', e);
    }
  }

  /**
   * Check if a series is in library
   */
  static async isInLibrary(userId: string, serverSeriesId: string): Promise<boolean> {
    const db = await getDB();
    if (!db) return false;

    try {
      const res = await db.query(
        'SELECT inLibrary FROM series WHERE userId = ? AND serverSeriesId = ? LIMIT 1',
        [userId, serverSeriesId]
      );
      return !!(res.values && res.values.length > 0 && res.values[0].inLibrary === 1);
    } catch (e) {
      console.error('Failed to check library status', e);
      return false;
    }
  }

  /**
   * Get single series metadata
   */
  static async getSeries(userId: string, serverSeriesId: string): Promise<LibrarySeriesEntity | null> {
    const db = await getDB();
    if (!db) return null;

    try {
      const res = await db.query(
        'SELECT * FROM series WHERE userId = ? AND serverSeriesId = ? LIMIT 1',
        [userId, serverSeriesId]
      );
      if (!res.values || res.values.length === 0) return null;
      const row = res.values[0];
      return {
        seriesId: row.serverSeriesId,
        title: row.title,
        slug: row.slug,
        coverImage: row.coverUrl,
        author: row.author,
        artist: row.artist,
        description: row.description,
        status: row.status,
        genres: row.genres ? JSON.parse(row.genres) : undefined,
      } as unknown as LibrarySeriesEntity;
    } catch (e) {
      console.error('Failed to get series', e);
      return null;
    }
  }

  /**
   * Get chapters for a series
   */
  static async getChapters(userId: string, serverSeriesId: string): Promise<any[]> {
    const db = await getDB();
    if (!db) return [];

    try {
      const localSeriesId = `${userId}_${serverSeriesId}`;
      const res = await db.query(
        'SELECT * FROM chapters WHERE userId = ? AND seriesId = ? ORDER BY CAST(chapterNumber AS REAL) DESC',
        [userId, localSeriesId]
      );
      return res.values || [];
    } catch (e) {
      console.error('Failed to get chapters', e);
      return [];
    }
  }

  /**
   * Save read state
   */
  static async saveReadState(userId: string, serverSeriesId: string, serverChapterId: string, isRead: boolean): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
      const localSeriesId = `${userId}_${serverSeriesId}`;
      const chapterId = `${userId}_${serverChapterId}`;
      const readAt = isRead ? Date.now() : null;

      // Upsert chapter read state
      await db.run(
        `INSERT INTO chapters (id, userId, seriesId, serverChapterId, chapterNumber, isRead, readAt)
         VALUES (?, ?, ?, ?, '0', ?, ?)
         ON CONFLICT(userId, serverChapterId) DO UPDATE SET
         isRead = excluded.isRead, readAt = excluded.readAt`,
        [chapterId, userId, localSeriesId, serverChapterId, isRead ? 1 : 0, readAt]
      );
    } catch (e) {
      console.error('Failed to save read state', e);
    }
  }

  /**
   * Save reading progress
   */
  static async saveReadingProgress(userId: string, serverSeriesId: string, serverChapterId: string, currentPage: number): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
      const localSeriesId = `${userId}_${serverSeriesId}`;
      const chapterId = `${userId}_${serverChapterId}`;
      const historyId = `${userId}_${serverSeriesId}_${serverChapterId}`;

      await db.run(
        `INSERT INTO history (id, userId, seriesId, chapterId, currentPage, lastReadAt)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(userId, seriesId, chapterId) DO UPDATE SET
         currentPage = excluded.currentPage, lastReadAt = excluded.lastReadAt`,
        [historyId, userId, localSeriesId, chapterId, currentPage, Date.now()]
      );
    } catch (e) {
      console.error('Failed to save reading progress', e);
    }
  }

  /**
   * Sync library metadata from server to SQLite
   */
  static async syncLibrary(userId: string, serverData: any[]): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
      const now = Date.now();
      // Use transaction for bulk update
      await db.execute('BEGIN TRANSACTION');
      for (const item of serverData) {
        const series = item.series; // Assumes serverData is [{ series: {...} }] from /api/user/library
        if (!series) continue;

        const localId = `${userId}_${series.id}`;
        const genresStr = series.genres ? JSON.stringify(series.genres) : null;

        await db.run(
          `INSERT INTO series (
            localId, userId, serverSeriesId, title, slug, coverUrl, 
            author, artist, description, status, genres, inLibrary, lastSyncedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          ON CONFLICT(userId, serverSeriesId) DO UPDATE SET
            inLibrary = 1,
            title = excluded.title,
            coverUrl = excluded.coverUrl,
            lastSyncedAt = excluded.lastSyncedAt`,
          [
            localId, userId, series.id, series.title, series.slug, series.coverImage || null,
            series.author || null, series.artist || null, series.description || null,
            series.status || null, genresStr, now
          ]
        );
      }
      await db.execute('COMMIT TRANSACTION');

      // Update sync state
      await db.run(
        `INSERT INTO sync_state (userId, key, lastSyncTimestamp) VALUES (?, 'library', ?)
         ON CONFLICT(userId, key) DO UPDATE SET lastSyncTimestamp = excluded.lastSyncTimestamp`,
        [userId, now]
      );
    } catch (e) {
      await db.execute('ROLLBACK TRANSACTION');
      console.error('Failed to sync library', e);
    }
  }

  /**
   * Clear all user-scoped data (Logout)
   */
  static async clearUserData(userId: string): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
      await db.execute('BEGIN TRANSACTION');
      await db.run('DELETE FROM history WHERE userId = ?', [userId]);
      await db.run('DELETE FROM chapters WHERE userId = ?', [userId]);
      await db.run('DELETE FROM series WHERE userId = ?', [userId]);
      await db.run('DELETE FROM sync_state WHERE userId = ?', [userId]);
      await db.execute('COMMIT TRANSACTION');
    } catch (e) {
      await db.execute('ROLLBACK TRANSACTION');
      console.error('Failed to clear user data', e);
    }
  }

  /**
   * Get chapters in the download queue (PENDING, DOWNLOADING, PAUSED)
   */
  static async getDownloadQueue(userId: string): Promise<any[]> {
    const db = await getDB();
    if (!db) return [];

    try {
      const res = await db.query(
        `SELECT c.*, s.title as seriesTitle, s.coverUrl as seriesCover 
         FROM chapters c 
         JOIN series s ON c.seriesId = s.localId 
         WHERE c.userId = ? AND c.downloadState IN ('PENDING', 'DOWNLOADING', 'PAUSED')
         ORDER BY c.downloadedAt DESC`,
        [userId]
      );
      return res.values || [];
    } catch (e) {
      console.error('Failed to get download queue', e);
      return [];
    }
  }

  /**
   * Update download state for a chapter
   */
  static async updateDownloadState(userId: string, serverChapterId: string, state: 'IDLE' | 'PENDING' | 'DOWNLOADING' | 'PAUSED' | 'DOWNLOADED', progress: number = 0): Promise<void> {
    const db = await getDB();
    if (!db) return;

    try {
      const chapterId = `${userId}_${serverChapterId}`;
      const now = state === 'DOWNLOADED' ? Date.now() : null;

      await db.run(
        `UPDATE chapters SET downloadState = ?, downloadedAt = COALESCE(?, downloadedAt) WHERE id = ? AND userId = ?`,
        [state, now, chapterId, userId]
      );
    } catch (e) {
      console.error('Failed to update download state', e);
    }
  }
}
