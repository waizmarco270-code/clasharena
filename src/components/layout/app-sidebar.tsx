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
  LifeBuoy,
  BookOpen,
  Skull,
  Ticket,
  Gift,
  Crown,
  Zap,
  ScrollText
} from 'lucide-react';
import { useBackgrounds, useProfile, useAdminStatus } from '@/firebase';
import { useUser } from "@clerk/nextjs";
import Image from 'next/image';
import { AppLogoImage } from '@/components/ui/app-logo-image';
import { useUnreadArenasCount } from '@/hooks/use-unread-arenas';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export function AppSidebar() {
  const pathname = usePathname();
  const unreadCount = useUnreadArenasCount();
  const { backgrounds: bgData } = useBackgrounds();
  const { profile } = useProfile();
  const { isAdmin } = useAdminStatus();

  const logoUrl = bgData?.logo;

  const mainNav = [
    { name: 'Command Hub', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
    { name: 'Tournament Arena', href: '/arena', icon: Swords, color: 'text-red-500' },
    { name: 'THC Arena 🏆', href: '/thc-arena', icon: Shield, color: 'text-primary' },
    { name: 'VS Arena ⚡', href: '/vs-arena', icon: Zap, color: 'text-orange-500' },
    { name: 'Coin Vault', href: '/wallet', icon: Wallet, color: 'text-emerald-500' },
    { name: 'Ticket Vault', href: '/tickets', icon: Ticket, color: 'text-purple-500' },
    { name: 'Transaction Logs', href: '/wallet/history', icon: History, color: 'text-amber-500' },
    { name: 'Hall of Champions', href: '/hall-of-champions', icon: Trophy, color: 'text-purple-500' },
    { name: 'Rich Leaderboard', href: '/leaderboard', icon: Crown, color: 'text-yellow-500' },
    { name: 'Wall of Shame', href: '/wall-of-shame', icon: Skull, color: 'text-red-600' },
    { name: 'Battle Guide', href: '/guide', icon: BookOpen, color: 'text-pink-500' },
  ];

  const userNav = [
    { name: 'My Profile', href: '/profile', icon: User, color: 'text-orange-500' },
    { name: 'Invite & Earn', href: '/squad', icon: Users, color: 'text-orange-500' },
    { name: 'Rules & Policies', href: '/rules', icon: ScrollText, color: 'text-cyan-500' },
    { name: 'Settings', href: '/settings', icon: Settings, color: 'text-gray-400' },
  ];

  return (
    <Sidebar collapsible="offcanvas" className="border-r border-white/5 bg-card/50 backdrop-blur-xl">
      <SidebarHeader className="h-20 flex flex-row items-center justify-between px-4 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="relative w-8 h-8 bg-primary rounded-xl flex items-center justify-center font-bold text-lg text-white glow-primary rotate-3 group-hover:rotate-0 transition-transform overflow-hidden shrink-0 shadow-xl">
             <AppLogoImage fallbackUrl={logoUrl} fill className="object-cover" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
            <span className="font-headline font-black text-lg tracking-tight uppercase leading-none truncate whitespace-nowrap">
              CLASH <span className="legendary-text italic">ARENA</span>
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 group-data-[collapsible=icon]:hidden">
          <Link href="/settings" className="w-8 h-8 flex items-center justify-center rounded-lg border border-yellow-500/30 hover:border-yellow-500/60 bg-yellow-500/10 hover:bg-yellow-500/20 transition-all text-yellow-500">
            <Settings className="w-4 h-4" />
          </Link>
          <Link href="/" className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-500/30 hover:border-red-500/60 bg-red-500/10 hover:bg-red-500/20 transition-all text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            <Home className="w-4 h-4" />
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        {/* VIP PASS SECTION */}
        <div className="px-4 mb-6 group-data-[collapsible=icon]:hidden flex gap-2">
          {isAdmin ? (
            <Link href="/vip/pricing" className="flex-1 relative overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 p-2 hover:border-yellow-500/50 transition-colors shadow-[0_0_15px_rgba(234,179,8,0.1)] flex flex-col items-center justify-center text-center gap-1 group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              <Crown className="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">VIP Pass</span>
            </Link>
          ) : (
            <div className="flex-1 relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-2 flex flex-col items-center justify-center text-center gap-1 opacity-50 cursor-not-allowed">
              <Crown className="w-4 h-4 text-muted-foreground" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Locked</span>
            </div>
          )}
          {(profile?.isVip || isAdmin) ? (
            <Link href="/vip/lounge" className="flex-1 relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-red-500/10 p-2 hover:border-purple-500/50 transition-colors flex flex-col items-center justify-center text-center gap-1 group">
              <Zap className="w-4 h-4 text-purple-400 animate-pulse group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Elite Lounge</span>
            </Link>
          ) : (
            <div className="flex-1 relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-2 flex flex-col items-center justify-center text-center gap-1 opacity-50 cursor-not-allowed">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Locked</span>
            </div>
          )}
        </div>

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
                    <Link href={item.href} className="flex items-center gap-3 w-full">
                      <div className="relative">
                        <item.icon className={`${item.color} ${pathname === item.href ? 'scale-110 drop-shadow-[0_0_8px_currentColor]' : ''} transition-transform`} />
                        {item.href === '/arena' && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-600 border border-black rounded-full flex items-center justify-center animate-pulse" />
                        )}
                      </div>
                      <span className={`font-bold text-sm tracking-tight ${pathname === item.href ? 'text-white' : 'text-muted-foreground'} flex items-center justify-between w-full group-data-[collapsible=icon]:hidden`}>
                        <span>{item.name}</span>
                        {item.href === '/arena' && unreadCount > 0 && (
                          <span className="ml-auto px-1.5 py-0.5 bg-red-600 border border-black rounded-full text-[9px] font-black text-white animate-pulse">
                            {unreadCount}
                          </span>
                        )}
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
            <Link href="https://youtube.com/@slyclasher?si=SXY9ktt1B3qNrfZq" target="_blank" className="text-red-500 hover:scale-125 transition-transform" title="SlyClasher YouTube">
              <Youtube className="w-5 h-5" />
            </Link>
            <Link href="https://whatsapp.com/channel/0029VbD00mO2Jl8HKwsJHH0V" target="_blank" className="text-green-500 hover:scale-125 transition-transform" title="WhatsApp Channel">
              <MessageCircle className="w-5 h-5" />
            </Link>
            <Link href="https://whatsapp.com/channel/0029VbDCBiE9mrGdmwx9690K" target="_blank" className="text-orange-500 hover:scale-125 transition-transform" title="Official Arena WhatsApp Channel">
              <Swords className="w-5 h-5" />
            </Link>
            <Link href="https://link.clashofclans.com/?action=OpenGlobalChat&chatId=P15fb9c0ffd14442faadd5f264fb9651a" target="_blank" className="text-amber-500 hover:scale-125 transition-transform" title="In-Game Community">
              <Users className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </SidebarFooterComponent>
    </Sidebar>
  );
}
