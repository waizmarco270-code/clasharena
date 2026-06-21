
'use client';

import { useMemo, useState, useEffect, use } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, Users, Trophy, Calendar, Clock, ShieldAlert, Timer, ChevronLeft, ShieldCheck, Zap, Info, ArrowRight, Loader2 } from 'lucide-react';
import { useDoc, useFirestore, useCollection, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, updateDoc, increment, setDoc, getDoc, collection } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { format, isBefore, isAfter } from 'date-fns';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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

  useEffect(() => {
    if (!t) return;
    const timer = setInterval(() => {
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
    
    // Check if already registered
    if (registration) {
      toast({ title: "ALREADY REGISTERED", description: "You are already in the arena." });
      return;
    }

    // Check Town Hall Requirement
    if (t.townHall > 0 && profile.townHall !== t.townHall) {
      toast({ 
        variant: "destructive", 
        title: "LEVEL MISMATCH", 
        description: `This arena is restricted to Town Hall ${t.townHall} warriors only. You are TH ${profile.townHall}.` 
      });
      return;
    }

    // Check Balance
    if (profile.balance < t.entryFee) {
      toast({ variant: "destructive", title: "INSUFFICIENT COINS", description: "Recharge your vault to join." });
      router.push('/wallet');
      return;
    }

    // Check Slot Availability
    if (t.currentPlayers >= t.maxPlayers) {
      toast({ variant: "destructive", title: "ARENA FULL", description: "No more slots available." });
      return;
    }

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

      toast({ title: "BATTLE JOINED", description: "Your slot has been reserved." });
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: tRef.path, operation: 'write' }));
    } finally {
      setRegistering(false);
    }
  };

  if (tLoading) return <PageWrapper><div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></PageWrapper>;
  if (!t) return <PageWrapper><div className="text-center py-20"><p className="text-muted-foreground font-black uppercase">Arena Not Found</p></div></PageWrapper>;

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
                    {t.townHall > 0 && <Badge className="bg-yellow-500 text-black font-black">TH {t.townHall} ONLY</Badge>}
                  </div>
                  <h1 className="font-headline text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white drop-shadow-xl">{t.name}</h1>
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
                    <p className="text-lg font-black text-white uppercase">{t.townHall > 0 ? `TH ${t.townHall}` : 'ANY TH'}</p>
                  </div>
                </div>

                <div className="mt-12 space-y-6">
                  <h3 className="font-headline text-2xl font-bold flex items-center gap-2 uppercase">
                    <Info className="text-primary w-6 h-6" /> ARENA RULES
                  </h3>
                  <div className="space-y-4">
                    {t.rules?.map((rule: string, i: number) => (
                      <div key={i} className="flex gap-4 items-start bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
                        <p className="text-sm text-muted-foreground font-medium">{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass border-primary/20 bg-primary/5 sticky top-24">
              <CardHeader className="text-center">
                <CardTitle className="font-headline text-xl font-black uppercase italic">BATTLE PROTOCOL</CardTitle>
                <CardDescription className="uppercase text-[10px] font-black tracking-widest">Verification Status Active</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Status</span>
                    <Badge className={status === 'OPEN' ? 'bg-green-500' : 'bg-red-500'}>{status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Countdown</span>
                    <span className="text-sm font-mono font-black text-primary animate-pulse">{countdown}</span>
                  </div>
                </div>

                {registration ? (
                  <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl text-center space-y-4">
                    <ShieldCheck className="w-12 h-12 text-green-500 mx-auto" />
                    <div className="space-y-1">
                      <p className="font-black text-green-500 uppercase tracking-tighter text-xl">WARRIOR VERIFIED</p>
                      <p className="text-[10px] text-muted-foreground font-bold">You are registered for this arena. Prepare your troops.</p>
                    </div>
                  </div>
                ) : (
                  <Button 
                    onClick={handleRegister}
                    disabled={status !== 'OPEN' || registering}
                    className="w-full h-16 bg-primary font-black uppercase text-xl glow-primary rounded-2xl shadow-2xl transition-all active:scale-95 group"
                  >
                    {registering ? <Loader2 className="animate-spin" /> : (
                      <>
                        JOIN ARENA <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
