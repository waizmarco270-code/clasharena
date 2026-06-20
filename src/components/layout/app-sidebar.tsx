
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
} from '@/components/ui/sidebar';
import { Home, Swords, Trophy, User, Shield, LayoutDashboard, Settings, Wallet, History } from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();
  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile } = useDoc(userRef);

  const mainNav = [
    { name: 'Command Hub', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tournament Arena', href: '/arena', icon: Swords },
    { name: 'Coin Vault', href: '/wallet', icon: Wallet },
    { name: 'Transaction Logs', href: '/wallet/history', icon: History },
    { name: 'Hall of Champions', href: '/hall-of-champions', icon: Trophy },
  ];

  const userNav = [
    { name: 'My Profile', href: '/profile', icon: User },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-card/50 backdrop-blur-xl">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-lg text-white glow-primary rotate-3 group-hover:rotate-0 transition-transform">
            C
          </div>
          <span className="font-headline font-bold text-xl tracking-tight group-data-[collapsible=icon]:hidden uppercase">
            CLASH <span className="text-primary italic">ARENA</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
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
                    className="hover:bg-primary/10 hover:text-primary transition-colors h-11 px-4"
                  >
                    <Link href={item.href}>
                      <item.icon className={pathname === item.href ? 'text-primary' : ''} />
                      <span className="font-bold">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
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
                    className="hover:bg-primary/10 hover:text-primary transition-colors h-11 px-4"
                  >
                    <Link href={item.href}>
                      <item.icon className={pathname === item.href ? 'text-primary' : ''} />
                      <span className="font-bold">{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Admin Portal"
                  className="hover:bg-primary/10 hover:text-primary transition-colors h-11 px-4"
                >
                  <Link href="/admin">
                    <Shield className="text-primary" />
                    <span className="font-bold">Admin Center</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
