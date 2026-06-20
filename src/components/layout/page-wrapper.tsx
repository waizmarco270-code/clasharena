
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Header } from './header';
import { BottomNav } from './bottom-nav';

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userRef = user ? doc(db, 'users', user.uid) : null;
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  useEffect(() => {
    if (!authLoading && !user && pathname !== '/login') {
      router.push('/login');
    }

    if (!authLoading && user && !profileLoading && pathname !== '/setup') {
      if (!profile || !profile.username || !profile.tag || !profile.townHall) {
        router.push('/setup');
      }
    }
  }, [user, authLoading, profile, profileLoading, pathname, router]);

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Allow login and setup pages to render without standard layout
  if (pathname === '/login' || pathname === '/setup') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col pt-16 pb-20 md:pb-0">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
