'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Swords, 
  Trophy, 
  Users, 
  Zap, 
  ShieldCheck, 
  Verified, 
  ArrowRight,
  Flame,
  Star,
  Target
} from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const { user } = useUser();
  const heroBg = PlaceHolderImages.find(img => img.id === 'hero-bg');
  
  return (
    <div className="flex flex-col bg-black selection:bg-primary selection:text-white">
      {/* Red Ambient Particles Overlay */}
      <div className="particles-bg" />
      
      {/* Dynamic Glowing Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] -z-10 animate-glow-drift opacity-40" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px] -z-10 animate-glow-drift opacity-30" style={{ animationDirection: 'reverse' }} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <Image 
            src={heroBg?.imageUrl || ''} 
            alt="Hero Background" 
            fill 
            className="object-cover opacity-20 scale-110 saturate-150"
            priority
            data-ai-hint="gaming fire"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-black" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-5 py-2 rounded-full text-[10px] font-black tracking-[0.2em] mb-8 border border-primary/30 animate-float backdrop-blur-md">
            <Zap className="w-4 h-4 fill-primary" />
            LIVE SEASON 12 COMPETITION
          </div>
          
          <h1 className="font-headline text-7xl md:text-[11rem] font-black mb-8 tracking-tighter leading-[0.8] uppercase flex flex-col">
            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">CLASH</span>
            <span className="text-primary italic animate-pulse-neon glow-text tracking-[-0.05em]">ARENA</span>
          </h1>
          
          <p className="text-xl md:text-2xl font-bold text-white/90 mb-4 tracking-tight">
            Compete. Win. <span className="text-primary italic underline decoration-primary/40 underline-offset-8">Rise.</span>
          </p>
          
          <p className="text-muted-foreground text-base md:text-xl max-w-2xl mb-14 leading-relaxed font-medium">
            The ultimate competitive ecosystem for elite Clash of Clans players. 
            <span className="text-white"> Fair play</span>, transparent results, and <span className="text-primary">legendary rewards</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg justify-center items-center">
            <Link href={user ? "/arena" : "/login"} className="w-full">
              <Button size="lg" className="w-full h-20 text-xl bg-primary hover:bg-primary/90 text-white font-black rounded-2xl glow-primary transition-all hover:scale-105 group border-t border-white/20">
                {user ? "ENTER THE ARENA" : "JOIN THE CLAN"}
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Clash Arena - Neon Cards */}
      <section className="py-32 container mx-auto px-4">
        <div className="text-center mb-24 relative">
          <h2 className="font-headline text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter">
            BUILT FOR <span className="text-primary italic glow-neon">CHAMPIONS</span>
          </h2>
          <div className="h-1.5 w-32 bg-primary mx-auto rounded-full glow-primary" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              title: "Skill-Based", 
              desc: "Matched purely by town hall and skill level. Zero pay-to-win elements.", 
              icon: <Target className="text-primary w-10 h-10" /> 
            },
            { 
              title: "AI Verified", 
              desc: "Every result is scanned via AI Vision to ensure competitive integrity.", 
              icon: <ShieldCheck className="text-primary w-10 h-10" /> 
            },
            { 
              title: "Active Pro Scene", 
              desc: "Join thousands of elite warriors in daily high-stakes tournaments.", 
              icon: <Users className="text-primary w-10 h-10" /> 
            },
            { 
              title: "Real Rewards", 
              desc: "Battle for coins, exclusive status, and the Hall of Champions glory.", 
              icon: <Trophy className="text-primary w-10 h-10" /> 
            },
          ].map((item, i) => (
            <Card key={i} className="glass bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/40 transition-all p-10 text-center group relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
              <div className="mb-8 flex justify-center group-hover:scale-110 group-hover:glow-neon transition-all duration-500">{item.icon}</div>
              <h3 className="font-headline text-2xl font-bold mb-4 text-white uppercase tracking-tight">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works - Premium Dark Mode */}
      <section className="py-32 bg-black/60 border-y border-white/5 relative">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-20">
            <div className="flex-1 space-y-16">
              <div className="space-y-6">
                <h2 className="font-headline text-5xl font-black uppercase tracking-tighter leading-none">
                  THE <span className="text-primary italic glow-text">BATTLE</span> PATH
                </h2>
                <p className="text-muted-foreground text-lg">Your journey to legendary status starts here.</p>
              </div>

              <div className="space-y-10">
                {[
                  { step: "01", title: "Join Arena", desc: "Sign in with Google and complete your profile setup." },
                  { step: "02", title: "Register", desc: "Select a tournament category matching your TH level." },
                  { step: "03", title: "Strike", desc: "Connect with your rival and execute your attack strategy." },
                  { step: "04", title: "Verify", desc: "Upload victory proof for instant AI verification & audit." },
                  { step: "05", title: "Claim", desc: "Receive rewards and rise in the global rankings." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-8 items-start group">
                    <div className="font-headline text-4xl font-black text-white/10 italic group-hover:text-primary/40 transition-colors duration-500">{item.step}</div>
                    <div className="pt-1">
                      <h4 className="font-bold text-xl mb-2 text-white group-hover:text-primary transition-colors">{item.title}</h4>
                      <p className="text-sm text-muted-foreground font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative aspect-square w-full max-w-lg">
              <div className="absolute inset-0 bg-primary/20 blur-[120px] animate-pulse" />
              <Card className="glass border-primary/20 relative z-10 h-full flex items-center justify-center p-16 overflow-hidden">
                 <Swords className="w-56 h-56 text-primary animate-float opacity-80 glow-neon" />
                 <div className="absolute top-8 left-8 flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
                   <span className="text-[10px] font-black tracking-widest uppercase text-white/80">AI GUARD ACTIVE</span>
                 </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Arenas - Glowing Cards */}
      <section className="py-32 container mx-auto px-4">
        <div className="text-center mb-24">
          <h2 className="font-headline text-4xl md:text-6xl font-black mb-4 uppercase">THE <span className="text-primary italic glow-text">ARENAS</span></h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { th: "TH15", title: "Vanguard Arena", color: "from-blue-600/40 to-blue-950/20", icon: "🛡️" },
            { th: "TH16", title: "Titan Arena", color: "from-orange-600/40 to-red-950/20", icon: "⚔️" },
            { th: "TH17", title: "Mystic Arena", color: "from-purple-600/40 to-indigo-950/20", icon: "⚡" },
            { th: "TH18", title: "Eternal Arena", color: "from-yellow-600/40 to-orange-950/20", icon: "🔥" },
          ].map((item, i) => (
            <Card key={i} className="group relative overflow-hidden border-none transition-all hover:-translate-y-4 hover:shadow-[0_20px_40px_-15px_rgba(255,69,0,0.3)]">
              <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-40 group-hover:opacity-60 transition-opacity`} />
              <CardContent className="relative p-12 flex flex-col items-center text-center bg-black/40 h-full">
                <div className="text-6xl mb-8 group-hover:scale-125 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                  {item.icon}
                </div>
                <Badge className="mb-4 bg-primary/20 text-primary border-primary/30 font-black tracking-widest uppercase text-[10px]">{item.th} CATEGORY</Badge>
                <h3 className="font-headline text-3xl font-bold mb-3 text-white">{item.title}</h3>
                <p className="text-xs text-muted-foreground mb-10 font-medium">Competitive matches for elite {item.th} players only.</p>
                <Link href="/login" className="w-full">
                  <Button variant="secondary" className="w-full font-black rounded-xl uppercase tracking-widest py-6 group-hover:bg-primary group-hover:text-white transition-all">Join Arena</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust Section - Neon Highlight */}
      <section className="py-32 container mx-auto px-4">
        <div className="glass bg-gradient-to-r from-primary/10 to-transparent border-primary/20 rounded-[3rem] p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 opacity-10 -rotate-12 translate-x-20 -translate-y-20 scale-150">
            <Verified className="w-64 h-64 text-primary" />
          </div>
          <div className="max-w-3xl relative z-10">
            <h2 className="font-headline text-5xl md:text-6xl font-black mb-8 uppercase italic leading-[0.9] tracking-tighter">
              RADICAL <br /><span className="text-primary glow-text">TRANSPARENCY</span>
            </h2>
            <div className="space-y-8">
              <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                At Clash Arena, competitive integrity is our north star. We utilize AI-powered vision auditing and public ledgers to ensure every win is earned.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  "Publicly accessible match ledger",
                  "Verified winner history",
                  "AI vision-powered screenshot audit",
                  "Strict fair-play enforcement"
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm font-bold text-white/90">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center border border-primary/40 shadow-[0_0_10px_rgba(255,69,0,0.3)]">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                    </div>
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - The Core Section */}
      <section className="py-40 container mx-auto px-4">
        <div className="relative rounded-[4rem] overflow-hidden bg-primary p-[2px] glow-primary animate-float">
          <div className="bg-black rounded-[3.9rem] py-28 px-8 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent opacity-50" />
            
            <h2 className="relative z-10 font-headline text-6xl md:text-8xl font-black mb-10 uppercase tracking-tighter leading-none">
              READY TO <br /><span className="text-primary italic glow-text">DOMINATE?</span>
            </h2>
            <p className="relative z-10 text-muted-foreground text-xl max-w-xl mb-16 font-medium">
              The arena is waiting. Your journey to the Hall of Champions starts with a single strike.
            </p>
            <Link href={user ? "/arena" : "/login"} className="relative z-10 w-full max-w-md">
              <Button size="lg" className="w-full h-24 text-2xl font-black bg-primary hover:bg-primary transition-all glow-primary rounded-3xl group border-t border-white/30 py-8 shadow-[0_0_60px_rgba(255,69,0,0.5)]">
                {user ? "ENTER THE ARENA" : "LOGIN & DOMINATE"}
                <Flame className="ml-4 w-8 h-8 animate-pulse group-hover:scale-125 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-white/5 bg-black/90 text-center">
        <p className="text-muted-foreground text-[10px] uppercase tracking-[0.4em] font-black opacity-60 flex items-center justify-center gap-3">
          <Star className="w-3 h-3 fill-primary text-primary" /> 
          ESTABLISHED 2024 • THE COMPETITIVE ECOSYSTEM
          <Star className="w-3 h-3 fill-primary text-primary" />
        </p>
      </footer>
    </div>
  );
}