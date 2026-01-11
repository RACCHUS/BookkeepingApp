import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from project root
dotenv.config({ path: resolve(__dirname, '../../.env') });

const { Client } = pg;

async function runMigration() {
  console.log('Running company columns migration...');
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL not found in .env file');
    process.exit(1);
  }
  
  console.log('Connecting to database...');
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database!');

    const sql = `
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS website TEXT;
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
      ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS type TEXT;
      UPDATE public.companies SET type = business_type WHERE type IS NULL AND business_type IS NOT NULL;
    `;

    await client.query(sql);
    console.log('Migration completed successfully!');

    // Verify columns exist
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'companies' 
      ORDER BY ordinal_position
    `);
    console.log('Current columns:', result.rows.map(r => r.column_name).join(', '));

    await client.end();
  } catch (error) {
    console.error('Migration failed:', error.message);
    try { await client.end(); } catch(e) {}
    process.exit(1);
  }
}

runMigration();
