'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userRef = user ? doc(db, 'users', user.uid) : null;
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Define public routes that don't require authentication
  const isPublicRoute = pathname === '/' || pathname === '/login' || pathname === '/hall-of-champions';

  useEffect(() => {
    // Only redirect to login if it's not a public route and user is not authenticated
    if (!authLoading && !user && !isPublicRoute) {
      router.push('/login');
    }

    // Force setup if user is logged in but profile is incomplete
    if (!authLoading && user && !profileLoading && pathname !== '/setup' && pathname !== '/login') {
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

  // Handle specialized pages (login/setup)
  if (pathname === '/login' || pathname === '/setup') {
    return <>{children}</>;
  }

  // If unauthenticated on a public route, show children with header but no sidebar
  if (!user && isPublicRoute) {
    return (
      <div className="flex min-h-screen w-full bg-background/95 flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 glass-dark h-16 border-b border-white/5">
          <div className="container mx-auto h-full px-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-lg text-white glow-primary rotate-3">C</div>
              <span className="font-headline font-bold text-xl tracking-tight">CLASH <span className="text-primary italic">ARENA</span></span>
            </Link>
            <Link href="/login">
              <button className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full font-bold text-sm transition-all glow-primary hover:scale-105">
                ENTER ARENA
              </button>
            </Link>
          </div>
        </header>
        <main className="flex-1 pt-16">
          {children}
        </main>
        <footer className="py-12 border-t border-white/5 bg-black/40 text-center">
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-bold">© 2024 CLASH ARENA • COMPETITIVE ECOSYSTEM</p>
        </footer>
      </div>
    );
  }

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

import Link from 'next/link';
