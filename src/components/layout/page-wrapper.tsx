
'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDoc, useFirestore } from '@/firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
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

  // Avatar and Identity Sync Logic
  useEffect(() => {
    if (!userId || !userRef || !clerkUser || profileLoading) return;

    const syncIdentity = async () => {
      // Check if avatar has changed on Clerk
      if (clerkUser.imageUrl && profile && profile.avatarUrl !== clerkUser.imageUrl) {
        try {
          await updateDoc(userRef, {
            avatarUrl: clerkUser.imageUrl,
            lastActive: new Date().toISOString()
          });
        } catch (e) {
          // Fail silently
        }
      } else {
        // Just update heartbeat
        try {
          await updateDoc(userRef, {
            lastActive: new Date().toISOString()
          });
        } catch (e) {
          // Fail silently
        }
      }
    };

    syncIdentity();
    const interval = setInterval(syncIdentity, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, clerkUser, profile, profileLoading]);

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

  // Strict Redirect for unauthenticated users on private routes
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
