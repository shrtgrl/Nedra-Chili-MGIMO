import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

export function connectDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString });
  return { db: drizzle(pool), close: () => pool.end() };
}
