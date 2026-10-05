import type { PanelState } from '@/lib/types';
import { duration } from '@/lib/utils';
import { SearchIcon } from './ui/search-icon';
export function SearchResultsDisplay({ title, state }: { title: string; state: PanelState }) {
  return <section className="card result-card" aria-label={title} aria-live="polite" aria-busy={state.status === 'loading'}>
    <div className="panel-heading"><SearchIcon/><h2>{state.status === 'idle' ? 'Waiting for search…' : title}</h2>{state.status === 'loading' && <span className="spinner"/>}</div>
    {state.status === 'idle' && <p className="empty">Enter a search term and click &quot;Search&quot; to see results.</p>}
    {state.status === 'loading' && <p className="empty">Arama devam ediyor…</p>}
    {state.status === 'error' && <div className="error" role="alert">{state.error}</div>}
    {state.status === 'success' && <>
      <div className="metrics"><strong>{duration(state.durationMs)}</strong><span>{state.total?.toLocaleString('tr-TR')} sonuç</span></div>
      <p className="caption">Sunucudan veritabanına gidiş-dönüş + sonuç okuma süresi.{state.engineTookMs !== undefined && ` Elasticsearch took: ${duration(state.engineTookMs)}.`}</p>
      <p className="caption">“{state.query}” · İlk {state.results?.length} sonuç{state.engine === 'elasticsearch' ? ' · ilgililik sırası' : ' · ID sırası'}</p>
      {!state.total && <p className="empty">Sonuç bulunamadı.</p>}
      <div className="reviews">{state.results?.map(review => <article className="review" key={review.id}>
        <div className="review-meta"><span>#{review.id}</span><span className={`badge ${review.sentiment === 'positive' ? 'positive' : 'negative'}`}>{review.sentiment}</span>{review.score !== undefined && <span>Skor: {review.score.toFixed(2)}</span>}</div>
        <p>{review.review.replace(/<br\s*\/?\s*>/gi, '\n')}</p>
      </article>)}</div>
    </>}
  </section>;
}
