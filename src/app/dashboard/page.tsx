
'use client';

import { useMemo } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Swords, 
  Trophy, 
  Users, 
  TrendingUp, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile } = useDoc(userRef);

  const activeTournaments = [
    {
      id: '1',
      name: 'Titan Clash Championship',
      category: 'TH16 Arena',
      prize: 2000,
      image: PlaceHolderImages.find(img => img.id === 'th16-arena')?.imageUrl
    },
    {
      id: '2',
      name: 'Rising Stars Cup',
      category: 'TH15 Arena',
      prize: 1000,
      image: PlaceHolderImages.find(img => img.id === 'th15-arena')?.imageUrl
    }
  ];

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="font-headline text-3xl md:text-4xl font-black mb-2 tracking-tight uppercase">
              COMMAND <span className="text-primary italic">HUB</span>
            </h1>
            <p className="text-muted-foreground font-medium">
              Welcome back, <span className="text-white font-bold">{profile?.username || 'Warrior'}</span>. The arena awaits.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/arena">
              <Button className="bg-primary hover:bg-primary/90 font-black px-8 h-12 rounded-xl glow-primary">
                FIND TOURNAMENT
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass border-white/5 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Wallet className="w-5 h-5 text-primary" />
                <Badge variant="outline" className="text-[10px] border-primary/20">WALLET</Badge>
              </div>
              <p className="text-2xl font-black font-headline">🪙 {profile?.balance || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Available Coins</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <Badge variant="outline" className="text-[10px] border-white/10">CAREER</Badge>
              </div>
              <p className="text-2xl font-black font-headline">{profile?.wins || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Total Victories</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <Badge variant="outline" className="text-[10px] border-white/10">STATUS</Badge>
              </div>
              <p className="text-2xl font-black font-headline italic uppercase tracking-tighter">{profile?.rank || 'ROOKIE'}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Current Standing</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Zap className="text-blue-500 w-5 h-5" />
                <Badge variant="outline" className="text-[10px] border-white/10">POWER</Badge>
              </div>
              <p className="text-2xl font-black font-headline uppercase tracking-tighter">TH{profile?.townHall || '??'}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Town Hall Level</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-xl font-bold flex items-center gap-2">
                <Swords className="text-primary w-5 h-5" /> HOT ARENAS
              </h2>
              <Link href="/arena" className="text-xs text-primary font-bold hover:underline">VIEW ALL</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeTournaments.map((t) => (
                <Card key={t.id} className="overflow-hidden glass border-white/5 group hover:border-primary/30 transition-all">
                  <div className="relative h-40">
                    <Image src={t.image || ''} alt={t.name} fill className="object-cover group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">{t.category}</p>
                      <h3 className="font-headline font-bold text-lg">{t.name}</h3>
                    </div>
                  </div>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Prize Pool</p>
                      <p className="font-bold">🪙 {t.prize}</p>
                    </div>
                    <Link href={`/arena/tournament/${t.id}`}>
                      <Button size="sm" className="bg-white text-black hover:bg-white/90 font-bold px-4 h-9">
                        JOIN
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Fair Play Notice */}
            <Card className="bg-primary/5 border border-primary/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck className="w-24 h-24" />
              </div>
              <CardContent className="p-8">
                <h3 className="font-headline text-2xl font-black mb-2 flex items-center gap-3 italic">
                  FAIR PLAY <span className="text-primary">ENFORCED</span>
                </h3>
                <p className="text-muted-foreground text-sm max-w-lg mb-6 leading-relaxed">
                  Every result is scanned by our advanced AI Vision systems. Any form of cheating, mismatched screenshots, or predatory behavior leads to an instant and permanent ban.
                </p>
                <Link href="/hall-of-champions">
                  <Button variant="outline" className="border-white/10 hover:bg-white/5 font-bold group">
                    VIEW VERIFIED LEDGER
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            <h2 className="font-headline text-xl font-bold flex items-center gap-2">
              <Users className="text-primary w-5 h-5" /> RECENT CHAMPIONS
            </h2>
            <Card className="glass border-white/5 overflow-hidden">
              <CardContent className="p-0">
                {[
                  { name: 'SlayerX', win: '+🪙 500', time: '2m ago' },
                  { name: 'DragonKing', win: '+🪙 200', time: '12m ago' },
                  { name: 'ProClash', win: '+🪙 1200', time: '45m ago' },
                  { name: 'KingArthur', win: '+🪙 5000', time: '1h ago' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 ${i !== 3 ? 'border-b border-white/5' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-black text-[10px]">
                        {item.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-green-500">{item.win}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Link href="/setup">
              <Card className="glass border-white/5 hover:border-primary/20 transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <h3 className="font-headline font-bold text-sm mb-2 group-hover:text-primary transition-colors uppercase">Profile Incomplete?</h3>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">Update your Town Hall and securing your Arena Identity is required for elite access.</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
