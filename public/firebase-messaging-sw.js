importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase App in Service Worker context
firebase.initializeApp({
  apiKey: "AIzaSyDKtuQ5McByifhpP-S7HZomgGaeE9Z6c_8",
  authDomain: "studio-7760131290-2f246.firebaseapp.com",
  projectId: "studio-7760131290-2f246",
  storageBucket: "studio-7760131290-2f246.firebasestorage.app",
  messagingSenderId: "908446470262",
  appId: "1:908446470262:web:432b1c95a6b617fc450f57"
});

const messaging = firebase.messaging();

// Handle notification display in background/closed app state
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message payload: ', payload);

  const title = payload.notification?.title || "CLASH ARENA INTEL";
  const options = {
    body: payload.notification?.body || "New notification received.",
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {},
  };

  self.registration.showNotification(title, options);
});
