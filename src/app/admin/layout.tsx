'use client';

import { useMemo } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Swords, 
  PackageCheck, 
  Wallet, 
  UserCog, 
  Settings, 
  Monitor,
  Loader2,
  Terminal,
  Headset,
  Wrench,
  Users,
  Bell,
  Activity,
  CreditCard
} from 'lucide-react';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const db = useFirestore();
  const pathname = usePathname();
  const router = useRouter();

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;

  // Load collections for overview metrics
  const allUsersQuery = useMemo(() => query(collection(db, 'users')), [db]);
  const { data: allUsers } = useCollection(allUsersQuery);

  const allRechargesQuery = useMemo(() => query(collection(db, 'recharge-requests')), [db]);
  const { data: allRecharges } = useCollection(allRechargesQuery);

  // Online count - active in the last 5m30s
  const onlineUsers = useMemo(() => {
    if (!allUsers) return 0;
    const threshold = 5 * 60 * 1000 + 30 * 1000;
    const now = Date.now();
    return allUsers.filter((u: any) => {
      if (!u.lastActive) return false;
      const lastActiveTime = new Date(u.lastActive).getTime();
      return now - lastActiveTime < threshold;
    }).length;
  }, [allUsers]);

  const paymentsCount = allRecharges?.length || 0;

  if (profileLoading) return <PageWrapper><div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></PageWrapper>;

  if (!isAdmin) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
          <Shield className="w-24 h-24 text-destructive animate-pulse" />
          <h1 className="font-headline text-4xl font-black text-destructive uppercase italic tracking-tighter">UNAUTHORISED ACCESS</h1>
        </div>
      </PageWrapper>
    );
  }

  const tabs = [
    { id: 'arenahub', label: 'Arena Hub', icon: Swords, href: '/admin/arenahub' },
    { id: 'fulfillment', label: 'Fulfillment Hub', icon: PackageCheck, href: '/admin/fulfillment' },
    { id: 'support', label: 'Support Intel', icon: Headset, href: '/admin/support' },
    { id: 'wallets', label: 'Wallet Logs', icon: Wallet, href: '/admin/wallets' },
    { id: 'controls', label: 'Controls', icon: Terminal, href: '/admin/controls' },
    { id: 'users', label: 'User Management', icon: UserCog, href: '/admin/users', superOnly: true },
    { id: 'gateway', label: 'Gateway', icon: Settings, href: '/admin/gateway' },
    { id: 'backgrounds', label: 'Backgrounds', icon: Monitor, href: '/admin/backgrounds' },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, href: '/admin/maintenance' },
  ];

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <h1 className="font-headline text-3xl font-black uppercase tracking-tighter">COMMAND <span className="text-primary italic">CENTER</span></h1>
        </div>

        {/* 📊 ADMIN STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass border-white/5 bg-black/40 overflow-hidden relative group">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Total Warriors</p>
                <p className="text-xl font-headline font-black text-white">{allUsers?.length || 0}</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/5 bg-black/40 overflow-hidden relative group">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Relay Alerts</p>
                <p className="text-xl font-headline font-black text-white">
                  {allUsers?.filter((u: any) => u.fcmTokens && u.fcmTokens.length > 0).length || 0}
                </p>
              </div>
              <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <Bell className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/5 bg-black/40 overflow-hidden relative group">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Active Online</p>
                <p className="text-xl font-headline font-black text-white">{onlineUsers}</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                <Activity className="w-5 h-5 text-primary animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/5 bg-black/40 overflow-hidden relative group">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Total Payments</p>
                <p className="text-xl font-headline font-black text-white">{paymentsCount}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full">
          <div className="bg-muted/50 border border-white/10 w-full rounded-lg p-1 flex justify-start overflow-x-auto no-scrollbar gap-1">
            {tabs.map((tab) => {
              if (tab.superOnly && !isSuperAdmin) return null;
              const isActive = pathname === tab.href;
              return (
                <button
                  key={tab.id}
                  onClick={() => router.push(tab.href)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-md text-xs font-bold uppercase transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-black/40 text-primary border border-primary/20 shadow-lg" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="mt-8">
            {children}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
