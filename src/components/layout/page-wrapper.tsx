
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { useAuth } from "@clerk/nextjs";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Profile data
  const userRef = userId ? doc(db, 'users', userId) : null;
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const isPublicRoute = pathname === '/' || pathname === '/hall-of-champions';

  useEffect(() => {
    if (!authLoaded || isRedirecting) return;

    // Handle Guests
    if (!userId) {
      if (!isPublicRoute) {
        setIsRedirecting(true);
        router.push('/');
      }
      return;
    }

    // Handle Authenticated Users
    const isProfileIncomplete = !profileLoading && (!profile || !profile.username || !profile.tag);
    
    // Redirect from landing page
    if (pathname === '/') {
      setIsRedirecting(true);
      router.push('/setup');
      return;
    }

    // Force setup if incomplete
    if (!profileLoading && isProfileIncomplete && pathname !== '/setup' && !isPublicRoute) {
      setIsRedirecting(true);
      router.push('/setup');
    } 
    // Redirect away from setup if complete
    else if (!profileLoading && !isProfileIncomplete && pathname === '/setup') {
      setIsRedirecting(true);
      router.push('/dashboard');
    }

  }, [userId, authLoaded, profile, profileLoading, pathname, router, isPublicRoute, isRedirecting]);

  // Global Auth Loading State
  if (!authLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-primary/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-headline font-black text-primary text-2xl">C</span>
          </div>
        </div>
      </div>
    );
  }

  // Full screen pages
  if (pathname === '/setup' || (pathname === '/' && !userId)) {
    return <div className="bg-black min-h-screen flex items-center justify-center w-full">{children}</div>;
  }

  // Handle protected layout flicker
  if (userId && (pathname === '/' || isRedirecting)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-headline font-bold text-primary animate-pulse tracking-widest uppercase text-xs italic">
            SYNCHRONIZING IDENTITY...
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0 bg-transparent">
          <Header />
          <main className="flex-1 pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-7xl mx-auto w-full overflow-x-hidden">
            {children}
          </main>
          <BottomNav />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
