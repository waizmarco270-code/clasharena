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
  Wrench
} from 'lucide-react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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
