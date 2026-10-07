import { Database as SqlDatabase } from 'sql.js';

export interface Migration {
  version: number;
  name: string;
  up: (db: SqlDatabase) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: '001_create_initial_schema',
    up: (db: SqlDatabase) => {
      // 1. Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TEXT NOT NULL
        );
      `);

      // 2. Services / URLs table
      db.run(`
        CREATE TABLE IF NOT EXISTS services (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'General',
          description TEXT DEFAULT '',
          icon TEXT DEFAULT 'globe',
          tags TEXT DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'checking',
          last_status_code INTEGER DEFAULT 0,
          last_response_time_ms INTEGER DEFAULT 0,
          last_checked_at TEXT,
          uptime_percentage REAL DEFAULT 100.0,
          total_checks INTEGER DEFAULT 0,
          successful_checks INTEGER DEFAULT 0,
          created_at TEXT NOT NULL,
          user_id TEXT NOT NULL DEFAULT 'admin'
        );
      `);

      // 3. Health check history table
      db.run(`
        CREATE TABLE IF NOT EXISTS check_history (
          id TEXT PRIMARY KEY,
          service_id TEXT NOT NULL,
          status TEXT NOT NULL,
          status_code INTEGER,
          response_time_ms INTEGER,
          checked_at TEXT NOT NULL,
          error_message TEXT,
          FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
        );
      `);

      // 4. API keys table for external Hermes Agent / integrations
      db.run(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          key TEXT UNIQUE NOT NULL,
          created_at TEXT NOT NULL,
          last_used_at TEXT
        );
      `);

      // 5. Audit logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          action TEXT NOT NULL,
          details TEXT,
          timestamp TEXT NOT NULL
        );
      `);

      // 6. Performance indexes
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
        CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
        CREATE INDEX IF NOT EXISTS idx_check_history_service_id ON check_history(service_id);
        CREATE INDEX IF NOT EXISTS idx_check_history_checked_at ON check_history(checked_at);
        CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
      `);
    },
  },
];

/**
 * Runs all pending migrations against the SQLite database.
 * Tracks applied migrations in the schema_migrations table.
 */
export function runMigrations(db: SqlDatabase): void {
  // Ensure schema_migrations table exists
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Query applied migrations
  const appliedVersions = new Set<number>();
  try {
    const res = db.exec("SELECT version FROM schema_migrations");
    if (res.length > 0 && res[0].values) {
      for (const row of res[0].values) {
        appliedVersions.add(Number(row[0]));
      }
    }
  } catch (err) {
    console.error('Error querying schema_migrations:', err);
  }

  // Apply pending migrations in order
  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`[SQLite Migration] Applying migration ${migration.version}: ${migration.name}...`);
      try {
        migration.up(db);
        const now = new Date().toISOString();
        db.run(
          "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
          [migration.version, migration.name, now]
        );
        console.log(`[SQLite Migration] Migration ${migration.version} successfully applied.`);
      } catch (err) {
        console.error(`[SQLite Migration] Fatal error applying migration ${migration.version}:`, err);
        throw err;
      }
    }
  }
}
