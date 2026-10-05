import assert from 'node:assert/strict';
import { createDatabase, createElastic, indexName } from '../lib/clients.js';
import { elasticQuery, likePattern, searchSQL } from '../lib/search.js';
const db = createDatabase();
const es = createElastic();
try {
  const count = (await db.query('SELECT count(*)::int AS count FROM reviews')).rows[0].count;
  assert.ok(count > 0, 'Veri tabanı boş');
  assert.equal((await es.count({ index: indexName() })).count, count);
  for (const id of [1, Math.ceil(count / 2), count]) {
    const pg = (await db.query('SELECT id, review, sentiment FROM reviews WHERE id=$1', [id])).rows[0];
    const document = await es.get({ index: indexName(), id: String(id) });
    assert.deepEqual(document._source, pg, `Kayıt ${id} farklı`);
  }
  for (const term of ['movie', 'only', 'laptop', 'zzzznomatch8675309', "' OR 1=1 --", '%']) {
    const start = performance.now();
    const pg = (await db.query(searchSQL, [likePattern(term)])).rows[0];
    const pgMs = performance.now() - start;
    const esStart = performance.now();
    const result = await es.search({ index: indexName(), query: elasticQuery(term), track_total_hits: true, size: 20 });
    assert.ok(pg.results.length <= 20);
    assert.ok(result.hits.hits.length <= 20);
    if (term.startsWith('zzzz') || term.includes('1=1')) assert.equal(pg.total, 0);
    console.log(JSON.stringify({ term, postgres: { total: pg.total, ms: +pgMs.toFixed(1) }, elasticsearch: { total: result.hits.total.value, ms: +(performance.now() - esStart).toFixed(1) } }));
  }
  console.log(`Doğrulama geçti: ${count} kayıt; örnek içerik eşitliği, arama ve parametreli SQL.`);
} finally { await db.end(); await es.close(); }
