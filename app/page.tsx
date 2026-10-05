'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SearchResultsDisplay } from '@/components/search-results-display';
import type { Engine, PanelState, SearchResult } from '@/lib/types';

const initial: Record<Engine, PanelState> = { postgres: { status: 'idle' }, elasticsearch: { status: 'idle' } };
export default function Home() {
  const [term, setTerm] = useState('');
  const [mode, setMode] = useState('video');
  const [panels, setPanels] = useState(initial);
  const [notice, setNotice] = useState('');
  const [health, setHealth] = useState('Bağlantılar kontrol ediliyor…');
  const active = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal }).then(r => r.json()).then(data => {
      setHealth(data.ready ? `Her iki sistemde ${data.postgres.toLocaleString('tr-TR')} yorum hazır.` : `PostgreSQL: ${data.postgres ?? 'bağlı değil'} · Elasticsearch: ${data.elasticsearch ?? 'bağlı değil'}. Kurulum için README dosyasına bakın.`);
    }).catch(() => { if (!controller.signal.aborted) setHealth('Bağlantı kontrolü başarısız. README dosyasındaki kurulum adımlarını izleyin.'); });
    return () => { controller.abort(); active.current?.abort(); };
  }, []);
  async function search(event: FormEvent) {
    event.preventDefault();
    const searchTerm = term.trim();
    if (!searchTerm) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const current = ++sequence.current;
    const received = new Set<Engine>();
    setNotice('');
    setPanels({ postgres: { status: 'loading' }, elasticsearch: { status: 'loading' } });
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ searchTerm, mode }), signal: controller.signal });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || 'İstek başarısız.'); }
      if (!response.body) throw new Error('Sonuç akışı bulunamadı.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';
      function consume(line: string) {
        if (!line.trim() || current !== sequence.current) return;
        const result: SearchResult = JSON.parse(line);
        received.add(result.engine);
        setPanels(previous => ({ ...previous, [result.engine]: result }));
      }
      while (true) {
        const { value, done } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split('\n');
        pending = lines.pop() || '';
        lines.forEach(consume);
        if (done) { consume(pending); break; }
      }
      if (received.size !== 2) throw new Error('Sonuç akışı erken kapandı. Tekrar deneyin.');
    } catch (error) {
      if (current !== sequence.current) return;
      const message = controller.signal.aborted ? 'İstek zaman aşımına uğradı. Servisleri kontrol edip tekrar deneyin.' : error instanceof Error ? error.message : 'Arama başarısız.';
      setNotice(message);
      setPanels(previous => {
        const next = { ...previous };
        for (const engine of ['postgres', 'elasticsearch'] as const) if (!received.has(engine)) next[engine] = { engine, status: 'error', query: searchTerm, durationMs: 0, error: message };
        return next;
      });
    } finally { clearTimeout(timer); }
  }
  return <main>
    <header><h1>Database Search Comparison</h1><p>Compare search performance between Postgres (ILIKE) and Elasticsearch (query_string). Results appear instantly as they complete.</p></header>
    <form className="card search-card" onSubmit={search}>
      <label htmlFor="search">Search Reviews</label><p className="helper">Enter a term to search in the review texts.</p>
      <div className="search-row"><input id="search" placeholder="e.g., 'movie', 'product quality', 'customer service'" value={term} onChange={e => setTerm(e.target.value)} maxLength={200} required autoComplete="off"/><button type="submit" disabled={!term.trim()}>Search</button></div>
      <div className="options"><label htmlFor="mode">Elasticsearch modu</label><select id="mode" value={mode} onChange={e => setMode(e.target.value)}><option value="video">Videodaki gibi · query_string (*terim*)</option><option value="fulltext">Tam metin · match (AND)</option></select><span className="health">{health}</span></div>
    </form>
    {notice && <p role="alert" className="error">{notice}</p>}
    <div className="results-grid"><SearchResultsDisplay title="PostgreSQL · ILIKE" state={panels.postgres}/><SearchResultsDisplay title="Elasticsearch" state={panels.elasticsearch}/></div>
    <details className="explanation"><summary>Bu karşılaştırmayı nasıl okumalıyım?</summary><p>Her iki sorgu aynı anda başlar; biten sonuç diğerini beklemeden gösterilir. Aynı veri kümesindeki tüm eşleşmeler sayılır ve ilk 20 yorum döndürülür. PostgreSQL tarafında metin arama indeksi bulunmaz.</p><p>ILIKE alt metin arar. Elasticsearch query_string ise analiz edilmiş kelimeler üzerinde çalışır; özellikle birden fazla kelimede sonuç sayıları farklı olabilir. Tam metin modu kelime bazında AND araması yapar. Bunlar her sorguda aynı anlama gelen aramalar değildir.</p><p>Süreler gerçek ölçümlerdir; ağ, önbellek, veri büyüklüğü ve ilk bağlantı etkiler. Aynı sorguyu birkaç kez deneyin. Bu deney, indeksli PostgreSQL tam metin aramasına karşı bir kıyaslama değildir ve Elasticsearch’ün her zaman daha hızlı olacağını varsaymaz.</p></details>
    <footer>Next.js · PostgreSQL · Elasticsearch <span>Yerel arama laboratuvarı</span></footer>
  </main>;
}
