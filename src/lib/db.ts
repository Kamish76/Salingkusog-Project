import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️ DATABASE_URL is not set. Please set it in your environment or .env.local.');
}

export const sql = neon(connectionString || '');
