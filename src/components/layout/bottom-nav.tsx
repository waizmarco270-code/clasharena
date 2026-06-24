'use client';

import Link from 'next/link';
import { LayoutDashboard, Swords, Trophy, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      route: '/dashboard',
      label: 'Hub',
      icon: LayoutDashboard,
      activeColor: 'text-emerald-400',
      activeBg: 'bg-emerald-500/[0.06] border-emerald-500/20',
      animationClass: 'animate-nav-bounce',
      glowColor: 'bg-emerald-500/20'
    },
    {
      route: '/arena',
      label: 'Arena',
      icon: Swords,
      activeColor: 'text-red-500',
      activeBg: 'bg-red-500/[0.06] border-red-500/20',
      animationClass: 'animate-nav-swing',
      glowColor: 'bg-red-500/20'
    },
    {
      route: '/hall-of-champions',
      label: 'Hall',
      icon: Trophy,
      activeColor: 'text-amber-400',
      activeBg: 'bg-amber-500/[0.06] border-amber-500/20',
      animationClass: 'animate-nav-glow',
      glowColor: 'bg-amber-500/20'
    },
    {
      route: '/profile',
      label: 'Profile',
      icon: User,
      activeColor: 'text-purple-400',
      activeBg: 'bg-purple-500/[0.06] border-purple-500/20',
      animationClass: 'animate-nav-float',
      glowColor: 'bg-purple-500/20'
    }
  ];

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-sm h-14 z-50 md:hidden rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.65)] flex items-center justify-around px-2">
      {navItems.map((item) => {
        const isActive = pathname === item.route;
        const Icon = item.icon;
        
        return (
          <Link 
            key={item.route} 
            href={item.route} 
            className="flex flex-col items-center justify-center w-16 h-12 relative group"
          >
            {/* Glow background for active item */}
            {isActive && (
              <div className={cn("absolute inset-0 rounded-xl blur-md pointer-events-none transition-all duration-300", item.glowColor)} />
            )}
            
            <div className={cn(
              "flex flex-col items-center justify-center rounded-xl px-3 py-1 transition-all duration-300 border border-transparent w-full",
              isActive ? cn("scale-105 bg-white/[0.03]", item.activeBg) : "group-hover:bg-white/[0.02]"
            )}>
              <Icon className={cn(
                "h-5 w-5 transition-all duration-300",
                isActive ? cn(item.activeColor, item.animationClass) : "text-muted-foreground/60 group-hover:text-white/80"
              )} />
              
              <span className={cn(
                "text-[8px] font-black uppercase tracking-wider mt-0.5 transition-colors duration-300",
                isActive ? item.activeColor : "text-muted-foreground/50 group-hover:text-white/60"
              )}>
                {item.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
