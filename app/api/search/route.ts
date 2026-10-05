import { getDatabase } from '@/lib/neon';
import { getElastic, indexName } from '@/lib/elasticsearch';
import { elasticQuery, likePattern, searchSQL, validateSearch } from '@/lib/search.js';
import type { Engine, Review, SearchResult } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  let input;
  try { input = validateSearch(await request.json()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : 'Geçersiz istek.' }, { status: 400 }); }
  const { term, mode } = input;
  let cancelled = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(result: SearchResult) {
        if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(result) + '\n'));
      }
      async function run(engine: Engine, search: () => Promise<Partial<SearchResult>>) {
        const start = performance.now();
        try {
          const result = await search();
          send({ ...result, engine, status: 'success', query: term, durationMs: performance.now() - start });
        } catch (error) {
          // Do not expose connection URLs, API keys or full upstream errors to the browser.
          console.error(`[search:${engine}]`, error instanceof Error ? error.name : 'Error');
          send({ engine, status: 'error', query: term, durationMs: performance.now() - start,
            error: `${engine === 'postgres' ? 'PostgreSQL' : 'Elasticsearch'} sorgusu tamamlanamadı. Docker servislerini, .env.local ayarlarını ve npm run populate adımını kontrol edin.` });
        }
      }
      await Promise.all([
        run('postgres', async () => {
          const response = await getDatabase().query(searchSQL, [likePattern(term)]);
          return { total: response.rows[0].total, results: response.rows[0].results };
        }),
        run('elasticsearch', async () => {
          const response = await getElastic().search<Review>({
            index: indexName(), query: elasticQuery(term, mode), size: 20, track_total_hits: true,
            timeout: '20s',
          });
          if (response.timed_out || response._shards.failed) throw new Error('Partial search result');
          return {
            total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0,
            engineTookMs: response.took,
            results: response.hits.hits.map(hit => ({ ...hit._source!, id: Number(hit._id), score: hit._score ?? undefined })),
          };
        }),
      ]);
      if (!cancelled) controller.close();
    },
    cancel() { cancelled = true; },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
}
