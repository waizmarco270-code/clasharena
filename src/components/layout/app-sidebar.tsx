'use client';

import * as React from 'react';
import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter as SidebarFooterComponent,
} from '@/components/ui/sidebar';
import { 
  Home, 
  Swords, 
  Trophy, 
  User, 
  Shield, 
  LayoutDashboard, 
  Settings, 
  Wallet, 
  History,
  Youtube,
  Send,
  MessageCircle,
  Users,
  Headset,
  LifeBuoy
} from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import Image from 'next/image';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile } = useDoc(userRef);

  const isAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isAdmin || profile?.isSuperAdmin;

  const logoUrl = bgData?.logo;

  const mainNav = [
    { name: 'Command Hub', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
    { name: 'Tournament Arena', href: '/arena', icon: Swords, color: 'text-red-500' },
    { name: 'Coin Vault', href: '/wallet', icon: Wallet, color: 'text-emerald-500' },
    { name: 'Transaction Logs', href: '/wallet/history', icon: History, color: 'text-amber-500' },
    { name: 'Hall of Champions', href: '/hall-of-champions', icon: Trophy, color: 'text-purple-500' },
  ];

  const userNav = [
    { name: 'My Profile', href: '/profile', icon: User, color: 'text-orange-500' },
    { name: 'Settings', href: '/settings', icon: Settings, color: 'text-gray-400' },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-card/50 backdrop-blur-xl">
      <SidebarHeader className="h-20 flex flex-col justify-center px-4 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-bold text-lg text-white glow-primary rotate-3 group-hover:rotate-0 transition-transform overflow-hidden shrink-0 shadow-xl">
             {logoUrl ? (
               <Image 
                  src={logoUrl} 
                  alt="Logo" 
                  fill 
                  className="object-cover" 
               />
             ) : (
               <span className="relative z-10">C</span>
             )}
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
            <span className="font-headline font-black text-lg tracking-tight uppercase leading-none truncate whitespace-nowrap">
              CLASH <span className="legendary-text italic">ARENA</span>
            </span>
            <span className="text-[8px] font-black text-muted-foreground tracking-[0.2em] uppercase opacity-60 truncate">Elite Ecosystem</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-data-[collapsible=icon]:hidden mb-2">
            BATTLE ZONE
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.name}
                    className={`sidebar-glow-item hover:bg-white/[0.05] transition-all h-12 px-4 rounded-xl mx-2 w-[calc(100%-1rem)] ${pathname === item.href ? 'bg-white/[0.05]' : ''}`}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={`${item.color} ${pathname === item.href ? 'scale-110 drop-shadow-[0_0_8px_currentColor]' : ''} transition-transform`} />
                      <span className={`font-bold text-sm tracking-tight ${pathname === item.href ? 'text-white' : 'text-muted-foreground'}`}>
                        {item.name}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 group-data-[collapsible=icon]:hidden mb-2">
            COMMANDER
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userNav.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.name}
                    className={`sidebar-glow-item hover:bg-white/[0.05] transition-all h-12 px-4 rounded-xl mx-2 w-[calc(100%-1rem)] ${pathname === item.href ? 'bg-white/[0.05]' : ''}`}
                  >
                    <Link href={item.href} className="flex items-center gap-3">
                      <item.icon className={`${item.color} ${pathname === item.href ? 'scale-110 drop-shadow-[0_0_8px_currentColor]' : ''} transition-transform`} />
                      <span className={`font-bold text-sm tracking-tight ${pathname === item.href ? 'text-white' : 'text-muted-foreground'}`}>
                        {item.name}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === '/admin'}
                    tooltip="Admin Center"
                    className={`sidebar-glow-item hover:bg-primary/10 transition-all h-12 px-4 rounded-xl mx-2 w-[calc(100%-1rem)] ${pathname.startsWith('/admin') ? 'bg-primary/10 border border-primary/20' : ''}`}
                  >
                    <Link href="/admin" className="flex items-center gap-3">
                      <Shield className="text-primary drop-shadow-[0_0_8px_rgba(255,69,0,0.4)]" />
                      <span className="font-black text-sm tracking-tight text-primary uppercase italic">Admin Center</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooterComponent className="p-4 border-t border-white/5 bg-black/20 mt-auto">
        <div className="flex flex-col gap-4 group-data-[collapsible=icon]:items-center">
          {/* Support Highlight Section */}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/settings/support'}
                tooltip="Support Desk"
                className="bg-green-600/10 hover:bg-green-600/20 border border-green-500/20 h-11 px-4 rounded-xl transition-all"
              >
                <Link href="/settings/support" className="flex items-center gap-3">
                  <Headset className="text-green-500 w-5 h-5 animate-pulse" />
                  <span className="font-black text-xs tracking-widest text-green-500 uppercase group-data-[collapsible=icon]:hidden">Support Desk</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="h-[1px] bg-white/5 w-full group-data-[collapsible=icon]:hidden" />

          <div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-4 pb-2">
            <Link href="https://youtube.com" target="_blank" className="text-red-500 hover:scale-125 transition-transform">
              <Youtube className="w-5 h-5" />
            </Link>
            <Link href="https://wa.me" target="_blank" className="text-green-500 hover:scale-125 transition-transform">
              <MessageCircle className="w-5 h-5" />
            </Link>
            <Link href="https://t.me" target="_blank" className="text-blue-400 hover:scale-125 transition-transform">
              <Send className="w-5 h-5" />
            </Link>
            <Link href="#" className="text-amber-500 hover:scale-125 transition-transform">
              <Users className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </SidebarFooterComponent>
    </Sidebar>
  );
}
