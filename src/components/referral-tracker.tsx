'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      // Store the referral code in localStorage. It will be sent during profile setup/update.
      localStorage.setItem('clash_arena_ref', ref);
    }
  }, [searchParams]);

  return null;
}
