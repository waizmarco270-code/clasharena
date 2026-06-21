'use client';

import Link from 'next/link';
import { LayoutDashboard, Swords, Trophy, User } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-primary/20 bg-gradient-to-t from-black via-black/95 to-black/90 backdrop-blur-2xl px-6 pb-6 pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
      <nav className="flex items-center justify-around relative">
        {/* Glow effect for active link */}
        <div className="absolute inset-0 flex justify-around pointer-events-none">
          {['/dashboard', '/arena', '/hall-of-champions', '/profile'].map((route, i) => (
            <div 
              key={i} 
              className={`w-12 h-12 bg-primary/20 rounded-full blur-xl transition-opacity duration-300 ${pathname === route ? 'opacity-100' : 'opacity-0'}`} 
            />
          ))}
        </div>

        <Link href="/dashboard" className="flex flex-col items-center gap-1.5 group relative z-10">
          <div className={`p-2 rounded-xl transition-all duration-300 ${pathname === '/dashboard' ? 'bg-primary/20 scale-110' : 'group-hover:bg-white/5'}`}>
            <LayoutDashboard className={`h-6 w-6 transition-colors ${pathname === '/dashboard' ? 'text-primary drop-shadow-[0_0_8px_rgba(255,69,0,0.6)]' : 'text-muted-foreground/60'}`} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground/60'}`}>Hub</span>
        </Link>
        
        <Link href="/arena" className="flex flex-col items-center gap-1.5 group relative z-10">
          <div className={`p-2 rounded-xl transition-all duration-300 ${pathname === '/arena' ? 'bg-primary/20 scale-110' : 'group-hover:bg-white/5'}`}>
            <Swords className={`h-6 w-6 transition-colors ${pathname === '/arena' ? 'text-primary drop-shadow-[0_0_8px_rgba(255,69,0,0.6)]' : 'text-muted-foreground/60'}`} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${pathname === '/arena' ? 'text-primary' : 'text-muted-foreground/60'}`}>Arena</span>
        </Link>

        <Link href="/hall-of-champions" className="flex flex-col items-center gap-1.5 group relative z-10">
          <div className={`p-2 rounded-xl transition-all duration-300 ${pathname === '/hall-of-champions' ? 'bg-primary/20 scale-110' : 'group-hover:bg-white/5'}`}>
            <Trophy className={`h-6 w-6 transition-colors ${pathname === '/hall-of-champions' ? 'text-primary drop-shadow-[0_0_8px_rgba(255,69,0,0.6)]' : 'text-muted-foreground/60'}`} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${pathname === '/hall-of-champions' ? 'text-primary' : 'text-muted-foreground/60'}`}>Hall</span>
        </Link>

        <Link href="/profile" className="flex flex-col items-center gap-1.5 group relative z-10">
          <div className={`p-2 rounded-xl transition-all duration-300 ${pathname === '/profile' ? 'bg-primary/20 scale-110' : 'group-hover:bg-white/5'}`}>
            <User className={`h-6 w-6 transition-colors ${pathname === '/profile' ? 'text-primary drop-shadow-[0_0_8px_rgba(255,69,0,0.6)]' : 'text-muted-foreground/60'}`} />
          </div>
          <span className={`text-[10px] font-black uppercase tracking-[0.1em] ${pathname === '/profile' ? 'text-primary' : 'text-muted-foreground/60'}`}>Profile</span>
        </Link>
      </nav>
    </div>
  );
}
