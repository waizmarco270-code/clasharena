
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Users, 
  ShieldCheck, 
  ArrowRight,
  Target,
  Shield,
  Zap,
  Swords,
  Globe,
  Star,
  CheckCircle2,
  Lock,
  MessageSquare,
  PlayCircle
} from 'lucide-react';
import Image from 'next/image';
import { NeuralBackground } from '@/components/ui/neural-background';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { useRouter } from 'next/navigation';
import { SignInButton, useAuth } from "@clerk/nextjs";
import { Card } from '@/components/ui/card';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, collection, query, limit, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function StatCard({ icon: Icon, label, value, delay }: { icon: any, label: string, value: string, delay: string }) {
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, 500);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className={cn(
      "glass bg-black/40 border-white/5 p-4 md:p-6 rounded-2xl flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 fill-mode-both",
      delay
    )}>
      <div className="p-3 bg-primary/10 rounded-xl mb-3 border border-primary/20">
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
      </div>
      <p className="text-xl md:text-2xl font-black font-headline text-white tracking-tighter">{displayValue}</p>
      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">{label}</p>
    </div>
  );
}

function StepCard({ step, title, desc, icon: Icon }: { step: string, title: string, desc: string, icon: any }) {
  return (
    <div className="relative group p-8 rounded-3xl glass border-white/5 hover:border-primary/30 transition-all duration-500 bg-white/[0.01]">
       <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary flex items-center justify-center rounded-2xl font-black text-xl italic skew-x-[-10deg] shadow-xl group-hover:rotate-12 transition-transform">
          {step}
       </div>
       <div className="mb-6 p-4 bg-primary/10 w-fit rounded-2xl border border-primary/10 group-hover:glow-primary transition-all">
          <Icon className="w-8 h-8 text-primary" />
       </div>
       <h3 className="font-headline text-2xl font-black uppercase italic mb-2 tracking-tighter text-white">{title}</h3>
       <p className="text-muted-foreground text-sm leading-relaxed font-medium">{desc}</p>
    </div>
  );
}

