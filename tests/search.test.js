import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSearch, likePattern, elasticQuery } from '../lib/search.js';
test('rejects invalid inputs and trims valid input', () => {
  for (const value of [null, {}, { searchTerm: '' }, { searchTerm: '  ' }, { searchTerm: 5 }, { searchTerm: 'x'.repeat(201) }, { searchTerm: 'movie', mode: 'invalid' }]) assert.throws(() => validateSearch(value));
  assert.deepEqual(validateSearch({ searchTerm: ' movie ' }), { term: 'movie', mode: 'video' });
});
test('LIKE special characters are literal, SQL text stays data', () => {
  assert.equal(likePattern('100%_done'), '%100\\%\\_done%');
  assert.equal(likePattern("' OR 1=1 --"), "%' OR 1=1 --%");
  assert.equal(likePattern('a\\b'), '%a\\\\b%');
});
test('video mode escapes Lucene operators; fulltext has explicit AND semantics', () => {
  assert.equal(elasticQuery('Movie').query_string.query, '*movie*');
  assert.equal(elasticQuery('a:b*').query_string.query, '*a\\:b\\**');
  assert.deepEqual(elasticQuery('great movie', 'fulltext'), { match: { review: { query: 'great movie', operator: 'and' } } });
});
