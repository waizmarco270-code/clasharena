import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

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

  // Fetch count once when lastVisit changes or is set
  useEffect(() => {
    if (!lastVisit) return;
    
    const fetchUnreadCount = async () => {
      try {
        const q = query(
          collection(db, 'tournaments'),
          where('createdAt', '>', lastVisit)
        );
        const snapshot = await getCountFromServer(q);
        setUnreadCount(snapshot.data().count);
      } catch (err) {
        console.warn('Failed to fetch unread arenas count:', err);
      }
    };
    
    fetchUnreadCount();
  }, [db, lastVisit]);

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

