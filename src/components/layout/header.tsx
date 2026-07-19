
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Shield, Wallet, CheckCircle2, Bell, X, Megaphone, Calendar, Ticket, Crown, Zap, User, Settings, Headset, LogOut, Copy } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useFirestore, useProfile, useBackgrounds, useAnnouncements, useAdminStatus } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useUser, useClerk } from "@clerk/nextjs";
import Image from 'next/image';
import { AppLogoImage } from '@/components/ui/app-logo-image';
import { Badge } from '@/components/ui/badge';
import { getRankByWins, getRankByType, RankType } from '@/lib/rank-utils';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export function Header() {
  const { user } = useUser();
  const { signOut } = useClerk();
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
      <div className="container mx-auto h-full px-2 sm:px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <SidebarTrigger className="hover:bg-primary/10 hover:text-primary" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="relative group flex items-center gap-1.5 sm:gap-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full px-2 sm:px-3 py-1.5 h-auto transition-all overflow-hidden ml-1 sm:ml-0">
                 <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                 <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 group-hover:rotate-12 transition-transform shrink-0" />
                 <span className="hidden sm:inline-block text-xs font-black uppercase tracking-widest text-white">Tickets</span>
                 <div className="flex sm:hidden items-center ml-1 border-l border-white/10 pl-1.5">
                   <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 rounded">
                     {(profile?.inventory?.bronzeTickets || 0) + (profile?.inventory?.silverTickets || 0) + (profile?.inventory?.goldenTickets || 0)}
                   </span>
                 </div>
                 <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 sm:ml-1 sm:border-l sm:border-white/10 sm:pl-2">
                    <div className="flex items-center gap-0.5" title="Bronze Tickets">
                      <span className="text-[9px] sm:text-[10px] font-black text-amber-600 bg-amber-900/30 px-1 sm:px-1.5 rounded">{profile?.inventory?.bronzeTickets || 0}</span>
                    </div>
                    <div className="flex items-center gap-0.5" title="Silver Tickets">
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-300 bg-slate-800/50 px-1 sm:px-1.5 rounded">{profile?.inventory?.silverTickets || 0}</span>
                    </div>
                    <div className="flex items-center gap-0.5" title="Golden Tickets">
                      <span className="text-[9px] sm:text-[10px] font-black text-yellow-400 bg-yellow-500/20 px-1 sm:px-1.5 rounded">{profile?.inventory?.goldenTickets || 0}</span>
                    </div>
                 </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="glass border-white/10 w-64 p-3 overflow-hidden" align="start" sideOffset={8}>
              <div className="space-y-3">
                 <div className="text-center pb-2 border-b border-white/10">
                   <p className="text-xs font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">Ticket Inventory</p>
                 </div>
                 
                 <div className="grid gap-2">
                   <div className="flex items-center justify-between p-2 rounded-lg bg-amber-900/20 border border-amber-900/50">
                     <div className="flex items-center gap-2">
                       <Ticket className="w-4 h-4 text-amber-600" />
                       <span className="text-xs font-bold uppercase text-amber-600">Bronze</span>
                     </div>
                     <span className="text-sm font-black text-white">{profile?.inventory?.bronzeTickets || 0}</span>
                   </div>
                   
                   <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                     <div className="flex items-center gap-2">
                       <Ticket className="w-4 h-4 text-slate-400" />
                       <span className="text-xs font-bold uppercase text-slate-400">Silver</span>
                     </div>
                     <span className="text-sm font-black text-white">{profile?.inventory?.silverTickets || 0}</span>
                   </div>

                   <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                     <div className="flex items-center gap-2">
                       <Crown className="w-4 h-4 text-yellow-500" />
                       <span className="text-xs font-bold uppercase text-yellow-500">Golden</span>
                     </div>
                     <span className="text-sm font-black text-white">{profile?.inventory?.goldenTickets || 0}</span>
                   </div>
                 </div>

                 <Link href="/tickets" className="block mt-2">
                    <Button variant="outline" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest border-white/10 hover:bg-white/10">
                      Open Ticket Vault
                    </Button>
                 </Link>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
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
          
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/wallet" className="flex items-center gap-1 sm:gap-2 bg-muted/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border/10 hover:bg-primary/10 transition-colors group">
              <span className="text-[11px] sm:text-sm font-black leading-none mt-0.5">🪙 {profile?.balance || 0}</span>
              <div className="flex h-4 w-4 sm:h-6 sm:w-6 rounded-full items-center justify-center bg-transparent group-hover:scale-110 transition-transform">
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              </div>
            </Link>

            <Link href="/wallet?currency=vcash" className="flex items-center gap-1 sm:gap-2 bg-green-500/10 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-green-500/20 hover:bg-green-500/20 transition-colors group">
              <span className="text-[11px] sm:text-sm font-black leading-none text-green-400 mt-0.5">⚡ {profile?.vCashBalance || 0}</span>
              <div className="flex h-4 w-4 sm:h-6 sm:w-6 rounded-full items-center justify-center bg-transparent group-hover:scale-110 transition-transform">
                <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
              </div>
            </Link>
          </div>

          {isAdmin && (
            <Link href="/admin" className="hidden sm:block">
              <Button variant="outline" size="icon" className="border-primary/20 hover:bg-primary/10 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
                <span className="sr-only">Admin Panel</span>
              </Button>
            </Link>
          )}

          <div className="flex items-center gap-1 sm:gap-3 ml-0 sm:ml-2 border-l border-border/10 pl-1 sm:pl-3">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative cursor-pointer group">
                  <div className={cn("absolute -inset-0.5 rounded-full blur opacity-50 group-hover:opacity-100 transition duration-500 bg-current", activeBadgeInfo.className)} />
                  <Avatar className={cn("h-8 w-8 sm:h-10 sm:w-10 relative border-2 border-background z-10", activeBadgeInfo.className)}>
                    <AvatarImage src={user?.imageUrl || profile?.avatarUrl} alt={profile?.username} />
                    <AvatarFallback className="bg-primary/20 text-primary font-black">
                      {(profile?.username || user?.firstName || 'W').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 glass border-white/10 p-2 mt-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-3 pb-2 border-b border-white/5">
                      <Avatar className={cn("h-12 w-12 border-2", activeBadgeInfo.className)}>
                        <AvatarImage src={user?.imageUrl || profile?.avatarUrl} alt={profile?.username} />
                        <AvatarFallback className="bg-primary/20 text-primary font-black">
                          {(profile?.username || user?.firstName || 'W').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-black leading-none uppercase text-white truncate max-w-[140px]">
                          {profile?.username || user?.firstName || 'Commander'}
                        </p>
                        <p className="text-[10px] leading-none text-muted-foreground truncate max-w-[140px]">
                          {user?.primaryEmailAddress?.emailAddress}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-white/5">
                       <div className="flex flex-col">
                         <span className="text-[8px] font-bold uppercase text-muted-foreground">Current Status</span>
                         <span className={cn("text-[10px] font-black uppercase", activeBadgeInfo.className)}>
                           {activeBadgeInfo.label}
                         </span>
                       </div>
                       <Crown className={cn("w-4 h-4", activeBadgeInfo.className)} />
                    </div>

                    <div className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5 group relative overflow-hidden" 
                         onClick={() => { navigator.clipboard.writeText(user?.id || ''); toast({title: "Copied!", description: "User ID copied to clipboard", duration: 2000}) }}
                         style={{cursor: 'pointer'}}>
                       <div className="flex flex-col z-10">
                         <span className="text-[8px] font-bold uppercase text-muted-foreground">Commander ID</span>
                         <span className="text-[9px] font-mono text-white/70">
                           {user?.id?.substring(0, 15)}...
                         </span>
                       </div>
                       <Copy className="w-3 h-3 text-white/40 group-hover:text-white transition-colors z-10" />
                       <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuGroup>
                  <Link href="/profile">
                    <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                      <User className="mr-2 h-4 w-4 text-primary" />
                      <span className="font-bold text-xs uppercase tracking-widest text-white/80">Profile Hub</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/wallet">
                    <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                      <Wallet className="mr-2 h-4 w-4 text-yellow-500" />
                      <span className="font-bold text-xs uppercase tracking-widest text-white/80">My Vault</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/settings">
                    <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                      <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="font-bold text-xs uppercase tracking-widest text-white/80">Settings</span>
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/support">
                    <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                      <Headset className="mr-2 h-4 w-4 text-emerald-500" />
                      <span className="font-bold text-xs uppercase tracking-widest text-white/80">Support Desk</span>
                    </DropdownMenuItem>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin">
                      <DropdownMenuItem className="cursor-pointer hover:bg-white/5 focus:bg-white/5 border-t border-white/5 mt-1 pt-2">
                        <Shield className="mr-2 h-4 w-4 text-primary" />
                        <span className="font-bold text-xs uppercase tracking-widest text-primary">Admin Panel</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="cursor-pointer hover:bg-red-500/10 focus:bg-red-500/10 text-red-500" onClick={() => signOut({ redirectUrl: '/' })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="font-black text-xs uppercase tracking-widest">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
