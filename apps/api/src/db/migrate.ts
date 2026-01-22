import 'dotenv/config';
import { Pool } from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = join(__dirname, 'migrations');

interface MigrationRecord {
  id: number;
  name: string;
  executed_at: Date;
}

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    // Create migrations tracking table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Get already executed migrations
    const { rows: executed } = await pool.query<MigrationRecord>(
      'SELECT name FROM _migrations ORDER BY id'
    );
    const executedNames = new Set(executed.map(m => m.name));

    // Get all migration files
    const files = await readdir(MIGRATIONS_DIR);
    const migrationFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files`);

    // Run pending migrations
    for (const file of migrationFiles) {
      if (executedNames.has(file)) {
        console.log(`  ✓ ${file} (already executed)`);
        continue;
      }

      console.log(`  → Running ${file}...`);

      const filePath = join(MIGRATIONS_DIR, file);
      const sql = await readFile(filePath, 'utf-8');

      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO _migrations (name) VALUES ($1)',
          [file]
        );
        await pool.query('COMMIT');
        console.log(`    ✓ ${file} completed`);
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`    ✗ ${file} failed:`, error);
        throw error;
      }
    }

    console.log('\nMigrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
runMigrations();
