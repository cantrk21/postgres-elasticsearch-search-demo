import { createWriteStream, createReadStream } from 'node:fs';
import { mkdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const directory = new URL('./data/', import.meta.url);
const target = new URL('reviews.csv', directory);
const temporary = new URL('reviews.csv.part', directory);
const expected = '308443a50e5c993e7b8a1cdb95750026';
async function checksum(path) {
  const hash = createHash('md5');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
await mkdir(directory, { recursive: true });
try {
  if (await stat(target).catch(() => null)) {
    if (await checksum(target) !== expected) throw new Error('reviews.csv zaten mevcut ve kaynak veriyle farklı. Dosyanız korunuyor; özel CSV için doğrudan npm run populate kullanın.');
    console.log('50.000 yorumluk CSV mevcut; sağlama toplamı doğrulandı.');
  } else {
    console.log('IMDb 50K veri kümesi indiriliyor (66 MB)…');
    try {
      const response = await fetch('https://zenodo.org/records/7929635/files/IMDB%20Dataset.csv?download=1', { signal: AbortSignal.timeout(60000) });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary));
    } catch {
      console.log('Birincil kaynak yanıt vermedi; aynı CSV için GitHub aynası deneniyor…');
      const response = await fetch('https://raw.githubusercontent.com/mcandemir/imdb-sentiment-analysis/master/IMDB%20Dataset.csv.zip', { signal: AbortSignal.timeout(240000) });
      if (!response.ok) throw new Error(`Alternatif indirme başarısız: HTTP ${response.status}`);
      const files = unzipSync(new Uint8Array(await response.arrayBuffer()), { filter: entry => entry.name === 'IMDB Dataset.csv' && entry.originalSize < 100000000 });
      if (!files['IMDB Dataset.csv']) throw new Error('Arşivde beklenen CSV bulunamadı.');
      await writeFile(temporary, files['IMDB Dataset.csv']);
    }
    if (await checksum(temporary) !== expected) throw new Error('Veri dosyasının sağlama toplamı beklenen değerle eşleşmedi.');
    await rename(temporary, target);
    console.log('scripts/data/reviews.csv hazır ve doğrulandı.');
  }
} catch (error) {
  await unlink(temporary).catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
}
