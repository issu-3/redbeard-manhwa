import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { DB_NAME, SCHEMA_V1 } from './schema';

export const sqlite = new SQLiteConnection(CapacitorSQLite);
export let db: SQLiteDBConnection;

export const initDB = async (): Promise<SQLiteDBConnection> => {
  if (db) return db;

  try {
    const isNative = Capacitor.isNativePlatform();

    if (!isNative) {
      console.warn('SQLite is running on web. Persistence may not work without jeep-sqlite.');
    }

    const ret = await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

    if (ret.result && isConn) {
      db = await sqlite.retrieveConnection(DB_NAME, false);
    } else {
      db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    }

    await db.open();
    
    // Create V1 Schema
    await db.execute(SCHEMA_V1);
    
    if (!isNative) {
      await sqlite.saveToStore(DB_NAME);
    }

    console.log('[SQLite] DB initialized successfully.');
    return db;
  } catch (error) {
    console.error('[SQLite] DB initialization failed:', error);
    throw error;
  }
};

export const getDB = async (): Promise<SQLiteDBConnection> => {
  if (!db) {
    return await initDB();
  }
  return db;
};
