import type { Metadata } from 'next';
import { Inter, Amiri } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FeedbackWidget } from '@/components/FeedbackWidget';
import { Providers } from '@/components/Providers';
import { ThemeProvider } from '@/components/ThemeProvider';
import { IslamicPattern } from '@/components/IslamicPattern';
import { PwaUpdateBanner } from '@/components/PwaUpdateBanner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const amiri = Amiri({
  weight: '400',
  subsets: ['arabic'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'My Hifdh Journey',
  description: 'Track your Quran memorization journey with intention, reflection, and progress',
  manifest: '/manifest.json',
  themeColor: '#1e293b',
  viewport: 'width=device-width, initial-scale=1',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${amiri.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-[#faf7f2] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <Providers>
            <IslamicPattern />
            <Navbar />
            <main className="flex min-h-[calc(100vh-5.5rem)] flex-col">{children}</main>
            <Footer />
            <FeedbackWidget />
            <PwaUpdateBanner />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
