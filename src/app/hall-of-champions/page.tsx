'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HallOfChampionsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hall-of-champions/main');
  }, [router]);

  return null;
}
