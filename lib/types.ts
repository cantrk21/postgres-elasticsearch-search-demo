export type Review = { id: number; review: string; sentiment: string; score?: number };
export type Engine = 'postgres' | 'elasticsearch';
export type SearchResult = {
  engine: Engine; status: 'success' | 'error'; query: string; durationMs: number;
  total?: number; results?: Review[]; error?: string; engineTookMs?: number;
};
export type PanelState = { status: 'idle' | 'loading' } | SearchResult;