export default function Home() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const db = useFirestore();

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);

  // Limit to top 3 champions for the landing page wall
  const topChampionsQuery = useMemo(() => query(collection(db, 'users'), orderBy('wins', 'desc'), limit(3)), [db]);
  const { data: champions } = useCollection(topChampionsQuery);

  useEffect(() => {
    if (isLoaded && userId) {
      router.push('/dashboard');
    }
  }, [userId, isLoaded, router]);

  const heroBg = bgData?.hero || 'https://res.cloudinary.com/dnbbmvbcr/image/upload/f_auto,q_auto/1000053884_i6oosd';
  const logoUrl = bgData?.logo;
  
  return (
    <PageWrapper>
      <div className="flex flex-col selection:bg-primary selection:text-white overflow-x-hidden min-h-screen relative bg-black">
        <div className="fixed inset-0 z-0 pointer-events-none">
           <NeuralBackground />
           <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse" />
        </div>
        
        <header className="fixed top-0 left-0 right-0 z-[100] h-20 glass-dark border-b border-white/5 backdrop-blur-2xl">
           <div className="container mx-auto h-full px-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                 <div className="relative w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-bold text-lg text-white glow-primary rotate-3 overflow-hidden shadow-2xl">
                    {logoUrl ? <Image src={logoUrl} alt="Logo" fill className="object-cover" /> : <span>C</span>}
                 </div>
                 <span className="font-headline font-black text-2xl tracking-tighter uppercase italic hidden md:block">
                   CLASH <span className="text-primary">ARENA</span>
                 </span>
              </Link>

              <div className="flex items-center gap-6">
                 {isLoaded && !userId ? (
                   <SignInButton mode="modal">
                     <Button className="bg-primary text-white font-black px-8 h-12 rounded-xl glow-primary border-t border-white/20 uppercase tracking-widest text-[10px] shadow-2xl">
                       SECURE ACCESS
                     </Button>
                   </SignInButton>
                 ) : (
                   <div className="h-10 w-24 bg-white/5 animate-pulse rounded-lg" />
                 )}
              </div>
           </div>
        </header>

        <section className="relative min-h-[100svh] flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-20">
          <div className="absolute inset-0 z-0 transition-transform duration-1000 ease-out hover:scale-105">
            <Image 
              src={heroBg} 
              alt="Hero Background" 
              fill 
              className="object-cover opacity-90 saturate-[1.2]"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center justify-center w-full">
            <div className="p-3 md:p-4 bg-primary/20 backdrop-blur-3xl rounded-full border border-primary/30 mb-8 flex items-center gap-3 animate-float shadow-[0_0_50px_rgba(255,69,0,0.3)]">
               <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary" />
               <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-white">The Pro Arena for Clash of Clans</span>
            </div>

            <h1 className="font-headline text-[4rem] leading-[0.85] xs:text-[6rem] md:text-[10rem] font-black mb-10 tracking-tighter uppercase flex flex-col items-center justify-center">
              <span className="text-white drop-shadow-[0_0_60px_rgba(255,255,255,0.2)]">CLASH</span>
              <span className="legendary-text italic tracking-[-0.05em] mt-1 md:mt-2 scale-110 drop-shadow-[0_0_80px_rgba(255,69,0,0.4)]">ARENA</span>
            </h1>
            
            <p className="text-base md:text-2xl font-bold text-white mb-12 tracking-tight max-w-xl drop-shadow-2xl opacity-90">
              Battle for <span className="text-primary italic underline decoration-primary/60 underline-offset-8">Glory.</span> Win real <span className="text-primary italic underline decoration-primary/60 underline-offset-8">Rewards.</span>
            </p>
            
            <div className="flex flex-col gap-8 w-full max-w-4xl justify-center items-center px-6">
              {isLoaded && !userId ? (
                <SignInButton mode="modal">
                  <Button 
                    size="lg" 
                    className="w-full sm:w-[400px] h-16 md:h-20 text-lg md:text-xl animate-shimmer text-white font-black rounded-2xl glow-primary transition-all hover:scale-105 active:scale-95 group border-t border-white/20 shadow-2xl"
                  >
                    ENTER BATTLEGROUND
                    <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </SignInButton>
              ) : null}

              <div className="grid grid-cols-3 gap-3 md:gap-6 w-full max-w-3xl mt-8">
                 <StatCard icon={Users} label="Warriors" value="2,400+" delay="duration-300" />
                 <StatCard icon={Swords} label="Live Arenas" value="12 Active" delay="duration-500" />
                 <StatCard icon={Trophy} label="Distributed" value="₹ 45,000+" delay="duration-700" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 md:py-40 relative z-10 bg-black/40 backdrop-blur-sm border-y border-white/5">
           <div className="container mx-auto px-6">
              <div className="text-center mb-20">
                 <h2 className="font-headline text-3xl md:text-6xl font-black uppercase tracking-tighter text-white mb-4">
                    WAR <span className="text-primary italic">PROTOCOL</span>
                 </h2>
                 <p className="text-muted-foreground font-black uppercase text-[10px] md:text-xs tracking-[0.4em]">How to claim your champion status</p>
                 <div className="h-1 w-24 bg-primary mx-auto rounded-full mt-6 glow-primary" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 relative">
                 <div className="hidden md:block absolute top-24 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent -z-10" />
                 <StepCard step="01" title="JOIN ARENA" desc="Create your elite profile with Clan Tag and secure your identity." icon={Globe} />
                 <StepCard step="02" title="REGISTER" desc="Choose your battle category and pay entry fee from your vault." icon={Target} />
                 <StepCard step="03" title="BATTLE" desc="Attack your assigned opponent in the official war clan." icon={Swords} />
                 <StepCard step="04" title="WIN REWARDS" desc="Claim coins, items or real cash instantly after victory." icon={Trophy} />
              </div>
           </div>
        </section>

        <section className="py-24 md:py-40 relative z-10">
           <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                 <div className="space-y-8">
                    <Badge className="bg-primary/20 text-primary border-primary/20 px-4 py-1.5 uppercase font-black tracking-widest text-xs">
                       <span className="w-2 h-2 rounded-full bg-primary animate-pulse mr-2 inline-block" /> 
                       LIVE TRANSPARENCY
                    </Badge>
                    <h2 className="font-headline text-4xl md:text-6xl font-black uppercase italic text-white tracking-tighter leading-none">
                       TRUST IS OUR <br/> <span className="text-primary italic">GREATEST WEAPON</span>
                    </h2>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-lg font-medium">
                       Every result is public, every payment is verified by AI, and every champion is etched into the Hall of Fame. We ensure zero bias and absolute fairness in every war.
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="flex gap-4">
                          <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                          <div>
                             <p className="font-black text-white uppercase text-sm">AI Verification</p>
                             <p className="text-xs text-muted-foreground">Automatic screenshot analysis for results.</p>
                          </div>
                       </div>
                       <div className="flex gap-4">
                          <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
                          <div>
                             <p className="font-black text-white uppercase text-sm">Proof Ledger</p>
                             <p className="text-xs text-muted-foreground">Public record of every reward transaction.</p>
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="relative aspect-video rounded-3xl overflow-hidden glass border-white/10 shadow-2xl group">
                    <Image src="https://picsum.photos/seed/transparency/800/450" alt="Transparency" fill className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="p-10 text-center space-y-4">
                          <Zap className="w-16 h-16 text-primary mx-auto animate-pulse" />
                          <h3 className="font-headline text-3xl font-black uppercase text-white drop-shadow-2xl">BATTLE LEDGER ACTIVE</h3>
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Auditing 142 Recent Victories</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        <section className="py-24 md:py-40 container mx-auto px-6 relative z-10 border-t border-white/5">
          <div className="text-center mb-20 relative">
            <h2 className="font-headline text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter text-white">
              BUILT FOR <span className="legendary-text italic glow-neon text-5xl md:text-7xl">CHAMPIONS</span>
            </h2>
            <div className="h-1.5 w-32 bg-primary mx-auto rounded-full glow-primary" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Skill-Based", desc: "Matched purely by town hall and skill level. Zero pay-to-win elements.", icon: <Target className="text-primary w-10 h-10" /> },
              { title: "AI Verified", desc: "Every result is scanned via AI Vision to ensure competitive integrity.", icon: <ShieldCheck className="text-primary w-10 h-10" /> },
              { title: "Active Pro Scene", desc: "Join thousands of elite warriors in daily high-stakes tournaments.", icon: <Users className="text-primary w-10 h-10" /> },
              { title: "Instant Rewards", desc: "Winning coins are credited automatically. Real cash within 24 hours.", icon: <Zap className="text-primary w-10 h-10" /> },
              { title: "Secure Payouts", desc: "Enterprise-grade security protocols for every transaction.", icon: <Lock className="text-primary w-10 h-10" /> },
              { title: "Chat Arena", desc: "Engage with your opponents and fans in our live arena chat.", icon: <MessageSquare className="text-primary w-10 h-10" /> },
            ].map((item, i) => (
              <Card key={i} className="glass bg-white/[0.01] hover:bg-white/[0.05] border-white/5 hover:border-primary/40 transition-all p-10 text-center group relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
                <div className="mb-8 flex justify-center group-hover:scale-110 transition-all duration-500 drop-shadow-[0_0_15px_rgba(255,69,0,0.3)]">{item.icon}</div>
                <h3 className="font-headline text-2xl font-bold mb-4 text-white uppercase tracking-tight">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="py-24 md:py-40 relative z-10 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent">
           <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
                 <div className="space-y-4 text-left">
                    <h2 className="font-headline text-4xl md:text-7xl font-black uppercase italic text-white tracking-tighter leading-none">
                       LEGENDS <br/><span className="text-primary italic">WALL</span>
                    </h2>
                    <p className="text-muted-foreground uppercase font-black text-xs tracking-widest">The eternal record of war</p>
                 </div>
                 {/* REMOVED: View All Champions button as per user request */}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 {champions?.map((champ: any, i: number) => (
                    <div key={champ.id} className="glass p-6 md:p-10 rounded-[2.5rem] flex flex-col items-center gap-4 text-center hover:bg-primary/5 transition-all border-white/5 group">
                       <div className="relative">
                          <div className="h-20 w-20 md:h-32 md:h-32 rounded-full overflow-hidden border-4 border-primary/20 p-1 group-hover:border-primary transition-all">
                             <Image src={champ.avatarUrl || 'https://picsum.photos/seed/warrior/200'} alt="Champion" fill className="object-cover rounded-full" />
                          </div>
                          <div className="absolute -bottom-2 -right-2 bg-yellow-500 h-8 w-8 md:h-12 md:w-12 rounded-xl flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform">
                             <Trophy className="w-5 h-5 md:w-6 md:h-6 text-black" />
                          </div>
                       </div>
                       <div>
                          <h4 className="font-headline text-lg md:text-xl font-black uppercase italic text-white truncate max-w-[120px]">{champ.username}</h4>
                          <p className="text-[10px] font-black text-primary uppercase mt-1 tracking-widest">{champ.wins} VICTORIES</p>
                       </div>
                    </div>
                 ))}
                 {(!champions || champions.length === 0) && Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass p-10 rounded-[2.5rem] flex flex-col items-center gap-4 text-center opacity-20 border-dashed border-white/20">
                       <div className="h-32 w-32 rounded-full bg-white/10" />
                       <div className="h-4 w-24 bg-white/10 rounded-full" />
                    </div>
                 ))}
              </div>
           </div>
        </section>

        <footer className="py-24 border-t border-white/5 bg-black/90 relative z-10">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 bg-primary rounded-xl flex items-center justify-center font-bold text-2xl text-white glow-primary rotate-3 overflow-hidden shadow-2xl">
                    {logoUrl ? <Image src={logoUrl} alt="Logo" fill className="object-cover" /> : "C"}
                  </div>
                  <span className="font-headline font-black text-3xl tracking-tighter text-white uppercase italic">
                    CLASH <span className="text-primary">ARENA</span>
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                  The ultimate competitive ecosystem for elite Clash of Clans players. Join the elite and claim your glory in the global arenas.
                </p>
              </div>

              <div>
                <h4 className="font-headline font-bold text-lg mb-8 uppercase tracking-widest text-white italic">Platform</h4>
                <ul className="space-y-4 text-sm font-medium text-muted-foreground">
                  <li><Link href="/arena" className="hover:text-primary transition-colors">Tournament Arena</Link></li>
                  <li><Link href="/hall-of-champions" className="hover:text-primary transition-colors">Hall of Champions</Link></li>
                  <li><Link href="#" className="hover:text-primary transition-colors">Live Leaderboards</Link></li>
                  <li><Link href="#" className="hover:text-primary transition-colors">Upcoming Events</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-headline font-bold text-lg mb-8 uppercase tracking-widest text-white italic">Information</h4>
                <ul className="space-y-4 text-sm font-medium text-muted-foreground">
                  <li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
                  <li><Link href="#" className="hover:text-primary transition-colors">Rules & Regulations</Link></li>
                  <li><Link href="#" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
                  <li><Link href="#" className="hover:text-primary transition-colors">Contact Us</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-headline font-bold text-lg mb-8 uppercase tracking-widest text-white italic">Community</h4>
                <div className="flex flex-wrap gap-4">
                  <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-primary/20 border border-white/5 hover:border-primary/30 group">
                    <svg className="w-6 h-6 fill-[#26A5E4] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .33z"/>
                    </svg>
                  </Button>
                  <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-primary/20 border border-white/5 hover:border-primary/30 group">
                    <svg className="w-6 h-6 fill-[#FF0000] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-[0.4em] font-black mb-2 opacity-60">© 2026 CLASH ARENA ECOSYSTEM</p>
                <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-widest">
                  Powered by <span className="text-white">EmityGate.com</span> • Developed by <span className="text-primary italic">WaizMarco</span>
                </p>
              </div>
              <div className="flex items-center gap-8 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">
                <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-white transition-colors">Safety Center</Link>
                <Link href="#" className="hover:text-white transition-colors">Partner Program</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </PageWrapper>
  );
}
