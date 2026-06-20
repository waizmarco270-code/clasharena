import { PageWrapper } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Swords, Trophy, Users, Zap, Bell } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  const heroBg = PlaceHolderImages.find(img => img.id === 'hero-bg');
  
  const arenas = [
    { id: 'th15', title: 'TH15 Arena', players: '128+', icon: '🛡️', color: 'from-blue-500/20 to-blue-600/20' },
    { id: 'th16', title: 'TH16 Arena', players: '256+', icon: '⚔️', color: 'from-orange-500/20 to-red-600/20' },
    { id: 'th17', title: 'TH17 Arena', players: '64+', icon: '⚡', color: 'from-purple-500/20 to-indigo-600/20' },
    { id: 'th18', title: 'TH18 Arena', players: 'Coming Soon', icon: '🔥', color: 'from-yellow-500/20 to-orange-600/20' },
  ];

  return (
    <PageWrapper>
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden mb-12 h-[300px] md:h-[400px]">
        <Image 
          src={heroBg?.imageUrl || ''} 
          alt="Hero" 
          fill 
          className="object-cover opacity-50"
          data-ai-hint="gaming fire"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold mb-4 border border-primary/20 w-fit">
            <Zap className="w-3 h-3 fill-primary" />
            LIVE SEASON 12
          </div>
          <h1 className="font-headline text-4xl md:text-6xl font-black mb-4 tracking-tighter max-w-2xl leading-[0.9]">
            COMPETE. WIN. <span className="text-primary italic">RISE.</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-md mb-8">
            The premium Clash of Clans competitive ecosystem. Fair play, high rewards, and pure skill.
          </p>
          <div className="flex gap-4">
            <Link href="/arena">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold px-8 glow-primary">
                ENTER ARENA
              </Button>
            </Link>
            <Link href="/hall-of-champions">
              <Button size="lg" variant="outline" className="border-white/10 glass font-bold">
                VIEW RESULTS
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Announcements Bar */}
      <div className="flex items-center gap-4 bg-muted/30 border border-white/5 rounded-2xl p-4 mb-12 overflow-hidden">
        <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
          <Bell className="w-5 h-5 text-primary animate-pulse" />
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="whitespace-nowrap flex items-center gap-12 animate-marquee">
            <p className="text-sm font-medium">New TH17 Arena tournament starting tomorrow! Prize pool: 5000 Coins 🪙</p>
            <p className="text-sm font-medium">Server maintenance scheduled for Sunday, 02:00 AM UTC.</p>
            <p className="text-sm font-medium text-primary">Season Pass holders get 2x bonus rewards this weekend!</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-headline text-2xl font-bold flex items-center gap-3">
            <Swords className="text-primary" /> ACTIVE ARENAS
          </h2>
          <Button variant="link" className="text-primary">View All</Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {arenas.map((arena) => (
            <Link key={arena.id} href={`/arena/${arena.id}`}>
              <Card className={`group relative overflow-hidden border-none transition-all hover:-translate-y-2`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${arena.color} opacity-50`} />
                <CardContent className="relative p-8 flex flex-col items-center text-center">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {arena.icon}
                  </div>
                  <h3 className="font-headline text-xl font-bold mb-1">{arena.title}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{arena.players} Competitors</p>
                  <Button variant="secondary" size="sm" className="w-full font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                    JOIN NOW
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="glass border-white/5 overflow-hidden">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Users className="text-primary w-6 h-6" />
            </div>
            <div>
              <p className="text-4xl font-headline font-black">12.5k</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Active Players</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-white/5 overflow-hidden">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center">
              <Trophy className="text-secondary w-6 h-6" />
            </div>
            <div>
              <p className="text-4xl font-headline font-black">450+</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Tournaments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass border-white/5 overflow-hidden">
          <CardContent className="p-8 flex items-center gap-6">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">🪙</span>
            </div>
            <div>
              <p className="text-4xl font-headline font-black">1.2M</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Coins Distributed</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </PageWrapper>
  );
}
