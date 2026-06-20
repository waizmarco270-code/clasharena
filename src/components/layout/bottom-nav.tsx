
'use client';

import Link from 'next/link';
import { LayoutDashboard, Swords, Trophy, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md md:hidden">
      <nav className="glass rounded-2xl flex items-center justify-around py-3 px-2 shadow-2xl border border-white/10">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 group">
          <LayoutDashboard className={`h-5 w-5 ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-tighter ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`}>Hub</span>
        </Link>
        
        <Link href="/arena" className="flex flex-col items-center gap-1 group">
          <Swords className={`h-5 w-5 ${pathname === '/arena' ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-tighter ${pathname === '/arena' ? 'text-primary' : 'text-muted-foreground'}`}>Arena</span>
        </Link>

        <Link href="/hall-of-champions" className="flex flex-col items-center gap-1 group">
          <Trophy className={`h-5 w-5 ${pathname === '/hall-of-champions' ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-tighter ${pathname === '/hall-of-champions' ? 'text-primary' : 'text-muted-foreground'}`}>Hall</span>
        </Link>

        <Link href="/profile" className="flex flex-col items-center gap-1 group">
          <User className={`h-5 w-5 ${pathname === '/profile' ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[10px] font-bold uppercase tracking-tighter ${pathname === '/profile' ? 'text-primary' : 'text-muted-foreground'}`}>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
