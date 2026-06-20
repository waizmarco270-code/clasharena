'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Swords, 
  Trophy, 
  Users, 
  ShieldCheck, 
  Verified, 
  ArrowRight,
  Flame,
  Star,
  Target,
  Zap,
  Youtube,
  Send,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import Link from 'next/link';
import { useUser, useAuth } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { NeuralBackground } from '@/components/ui/neural-background';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function Home() {
  const { user } = useUser();
  const auth = useAuth();
  const heroBg = PlaceHolderImages.find(img => img.id === 'hero-bg');

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };
  
  return (
    <div className="flex flex-col selection:bg-primary selection:text-white overflow-x-hidden min-h-screen">
      {/* Neural Node Particle Background */}
      <NeuralBackground />
      
      {/* Dynamic Glowing Blobs for Ambient Depth */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] -z-10 animate-glow-drift opacity-40" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px] -z-10 animate-glow-drift opacity-30" style={{ animationDirection: 'reverse' }} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <Image 
            src={heroBg?.imageUrl || ''} 
            alt="Hero Background" 
            fill 
            className="object-cover opacity-30 scale-105 saturate-150"
            priority
            data-ai-hint="gaming fire"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center">
          <h1 className="font-headline text-7xl md:text-[11rem] font-black mb-8 tracking-tighter leading-[0.8] uppercase flex flex-col">
            <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">CLASH</span>
            <span className="legendary-text italic tracking-[-0.05em]">ARENA</span>
          </h1>
          
          <p className="text-xl md:text-2xl font-bold text-white/90 mb-4 tracking-tight">
            Compete. Win. <span className="text-primary italic underline decoration-primary/40 underline-offset-8">Rise.</span>
          </p>
          
          <p className="text-muted-foreground text-base md:text-xl max-w-2xl mb-14 leading-relaxed font-medium">
            The ultimate competitive ecosystem for elite Clash of Clans players. 
            <span className="text-white"> Fair play</span>, transparent results, and <span className="text-primary">legendary rewards</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg justify-center items-center">
            {user ? (
              <Link href="/arena" className="w-full">
                <Button size="lg" className="w-full h-20 text-xl bg-primary hover:bg-primary/90 text-white font-black rounded-2xl glow-primary transition-all hover:scale-105 group border-t border-white/20">
                  ENTER THE ARENA
                  <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
            ) : (
              <Button 
                onClick={handleLogin}
                size="lg" 
                className="w-full h-20 text-xl animate-shimmer text-white font-black rounded-2xl glow-primary transition-all hover:scale-105 group border-t border-white/20"
              >
                LOGIN TO CLASH ARENA
                <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Why Clash Arena - Neon Cards */}
      <section className="py-32 container mx-auto px-4 relative z-10">
        <div className="text-center mb-24 relative">
          <h2 className="font-headline text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter">
            BUILT FOR <span className="legendary-text italic glow-neon">CHAMPIONS</span>
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
      <section className="py-32 bg-black/40 border-y border-white/5 relative z-10">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-20">
            <div className="flex-1 space-y-16">
              <div className="space-y-6">
                <h2 className="font-headline text-5xl font-black uppercase tracking-tighter leading-none">
                  THE <span className="legendary-text italic">BATTLE</span> PATH
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
      <section className="py-32 container mx-auto px-4 relative z-10">
        <div className="text-center mb-24">
          <h2 className="font-headline text-4xl md:text-6xl font-black mb-4 uppercase">THE <span className="legendary-text italic">ARENAS</span></h2>
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
                {user ? (
                  <Link href="/arena" className="w-full">
                    <Button variant="secondary" className="w-full font-black rounded-xl uppercase tracking-widest py-6 group-hover:bg-primary group-hover:text-white transition-all">Join Arena</Button>
                  </Link>
                ) : (
                  <Button onClick={handleLogin} variant="secondary" className="w-full font-black rounded-xl uppercase tracking-widest py-6 group-hover:bg-primary group-hover:text-white transition-all">Login & Join</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust Section - Neon Highlight */}
      <section className="py-32 container mx-auto px-4 relative z-10">
        <div className="glass bg-gradient-to-r from-primary/10 to-transparent border-primary/20 rounded-[3rem] p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 opacity-10 -rotate-12 translate-x-20 -translate-y-20 scale-150">
            <Verified className="w-64 h-64 text-primary" />
          </div>
          <div className="max-w-3xl relative z-10">
            <h2 className="font-headline text-5xl md:text-6xl font-black mb-8 uppercase italic leading-[0.9] tracking-tighter">
              RADICAL <br /><span className="legendary-text">TRANSPARENCY</span>
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
      <section className="py-40 container mx-auto px-4 relative z-10">
        <div className="relative rounded-[4rem] overflow-hidden bg-primary p-[2px] glow-primary animate-float">
          <div className="bg-black/90 rounded-[3.9rem] py-28 px-8 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/30 via-transparent to-transparent opacity-50" />
            
            <h2 className="relative z-10 font-headline text-6xl md:text-8xl font-black mb-10 uppercase tracking-tighter leading-none">
              READY TO <br /><span className="legendary-text italic">DOMINATE?</span>
            </h2>
            <p className="relative z-10 text-muted-foreground text-xl max-w-xl mb-16 font-medium">
              The arena is waiting. Your journey to the Hall of Champions starts with a single strike.
            </p>
            {user ? (
              <Link href="/arena" className="relative z-10 w-full max-w-md">
                <Button size="lg" className="w-full h-24 text-2xl font-black bg-primary hover:bg-primary transition-all glow-primary rounded-3xl group border-t border-white/30 py-8 shadow-[0_0_60px_rgba(255,69,0,0.5)]">
                  ENTER THE ARENA
                  <Flame className="ml-4 w-8 h-8 animate-pulse group-hover:scale-125 transition-transform" />
                </Button>
              </Link>
            ) : (
              <Button 
                onClick={handleLogin}
                size="lg" 
                className="relative z-10 w-full max-w-md h-24 text-2xl font-black animate-shimmer transition-all glow-primary rounded-3xl group border-t border-white/30 py-8 shadow-[0_0_60px_rgba(255,69,0,0.5)]"
              >
                LOGIN & DOMINATE
                <Flame className="ml-4 w-8 h-8 animate-pulse group-hover:scale-125 transition-transform" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Premium SaaS Footer */}
      <footer className="py-20 border-t border-white/5 bg-black/90 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            {/* Brand Section */}
            <div className="space-y-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center font-bold text-2xl text-white glow-primary rotate-3">
                  C
                </div>
                <span className="font-headline font-bold text-2xl tracking-tighter">
                  CLASH <span className="text-primary italic">ARENA</span>
                </span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The ultimate competitive ecosystem for elite Clash of Clans players. Join the elite and claim your glory in the global arenas.
              </p>
            </div>

            {/* Platform Links */}
            <div>
              <h4 className="font-headline font-bold text-lg mb-6 uppercase tracking-wider text-white">Platform</h4>
              <ul className="space-y-4 text-sm font-medium text-muted-foreground">
                <li><Link href="/arena" className="hover:text-primary transition-colors">Tournament Arena</Link></li>
                <li><Link href="/hall-of-champions" className="hover:text-primary transition-colors">Hall of Champions</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Live Leaderboards</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Upcoming Events</Link></li>
              </ul>
            </div>

            {/* Information Links */}
            <div>
              <h4 className="font-headline font-bold text-lg mb-6 uppercase tracking-wider text-white">Information</h4>
              <ul className="space-y-4 text-sm font-medium text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Rules & Regulations</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact Us</Link></li>
              </ul>
            </div>

            {/* Social & Community */}
            <div>
              <h4 className="font-headline font-bold text-lg mb-6 uppercase tracking-wider text-white">Community</h4>
              <div className="flex flex-wrap gap-4">
                {/* Telegram */}
                <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5 group" title="Telegram">
                  <svg className="w-5 h-5 fill-[#26A5E4] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .33z"/>
                  </svg>
                </Link>
                {/* YouTube */}
                <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5 group" title="YouTube">
                  <svg className="w-5 h-5 fill-[#FF0000] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </Link>
                {/* WhatsApp */}
                <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5 group" title="WhatsApp">
                  <svg className="w-5 h-5 fill-[#25D366] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </Link>
                {/* Clash of Clans Community */}
                <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5 group" title="Game Community">
                  <Swords className="w-5 h-5 text-yellow-600 group-hover:scale-110 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div>
              <p className="text-muted-foreground text-[10px] uppercase tracking-[0.3em] font-black mb-1">
                © 2026 CLASH OF CLANS TOURNAMENT WEBSITE
              </p>
              <p className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                Powered by <span className="text-white">EmityGate.com</span> • Developed by <span className="text-primary italic">WaizMarco</span> to you all by love.
              </p>
            </div>
            <div className="flex items-center gap-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <Link href="#" className="hover:text-white transition-colors">Safety Center</Link>
              <span className="w-1 h-1 bg-white/20 rounded-full" />
              <Link href="#" className="hover:text-white transition-colors">Partner Program</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
