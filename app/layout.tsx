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
import { AuthProvider } from '@/components/AuthProvider';
import { QueryProvider } from '@/components/QueryProvider';
import { SignInPromptProvider } from '@/components/SignInPrompt';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const amiri = Amiri({
  weight: '400',
  subsets: ['arabic'],
  variable: '--font-display',
});

const TITLE = 'Hifz yo\'lim — Qur\'on yodlash yo\'ldoshi';
const DESCRIPTION = 'Qur\'on yodlashni niyat, mulohaza va aniq progress bilan kuzatib boring: xarita, kundalik, haftalik reja va yoddan o\'qishni tinglovchi yordamchi.';

export const metadata: Metadata = {
  metadataBase: new URL('https://hifz.uz'),
  openGraph: { type: 'website', siteName: 'Hifz yo\'lim', locale: 'uz_UZ', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  title: 'Hifz yo\'lim — Qur\'on yodlash yo\'ldoshi',
  description: 'Qur\'on yodlashni niyat, mulohaza va aniq progress bilan kuzatib boring: xarita, kundalik, haftalik reja va yoddan o\'qishni tinglovchi yordamchi.',
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
    <html lang="uz" className={`${inter.variable} ${amiri.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-[#faf7f2] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <Providers>
            <QueryProvider>
              <AuthProvider>
                <SignInPromptProvider>
                  <IslamicPattern />
                  <Navbar />
                  <main className="flex min-h-[calc(100vh-5.5rem)] flex-col">{children}</main>
                  <Footer />
                  <FeedbackWidget />
                  <PwaUpdateBanner />
                </SignInPromptProvider>
              </AuthProvider>
            </QueryProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
