'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Shield, Wallet, Menu } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';

export function Header() {
  const { user } = useUser();
  const db = useFirestore();
  const userRef = user ? doc(db, 'users', user.uid) : null;
  const { data: profile } = useDoc(userRef);
  const avatar = PlaceHolderImages.find(img => img.id === 'avatar-user');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-dark h-16 border-b border-white/5">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="hover:bg-primary/10 hover:text-primary" />
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-lg text-white glow-primary rotate-3">
              C
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-white/5">
            <span className="text-sm font-bold">🪙 {profile?.balance || 0}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/20">
              <Wallet className="h-3 w-3 text-primary" />
            </Button>
          </div>

          <Link href="/admin">
            <Button variant="outline" size="sm" className="hidden lg:flex gap-2 border-primary/20 hover:bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">ADMIN</span>
            </Button>
          </Link>

          <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-3">
            <div className="flex flex-col items-end hidden xs:flex">
              <span className="text-xs font-black leading-none uppercase tracking-tight">
                {profile?.username || 'WARRIOR'}
              </span>
              <span className="text-[9px] text-muted-foreground font-bold">
                TH{profile?.townHall || '??'} • {profile?.rank || 'ROOKIE'}
              </span>
            </div>
            <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-lg">
              <AvatarImage src={user?.photoURL || avatar?.imageUrl} alt="User" className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">
                {profile?.username?.substring(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
