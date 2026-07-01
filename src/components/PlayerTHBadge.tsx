'use client';

import { useState, useEffect } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

// Global cache to prevent redundant reads across rows for the same user
const thCache: Record<string, number> = {};

export function PlayerTHBadge({ userId }: { userId: string }) {
  const db = useFirestore();
  const [th, setTh] = useState<number | null>(thCache[userId] || null);

  useEffect(() => {
    if (!userId || thCache[userId] !== undefined) return;
    
    let isMounted = true;
    getDoc(doc(db, 'users', userId)).then((snap) => {
      if (snap.exists() && isMounted) {
        const level = snap.data().townHall || 0;
        thCache[userId] = level;
        setTh(level);
      } else if (!snap.exists() && isMounted) {
        thCache[userId] = 0;
        setTh(0);
      }
    }).catch(console.error);

    return () => { isMounted = false; };
  }, [userId, db]);

  if (th === null) return <span className="text-[10px] text-muted-foreground animate-pulse ml-2">...</span>;
  if (th === 0) return null;
  
  return (
    <span className="inline-flex items-center justify-center font-black text-[9px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2 py-0.5 rounded-full ml-2">
      TH {th}
    </span>
  );
}
