
'use client';

import { useMemo, useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Swords, Users, Trophy, Calendar, Filter, Search, Clock, Zap, ArrowRight, ShieldAlert, Timer } from 'lucide-react';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { format, isBefore, isAfter } from 'date-fns';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';

function TournamentCard({ t }: { t: any }) {
  const [countdown, setCountdown] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const regStart = new Date(t.registrationStartTime);
      const regEnd = new Date(t.registrationEndTime);
      const battleStart = new Date(t.startTime);

      if (isBefore(now, regStart)) {
        const diff = regStart.getTime() - now.getTime();
        setCountdown(formatDiff(diff));
        setStatus('REGISTRATION_SOON');
      } else if (isAfter(now, regStart) && isBefore(now, regEnd)) {
        if (t.currentPlayers >= t.maxPlayers) {
          setStatus('FULL');
          setCountdown('SOLD OUT');
        } else {
          setStatus('OPEN');
          const diff = regEnd.getTime() - now.getTime();
          setCountdown(formatDiff(diff));
        }
      } else if (isAfter(now, regEnd) && isBefore(now, battleStart)) {
        setStatus('CLOSED');
        const diff = battleStart.getTime() - now.getTime();
        setCountdown(formatDiff(diff));
      } else if (isAfter(now, battleStart)) {
        setStatus('ONGOING');
        setCountdown('BATTLE LIVE');
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

  return (
    <Card className="overflow-hidden glass border-white/5 flex flex-col hover:border-primary/30 transition-all group relative">
      <div className="relative h-48">
        <Image src={t.imageUrl || 'https://picsum.photos/seed/clash/800/600'} alt={t.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-60" />
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className="bg-primary/80 backdrop-blur-md uppercase font-black text-[10px] tracking-widest">{t.subCategory.replace('_', ' ')}</Badge>
          {t.townHall > 0 && <Badge variant="secondary" className="backdrop-blur-md font-black text-[10px]">TH {t.townHall}</Badge>}
        </div>
        <div className="absolute top-4 right-4">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
            <Timer className="w-3 h-3 text-primary animate-pulse" />
            <span className="text-[10px] font-black text-white font-mono">{countdown}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent">
          <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-[0.2em]">{t.type.toUpperCase()}</p>
          <h3 className="font-headline text-2xl font-black uppercase italic truncate">{t.name}</h3>
        </div>
      </div>

      <CardContent className="flex-1 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Prize Pool</p>
            <p className="text-sm font-black text-white">🏆 {t.prizePool}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Entry Fee</p>
            <p className="text-sm font-black text-primary">🪙 {t.entryFee}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">Requirement</p>
            <p className="text-[10px] font-bold text-white">{t.townHall > 0 ? `TH ${t.townHall} ONLY` : 'ALL TH LEVELS'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">War Start</p>
            <p className="text-[10px] font-bold text-white">{format(new Date(t.startTime), 'MMM dd, HH:mm')}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-black uppercase">
            <span>Recruitment Progress</span>
            <span className={t.currentPlayers >= t.maxPlayers ? 'text-primary' : 'text-green-500'}>
              {t.currentPlayers} / {t.maxPlayers} Warriors
            </span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(t.currentPlayers / t.maxPlayers) * 100}%` }} />
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Link href={`/arena/tournament/${t.id}`} className="w-full">
          <Button 
            className={`w-full font-black uppercase tracking-widest h-12 rounded-xl transition-all ${
              status === 'OPEN' ? 'bg-primary hover:bg-primary/90 glow-primary' : 'bg-white/5 text-muted-foreground'
            }`}
          >
            {status === 'REGISTRATION_SOON' ? 'REGISTRATION SOON' : status === 'OPEN' ? 'JOIN BATTLE' : status === 'FULL' ? 'ARENA FULL' : status === 'CLOSED' ? 'REGISTRATION CLOSED' : 'BATTLE LIVE'}
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
                <div key={i} className="h-96 w-full rounded-3xl bg-white/5 animate-pulse" />
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
