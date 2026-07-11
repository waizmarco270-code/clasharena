
import type { Metadata } from 'next';
import './globals.css';
import './badge-anime.css';
import { FirebaseClientProvider } from '@/firebase';
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { NotificationHandler } from "@/components/notification-handler";
import { Analytics } from '@vercel/analytics/react';
import { PwaInstaller } from '@/components/pwa-installer';
import { ErrorBoundary } from '@/components/error-boundary';
import { ReferralTracker } from '@/components/referral-tracker';
import { Suspense } from 'react';
import { BanGuardian } from '@/components/auth/ban-guardian';
import fs from 'fs';
import path from 'path';
import { adminDb } from '@/lib/firebase-admin';

export async function generateMetadata(): Promise<Metadata> {
  const defaultTitle = 'CLASH ARENA | Compete. Win. Rise.';
  const defaultDesc = 'The ultimate Clash of Clans tournament platform. Compete, win tournaments, and claim your rewards at Clash Arena.';
  const defaultIcon = '/logo.png';

  // Check if public/logo.png exists
  const publicLogoPath = path.join(process.cwd(), 'public', 'logo.png');
  const hasLocalLogo = fs.existsSync(publicLogoPath);

  let iconUrl = defaultIcon;

  // Fallback to Firebase custom logo if firebase-admin is initialized
  if (!hasLocalLogo && adminDb) {
    try {
      const bgDoc = await adminDb.collection('app-settings').doc('backgrounds').get();
      if (bgDoc.exists) {
        const logo = bgDoc.data()?.logo;
        if (logo) {
          iconUrl = logo;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch custom logo metadata:", e);
    }
  }

  return {
    title: defaultTitle,
    description: defaultDesc,
    keywords: [
      'clash arena',
      'clash of clans tournament website',
      'clash of clans tournaments',
      'clash of clans rewards',
      'clash of clans game platform',
      'gaming tournament platform'
    ],
    metadataBase: new URL('https://clasharena.emitygate.com'),
    alternates: {
      canonical: '/',
    },
    icons: {
      icon: iconUrl,
      shortcut: iconUrl,
      apple: iconUrl,
    },
    openGraph: {
      title: defaultTitle,
      description: defaultDesc,
      images: [
        {
          url: iconUrl,
          width: 512,
          height: 512,
          alt: 'Clash Arena Logo',
        },
      ],
    },
  };
}

const IS_UNDER_MAINTENANCE = false;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (IS_UNDER_MAINTENANCE) {
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body className="font-body antialiased bg-black text-white selection:bg-orange-500 selection:text-white overflow-hidden">
          <div className="min-h-screen flex flex-col items-center justify-center p-4 relative z-10 overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-900/20 via-black to-black z-[-1]" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 z-[-1]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-600/10 blur-[120px] rounded-full z-[-1] animate-pulse" />
            
            <div className="max-w-2xl w-full bg-black/40 backdrop-blur-xl p-8 md:p-12 rounded-3xl border border-white/10 text-center relative shadow-2xl">
              <div className="mx-auto w-20 h-20 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-8 border border-orange-500/30 animate-bounce shadow-[0_0_30px_rgba(255,100,0,0.3)]">
                <svg className="w-10 h-10 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter mb-4 text-white drop-shadow-md">
                ARENA <span className="text-orange-500">MAINTENANCE</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed font-medium">
                Clash Arena is currently experiencing unprecedented high traffic! 🚀<br/>
                We are upgrading our servers to handle the massive demand and provide you with a smoother battle experience.
              </p>
              
              <div className="inline-block bg-orange-500/10 border border-orange-500/20 rounded-full px-6 py-3">
                <p className="text-orange-400 font-bold uppercase tracking-widest text-sm">
                  We will be back tomorrow!
                </p>
              </div>
              
              <div className="mt-12 text-xs font-black text-gray-500 uppercase tracking-[0.3em]">
                Please check back later • Clash Arena Protocol
              </div>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </head>
        <body className="font-body antialiased bg-background text-foreground selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <FirebaseClientProvider>
              <ErrorBoundary>
                <Suspense fallback={null}>
                  <ReferralTracker />
                </Suspense>
                <BanGuardian>
                  {children}
                </BanGuardian>
              </ErrorBoundary>
              <Toaster />
              <NotificationHandler />
              <PwaInstaller />
              <Analytics />
            </FirebaseClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
