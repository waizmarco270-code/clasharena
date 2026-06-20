'use client';

import Link from 'next/link';
import { LayoutDashboard, Swords, Trophy, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/5 bg-black/90 backdrop-blur-xl">
      <nav className="flex items-center justify-around py-3 px-2 shadow-2xl">
        <Link href="/dashboard" className="flex flex-col items-center gap-1 group transition-all">
          <LayoutDashboard className={`h-5 w-5 transition-colors ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground/60'}`} />
          <span className={`text-[10px] font-black uppercase tracking-tighter ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground/60'}`}>Hub</span>
        </Link>
        
        <Link href="/arena" className="flex flex-col items-center gap-1 group transition-all">
          <Swords className={`h-5 w-5 transition-colors ${pathname === '/arena' ? 'text-primary' : 'text-muted-foreground/60'}`} />
          <span className={`text-[10px] font-black uppercase tracking-tighter ${pathname === '/arena' ? 'text-primary' : 'text-muted-foreground/60'}`}>Arena</span>
        </Link>

        <Link href="/hall-of-champions" className="flex flex-col items-center gap-1 group transition-all">
          <Trophy className={`h-5 w-5 transition-colors ${pathname === '/hall-of-champions' ? 'text-primary' : 'text-muted-foreground/60'}`} />
          <span className={`text-[10px] font-black uppercase tracking-tighter ${pathname === '/hall-of-champions' ? 'text-primary' : 'text-muted-foreground/60'}`}>Hall</span>
        </Link>

        <Link href="/profile" className="flex flex-col items-center gap-1 group transition-all">
          <User className={`h-5 w-5 transition-colors ${pathname === '/profile' ? 'text-primary' : 'text-muted-foreground/60'}`} />
          <span className={`text-[10px] font-black uppercase tracking-tighter ${pathname === '/profile' ? 'text-primary' : 'text-muted-foreground/60'}`}>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
