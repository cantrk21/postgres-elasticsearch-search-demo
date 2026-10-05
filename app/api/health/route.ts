import { getDatabase } from '@/lib/neon';
import { getElastic, indexName } from '@/lib/elasticsearch';
export const dynamic = 'force-dynamic';
export async function GET() {
  const [pg, es] = await Promise.allSettled([
    Promise.resolve().then(() => getDatabase().query('SELECT count(*)::int AS count FROM reviews')),
    Promise.resolve().then(() => getElastic().count({ index: indexName() })),
  ]);
  const postgres = pg.status === 'fulfilled' ? pg.value.rows[0].count : null;
  const elasticsearch = es.status === 'fulfilled' ? es.value.count : null;
  return Response.json({ postgres, elasticsearch, ready: postgres !== null && postgres > 0 && postgres === elasticsearch });
}
