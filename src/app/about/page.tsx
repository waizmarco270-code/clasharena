'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Target, 
  Users, 
  Zap, 
  Crown, 
  Globe, 
  Cpu, 
  CodeXml,
  ChevronRight
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto space-y-16 pb-20">
        {/* Hero Section */}
        <div className="relative h-[400px] rounded-[3rem] overflow-hidden group shadow-2xl">
           <Image 
             src="https://picsum.photos/seed/clash-arena-about/1200/600" 
             alt="About Hero" 
             fill 
             className="object-cover opacity-60 saturate-150 group-hover:scale-105 transition-transform duration-1000" 
           />
           <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
           <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-6">
              <Badge className="bg-primary/20 text-primary border-primary/30 px-6 py-1.5 uppercase font-black tracking-[0.3em] animate-in fade-in zoom-in duration-500">
                The Ecosystem
              </Badge>
              <h1 className="font-headline text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                BEYOND <span className="text-primary">BATTLE</span>
              </h1>
              <p className="max-w-2xl text-lg md:text-xl font-medium text-muted-foreground animate-in fade-in slide-in-from-bottom-8 duration-1000">
                Clash Arena is a cutting-edge esports ecosystem designed to empower elite warriors through transparent, AI-verified competitive protocols.
              </p>
           </div>
        </div>

        {/* Vision Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <Card className="glass border-white/5 p-8 rounded-[2.5rem] bg-primary/5 hover:bg-primary/10 transition-all group">
              <div className="mb-6 p-4 bg-primary/10 w-fit rounded-2xl border border-primary/20 group-hover:glow-primary transition-all">
                <Target className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-headline text-3xl font-black uppercase italic mb-4">Our <span className="text-primary">Mission</span></h3>
              <p className="text-muted-foreground leading-relaxed font-medium">
                To build the world's most trusted arena for Clash of Clans enthusiasts. We eliminate bias, automate integrity, and ensure every victory is rewarded with legendary speed.
              </p>
           </Card>

           <Card className="glass border-white/5 p-8 rounded-[2.5rem] bg-blue-600/5 hover:bg-blue-600/10 transition-all group border-blue-500/10">
              <div className="mb-6 p-4 bg-blue-600/10 w-fit rounded-2xl border border-blue-500/20 group-hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all">
                <Globe className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="font-headline text-3xl font-black uppercase italic mb-4">Global <span className="text-blue-500">Reach</span></h3>
              <p className="text-muted-foreground leading-relaxed font-medium">
                Uniting warriors across all time zones. Our cloud-native infrastructure ensures that from New York to New Delhi, the battle never lags and the rewards never delay.
              </p>
           </Card>
        </div>

        {/* Pillars Section */}
        <div className="space-y-10">
           <div className="text-center">
              <h2 className="font-headline text-4xl font-black uppercase italic tracking-tighter">THE CORE <span className="text-primary">PILLARS</span></h2>
              <div className="h-1.5 w-24 bg-primary mx-auto rounded-full mt-4 glow-primary" />
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Cpu, label: "AI VISION", desc: "Automated result auditing" },
                { icon: Zap, label: "INSTANT PAY", desc: "Lightning fast reward flow" },
                { icon: Shield, label: "SECURE IDENTITY", desc: "Clash Tag locked protocols" },
                { icon: Crown, label: "ELITE RANKS", desc: "Animated career progression" }
              ].map((pillar, i) => (
                <div key={i} className="glass p-6 rounded-3xl border-white/5 text-center flex flex-col items-center gap-4 hover:-translate-y-2 transition-all duration-500">
                   <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-primary"><pillar.icon className="w-6 h-6" /></div>
                   <h4 className="font-black uppercase text-sm tracking-widest">{pillar.label}</h4>
                   <p className="text-xs text-muted-foreground font-bold">{pillar.desc}</p>
                </div>
              ))}
           </div>
        </div>

        {/* Credits Section */}
        <Card className="glass border-white/10 bg-black/40 p-10 rounded-[3rem] relative overflow-hidden">
           <div className="absolute top-0 right-0 p-10 opacity-5">
              <CodeXml className="w-64 h-64 rotate-12" />
           </div>
           <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-4">
                 <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-2xl rotate-6">C</div>
                 <div>
                    <h3 className="font-headline text-3xl font-black uppercase italic leading-none">THE CLASH <span className="text-primary">ARENA</span></h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mt-2">Legendary Edition v2.1</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6 border-t border-white/5">
                 <div className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">POWERED BY</p>
                    <h4 className="text-2xl font-black uppercase tracking-tight">EmityGate.com</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                       Providing the robust infrastructure and secure gateway APIs that keep the arena operational 24/7.
                    </p>
                 </div>
                 <div className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">DEVELOPED BY</p>
                    <h4 className="text-2xl font-black uppercase tracking-tight italic">WaizMarco</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                       Lead Architect of the Arena UI/UX and the Anti-Cheat Integrity Protocol. Built for the elite, by the elite.
                    </p>
                 </div>
              </div>

              <div className="pt-8 flex justify-center">
                 <Link href="/">
                    <button className="bg-white text-black font-black px-10 h-14 rounded-2xl hover:scale-105 transition-all shadow-2xl flex items-center gap-3">
                       RETURN TO BATTLEGROUND <ChevronRight className="w-5 h-5" />
                    </button>
                 </Link>
              </div>
           </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
