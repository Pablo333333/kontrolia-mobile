// import * as SQLite from 'expo-sqlite';
// import * as FileSystem from 'expo-file-system';

// const dbName = 'kontrolia.db';
// let dbInstance: SQLite.SQLiteDatabase | null = null;

// export const initDatabase = async () => {
//   if (dbInstance) return dbInstance;

//   try {
//     // 1. Abrimos la base de datos de forma síncrona para evitar 
//     // problemas de promesas pendientes durante el inicio de la app
//     const db = SQLite.openDatabaseSync(dbName);
    
//     // 2. Ejecutamos las migraciones
//     db.execSync(`
//       PRAGMA journal_mode = WAL;
//       CREATE TABLE IF NOT EXISTS pending_actions (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         action_type TEXT NOT NULL,
//         entity_type TEXT NOT NULL,
//         entity_id TEXT,
//         payload TEXT NOT NULL,
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         sync_pending INTEGER DEFAULT 1
//       );
      
//       CREATE TABLE IF NOT EXISTS local_tickets (
//         id TEXT PRIMARY KEY,
//         title TEXT NOT NULL,
//         description TEXT,
//         status_name TEXT,
//         category_name TEXT,
//         latitude REAL,
//         longitude REAL,
//         created_at TEXT
//       );
//     `);
    
//     dbInstance = db;
//     console.log('[DB] Database initialized successfully');
//     return db;
//   } catch (error) {
//     console.error('[DB] Failed to initialize database:', error);
//     throw error; // Esto disparará el error en tu _layout.tsx
//   }
// };

// export const getDatabase = async () => {
//   if (!dbInstance) return await initDatabase();
//   return dbInstance;
// };

const stubDb = {
  runAsync: async () => undefined,
  getFirstAsync: async () => ({ count: 0 }),
  getAllAsync: async () => [],
};

export const initDatabase = async () => {
  console.log('--- DB SIMULADA ---');
  return stubDb;
};

export const getDatabase = async () => stubDb;