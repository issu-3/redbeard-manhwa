import { capSQLiteVersionUpgrade } from '@capacitor-community/sqlite';

export const SQLiteMigrations: capSQLiteVersionUpgrade[] = [
  {
    toVersion: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS series (
          localId TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          serverSeriesId TEXT NOT NULL,
          title TEXT NOT NULL,
          slug TEXT NOT NULL,
          coverUrl TEXT,
          author TEXT,
          artist TEXT,
          description TEXT,
          status TEXT,
          genres TEXT,
          inLibrary INTEGER DEFAULT 0,
          addedAt INTEGER,
          lastSyncedAt INTEGER,
          UNIQUE(userId, serverSeriesId)
      );`,
      `CREATE TABLE IF NOT EXISTS chapters (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          seriesId TEXT NOT NULL,
          serverChapterId TEXT NOT NULL,
          title TEXT,
          chapterNumber TEXT NOT NULL,
          publishedAt INTEGER,
          isRead INTEGER DEFAULT 0,
          readAt INTEGER,
          downloadState TEXT DEFAULT 'IDLE',
          localPath TEXT,
          fileSize INTEGER,
          downloadedAt INTEGER,
          FOREIGN KEY (seriesId) REFERENCES series(localId) ON DELETE CASCADE,
          UNIQUE(userId, serverChapterId)
      );`,
      `CREATE TABLE IF NOT EXISTS history (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          seriesId TEXT NOT NULL,
          chapterId TEXT NOT NULL,
          currentPage INTEGER DEFAULT 1,
          progressPercentage REAL DEFAULT 0.0,
          lastReadAt INTEGER NOT NULL,
          FOREIGN KEY (seriesId) REFERENCES series(localId) ON DELETE CASCADE,
          FOREIGN KEY (chapterId) REFERENCES chapters(id) ON DELETE CASCADE,
          UNIQUE(userId, seriesId, chapterId)
      );`,
      `CREATE TABLE IF NOT EXISTS sync_state (
          userId TEXT NOT NULL,
          key TEXT NOT NULL,
          lastSyncTimestamp INTEGER,
          PRIMARY KEY(userId, key)
      );`
    ]
  }
];
