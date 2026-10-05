import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Database Search Comparison', description: 'PostgreSQL ILIKE ve Elasticsearch arama karşılaştırması' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
