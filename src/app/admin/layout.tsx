'use client';

import { useMemo, useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  CreditCard,
  Gift,
  Skull,
  Ticket,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, collection, query, where, getCountFromServer } from 'firebase/firestore';
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

  // States for server count stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    relayEnabled: 0,
    onlineUsers: 0,
    totalPayments: 0
  });

  const [showTHDialog, setShowTHDialog] = useState(false);
  const [thStats, setThStats] = useState<Record<string, number>>({});
  const [loadingThStats, setLoadingThStats] = useState(false);

  const fetchThStats = async () => {
    setLoadingThStats(true);
    setShowTHDialog(true);
    try {
      const stats: Record<string, number> = {};
      const usersCol = collection(db, 'users');
      const promises = [];
      for (let i = 9; i <= 18; i++) {
        promises.push(
          getCountFromServer(query(usersCol, where('townHall', '==', i)))
            .then(snap => ({ th: `TH ${i}`, count: snap.data().count }))
        );
      }
      const results = await Promise.all(promises);
      results.forEach(res => {
        if (res.count > 0) stats[res.th] = res.count;
      });
      const allSnap = await getCountFromServer(usersCol);
      const totalTh = results.reduce((acc, curr) => acc + curr.count, 0);
      const others = allSnap.data().count - totalTh;
      if (others > 0) stats['Unlinked / Others'] = others;
      
      setThStats(stats);
    } catch (err) {
      console.error('Error fetching TH stats:', err);
    }
    setLoadingThStats(false);
  };

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const usersCol = collection(db, 'users');
        const rechargesCol = collection(db, 'recharge-requests');

        // Count relay enabled
        const relayQuery = query(usersCol, where('hasFcmToken', '==', true));

        const [usersSnap, relaySnap, rechargesSnap] = await Promise.all([
          getCountFromServer(usersCol),
          getCountFromServer(relayQuery),
          getCountFromServer(rechargesCol)
        ]);

        if (active) {
          setStats({
            totalUsers: usersSnap.data().count,
            relayEnabled: relaySnap.data().count,
            onlineUsers: 0, // Feature disabled for MVP efficiency
            totalPayments: rechargesSnap.data().count
          });
        }
      } catch (err) {
        console.error("Error fetching admin layout stats:", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60 * 1000); // 1 minute refresh

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [db]);

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
    { id: 'withdrawals', label: 'Payout Hub', icon: ShieldCheck, href: '/admin/withdrawals' },
    { id: 'gifts', label: 'Gift System', icon: Gift, href: '/admin/gifts', superOnly: true },
    { id: 'notifications', label: 'Notifications', icon: Bell, href: '/admin/notifications' },
    { id: 'controls', label: 'Controls', icon: Terminal, href: '/admin/controls' },
    { id: 'users', label: 'User Management', icon: UserCog, href: '/admin/users', superOnly: true },
    { id: 'gateway', label: 'Gateway', icon: Settings, href: '/admin/gateway', superOnly: true },
    { id: 'bans', label: 'Judgment Day', icon: Skull, href: '/admin/bans' },
    { id: 'tickets', label: 'Ticket Vault', icon: Ticket, href: '/admin/tickets', superOnly: true },
    { id: 'backgrounds', label: 'Backgrounds', icon: Monitor, href: '/admin/backgrounds' },
    { id: 'cosmetics', label: 'Cosmetics Engine', icon: Sparkles, href: '/admin/cosmetics', superOnly: true },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench, href: '/admin/maintenance' },
  ];

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <h1 className="font-headline text-3xl font-black uppercase tracking-tighter">COMMAND <span className="text-primary italic">CENTER</span></h1>
        </div>

        {/* 📊 ADMIN STATS CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Card onClick={fetchThStats} className="glass border-white/5 bg-black/40 overflow-hidden relative group cursor-pointer hover:bg-white/5 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest group-hover:text-white transition-colors">Total Warriors</p>
                <p className="text-xl font-headline font-black text-white group-hover:text-primary transition-colors">{stats.totalUsers}</p>
              </div>
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                <Users className="w-5 h-5 text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/5 bg-black/40 overflow-hidden relative group">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Relay Alerts</p>
                <p className="text-xl font-headline font-black text-white">
                  {stats.relayEnabled}
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
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Total Payments</p>
                <p className="text-xl font-headline font-black text-white">{stats.totalPayments}</p>
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
          <div className="flex-1 overflow-y-auto pb-safe">
            {children}
          </div>
        </div>
      </div>
      
      {/* TH Stats Dialog */}
      <Dialog open={showTHDialog} onOpenChange={setShowTHDialog}>
        <DialogContent className="glass border-white/10 bg-zinc-950 text-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
              <Users className="text-primary" /> WARRIOR <span className="text-primary">STATS</span>
            </DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
              Distribution of players across Town Hall levels.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4 max-h-[60vh] overflow-y-auto pr-2">
            {loadingThStats ? (
              <div className="flex flex-col items-center justify-center py-8">
                 <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                 <p className="text-xs uppercase font-black tracking-widest text-muted-foreground">SCANNING DATABASES...</p>
              </div>
            ) : (
              <div className="grid gap-2">
                {Object.entries(thStats).map(([th, count]) => (
                   <div key={th} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                     <span className="font-black text-sm uppercase text-white/80">{th}</span>
                     <span className="font-headline text-lg font-black text-primary">{count}</span>
                   </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
