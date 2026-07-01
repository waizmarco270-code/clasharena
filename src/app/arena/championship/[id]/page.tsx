'use client';

import { useMemo, useState, useEffect, use } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, Users, Trophy, ChevronLeft, ShieldCheck, Zap, Info, Loader2 } from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { isBefore, isAfter } from 'date-fns';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ChampionshipDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const tRef = useMemo(() => doc(db, 'tournaments', id), [db, id]);
  const { data: t, loading: tLoading } = useDoc(tRef);

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile } = useDoc(userRef);

  const registrationRef = useMemo(() => (user && id) ? doc(db, 'tournaments', id, 'registrations', user.id) : null, [db, id, user?.id]);
  const { data: registration } = useDoc(registrationRef);

  const [registering, setRegistering] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [countdown, setCountdown] = useState<string>('');

  useEffect(() => {
    if (!t) return;
    const timer = setInterval(() => {
      if (t.status === 'completed') {
        setStatus('COMPLETED');
        setCountdown('BATTLE OVER');
        return;
      }
      if (t.status !== 'registration' && t.status !== 'upcoming') {
        setStatus(t.status.toUpperCase());
        setCountdown('IN PROGRESS');
        return;
      }

      const now = new Date();
      const regStart = new Date(t.registrationStartTime);
      const regEnd = new Date(t.registrationEndTime);

      if (isBefore(now, regStart)) {
        setStatus('REGISTRATION_SOON');
        setCountdown(formatDiff(regStart.getTime() - now.getTime()));
      } else if (isAfter(now, regStart) && isBefore(now, regEnd)) {
        if (t.totalRegistered >= t.totalPlayers) setStatus('FULL');
        else setStatus('OPEN');
        setCountdown(formatDiff(regEnd.getTime() - now.getTime()));
      } else {
        setStatus('CLOSED');
        setCountdown('REGISTRATION CLOSED');
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

  const handleRegister = async () => {
    if (!user || !profile || !t) return;
    if (registration) return;
    
    const th = profile.townHall || 0;
    if (!t.thDistribution || t.thDistribution[th] === undefined) {
      toast({ variant: "destructive", title: "TH NOT ALLOWED", description: `Town Hall ${th} is not part of this Championship.` });
      return;
    }
    
    const thCount = t.currentRegistered?.[th] || 0;
    if (thCount >= t.thDistribution[th]) {
      toast({ variant: "destructive", title: "TH SLOTS FULL", description: `All slots for TH ${th} have been taken.` });
      return;
    }

    if (profile.balance < t.entryFee) {
      toast({ variant: "destructive", title: "INSUFFICIENT COINS" });
      router.push('/wallet');
      return;
    }

    setRegistering(true);
    try {
      const res = await fetch('/api/championship/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ championshipId: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'REGISTERED SUCCESSFULLY' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'REGISTRATION FAILED', description: e.message });
    } finally {
      setRegistering(false);
    }
  };

  if (tLoading || !t) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const myTh = profile?.townHall || 0;
  const isMyThFull = (t.currentRegistered?.[myTh] || 0) >= (t.thDistribution?.[myTh] || 0);
  const isAllowedTh = t.thDistribution?.[myTh] !== undefined;

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/arena">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full hover:bg-white/10"><ChevronLeft className="w-6 h-6" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-headline font-black uppercase italic tracking-wider flex items-center gap-3">
              <Swords className="w-8 h-8 text-blue-500" /> {t.name}
            </h1>
            <div className="flex gap-2 mt-2">
              <Badge className="bg-blue-600 font-black uppercase">CHAMPIONSHIP</Badge>
              <Badge variant="outline" className="border-blue-500/50 text-blue-400 font-black uppercase">{t.totalPlayers} PLAYERS ({t.totalPlayers/2} VS {t.totalPlayers/2})</Badge>
            </div>
          </div>
        </div>

        <div className="relative h-64 w-full rounded-[2.5rem] overflow-hidden border border-white/10">
          <Image src={t.imageUrl || 'https://picsum.photos/seed/coc/1200/400'} alt={t.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-6 left-8">
            <h3 className="text-xl font-black uppercase italic text-white drop-shadow-lg">Entry Fee</h3>
            <p className="text-3xl font-black text-yellow-500">{t.entryFee === 0 ? 'FREE' : `🪙 ${t.entryFee}`}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass border-white/5 overflow-hidden rounded-[2rem]">
              <CardContent className="p-8 space-y-8">
                <div>
                  <h3 className="text-lg font-black uppercase mb-4 text-blue-400 flex items-center gap-2"><Users className="w-5 h-5" /> Town Hall Distribution Requirements</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(t.thDistribution || {}).map(([th, limit]) => {
                      const count = t.currentRegistered?.[th] || 0;
                      const isFull = count >= (limit as number);
                      const isMe = parseInt(th) === myTh;
                      return (
                        <div key={th} className={cn("bg-white/5 rounded-xl p-4 border transition-colors", isMe ? "border-blue-500/50 bg-blue-500/10" : "border-white/5", isFull ? "opacity-50" : "")}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-black text-sm uppercase">TH {th} {isMe && <span className="text-[10px] text-blue-400 ml-2">(YOU)</span>}</span>
                            <span className="font-bold text-xs">{count} / {limit as number}</span>
                          </div>
                          <div className="h-2 bg-black rounded-full overflow-hidden">
                            <div className={cn("h-full transition-all", isFull ? "bg-red-500" : "bg-blue-500")} style={{ width: `${(count / (limit as number)) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass border-white/5 rounded-[2rem] overflow-hidden">
              <div className="bg-blue-600/20 p-6 border-b border-blue-500/20 text-center">
                <p className="text-xs font-black uppercase text-blue-400 mb-1">Status</p>
                <h3 className="text-2xl font-black uppercase tracking-widest text-white">{status.replace('_', ' ')}</h3>
                <p className="text-sm font-bold text-blue-200 mt-2">{countdown}</p>
              </div>
              <CardContent className="p-6">
                {!registration ? (
                  <Button 
                    className={cn("w-full h-14 rounded-xl font-black uppercase text-lg", status === 'OPEN' && isAllowedTh && !isMyThFull ? "bg-blue-600 hover:bg-blue-700 glow-primary" : "bg-white/10 text-white/40 cursor-not-allowed")}
                    disabled={status !== 'OPEN' || !isAllowedTh || isMyThFull || registering}
                    onClick={handleRegister}
                  >
                    {registering ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                     !isAllowedTh ? `TH ${myTh} NOT ALLOWED` :
                     isMyThFull ? `TH ${myTh} FULL` :
                     status === 'OPEN' ? 'REGISTER NOW' : 
                     status === 'REGISTRATION_SOON' ? 'WAITING' : 'CLOSED'}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-center font-black uppercase text-sm">
                      SUCCESSFULLY REGISTERED
                    </div>
                    {status === 'OPEN' && (
                      <p className="text-xs text-center font-bold text-muted-foreground uppercase">Waiting for registration to close before Party Phase begins.</p>
                    )}
                    {['PARTY_PHASE', 'LEADER_SELECTION', 'DRAFT', 'TEAMS_LOCKED', 'CLAN_ASSIGNED', 'BATTLE_STARTED', 'VERIFICATION', 'REWARDS'].includes(status) && (
                      <Link href={`/arena/championship/${id}/lobby`}>
                        <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 font-black uppercase text-lg glow-primary rounded-xl">ENTER LOBBY</Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
