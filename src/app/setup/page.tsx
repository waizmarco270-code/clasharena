'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Setup page is now handled via modal on the dashboard.
 * This page redirects any legacy traffic to the dashboard.
 */
export default function ProfileSetupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-black">
      <div className="text-center animate-pulse">
        <p className="text-primary font-black uppercase tracking-widest italic">Redirecting to Command Hub...</p>
      </div>
    </div>
  );
}
