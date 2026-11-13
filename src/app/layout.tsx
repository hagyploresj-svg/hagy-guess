import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'HAGY GUESS — Dünyayı tahmin et',
  description: 'Sokak görüntülerinden konumu tahmin et. Ücretsiz, sınırsız, tek veya çok oyunculu.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#020617' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
