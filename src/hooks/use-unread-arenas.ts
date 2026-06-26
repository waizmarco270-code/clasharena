import { useState, useEffect, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export function useUnreadArenasCount() {
  const db = useFirestore();
  const [unreadCount, setUnreadCount] = useState(0);

  // Query tournaments that are open or upcoming (non-completed)
  const activeTournamentsQuery = useMemo(() => query(
    collection(db, 'tournaments'),
    where('status', 'in', ['upcoming', 'open'])
  ), [db]);

  const { data: tournaments } = useCollection(activeTournamentsQuery);

  useEffect(() => {
    if (!tournaments) return;

    const updateCount = () => {
      const lastVisitStr = localStorage.getItem('last_arena_visit_time');
      if (!lastVisitStr) {
        // If the user has never visited, set it to the current time so they start clean
        localStorage.setItem('last_arena_visit_time', new Date().toISOString());
        setUnreadCount(0);
        return;
      }

      const lastVisitTime = new Date(lastVisitStr).getTime();
      const newArenas = tournaments.filter(t => {
        const createdTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
        return createdTime > lastVisitTime;
      });

      setUnreadCount(newArenas.length);
    };

    updateCount();

    // Listen to storage events (multi-tab sync) and local custom events
    window.addEventListener('storage', updateCount);
    window.addEventListener('arena_visited', updateCount);

    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('arena_visited', updateCount);
    };
  }, [tournaments]);

  return unreadCount;
}
