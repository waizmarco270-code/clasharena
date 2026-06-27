
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Shield, Wallet, CheckCircle2, Bell, X, Megaphone, Calendar } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useFirestore, useProfile, useBackgrounds, useAnnouncements, useAdminStatus } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { UserButton, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from 'next/image';
import { AppLogoImage } from '@/components/ui/app-logo-image';
import { Badge } from '@/components/ui/badge';
import { getRankByWins, getRankByType, RankType } from '@/lib/rank-utils';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export function Header() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // OPTIMIZATION: Use centralized providers (eliminates 3 independent listeners)
  const { backgrounds: bgData } = useBackgrounds();
  const { profile } = useProfile();
  const { announcements } = useAnnouncements();
  const { isAdmin, isSuperAdmin } = useAdminStatus();

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);

  const notificationsOn = useMemo(() => {
    return typeof window !== 'undefined' && 
           'Notification' in window && 
           Notification.permission === 'granted' && 
           profile?.fcmTokens && 
           profile.fcmTokens.length > 0;
  }, [profile?.fcmTokens]);

  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        variant: "destructive",
        title: "Unsupported",
        description: "Notifications are not supported in this browser."
      });
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "Permission Granted 🔔",
          description: "Activating push notifications for this device..."
        });
        await registerNotificationToken();
      } else {
        toast({
          variant: "destructive",
          title: "Permission Denied ❌",
          description: "Please enable notifications in browser settings."
        });
      }
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Activation Error",
        description: e.message || "Failed to request permission."
      });
    }
  };

  const registerNotificationToken = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!vapidKey) {
      console.warn("VAPID key is missing");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      
      const { initializeFirebase } = await import('@/firebase');
      const { getMessaging, getToken } = await import('firebase/messaging');

      const { firebaseApp: app } = initializeFirebase();
      const messaging = getMessaging(app);

      const token = await getToken(messaging, {
        vapidKey: vapidKey.trim(),
        serviceWorkerRegistration: registration
      });

      if (token && user?.id) {
        await fetch('/api/notifications/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, token })
        });
        localStorage.setItem('fcm_token_registered', 'true');
        toast({
          title: "Link Confirm ✅",
          description: "Notifications activated! Your device is linked."
        });
      }
    } catch (err: any) {
      console.error("FCM Token Registration Error:", err);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: err.message || "Could not retrieve device token."
      });
    }
  };



  const logoUrl = bgData?.logo;

  const currentRankInfo = useMemo(() => getRankByWins(profile?.wins || 0), [profile?.wins]);
  const activeBadgeInfo = useMemo(() => getRankByType(profile?.activeBadge as RankType || currentRankInfo.type), [profile?.activeBadge, currentRankInfo.type]);

  const unreadCount = useMemo(() => {
    if (!announcements || !profile) return 0;
    const lastRead = profile.lastReadNotificationsAt ? new Date(profile.lastReadNotificationsAt).getTime() : 0;
    return announcements.filter((a: any) => new Date(a.createdAt).getTime() > lastRead).length;
  }, [announcements, profile]);

  const handleMarkRead = async () => {
    if (!userRef || unreadCount === 0) return;
    await updateDoc(userRef, { lastReadNotificationsAt: new Date().toISOString() });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-dark h-16 border-b border-border/10">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="hover:bg-primary/10 hover:text-primary" />
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <div className="relative w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-lg text-white glow-primary rotate-3 overflow-hidden">
               <AppLogoImage fallbackUrl={logoUrl} fill className="object-cover" />
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          {/* Notification Bell */}
          <Popover onOpenChange={(open) => open && handleMarkRead()}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative group">
                 <Bell className={cn(
                   "h-5 w-5 transition-colors",
                   unreadCount > 0 ? "text-red-500 animate-bounce" : "text-yellow-500"
                 )} />
                 {unreadCount > 0 && (
                   <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-background">
                     {unreadCount}
                   </span>
                 )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="glass border-white/10 w-80 p-0 overflow-hidden" align="end">
                <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                   <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                     <Megaphone className="w-3 h-3" /> Area Announcements
                   </p>
                   <div className="flex items-center gap-2">
                     {notificationsOn ? (
                       <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                         <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> LINK CONFIRM
                       </span>
                     ) : (
                       <button 
                         onClick={handleEnableNotifications}
                         className="text-[9px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full hover:bg-red-500/20 transition-colors flex items-center gap-1 animate-pulse"
                       >
                         OFF (CLICK TO ON)
                       </button>
                     )}
                   </div>
                </div>
               <ScrollArea className="h-[350px]">
                  {announcements?.length === 0 ? (
                    <div className="p-10 text-center space-y-2 opacity-40">
                       <Bell className="w-8 h-8 mx-auto mb-2" />
                       <p className="text-[10px] font-black uppercase">No New Intel</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                       {announcements?.map((a: any) => (
                         <div key={a.id} className="p-4 space-y-2 hover:bg-white/5 transition-colors">
                            <div className="flex justify-between items-start gap-2">
                               <p className="font-bold text-xs uppercase text-foreground">{a.title}</p>
                               <Badge variant="outline" className="text-[8px] border-primary/20 text-primary shrink-0">{a.type}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">{a.content}</p>
                            <div className="flex items-center gap-1.5 text-[8px] font-black text-muted-foreground uppercase">
                               <Calendar className="w-2.5 h-2.5" /> {format(new Date(a.createdAt), 'MMM dd, HH:mm')}
                            </div>
                         </div>
                       ))}
                    </div>
                  )}
               </ScrollArea>
            </PopoverContent>
          </Popover>
          
          <Link href="/wallet" className="flex items-center gap-2 bg-muted/50 px-2 sm:px-3 py-1.5 rounded-full border border-border/10 hover:bg-primary/10 transition-colors group">
            <span className="text-xs sm:text-sm font-black">🪙 {profile?.balance || 0}</span>
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center bg-transparent group-hover:scale-110 transition-transform">
              <Wallet className="h-3 w-3 text-primary" />
            </div>
          </Link>

          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="icon" className="border-primary/20 hover:bg-primary/10 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
                <span className="sr-only">Admin Panel</span>
              </Button>
            </Link>
          )}

          <div className="flex items-center gap-2 sm:gap-3 ml-1 sm:ml-2 border-l border-border/10 pl-2 sm:pl-3">
            <div className="flex flex-col items-end hidden xs:flex">
              <div className="flex items-center gap-1">
                <span className="text-xs font-black leading-none uppercase tracking-tight">
                  {profile?.username || user?.firstName || 'WARRIOR'}
                </span>
                {isSuperAdmin ? <CheckCircle2 className="w-3 h-3 text-yellow-500" /> : isAdmin && <CheckCircle2 className="w-3 h-3 text-green-500" />}
              </div>
              <span className={cn("text-[8px] font-black px-1.5 rounded-full uppercase mt-0.5", activeBadgeInfo.className)}>
                {activeBadgeInfo.label}
              </span>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
}
