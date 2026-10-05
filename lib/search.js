// Bound values keep SQL input separate from SQL syntax. Escape LIKE metacharacters
// so that '%' and '_' typed by the user mean literal characters.
export function likePattern(term) { return '%' + term.replace(/[\\%_]/g, '\\$&') + '%'; }
/** @param {string} term @param {string} mode @returns {import('@elastic/elasticsearch').estypes.QueryDslQueryContainer} */
export function elasticQuery(term, mode = 'video') {
  if (mode === 'fulltext') return { match: { review: { query: term, operator: 'and' } } };
  const escaped = term.toLowerCase().replace(/([+\-=!(){}\[\]^"~*?:\\/<>|&])/g, '\\$1');
  return { query_string: { query: `*${escaped}*`, fields: ['review'], default_operator: 'OR' } };
}
export function validateSearch(input) {
  if (!input || typeof input !== 'object' || typeof input.searchTerm !== 'string') throw new Error('Arama metni gerekli.');
  const term = input.searchTerm.trim();
  if (!term || term.length > 200) throw new Error('Arama metni 1–200 karakter olmalı.');
  const mode = input.mode ?? 'video';
  if (!['video', 'fulltext'].includes(mode)) throw new Error('Geçersiz arama modu.');
  return { term, mode };
}
export const searchSQL = `WITH matches AS MATERIALIZED (
  SELECT id, review, sentiment FROM reviews WHERE review ILIKE $1
), sample AS (SELECT * FROM matches ORDER BY id LIMIT 20)
SELECT (SELECT count(*)::int FROM matches) AS total,
       COALESCE((SELECT json_agg(sample) FROM sample), '[]'::json) AS results`;
