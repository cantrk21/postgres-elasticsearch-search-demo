# Veri kaynağı

`npm run data:download` 50.000 IMDb film yorumunu `reviews.csv` olarak indirir.

- CSV: https://zenodo.org/records/7929635
- Alternatif indirme aynası: https://github.com/mcandemir/imdb-sentiment-analysis (aynı MD5 ile doğrulanır).
- Orijinal çalışma: https://ai.stanford.edu/~amaas/data/sentiment/
- Andrew L. Maas et al., *Learning Word Vectors for Sentiment Analysis*, ACL 2011.
- Kaynağın yayımladığı MD5: `308443a50e5c993e7b8a1cdb95750026`.

Videoda CSV'nin kaynağı belirtilmiyor; bu veri kümesi aynı boyut ve kolon düzenine sahip yeniden üretim verisidir, videodaki dosyanın birebir aynısı olduğu iddia edilmez.

Kendi CSV'niz: UTF-8, `review,sentiment` başlıkları; sentiment `positive` veya `negative` olmalı. Virgül/yeni satır içeren yorumları CSV standardına göre tırnaklayın.
