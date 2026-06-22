
'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { useAuth, useUser } from "@clerk/nextjs";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userRef = useMemo(() => userId ? doc(db, 'users', userId) : null, [db, userId]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const isPublicRoute = pathname === '/' || pathname === '/hall-of-champions';
  const lastUpdateRef = useRef<number>(0);

  // Avatar and Identity Sync Logic - Optimized to prevent infinite loops and save quota
  useEffect(() => {
    // Only run if user is loaded and not currently loading the profile from Firestore
    if (!userId || !userRef || !clerkUser || profileLoading) return;

    const syncIdentity = async () => {
      const now = Date.now();
      // Throttle updates: Only update heartbeats every 15 minutes to save Firestore writes/reads
      // 15 mins = 15 * 60 * 1000 = 900,000 ms
      const shouldSyncAvatar = clerkUser.imageUrl && profile && profile.avatarUrl !== clerkUser.imageUrl;
      const shouldUpdateHeartbeat = now - lastUpdateRef.current > 15 * 60 * 1000;

      if (!shouldSyncAvatar && !shouldUpdateHeartbeat) return;

      const updates: any = {};
      if (shouldSyncAvatar) updates.avatarUrl = clerkUser.imageUrl;
      if (shouldUpdateHeartbeat) updates.lastActive = new Date().toISOString();

      try {
        await updateDoc(userRef, updates);
        lastUpdateRef.current = now;
      } catch (e) {
        // Silently handle errors (likely quota or permissions)
      }
    };

    syncIdentity();
    // Heartbeat check every 15 minutes while the app is open
    const interval = setInterval(syncIdentity, 15 * 60 * 1000);
    return () => clearInterval(interval);
    
    // CRITICAL: Removed 'profile' from dependencies to break the update -> re-render -> update loop
    // Only depend on values that don't change constantly or are managed outside Firestore update
  }, [userId, clerkUser?.imageUrl, profileLoading]);

  useEffect(() => {
    if (!authLoaded) return;

    if (!userId) {
      if (!isPublicRoute) {
        router.push('/');
      }
      return;
    }

    if (pathname === '/') {
      router.push('/dashboard');
    }
  }, [userId, authLoaded, pathname, router, isPublicRoute]);

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

  if (!userId && !isPublicRoute) {
    return null;
  }

  if (pathname === '/' && !userId) {
    return <div className="bg-black min-h-screen flex items-center justify-center w-full">{children}</div>;
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
