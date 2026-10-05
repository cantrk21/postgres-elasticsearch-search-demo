import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
import { createDatabase, createElastic, indexName } from '../lib/clients.js';

const db = createDatabase();
const es = createElastic();
const index = indexName();
try {
  const csv = await readFile(new URL('./data/reviews.csv', import.meta.url), 'utf8');
  const records = parse(csv, { columns: true, bom: true, skip_empty_lines: true });
  const invalid = records.findIndex(row => !row.review?.trim() || !['positive', 'negative'].includes(row.sentiment?.trim()));
  if (invalid !== -1) throw new Error(`CSV satır ${invalid + 2}: review ve positive/negative sentiment gerekli. Veri değiştirilmedi.`);
  if (!records.length) throw new Error('CSV boş.');
  const rows = records.map((row, i) => ({ id: i + 1, review: row.review.trim(), sentiment: row.sentiment.trim() }));
  const schema = await readFile(new URL('./create-table.sql', import.meta.url), 'utf8');
  await db.query(schema);
  const existing = await db.query('SELECT count(*)::int AS count FROM reviews');
  const exists = await es.indices.exists({ index });
  const esCount = exists ? (await es.count({ index })).count : 0;
  const resume = process.argv.includes('--resume');
  if ((existing.rows[0].count > 0 || esCount > 0) && !resume) {
    throw new Error('Veri zaten var; otomatik silme yapılmadı. Aynı CSV ile yarım kalan yüklemeyi sürdürmek/güncellemek için npm run populate -- --resume kullanın.');
  }
  if (resume && (existing.rows[0].count > rows.length || esCount > rows.length)) throw new Error('Hedefte CSV’den fazla kayıt var. Ayrı bir test veritabanı/indeksi kullanın.');
  if (!exists) await es.indices.create({ index, settings: { number_of_shards: 1, number_of_replicas: 0 }, mappings: { properties: { id: { type: 'integer' }, review: { type: 'text' }, sentiment: { type: 'keyword' } } } });
  console.log(`${rows.length} yorum her iki sisteme yükleniyor…`);
  for (let offset = 0; offset < rows.length; offset += 1000) {
    const batch = rows.slice(offset, offset + 1000);
    const values = batch.flatMap(row => [row.id, row.review, row.sentiment]);
    const placeholders = batch.map((_, i) => `($${i * 3 + 1},$${i * 3 + 2},$${i * 3 + 3})`).join(',');
    await db.query(`INSERT INTO reviews (id, review, sentiment) VALUES ${placeholders} ON CONFLICT(id) DO UPDATE SET review=EXCLUDED.review, sentiment=EXCLUDED.sentiment`, values);
    const result = await es.bulk({ operations: batch.flatMap(row => [{ index: { _index: index, _id: String(row.id) } }, row]) });
    if (result.errors) throw new Error('Elasticsearch bulk işlemi kısmen başarısız. Aynı CSV ile --resume kullanın.');
    console.log(`${Math.min(offset + batch.length, rows.length)}/${rows.length}`);
  }
  await es.indices.refresh({ index });
  await db.query('ANALYZE reviews');
  const pgCount = (await db.query('SELECT count(*)::int AS count FROM reviews')).rows[0].count;
  const finalEsCount = (await es.count({ index })).count;
  if (pgCount !== rows.length || finalEsCount !== rows.length) throw new Error(`Kayıt sayıları farklı: CSV=${rows.length}, PG=${pgCount}, ES=${finalEsCount}`);
  console.log(`Tamamlandı: PostgreSQL=${pgCount}, Elasticsearch=${finalEsCount}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await db.end(); await es.close(); }
