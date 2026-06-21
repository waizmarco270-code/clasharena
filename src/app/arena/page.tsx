
'use client';

import { useMemo, useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Swords, Users, Trophy, Calendar, Filter, Search, Clock, Zap, ArrowRight, ShieldAlert, Timer, Info } from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { format, isBefore, isAfter } from 'date-fns';

function TournamentCard({ t }: { t: any }) {
  const [countdown, setCountdown] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('');
  const [statusColor, setStatusColor] = useState<string>('text-primary');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const regStart = new Date(t.registrationStartTime);
      const regEnd = new Date(t.registrationEndTime);
      const battleStart = new Date(t.startTime);

      if (isBefore(now, regStart)) {
        const diff = regStart.getTime() - now.getTime();
        setCountdown(formatDiff(diff));
        setStatusText('REGISTRATION OPENS IN');
        setStatusColor('text-yellow-500');
      } else if (isAfter(now, regStart) && isBefore(now, regEnd)) {
        if (t.currentPlayers >= t.maxPlayers) {
          setCountdown('SOLD OUT');
          setStatusText('ARENA FULL');
          setStatusColor('text-red-500');
        } else {
          const diff = regEnd.getTime() - now.getTime();
          setCountdown(formatDiff(diff));
          setStatusText('REGISTRATION ENDS IN');
          setStatusColor('text-green-500');
        }
      } else if (isAfter(now, regEnd) && isBefore(now, battleStart)) {
        const diff = battleStart.getTime() - now.getTime();
        setCountdown(formatDiff(diff));
        setStatusText('BATTLE STARTS IN');
        setStatusColor('text-primary');
      } else {
        setCountdown('BATTLE LIVE');
        setStatusText('ARENA ACTIVE');
        setStatusColor('text-red-500');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [t]);

  const formatDiff = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

  const getRegistrationStatus = () => {
    const now = new Date();
    const regStart = new Date(t.registrationStartTime);
    const regEnd = new Date(t.registrationEndTime);
    const battleStart = new Date(t.startTime);

    if (isBefore(now, regStart)) return 'WAITING';
    if (isAfter(now, regStart) && isBefore(now, regEnd)) {
        return t.currentPlayers >= t.maxPlayers ? 'FULL' : 'OPEN';
    }
    if (isAfter(now, regEnd) && isBefore(now, battleStart)) return 'CLOSED';
    return 'ONGOING';
  };

  const regStatus = getRegistrationStatus();

  return (
    <Card className="overflow-hidden glass border-white/5 flex flex-col hover:border-primary/30 transition-all group relative rounded-[2rem]">
      {/* Hero Section */}
      <div className="relative h-60">
        <Image 
          src={t.imageUrl || 'https://picsum.photos/seed/clash/800/600'} 
          alt={t.name} 
          fill 
          className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
          data-ai-hint="clash game"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/40" />
        
        {/* Top Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className="bg-primary px-3 py-1 uppercase font-black text-[10px] tracking-widest rounded-full shadow-lg">
            {t.subCategory.replace('_', ' ')}
          </Badge>
        </div>

        {/* Live Timer Badge */}
        <div className="absolute top-4 right-4">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
            <Timer className="w-3.5 h-3.5 text-primary animate-pulse" />
            <div className="flex flex-col">
                <span className="text-[7px] font-black text-muted-foreground uppercase leading-none mb-0.5">{statusText}</span>
                <span className={`text-[11px] font-black ${statusColor} font-mono leading-none`}>{countdown}</span>
            </div>
          </div>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-4 left-6 right-6">
          <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-[0.3em] drop-shadow-md">{t.type}</p>
          <h3 className="font-headline text-3xl font-black uppercase italic tracking-tighter text-white drop-shadow-2xl truncate leading-none">
            {t.name}
          </h3>
        </div>
      </div>

      {/* Info Section */}
      <CardContent className="flex-1 p-6 space-y-6 bg-card/20">
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em]">Prize Pool</p>
            <p className="text-sm font-black text-white flex items-center gap-2">🏆 {t.prizePool}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em]">Entry Fee</p>
            <p className="text-sm font-black text-primary flex items-center gap-2">🪙 {t.entryFee}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em]">Requirement</p>
            <p className="text-[10px] font-bold text-white uppercase">{t.townHall > 0 ? `TH ${t.townHall} ONLY` : 'ALL TH LEVELS'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em]">War Start</p>
            <p className="text-[10px] font-bold text-white uppercase">{format(new Date(t.startTime), 'MMM dd, HH:mm')}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-muted-foreground">Recruitment Progress</span>
            <span className={t.currentPlayers >= t.maxPlayers ? 'text-primary' : 'text-green-500'}>
              {t.currentPlayers} / {t.maxPlayers} Warriors
            </span>
          </div>
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
            <div 
              className="h-full bg-gradient-to-r from-primary to-orange-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,69,0,0.5)]" 
              style={{ width: `${(t.currentPlayers / t.maxPlayers) * 100}%` }} 
            />
          </div>
        </div>
      </CardContent>

      {/* Actions */}
      <CardFooter className="p-6 pt-0 bg-card/20">
        <Link href={`/arena/tournament/${t.id}`} className="w-full flex gap-3">
          <Button 
            className={`flex-1 font-black uppercase tracking-widest h-14 rounded-2xl transition-all text-sm ${
              regStatus === 'OPEN' 
                ? 'bg-primary hover:bg-primary/90 glow-primary text-white' 
                : 'bg-white/5 text-muted-foreground cursor-not-allowed border border-white/10'
            }`}
            disabled={regStatus !== 'OPEN'}
          >
            {regStatus === 'WAITING' ? 'REGISTRATION SOON' : 
             regStatus === 'OPEN' ? 'JOIN BATTLE' : 
             regStatus === 'FULL' ? 'ARENA FULL' : 
             regStatus === 'CLOSED' ? 'REGISTRATION CLOSED' : 'BATTLE LIVE'}
          </Button>
          <Button size="icon" variant="outline" className="h-14 w-14 rounded-2xl border-white/10 glass hover:bg-primary/10 transition-colors group relative">
             <Info className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
             {/* Red Bubble for Rules notification logic could go here */}
             <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ArenaPage() {
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState('all');

  const tournamentQuery = useMemo(() => {
    let q = query(collection(db, 'tournaments'), orderBy('startTime', 'asc'));
    if (activeTab !== 'all') {
      q = query(collection(db, 'tournaments'), where('type', '==', activeTab), orderBy('startTime', 'asc'));
    }
    return q;
  }, [db, activeTab]);

  const { data: tournaments, loading } = useCollection(tournamentQuery);

  return (
    <PageWrapper>
      <div className="flex flex-col gap-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-headline text-5xl font-black mb-2 tracking-tighter uppercase leading-none">
              TOURNAMENT <span className="text-primary italic">HUB</span>
            </h1>
            <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-xs">Find your battle. Claim your legacy.</p>
          </div>
          <div className="flex gap-2 bg-muted/30 p-1 rounded-2xl border border-white/5">
            {['all', 'paid', 'free', 'championship'].map((tab) => (
              <Button 
                key={tab} 
                variant={activeTab === tab ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl font-black uppercase text-[10px] px-6 h-10 transition-all ${
                  activeTab === tab ? 'bg-primary glow-primary' : ''
                }`}
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>

        {activeTab === 'championship' && (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <Trophy className="w-24 h-24 text-primary animate-float" />
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            </div>
            <div className="space-y-2">
              <h2 className="font-headline text-4xl font-black uppercase italic legendary-text">Legendary World Championship</h2>
              <p className="text-muted-foreground font-bold tracking-[0.3em] text-xs uppercase animate-pulse">Coming Soon - Prepare for Ultimate Glory</p>
            </div>
          </div>
        )}

        {activeTab !== 'championship' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-96 w-full rounded-[2rem] bg-white/5 animate-pulse" />
              ))
            ) : tournaments?.length === 0 ? (
              <div className="col-span-full py-20 text-center space-y-4">
                <Swords className="w-16 h-16 text-muted-foreground/20 mx-auto" />
                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No active arenas in this sector.</p>
              </div>
            ) : (
              tournaments?.map((t: any) => (
                <TournamentCard key={t.id} t={t} />
              ))
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
