'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';

/**
 * PageWrapper acts as the global gatekeeper for the application.
 * It handles:
 * 1. Authentication guards for private routes.
 * 2. Mandatory profile setup redirection for new users.
 * 3. Consistent layout (Sidebar/Header) for authenticated sections.
 */
export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userRef = user ? doc(db, 'users', user.uid) : null;
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const isPublicRoute = pathname === '/' || pathname === '/hall-of-champions';

  useEffect(() => {
    // 1. If the user is NOT logged in and trying to access a private route, send to Home
    if (!authLoading && !user && !isPublicRoute) {
      router.push('/');
      return;
    }

    // 2. If the user IS logged in but hasn't completed their Arena Identity, force Setup
    if (!authLoading && user && !profileLoading && pathname !== '/setup') {
      const isProfileIncomplete = !profile || !profile.username || !profile.tag || !profile.townHall;
      if (isProfileIncomplete) {
        router.push('/setup');
      }
    }
  }, [user, authLoading, profile, profileLoading, pathname, router, isPublicRoute]);

  // Handle initialization and profile loading states
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_hsla(var(--primary),0.5)]" />
          <div className="absolute inset-0 flex items-center justify-center font-headline font-black text-primary text-xl">C</div>
        </div>
      </div>
    );
  }

  // Setup page renders as a standalone full-screen experience
  if (pathname === '/setup') {
    return <div className="bg-background min-h-screen flex items-center justify-center w-full">{children}</div>;
  }

  // Public/Marketing view for guest users
  if (!user && isPublicRoute) {
    return <div className="min-w-0 w-full">{children}</div>;
  }

  // Standard App Layout for authenticated users
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background/95">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 bg-transparent">
          <Header />
          <main className="flex-1 pt-20 pb-20 md:pb-6 px-4 md:px-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
          <BottomNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
