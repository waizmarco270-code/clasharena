import { useState, useEffect, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

export function useUnreadArenasCount() {
  const db = useFirestore();
  const [lastVisit, setLastVisit] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize lastVisit on client-side mount
  useEffect(() => {
    let val = localStorage.getItem('last_arena_visit_time');
    if (!val) {
      val = new Date().toISOString();
      localStorage.setItem('last_arena_visit_time', val);
    }
    setLastVisit(val);
  }, []);

  // Query tournaments that are created after lastVisit
  const unreadTournamentsQuery = useMemo(() => {
    if (!lastVisit) return null;
    return query(
      collection(db, 'tournaments'),
      where('createdAt', '>', lastVisit)
    );
  }, [db, lastVisit]);

  const { data: tournaments } = useCollection(unreadTournamentsQuery);

  useEffect(() => {
    if (!tournaments) return;
    setUnreadCount(tournaments.length);
  }, [tournaments]);

  useEffect(() => {
    const handleUpdate = () => {
      const val = localStorage.getItem('last_arena_visit_time');
      if (val) {
        setLastVisit(val);
      }
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('arena_visited', handleUpdate);

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('arena_visited', handleUpdate);
    };
  }, []);

  return unreadCount;
}
