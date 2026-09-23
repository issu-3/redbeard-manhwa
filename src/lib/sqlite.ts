import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

// Define the schema migrations
const sqliteSetup = `
  CREATE TABLE IF NOT EXISTS series (
    id TEXT PRIMARY KEY,
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
    lastSyncedAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    seriesId TEXT NOT NULL,
    title TEXT,
    chapterNumber TEXT NOT NULL,
    publishedAt INTEGER,
    isRead INTEGER DEFAULT 0,
    readAt INTEGER,
    downloadState TEXT DEFAULT 'IDLE',
    localPath TEXT,
    fileSize INTEGER,
    downloadedAt INTEGER,
    FOREIGN KEY (seriesId) REFERENCES series(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS history (
    seriesId TEXT PRIMARY KEY,
    chapterId TEXT NOT NULL,
    currentPage INTEGER DEFAULT 1,
    progressPercentage REAL DEFAULT 0.0,
    lastReadAt INTEGER NOT NULL,
    FOREIGN KEY (seriesId) REFERENCES series(id) ON DELETE CASCADE,
    FOREIGN KEY (chapterId) REFERENCES chapters(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sync_state (
    key TEXT PRIMARY KEY,
    lastSyncTimestamp INTEGER
  );
`;

let sqlite: SQLiteConnection;
let db: SQLiteDBConnection;
let isInitialized = false;

export async function initSQLiteDB(): Promise<SQLiteDBConnection | null> {
  if (isInitialized && db) return db;
  
  if (!Capacitor.isNativePlatform()) {
    console.warn('SQLite is only available on native Android/iOS. Returning null.');
    return null;
  }

  try {
    sqlite = new SQLiteConnection(CapacitorSQLite);
    
    // Check connections consistency
    const retCC = (await sqlite.checkConnectionsConsistency()).result;
    const isConn = (await sqlite.isConnection('redbeard_db', false)).result;

    if (retCC && isConn) {
      db = await sqlite.retrieveConnection('redbeard_db', false);
    } else {
      db = await sqlite.createConnection('redbeard_db', false, 'no-encryption', 1, false);
    }
    
    await db.open();

    // Run setup query
    await db.execute(sqliteSetup);
    
    isInitialized = true;
    return db;
  } catch (err) {
    console.error('Failed to initialize SQLite DB:', err);
    throw err;
  }
}

export async function getDB(): Promise<SQLiteDBConnection | null> {
  if (!isInitialized) {
    return await initSQLiteDB();
  }
  return db;
}
