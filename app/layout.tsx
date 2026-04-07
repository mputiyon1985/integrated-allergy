/**
 * @file app/layout.tsx — Root Next.js application layout
 *
 * Sets global HTML metadata (title, description, favicon) and wraps all pages
 * in the ClientLayout shell (sidebar + TopBar context provider).
 * This is the outermost layout that applies to every route in the application.
 */
import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from '@/components/layout/ClientLayout';

export const metadata: Metadata = {
  title: 'Integrated Allergy IMS',
  description: 'Clinical Allergy Immunotherapy Management System',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%', margin: 0 }}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
