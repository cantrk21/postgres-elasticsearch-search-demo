import pg from 'pg';
import { neon } from '@neondatabase/serverless';
import { Client } from '@elastic/elasticsearch';

export function createDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL eksik. .env.local dosyasını kontrol edin.');
  if (process.env.DATABASE_DRIVER === 'neon') {
    const sql = neon(connectionString);
    return {
      async query(text, values = []) {
        const rows = await sql.query(text, values, { fetchOptions: { signal: AbortSignal.timeout(20000) } });
        return { rows };
      },
      async end() {},
    };
  }
  const pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 10000, statement_timeout: 20000 });
  return {
    /** @param {string} text @param {unknown[]} values */
    async query(text, values = []) { return await pool.query(text, values); },
    async end() { await pool.end(); },
  };
}

export function createElastic() {
  if (!process.env.ELASTICSEARCH_URL) throw new Error('ELASTICSEARCH_URL eksik.');
  return new Client({
    node: process.env.ELASTICSEARCH_URL,
    ...(process.env.ELASTICSEARCH_API_KEY ? { auth: { apiKey: process.env.ELASTICSEARCH_API_KEY } } : {}),
    requestTimeout: 20000,
    maxRetries: 0,
  });
}
export function indexName() { return process.env.ELASTICSEARCH_INDEX || 'reviews'; }
