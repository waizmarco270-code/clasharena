'use client';

import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Users, 
  ShieldCheck, 
  ArrowRight,
  Target,
  Shield
} from 'lucide-react';
import Image from 'next/image';
import { NeuralBackground } from '@/components/ui/neural-background';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { useRouter } from 'next/navigation';
import { SignInButton, useAuth } from "@clerk/nextjs";
import { Card } from '@/components/ui/card';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';

export default function Home() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const db = useFirestore();

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);

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
        <NeuralBackground />
        
        {/* Landing Page Header */}
        <header className="fixed top-0 left-0 right-0 z-[100] h-20 glass-dark border-b border-white/5 backdrop-blur-xl">
           <div className="container mx-auto h-full px-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                 <div className="relative w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-bold text-lg text-white glow-primary rotate-3 overflow-hidden shadow-2xl">
                    {logoUrl ? (
                      <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                    ) : (
                      <span>C</span>
                    )}
                 </div>
                 <span className="font-headline font-black text-2xl tracking-tighter uppercase italic hidden md:block">
                   CLASH <span className="text-primary">ARENA</span>
                 </span>
              </Link>

              <div className="flex items-center gap-6">
                 {isLoaded && !userId ? (
                   <SignInButton mode="modal">
                     <Button className="bg-primary text-white font-black px-8 h-12 rounded-xl glow-primary border-t border-white/20 uppercase tracking-widest text-[10px]">
                       SECURE ACCESS
                     </Button>
                   </SignInButton>
                 ) : isLoaded && userId ? (
                   <Link href="/dashboard">
                     <Button className="bg-primary text-white font-black px-8 h-12 rounded-xl glow-primary border-t border-white/20 uppercase tracking-widest text-[10px]">
                       COMMAND HUB
                     </Button>
                   </Link>
                 ) : (
                   <div className="h-10 w-24 bg-white/5 animate-pulse rounded-lg" />
                 )}
              </div>
           </div>
        </header>
        
        {/* Decorative Glows */}
        <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] -z-10 animate-glow-drift opacity-40" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px] -z-10 animate-glow-drift opacity-30" style={{ animationDirection: 'reverse' }} />

        {/* Hero Section */}
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-20">
          <div className="absolute inset-0 z-0">
            <Image 
              src={heroBg} 
              alt="Hero Background" 
              fill 
              className="object-cover opacity-80 scale-100 saturate-[1.2]"
              priority
            />
            {/* Minimal overlay for text readability but maintaining visual clarity */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black" />
          </div>

          <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center justify-center w-full">
            <div className="p-4 bg-primary/20 backdrop-blur-2xl rounded-full border border-primary/20 mb-8 flex items-center gap-3 animate-float">
               <Shield className="w-5 h-5 text-primary" />
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">Official 2026 Pro Season</span>
            </div>

            <h1 className="font-headline text-[5.5rem] leading-[0.85] xs:text-[7rem] md:text-[11rem] font-black mb-10 tracking-tighter uppercase flex flex-col items-center justify-center">
              <span className="text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]">CLASH</span>
              <span className="legendary-text italic tracking-[-0.05em] mt-2">ARENA</span>
            </h1>
            
            <p className="text-lg md:text-2xl font-bold text-white mb-6 tracking-tight drop-shadow-2xl">
              Compete. Win. <span className="text-primary italic underline decoration-primary/60 underline-offset-8">Rise.</span>
            </p>
            
            <p className="text-white/90 text-sm md:text-xl max-w-2xl mb-14 leading-relaxed font-bold px-4 drop-shadow-lg">
              The ultimate competitive ecosystem for elite Clash of Clans players. 
              <span className="text-primary"> Fair play</span>, transparent results, and <span className="text-primary">legendary rewards</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg justify-center items-center px-6">
              {isLoaded && !userId ? (
                <SignInButton mode="modal">
                  <Button 
                    size="lg" 
                    className="w-full h-20 text-xl animate-shimmer text-white font-black rounded-2xl glow-primary transition-all hover:scale-105 group border-t border-white/20"
                  >
                    LOGIN TO CLASH ARENA
                    <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </SignInButton>
              ) : isLoaded && userId ? (
                <Button 
                  onClick={() => router.push('/dashboard')}
                  size="lg" 
                  className="w-full h-20 text-xl animate-shimmer text-white font-black rounded-2xl glow-primary transition-all hover:scale-105 group border-t border-white/20"
                >
                  ENTER THE ARENA
                  <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </Button>
              ) : (
                <Button disabled size="lg" className="w-full h-20 rounded-2xl opacity-50">
                  LOADING ARENA...
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Why Clash Arena */}
        <section className="py-20 md:py-32 container mx-auto px-4 relative z-10">
          <div className="text-center mb-20 relative">
            <h2 className="font-headline text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter text-white">
              BUILT FOR <span className="legendary-text italic glow-neon text-5xl md:text-7xl">CHAMPIONS</span>
            </h2>
            <div className="h-1.5 w-32 bg-primary mx-auto rounded-full glow-primary" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Skill-Based", desc: "Matched purely by town hall and skill level. Zero pay-to-win elements.", icon: <Target className="text-primary w-10 h-10" /> },
              { title: "AI Verified", desc: "Every result is scanned via AI Vision to ensure competitive integrity.", icon: <ShieldCheck className="text-primary w-10 h-10" /> },
              { title: "Active Pro Scene", desc: "Join thousands of elite warriors in daily high-stakes tournaments.", icon: <Users className="text-primary w-10 h-10" /> },
              { title: "Real Rewards", desc: "Battle for coins, exclusive status, and the Hall of Champions glory.", icon: <Trophy className="text-primary w-10 h-10" /> },
            ].map((item, i) => (
              <Card key={i} className="glass bg-white/[0.02] hover:bg-white/[0.05] border-white/5 hover:border-primary/40 transition-all p-10 text-center group relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
                <div className="mb-8 flex justify-center group-hover:scale-110 group-hover:glow-neon transition-all duration-500">{item.icon}</div>
                <h3 className="font-headline text-2xl font-bold mb-4 text-white uppercase tracking-tight">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{item.desc}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* SaaS Footer */}
        <footer className="py-20 border-t border-white/5 bg-black/90 relative z-10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <div className="relative w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-bold text-2xl text-white glow-primary rotate-3 overflow-hidden">
                    {logoUrl ? <Image src={logoUrl} alt="Logo" fill className="object-cover" /> : "C"}
                  </div>
                  <span className="font-headline font-bold text-2xl tracking-tighter text-white">
                    CLASH <span className="text-primary italic">ARENA</span>
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                  The ultimate competitive ecosystem for elite Clash of Clans players. Join the elite and claim your glory in the global arenas.
                </p>
              </div>

              <div>
                <h4 className="font-headline font-bold text-lg mb-6 uppercase tracking-wider text-white">Platform</h4>
                <ul className="space-y-4 text-sm font-medium text-muted-foreground">
                  <li><Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary transition-colors">Tournament Arena</Button></li>
                  <li><Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary transition-colors">Hall of Champions</Button></li>
                  <li><Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary transition-colors">Live Leaderboards</Button></li>
                  <li><Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary transition-colors">Upcoming Events</Button></li>
                </ul>
              </div>

              <div>
                <h4 className="font-headline font-bold text-lg mb-6 uppercase tracking-wider text-white">Information</h4>
                <ul className="space-y-4 text-sm font-medium text-muted-foreground">
                  <li><Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary transition-colors">About Us</Button></li>
                  <li><Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary transition-colors">Rules & Regulations</Button></li>
                  <li><Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</Button></li>
                  <li><Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary transition-colors">Contact Us</Button></li>
                </ul>
              </div>

              <div>
                <h4 className="font-headline font-bold text-lg mb-6 uppercase tracking-wider text-white">Community</h4>
                <div className="flex flex-wrap gap-4">
                  <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 group">
                    <svg className="w-5 h-5 fill-[#26A5E4] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .33z"/>
                    </svg>
                  </Button>
                  <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 group">
                    <svg className="w-5 h-5 fill-[#FF0000] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </Button>
                  <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 group">
                    <svg className="w-5 h-5 fill-[#25D366] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-[0.3em] font-black mb-1">© 2026 CLASH OF CLANS TOURNAMENT WEBSITE</p>
                <p className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                  Powered by <span className="text-white">EmityGate.com</span> • Developed by <span className="text-primary italic">WaizMarco</span> to you all by love.
                </p>
              </div>
              <div className="flex items-center gap-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                <Button variant="link" className="p-0 h-auto text-[10px] text-muted-foreground hover:text-white transition-colors">Privacy Policy</Button>
                <Button variant="link" className="p-0 h-auto text-[10px] text-muted-foreground hover:text-white transition-colors">Safety Center</Button>
                <Button variant="link" className="p-0 h-auto text-[10px] text-muted-foreground hover:text-white transition-colors">Partner Program</Button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </PageWrapper>
  );
}
