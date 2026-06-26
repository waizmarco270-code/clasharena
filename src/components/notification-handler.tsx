'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Bell, X, ShieldAlert, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function NotificationHandler() {
  const { user } = useUser();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const setupNotifications = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
      console.log('Push notifications are not supported in this browser.');
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!vapidKey) {
      console.log('Push notifications registration skipped: NEXT_PUBLIC_VAPID_KEY env is empty.');
      return;
    }

    try {
      // Register our FCM background service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      
      console.log('Messaging service worker registration active.');

      // Dynamically import Firebase scripts to avoid Next.js compile/SSR errors
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { getMessaging, getToken } = await import('firebase/messaging');
      const { firebaseConfig } = await import('@/firebase/config');

      // Initialize client-side app instance
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      // Request FCM Registration Token using public VAPID certificate
      const token = await getToken(messaging, {
        vapidKey: vapidKey.trim(),
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('FCM registration token acquired.');
        
        // Store the token and subscribe the device to the broadcast topic
        await fetch('/api/notifications/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, token })
        });
      }
    } catch (err) {
      console.warn('FCM registration initialization failed:', err);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Check if permission is already granted
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        setShowPrompt(true);
      } else {
        // If already granted, set up background listeners directly
        setupNotifications();
      }
    }
  }, [user]);

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    setIsProcessing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShowPrompt(false);
        toast({
          title: "Alerts Activated 🔔",
          description: "You will now receive instant tournament updates and rewards alerts.",
        });
        await setupNotifications();
      } else {
        toast({
          variant: "destructive",
          title: "Notifications Blocked ❌",
          description: "Please enable notifications in your browser settings to receive alerts.",
        });
      }
    } catch (error) {
      console.error("Error requesting notifications:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="glass border-primary/40 max-w-md p-8 overflow-hidden outline-none rounded-[2.5rem] bg-zinc-950/95 text-center [&>button]:hidden">
        <DialogTitle className="sr-only">Activate Push Notifications</DialogTitle>
        <DialogDescription className="sr-only">
          To receive tournament check-ins, reward redemptions, and coins balance updates, enable alerts.
        </DialogDescription>
        
        {/* Glowing background elements */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button 
          onClick={handleDismiss} 
          className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors p-2 rounded-full hover:bg-white/5 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Glowing Notification Bell Icon */}
        <div className="relative mx-auto mb-6 w-20 h-20 rounded-full border-2 border-primary/50 bg-zinc-900 flex items-center justify-center shadow-[0_0_24px_rgba(255,69,0,0.4)] animate-pulse pointer-events-none">
          <Bell className="w-10 h-10 text-primary drop-shadow-[0_0_8px_rgba(255,69,0,0.5)]" />
          <div className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full animate-bounce">
            <Sparkles className="w-3 h-3 fill-white" />
          </div>
        </div>

        {/* Alert Content */}
        <h3 className="font-headline text-2xl font-black uppercase italic tracking-tight text-white mb-2 leading-none">
          ACTIVATE <span className="text-primary">NOTIFICATIONS</span>
        </h3>
        <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase mb-4">
          CRITICAL ACTION REQUIRED
        </p>

        {/* COC Legendary Notice Box */}
        <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-5 mb-6 text-left space-y-2 pointer-events-auto">
          <p className="text-xs text-white font-semibold leading-relaxed">
            ⚠️ To receive latest updates related to <span className="text-primary font-black uppercase">Tournaments</span>, claiming your <span className="text-yellow-500 font-black uppercase">Rewards</span>, and coin <span className="text-emerald-500 font-black uppercase">Recharges</span>, you must enable push notifications.
          </p>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Missing match alerts will result in automatic disqualification or delayed reward fulfillment.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pointer-events-auto">
          <Button 
            disabled={isProcessing}
            onClick={handleRequestPermission} 
            className="w-full bg-gradient-to-r from-red-600 to-primary hover:from-red-600/90 hover:to-primary/90 text-white font-black py-6 rounded-2xl glow-primary border-t border-white/20 uppercase tracking-widest text-xs shadow-2xl animate-shimmer"
          >
            {isProcessing ? "ACTIVATING..." : "ALLOW NOTIFICATIONS"}
          </Button>
          <button 
            onClick={handleDismiss} 
            className="text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:text-white transition-colors mt-2"
          >
            I'LL RISK IT, CLOSE
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
