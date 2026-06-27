'use client';

import React, { useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { GlobalDataProvider } from './global-data-provider';
import { initializeFirebase } from './index';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseApp, firestore, auth } = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
      <GlobalDataProvider>
        {children}
      </GlobalDataProvider>
    </FirebaseProvider>
  );
}

