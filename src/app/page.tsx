'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Swords, 
  Trophy, 
  Users, 
  Zap, 
  ShieldCheck, 
  Search, 
  Verified, 
  Medal, 
  ArrowRight,
  Flame,
  LayoutDashboard
} from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@/firebase';

export default function Home() {
  const { user } = useUser();
  const heroBg = PlaceHolderImages.find(img => img.id === 'hero-bg');
  
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <Image 
            src={heroBg?.imageUrl || ''} 
            alt="Hero Background" 
            fill 
            className="object-cover opacity-30 scale-110 animate-pulse-slow"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-1.5 rounded-full text-xs font-black mb-8 border border-primary/30 animate-float">
            <Zap className="w-4 h-4 fill-primary" />
            LIVE SEASON 12 COMPETITION
          </div>
          
          <h1 className="font-headline text-6xl md:text-9xl font-black mb-6 tracking-tighter leading-[0.85] uppercase">
            CLASH <br />
            <span className="text-primary italic glow-text">ARENA</span>
          </h1>
          
          <p className="text-xl md:text-2xl font-medium text-muted-foreground mb-4 tracking-tight">
            Compete. Win. <span className="text-white italic">Rise.</span>
          </p>
          
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mb-12 leading-relaxed">
            The ultimate competitive ecosystem for elite Clash of Clans players. 
            Fair skill-based battles, transparent results, and premium rewards.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 w-full max-w-md justify-center">
            <Link href={user ? "/arena" : "/login"} className="w-full">
              <Button size="lg" className="w-full h-16 text-lg bg-primary hover:bg-primary/90 text-white font-black rounded-2xl glow-primary shadow-[0_0_30px_rgba(255,69,0,0.4)] transition-all hover:scale-105 group">
                {user ? "ENTER THE ARENA" : "JOIN THE CLAN"}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Floating Light Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] -z-10 animate-pulse-slow" />
      </section>

      {/* Why Clash Arena */}
      <section className="py-24 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-5xl font-black mb-4 uppercase tracking-tight">
            BUILT FOR <span className="text-primary italic">CHAMPIONS</span>
          </h2>
          <div className="h-1 w-24 bg-primary mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              title: "Skill-Based", 
              desc: "Matched purely by town hall and skill level. No unfair advantages.", 
              icon: <Swords className="text-primary w-8 h-8" /> 
            },
            { 
              title: "AI Verified", 
              desc: "Every match result is verified via AI vision to ensure zero fraud.", 
              icon: <ShieldCheck className="text-green-500 w-8 h-8" /> 
            },
            { 
              title: "Active Community", 
              desc: "Join thousands of elite warriors in the most active COC community.", 
              icon: <Users className="text-blue-500 w-8 h-8" /> 
            },
            { 
              title: "Real Rewards", 
              desc: "Battle for coins, glory, and legendary status in the Hall of Champions.", 
              icon: <Trophy className="text-yellow-500 w-8 h-8" /> 
            },
          ].map((item, i) => (
            <Card key={i} className="glass border-white/5 bg-white/5 hover:border-primary/20 transition-all p-8 text-center group">
              <div className="mb-6 flex justify-center group-hover:scale-110 transition-transform">{item.icon}</div>
              <h3 className="font-headline text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-black/40">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-12">
              <div className="space-y-4">
                <h2 className="font-headline text-4xl font-black uppercase tracking-tight leading-none">
                  THE <span className="text-primary italic">BATTLE</span> PATH
                </h2>
                <p className="text-muted-foreground">Follow these steps to claim your throne.</p>
              </div>

              <div className="space-y-8">
                {[
                  { step: "01", title: "Join Arena", desc: "Sign in with Google and complete your profile setup." },
                  { step: "02", title: "Register", desc: "Find a tournament matching your Town Hall level." },
                  { step: "03", title: "Battle", desc: "Connect with your opponent and strike for the 3-star." },
                  { step: "04", title: "Verify", desc: "Upload proof of your victory for instant AI verification." },
                  { step: "05", title: "Win", desc: "Receive rewards and rise in the Hall of Champions." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 items-start">
                    <div className="font-headline text-3xl font-black text-primary/40 italic">{item.step}</div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative aspect-square w-full max-w-md">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] animate-pulse" />
              <Card className="glass border-primary/20 relative z-10 h-full flex items-center justify-center p-12 overflow-hidden">
                 <Swords className="w-48 h-48 text-primary animate-float opacity-80" />
                 <div className="absolute top-4 left-4 flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-[10px] font-black tracking-widest uppercase">Live Verification Active</span>
                 </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-24 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-5xl font-black mb-4 uppercase">THE <span className="text-primary italic">ARENAS</span></h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { th: "TH15", title: "Vanguard Arena", color: "from-blue-500/20 to-indigo-500/20", icon: <ShieldCheck className="w-12 h-12 text-blue-500" /> },
            { th: "TH16", title: "Titan Arena", color: "from-orange-500/20 to-red-500/20", icon: <Swords className="w-12 h-12 text-primary" /> },
            { th: "TH17", title: "Mystic Arena", color: "from-purple-500/20 to-pink-500/20", icon: <Zap className="w-12 h-12 text-purple-500" /> },
            { th: "TH18", title: "Eternal Arena", color: "from-yellow-500/20 to-orange-500/20", icon: <Flame className="w-12 h-12 text-yellow-500" /> },
          ].map((item, i) => (
            <Card key={i} className="group overflow-hidden border-none transition-all hover:-translate-y-4">
              <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-40`} />
              <CardContent className="relative p-10 flex flex-col items-center text-center">
                <div className="mb-6 p-4 bg-white/5 rounded-3xl border border-white/10 group-hover:glow-primary transition-all">
                  {item.icon}
                </div>
                <Badge className="mb-3 bg-primary/20 text-primary border-primary/30">{item.th} CATEGORY</Badge>
                <h3 className="font-headline text-2xl font-bold mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground mb-8">Competitive matches for elite {item.th} players only.</p>
                <Button variant="secondary" className="w-full font-black rounded-xl uppercase tracking-wider group-hover:bg-primary group-hover:text-white">Join Arena</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Transparency */}
      <section className="py-24 container mx-auto px-4">
        <div className="glass border-primary/20 rounded-3xl p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10 -rotate-12 translate-x-12 -translate-y-12">
            <Verified className="w-64 h-64" />
          </div>
          <div className="max-w-2xl">
            <h2 className="font-headline text-4xl font-black mb-6 uppercase italic">UNMATCHED <span className="text-primary">TRUST</span></h2>
            <div className="space-y-6">
              <p className="text-muted-foreground leading-relaxed">
                At Clash Arena, we believe in radical transparency. Every tournament result, every payout, and every match verify record is stored securely.
              </p>
              <ul className="space-y-4">
                {[
                  "Publicly accessible match ledger",
                  "Verified winner history",
                  "AI vision-powered screenshot verification",
                  "Fair play strictly enforced by veteran admins"
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold">
                    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                      <ShieldCheck className="w-3 h-3 text-green-500" />
                    </div>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Rules */}
      <section className="py-24 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-headline text-3xl font-black mb-8 uppercase tracking-widest">RULES OF THE <span className="text-primary italic">GAME</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            {[
              "No multi-accounting during events.",
              "Strict 3-day identity lock after updates.",
              "Fair play: No third-party software.",
              "Respect opponents and staff.",
            ].map((rule, i) => (
              <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-xl text-sm font-medium flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                {rule}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 container mx-auto px-4">
        <div className="relative rounded-[3rem] overflow-hidden bg-primary p-1 md:p-1.5 glow-primary group">
          <div className="bg-black rounded-[2.8rem] py-20 px-8 flex flex-col items-center text-center relative overflow-hidden transition-all group-hover:bg-black/90">
             {/* Decorative Background for CTA */}
            <div className="absolute inset-0 z-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent" />
            </div>

            <h2 className="relative z-10 font-headline text-5xl md:text-7xl font-black mb-8 uppercase tracking-tighter leading-none">
              READY TO <span className="text-primary italic italic">DOMINATE?</span>
            </h2>
            <p className="relative z-10 text-muted-foreground text-lg md:text-xl max-w-xl mb-12">
              The arena is waiting. Your journey to the Hall of Champions starts with a single strike.
            </p>
            <Link href={user ? "/arena" : "/login"} className="relative z-10 w-full max-w-sm">
              <Button size="lg" className="w-full h-18 text-xl font-black bg-primary hover:bg-primary hover:scale-105 transition-all glow-primary rounded-2xl group shadow-[0_0_50px_rgba(255,69,0,0.6)] py-8">
                {user ? "ENTER THE ARENA" : "LOGIN & DOMINATE"}
                <Flame className="ml-3 w-6 h-6 animate-pulse" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

import { Badge } from '@/components/ui/badge';
