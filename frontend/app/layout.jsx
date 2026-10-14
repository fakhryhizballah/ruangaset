import './globals.css';

export const metadata = {
  title: 'Pelacakan Aset IT RSUD',
  description: 'Sistem pelacakan aset ruangan, lokasi, kondisi, dan riwayat perubahan.',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#f5f7f4' };

export default function RootLayout({ children }) {
  return <html lang="id"><body>{children}</body></html>;
}
