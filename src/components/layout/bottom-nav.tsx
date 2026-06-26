'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Swords, Trophy, User, X, ChevronUp } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  
  // Collapse state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Scroll to hide state variables
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('bottom-nav-collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If user scrolls down by more than 10px, hide bottom bar. Otherwise, show it.
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const toggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('bottom-nav-collapsed', String(nextVal));
  };

  // Prevent server side rendering differences for localStorage keys
  if (!isMounted) return null;

  if (isCollapsed) {
    return (
      <button 
        onClick={toggleCollapse} 
        className="fixed bottom-4 right-4 z-50 md:hidden bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white p-3 rounded-full shadow-[0_4px_20px_rgba(239,68,68,0.5)] border border-white/20 transition-all duration-300 animate-bounce flex items-center justify-center"
        title="Show Navigation Bar"
      >
        <ChevronUp className="w-5 h-5 text-white" />
      </button>
    );
  }

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
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 w-full h-16 z-50 md:hidden bg-gradient-to-r from-black via-red-950/95 to-amber-950/95 border-t border-white/10 flex items-center justify-around px-4 transition-transform duration-300 ease-in-out shadow-[0_-4px_25px_rgba(0,0,0,0.8)] pb-safe",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      {/* Red Orange Gradient Accent Top line */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-600 via-orange-500 to-transparent" />

      {navItems.map((item) => {
        const isActive = pathname === item.route;
        const Icon = item.icon;
        
        return (
          <Link 
            key={item.route} 
            href={item.route} 
            className="flex flex-col items-center justify-center w-14 h-12 relative group"
          >
            {/* Glow background for active item */}
            {isActive && (
              <div className={cn("absolute inset-0 rounded-xl blur-md pointer-events-none transition-all duration-300", item.glowColor)} />
            )}
            
            <div className={cn(
              "flex flex-col items-center justify-center rounded-xl px-2 py-0.5 transition-all duration-300 border border-transparent w-full",
              isActive ? cn("scale-105 bg-white/[0.03]", item.activeBg) : "group-hover:bg-white/[0.02]"
            )}>
              <Icon className={cn(
                "h-4 w-4 transition-all duration-300",
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

      {/* Manual Collapse / Close Button */}
      <button 
        onClick={toggleCollapse}
        className="flex flex-col items-center justify-center w-14 h-12 relative group border border-transparent hover:bg-white/[0.02] rounded-xl px-2 py-0.5 transition-all"
        title="Hide Bottom Nav Bar"
      >
        <X className="h-4 w-4 text-muted-foreground/60 group-hover:text-red-500 transition-colors" />
        <span className="text-[8px] font-black uppercase tracking-wider mt-0.5 text-muted-foreground/50 group-hover:text-red-500 transition-colors">
          Hide
        </span>
      </button>
    </div>
  );
}
