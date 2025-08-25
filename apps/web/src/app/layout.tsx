import './globals.css';
import { Inter } from 'next/font/google';
import AuthProvider from '@/components/providers/auth-provider';
import Navbar from '@/components/layout/navbar';
import type { ReactNode } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AgriMRV - Agricultural Carbon Monitoring',
  description: 'Monitor, Report, and Verify carbon sequestration in agriculture',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <AuthProvider>
          <Navbar />
          <div className="pt-4">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
