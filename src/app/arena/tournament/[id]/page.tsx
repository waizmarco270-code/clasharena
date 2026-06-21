
'use client';

import { useMemo, useState, useEffect, use } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, Users, Trophy, ChevronLeft, ShieldCheck, Zap, Info, ArrowRight, Loader2, PlayCircle } from 'lucide-react';
import { useDoc, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { isBefore, isAfter } from 'date-fns';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function TournamentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
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

  const isSuperAdmin = user?.id === "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16" || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;

  useEffect(() => {
    if (!t) return;
    const timer = setInterval(() => {
      // Priority check for manually completed status
      if (t.status === 'completed') {
        setStatus('COMPLETED');
        setCountdown('BATTLE OVER');
        return;
      }

      const now = new Date();
      const regStart = new Date(t.registrationStartTime);
      const regEnd = new Date(t.registrationEndTime);
      const battleStart = new Date(t.startTime);

      if (isBefore(now, regStart)) {
        setStatus('REGISTRATION_SOON');
        setCountdown(formatDiff(regStart.getTime() - now.getTime()));
      } else if (isAfter(now, regStart) && isBefore(now, regEnd)) {
        if (t.currentPlayers >= t.maxPlayers) setStatus('FULL');
        else setStatus('OPEN');
        setCountdown(formatDiff(regEnd.getTime() - now.getTime()));
      } else if (isAfter(now, regEnd) && isBefore(now, battleStart)) {
        setStatus('CLOSED');
        setCountdown(formatDiff(battleStart.getTime() - now.getTime()));
      } else {
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

  const handleRegister = async () => {
    if (!user || !profile || !t) return;
    if (registration) return;
    if (t.townHall > 0 && profile.townHall !== t.townHall) {
      toast({ variant: "destructive", title: "LEVEL MISMATCH", description: `TH ${t.townHall} only.` });
      return;
    }
    if (profile.balance < t.entryFee) {
      toast({ variant: "destructive", title: "INSUFFICIENT COINS" });
      router.push('/wallet');
      return;
    }
    if (t.currentPlayers >= t.maxPlayers) return;

    setRegistering(true);
    try {
      await updateDoc(userRef!, { balance: increment(-t.entryFee) });
      await updateDoc(tRef, { currentPlayers: increment(1) });
      const regData = {
        tournamentId: id,
        userId: user.id,
        username: profile.username || user.firstName || 'Warrior',
        tag: profile.tag,
        registeredAt: new Date().toISOString()
      };
      await setDoc(registrationRef!, regData);
      toast({ title: "BATTLE JOINED" });
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: tRef.path, operation: 'write' }));
    } finally {
      setRegistering(false);
    }
  };

  if (tLoading) return <PageWrapper><div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></PageWrapper>;
  if (!t) return <PageWrapper><div className="text-center py-20"><p className="text-muted-foreground font-black uppercase">Arena Not Found</p></div></PageWrapper>;

  const canEnterArena = registration || isAdmin || t.status === 'completed';

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        <Link href="/arena" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" /> Back to Arena
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="glass border-white/5 overflow-hidden">
              <div className="relative h-64 md:h-80">
                <Image src={t.imageUrl || 'https://picsum.photos/seed/clash/1200/800'} alt={t.name} fill className="object-cover opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Badge className="bg-primary uppercase font-black px-4 py-1">{t.type}</Badge>
                    <Badge variant="outline" className="border-white/20 text-white uppercase font-black px-4 py-1">{t.subCategory.replace('_', ' ')}</Badge>
                  </div>
                  <h1 className="font-headline text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white drop-shadow-xl">{t.name}</h1>
                  {t.status === 'completed' && (
                     <div className="mt-4 flex items-center gap-2 bg-yellow-500/90 text-black px-4 py-2 rounded-xl font-black italic uppercase text-sm animate-bounce shadow-xl w-fit">
                        <Trophy className="w-5 h-5" /> WINNER: {t.winnerName}
                     </div>
                  )}
                </div>
              </div>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <Trophy className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Prize Pool</p>
                    <p className="text-lg font-black text-white">{t.prizePool}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <Swords className="w-5 h-5 text-red-500 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Entry Fee</p>
                    <p className="text-lg font-black text-primary">🪙 {t.entryFee}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <Users className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Warriors</p>
                    <p className="text-lg font-black text-white">{t.currentPlayers} / {t.maxPlayers}</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                    <Zap className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Requirement</p>
                    <p className="text-lg font-black text-white uppercase">TH {t.townHall || 'ANY'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass border-primary/20 bg-primary/5 sticky top-24">
              <CardHeader className="text-center">
                <CardTitle className="font-headline text-xl font-black uppercase italic">ARENA STATUS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Battle Status</span>
                    <Badge className={status === 'OPEN' ? 'bg-green-500' : (status === 'COMPLETED' ? 'bg-blue-600' : 'bg-red-500')}>
                      {status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Time Phase</span>
                    <span className={cn(
                      "text-sm font-mono font-black",
                      status === 'COMPLETED' ? "text-muted-foreground" : "text-primary animate-pulse"
                    )}>
                      {countdown}
                    </span>
                  </div>
                </div>

                {canEnterArena ? (
                  <Link href={`/arena/tournament/${id}/play`} className="block">
                    <Button className="w-full h-16 bg-green-600 hover:bg-green-700 font-black uppercase text-xl rounded-2xl shadow-2xl transition-all glow-primary border-t border-white/20">
                      {status === 'COMPLETED' ? 'VIEW RESULTS' : 'ENTER ARENA'} <PlayCircle className="ml-2 w-6 h-6" />
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    onClick={handleRegister}
                    disabled={status !== 'OPEN' || registering}
                    className="w-full h-16 bg-primary font-black uppercase text-xl glow-primary rounded-2xl shadow-2xl transition-all group"
                  >
                    {registering ? <Loader2 className="animate-spin" /> : (
                      <>
                        JOIN ARENA <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                      </>
                    )}
                  </Button>
                )}
                
                {!registration && !isAdmin && (
                  <Link href={`/arena/tournament/${id}/play`} className="block">
                    <Button variant="outline" className="w-full h-12 text-[10px] font-black uppercase border-white/10 glass">
                      SPECTATE ARENA
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
