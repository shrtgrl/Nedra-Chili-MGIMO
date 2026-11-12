import { defineConfig } from 'drizzle-kit';
const migrationUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!migrationUrl) throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL is required');
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: { url: migrationUrl },
});
