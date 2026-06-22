'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  Moon, 
  Sun, 
  Monitor, 
  Info, 
  ShieldAlert, 
  Scale, 
  HelpCircle, 
  MessageSquare,
  ChevronRight,
  Zap
} from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const menuItems = [
    { label: 'Intelligence FAQ', desc: 'Search common arena protocols', icon: HelpCircle, href: '/settings/faq', color: 'text-blue-500' },
    { label: 'Contact Support', desc: 'Submit a technical support ticket', icon: MessageSquare, href: '/settings/support', color: 'text-green-500' },
    { label: 'War Protocols', desc: 'Read the official rules', icon: Scale, href: '/rules', color: 'text-primary' },
    { label: 'Fair Play Policy', desc: 'Integrity and Anti-Cheat details', icon: ShieldAlert, href: '/fair-play', color: 'text-orange-500' },
    { label: 'About Arena', desc: 'The vision of Clash Arena', icon: Info, href: '/about', color: 'text-purple-500' },
  ];

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <div className="flex items-center gap-4 mb-8">
           <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
              <Settings className="w-8 h-8 text-primary" />
           </div>
           <div>
              <h1 className="font-headline text-3xl font-black uppercase italic tracking-tighter text-white">SYSTEM <span className="text-primary">PREFERENCES</span></h1>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">Control your arena experience</p>
           </div>
        </div>

        <section className="space-y-6">
           <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary ml-1 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Visual Protocol
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'light', label: 'Light Arena', icon: Sun },
                { id: 'dark', label: 'Dark Arena', icon: Moon },
                { id: 'system', label: 'System Default', icon: Monitor },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all",
                    theme === t.id 
                      ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(255,69,0,0.2)]" 
                      : "bg-white/5 border-white/5 hover:border-white/10"
                  )}
                >
                  <t.icon className={cn("w-6 h-6", theme === t.id ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", theme === t.id ? "text-white" : "text-muted-foreground")}>{t.label}</span>
                </button>
              ))}
           </div>
        </section>

        <section className="space-y-6 pt-4">
           <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary ml-1 flex items-center gap-2">
              <Info className="w-3 h-3" /> Intelligence Hub
           </h2>
           <div className="grid gap-3">
              {menuItems.map((item, i) => (
                <Link key={i} href={item.href}>
                  <Card className="glass border-white/5 hover:border-primary/30 transition-all group cursor-pointer overflow-hidden bg-white/[0.02]">
                    <CardContent className="p-5 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className={cn("p-3 bg-white/5 rounded-xl border border-white/5", item.color)}>
                             <item.icon className="w-5 h-5" />
                          </div>
                          <div>
                             <p className="text-sm font-black uppercase tracking-tight text-white">{item.label}</p>
                             <p className="text-[10px] text-muted-foreground font-medium">{item.desc}</p>
                          </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
           </div>
        </section>

        <div className="pt-10 flex flex-col items-center text-center opacity-40">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-1">Clash Arena legendary v2.1</p>
           <p className="text-[8px] font-bold uppercase text-muted-foreground">© 2026 EMITYGATE SYSTEMS</p>
        </div>
      </div>
    </PageWrapper>
  );
}
