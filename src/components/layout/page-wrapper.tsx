'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import Link from 'next/link';

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userRef = user ? doc(db, 'users', user.uid) : null;
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Define public routes that don't require authentication
  const isPublicRoute = pathname === '/' || pathname === '/hall-of-champions';

  useEffect(() => {
    // Only redirect to home if it's not a public route and user is not authenticated
    if (!authLoading && !user && !isPublicRoute) {
      router.push('/');
    }

    // Force setup if user is logged in but profile is incomplete
    // Don't force redirect if they are already on the setup page
    if (!authLoading && user && !profileLoading && pathname !== '/setup') {
      if (!profile || !profile.username || !profile.tag || !profile.townHall) {
        router.push('/setup');
      }
    }
  }, [user, authLoading, profile, profileLoading, pathname, router, isPublicRoute]);

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(255,69,0,0.5)]" />
        </div>
      </div>
    );
  }

  // Handle setup page separately
  if (pathname === '/setup') {
    return <>{children}</>;
  }

  // If unauthenticated on a public route, show children with guest-friendly layout
  if (!user && isPublicRoute) {
    return (
      <div className="flex min-h-screen w-full bg-background/95 flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 glass-dark h-16 border-b border-white/5">
          <div className="container mx-auto h-full px-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-lg text-white glow-primary rotate-3">C</div>
              <span className="font-headline font-bold text-xl tracking-tight">CLASH <span className="text-primary italic">ARENA</span></span>
            </Link>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  // Authenticated layout with Sidebar
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