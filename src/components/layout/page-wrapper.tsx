'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useFirestore, useProfile } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { useAuth, useUser } from "@clerk/nextjs";
import { MaintenanceGuard } from '@/components/maintenance-guard';


export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { user: clerkUser } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  // OPTIMIZATION: Use centralized profile from GlobalDataProvider
  const { profile, profileLoading } = useProfile();
  const userRef = useMemo(() => userId ? doc(db, 'users', userId) : null, [db, userId]);

  // Expanded public routes list
  const isPublicRoute = useMemo(() => {
    const publics = ['/', '/hall-of-champions', '/about', '/rules', '/fair-play', '/settings/faq', '/settings/support'];
    return publics.includes(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!userId || !userRef || !clerkUser || profileLoading) return;

    const syncIdentity = async () => {
      // Visibility Guard: Don't run background writes if the tab is hidden
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }

      const now = Date.now();
      const shouldSyncAvatar = clerkUser.imageUrl && profile && profile.avatarUrl !== clerkUser.imageUrl;
      const shouldSyncFcmFlag = profile && profile.fcmTokens && profile.fcmTokens.length > 0 && !profile.hasFcmToken;

      if (!shouldSyncAvatar && !shouldSyncFcmFlag) return;

      const updates: any = {};
      if (shouldSyncAvatar) updates.avatarUrl = clerkUser.imageUrl;
      if (shouldSyncFcmFlag) {
        updates.hasFcmToken = true;
      }

      try {
        await updateDoc(userRef, updates);
      } catch (e) {}
    };

    syncIdentity();
  }, [userId, clerkUser?.imageUrl, profileLoading, profile]);

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

  // Handle Public Page Layout (No Sidebar/Header needed for Landing, but needed for Rules/About etc)
  const isLandingOnly = pathname === '/';

  if (isLandingOnly && !userId) {
    return <div className="bg-black min-h-screen flex items-center justify-center w-full">{children}</div>;
  }

  return (
    <MaintenanceGuard>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-background">
          {userId && <AppSidebar />}
          <SidebarInset className="flex flex-col flex-1 min-w-0 bg-transparent">
            <Header />
            <main className="flex-1 pt-20 pb-24 md:pb-8 px-4 md:px-8 max-w-7xl mx-auto w-full overflow-x-hidden">
              {children}
            </main>
            {userId && <BottomNav />}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </MaintenanceGuard>
  );
}
