
'use client';

/**
 * OPTIMIZATION: Stabilized collection hook
 * 
 * Uses a serialized query key for the useEffect dependency instead of the
 * raw Query object reference. This prevents infinite re-subscription when
 * the Query has identical logical content but a different object identity
 * (which happens on every render when useMemo deps include objects).
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import {
  Query,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

/** Serialize a Firestore Query to a stable string key for dependency tracking */
function getQueryKey(q: Query | null): string {
  if (!q) return '__null__';
  try {
    const internal = q as any;
    const path = internal._query?.path?.toString?.() || internal.path || '';
    // Include filter/order info to differentiate queries on the same collection
    const filters = JSON.stringify(internal._query?.filters || []);
    const orders = JSON.stringify(internal._query?.explicitOrderBy || []);
    const limitVal = internal._query?.limit || '';
    return `${path}|${filters}|${orders}|${limitVal}`;
  } catch {
    return String(q);
  }
}

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stable key prevents re-subscription when Query object identity changes
  const queryKey = useMemo(() => getQueryKey(query as any), [query]);
  // Keep a ref to the latest query so the snapshot callback uses the current one
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    const currentQuery = queryRef.current;
    if (!currentQuery) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      currentQuery,
      (snapshot: QuerySnapshot<T>) => {
        const docs = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(docs);
        setLoading(false);
        setError(null);
      },
      async (serverError: any) => {
        if (serverError?.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: (currentQuery as any)._query?.path?.toString() || 'unknown',
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);
        } else {
          console.warn('Firestore Collection Error:', serverError);
          setError(serverError);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  return { data, loading, error };
}
