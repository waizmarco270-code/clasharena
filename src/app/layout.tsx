
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
                {children}
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
