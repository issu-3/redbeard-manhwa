import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { SQLiteMigrations } from './migrations';

let sqlite: SQLiteConnection;
let db: SQLiteDBConnection;
let isInitialized = false;

const DB_NAME = 'redbeard_db';
const DB_VERSION = 2;

export async function initSQLiteDB(): Promise<SQLiteDBConnection | null> {
  if (isInitialized && db) return db;
  
  // Do not initialize on Web fallback to prevent crashes if jeep-sqlite is not set up
  if (!Capacitor.isNativePlatform()) {
    console.warn('SQLite is only configured for Native Android/iOS in REDBEARD.');
    return null;
  }

  try {
    if (!sqlite) {
      sqlite = new SQLiteConnection(CapacitorSQLite);
    }
    
    // Add Upgrade Statement (Migrations)
    await sqlite.addUpgradeStatement(DB_NAME, SQLiteMigrations);

    const retCC = (await sqlite.checkConnectionsConsistency()).result;
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

    if (retCC && isConn) {
      db = await sqlite.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
    }
    
    await db.open();
    isInitialized = true;
    console.log(`SQLite DB initialized successfully with version ${DB_VERSION}`);
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
