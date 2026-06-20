'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { useAuth } from "@clerk/nextjs";

/**
 * PageWrapper handles the global authentication and profile state.
 * It ensures that users are redirected to the correct location based on their auth status.
 */
export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  // We fetch the profile here
  const userRef = userId ? doc(db, 'users', userId) : null;
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const isPublicRoute = pathname === '/' || pathname === '/hall-of-champions';

  useEffect(() => {
    if (!authLoaded) return;

    // IF NOT LOGGED IN
    if (!userId) {
      if (!isPublicRoute) {
        router.push('/');
      }
    } 
    // IF LOGGED IN
    else {
      // 1. Force to setup if on landing page
      if (pathname === '/') {
        router.push('/setup');
        return;
      }
      
      // 2. Gatekeeping: Only check profile completion if we aren't already on setup or a public route
      if (pathname !== '/setup' && !isPublicRoute) {
        // If we know for sure the profile is incomplete, push to setup
        const isIncomplete = !profileLoading && (!profile || !profile.username || !profile.tag);
        if (isIncomplete) {
          router.push('/setup');
        }
      }
      
      // 3. If profile is complete and they ARE on setup, force them to arena
      const isComplete = !profileLoading && profile && profile.username && profile.tag;
      if (isComplete && pathname === '/setup') {
        router.push('/arena');
      }
    }
  }, [userId, authLoaded, profile, profileLoading, pathname, router, isPublicRoute]);

  // Global Loading State (Initial Auth Check)
  if (!authLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_30px_hsla(var(--primary),0.5)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-headline font-black text-primary text-2xl animate-pulse">C</span>
          </div>
        </div>
      </div>
    );
  }

  // Setup page is full screen and handled independently
  if (pathname === '/setup') {
    return <div className="bg-background min-h-screen flex items-center justify-center w-full overflow-hidden">{children}</div>;
  }

  // Guests on Landing Page / Public Pages
  if (!userId && isPublicRoute) {
    return <div className="min-w-0 w-full bg-background">{children}</div>;
  }

  // Prevent flicker for logged in users on landing page while redirecting
  if (userId && pathname === '/') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-headline font-bold text-primary animate-pulse tracking-widest uppercase text-xs">Entering the Arena...</p>
        </div>
      </div>
    );
  }

  // Standard Protected Layout
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
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