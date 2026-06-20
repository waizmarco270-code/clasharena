'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { useAuth, useUser } from "@clerk/nextjs";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userRef = userId ? doc(db, 'users', userId) : null;
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const isPublicRoute = pathname === '/' || pathname === '/hall-of-champions';

  useEffect(() => {
    // If auth is still loading, wait.
    if (!authLoaded) return;

    // IF LOGGED IN
    if (userId) {
      // Check if profile is missing critical data
      const isProfileIncomplete = !profile || !profile.username || !profile.tag || !profile.townHall;

      // Force to setup if profile is incomplete
      if (!profileLoading && isProfileIncomplete && pathname !== '/setup') {
        router.push('/setup');
      } 
      // If they have a profile but are stuck on landing or setup, send to arena
      else if (!profileLoading && !isProfileIncomplete && (pathname === '/setup' || pathname === '/')) {
        router.push('/arena');
      }
    } 
    // IF NOT LOGGED IN and trying to access restricted page
    else if (!isPublicRoute && authLoaded) {
      router.push('/');
    }
  }, [userId, authLoaded, profile, profileLoading, pathname, router, isPublicRoute]);

  // Global Loading State
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

  // Setup page is full screen
  if (pathname === '/setup') {
    return <div className="bg-background min-h-screen flex items-center justify-center w-full overflow-hidden">{children}</div>;
  }

  // Guests on Landing Page
  if (!userId && isPublicRoute) {
    return <div className="min-w-0 w-full bg-background">{children}</div>;
  }

  // Auth'd User with incomplete profile (prevent flicker while redirecting)
  if (userId && pathname !== '/setup' && (!profile || !profile.username)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-headline font-bold text-primary animate-pulse tracking-widest uppercase text-xs">Synchronizing Identity...</p>
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