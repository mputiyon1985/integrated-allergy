import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Integrated Allergy IMS',
  description: 'Clinical Allergy Immunotherapy Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0 }}>
        <Sidebar />
        <div className="main-layout">
          {children}
        </div>
      </body>
    </html>
  );
}
