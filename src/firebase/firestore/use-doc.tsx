'use client';

/**
 * OPTIMIZATION: Stabilized document hook
 * 
 * Uses the DocumentReference path string for the useEffect dependency
 * instead of the raw object reference. Prevents re-subscription thrashing.
 */

import { useEffect, useState, useRef, useMemo } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { convertTimestamps } from './use-collection';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T = DocumentData>(docRef: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stable key: use the document path string instead of object reference
  const refKey = useMemo(() => docRef?.path ?? '__null__', [docRef]);
  const docRefRef = useRef(docRef);
  docRefRef.current = docRef;

  useEffect(() => {
    const currentRef = docRefRef.current;
    if (!currentRef) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      currentRef,
      (snapshot: DocumentSnapshot<T>) => {
        if (snapshot.exists()) {
          setData(convertTimestamps(snapshot.data()));
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      async (serverError: any) => {
        // Only report as permission error if it actually is one
        if (serverError?.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: currentRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
          setError(permissionError);
        } else {
          // Log other errors (like network "Failed to fetch") without triggering the permission overlay
          console.warn('Firestore Subscription Error:', serverError);
          setError(serverError);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey]);

  return { data, loading, error };
}

