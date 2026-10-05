CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  review TEXT NOT NULL,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative'))
);
-- Intentionally no text-search index: this reproduces the video's ILIKE baseline.
