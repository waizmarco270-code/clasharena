'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Shield, Wallet, CheckCircle2 } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { UserButton, useUser } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme-toggle";
import Image from 'next/image';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export function Header() {
  const { user } = useUser();
  const db = useFirestore();

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile } = useDoc(userRef);

  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;

  const logoUrl = bgData?.logo;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-dark h-16 border-b border-border/10">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="hover:bg-primary/10 hover:text-primary" />
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <div className="relative w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-lg text-white glow-primary rotate-3 overflow-hidden">
               {logoUrl ? (
                 <Image src={logoUrl} alt="Logo" fill className="object-cover" />
               ) : (
                 "C"
               )}
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          
          <Link href="/wallet" className="flex items-center gap-2 bg-muted/50 px-2 sm:px-3 py-1.5 rounded-full border border-border/10 hover:bg-primary/10 transition-colors group">
            <span className="text-xs sm:text-sm font-black">🪙 {profile?.balance || 0}</span>
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center bg-transparent group-hover:scale-110 transition-transform">
              <Wallet className="h-3 w-3 text-primary" />
            </div>
          </Link>

          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm" className="flex gap-1 sm:gap-2 border-primary/20 hover:bg-primary/10 h-8 sm:h-10 px-2 sm:px-4">
                <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                <span className="text-[10px] sm:text-xs font-black uppercase italic">ADMIN</span>
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
              <span className="text-[9px] text-muted-foreground font-bold">
                TH{profile?.townHall || '??'} • {profile?.rank || 'ROOKIE'}
              </span>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
}
