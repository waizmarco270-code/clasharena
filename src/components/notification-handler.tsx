'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';

export function NotificationHandler() {
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const setupNotifications = async () => {
      // 1. Check browser capabilities
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
        console.log('Push notifications are not supported in this browser.');
        return;
      }

      try {
        // 2. Request browser permission to show notifications
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Web Push permission not granted.');
          return;
        }

        // 3. Register our FCM background service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        
        console.log('Messaging service worker registration active.');

        // 4. Dynamically import Firebase scripts to avoid Next.js compile/SSR errors
        const { initializeApp, getApps, getApp } = await import('firebase/app');
        const { getMessaging, getToken } = await import('firebase/messaging');
        const { firebaseConfig } = await import('@/firebase/config');

        // 5. Initialize client-side app instance
        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        // 6. Request FCM Registration Token using our public VAPID certificate
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
          serviceWorkerRegistration: registration
        });

        if (token) {
          console.log('FCM registration token acquired.');
          
          // 7. Store the token and subscribe the device to the broadcast topic
          await fetch('/api/notifications/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, token })
          });
        }
      } catch (err) {
        console.warn('FCM registration initialization failed:', err);
      }
    };

    // Delay initialization slightly to prioritize main page paint resources
    const delayTimer = setTimeout(() => {
      setupNotifications();
    }, 2000);

    return () => clearTimeout(delayTimer);
  }, [user]);

  return null;
}
