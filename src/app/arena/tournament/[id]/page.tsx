
'use client';

import { useMemo, useState, useEffect, use } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ChevronLeft, Loader2, PlayCircle, Shield, Swords, Trophy, Users, Zap, Ticket, Crown } from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { isBefore, isAfter } from 'date-fns';
import { THRuleCard } from '@/components/th-rule-card';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  const thRulesRef = useMemo(() => doc(db, 'app-settings', 'th-rules'), [db]);
  const { data: allThRules } = useDoc(thRulesRef);

  const registrationRef = useMemo(() => (user && id) ? doc(db, 'tournaments', id, 'registrations', user.id) : null, [db, id, user?.id]);
  const { data: registration } = useDoc(registrationRef);

  const [registering, setRegistering] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [countdown, setCountdown] = useState<string>('');
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string>('bronze');

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

  const handleRegister = async (ticketType: string = 'none') => {
    if (!user || !profile || !t) return;
    if (registration) return;
    if (t.townHall > 0 && profile.townHall !== t.townHall) {
      toast({ variant: "destructive", title: "LEVEL MISMATCH", description: `TH ${t.townHall} only.` });
      return;
    }
    if (ticketType === 'none' && profile.balance < t.entryFee) {
      toast({ variant: "destructive", title: "INSUFFICIENT COINS" });
      router.push('/wallet');
      return;
    }
    if (t.currentPlayers >= t.maxPlayers) return;

    setRegistering(true);
    try {
      const res = await fetch('/api/tournament/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: id, ticketType })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      if (data.message === 'Already registered') {
        toast({ title: "ALREADY IN ARENA", description: "You are already registered." });
      } else {
        toast({ title: "BATTLE JOINED", description: "Registration successful!" });
      }
      setTicketModalOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "REGISTRATION ERROR", description: e.message });
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
                  <div className="space-y-2">
                    <Button 
                      onClick={() => handleRegister('none')}
                      disabled={status !== 'OPEN' || registering}
                      className="w-full h-16 bg-primary font-black uppercase text-xl glow-primary rounded-2xl shadow-2xl transition-all group"
                    >
                      {registering ? <Loader2 className="animate-spin" /> : (
                        <>
                          PAY 🪙 {t.entryFee} <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </>
                      )}
                    </Button>
                    
                    {status === 'OPEN' && (
                        <div className="pt-2 space-y-2">
                          {((profile?.inventory?.bronzeTickets || 0) > 0 && t.entryFee <= 80) ||
                           ((profile?.inventory?.silverTickets || 0) > 0 && t.entryFee <= 199) ||
                           ((profile?.inventory?.goldenTickets || 0) > 0) ? (
                            <Button 
                              onClick={() => {
                                // Auto-select highest valid ticket by default or let user choose
                                if (profile?.inventory?.bronzeTickets > 0 && t.entryFee <= 80) setSelectedTicket('bronze');
                                else if (profile?.inventory?.silverTickets > 0 && t.entryFee <= 199) setSelectedTicket('silver');
                                else if (profile?.inventory?.goldenTickets > 0) setSelectedTicket('golden');
                                setTicketModalOpen(true);
                              }}
                              disabled={registering} 
                              className="w-full h-12 bg-white hover:bg-gray-200 text-black font-black uppercase rounded-xl"
                            >
                              <Ticket className="w-4 h-4 mr-2" /> USE TICKET FOR ENTRY
                            </Button>
                          ) : null}
                        </div>
                    )}
                  </div>
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

        {/* TH Rules Section */}
        {t?.townHall > 0 && allThRules && (
          <div className="mt-8">
            <h3 className="text-xl font-headline font-black italic uppercase mb-4 text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" /> Town Hall {t.townHall} Rules
            </h3>
            <div className="max-w-md">
              <THRuleCard 
                th={t.townHall.toString()} 
                rulesList={allThRules[t.townHall.toString()] || []} 
              />
            </div>
          </div>
        )}
      </div>

      {/* Ticket Selection Modal */}
      <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="font-headline font-black uppercase text-xl text-primary italic flex items-center gap-2">
              <Ticket className="w-5 h-5" /> Select Entry Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm font-bold text-muted-foreground mb-4">Choose which ticket to consume for entry. Make sure you select the correct one.</p>
            
            <div className="grid grid-cols-1 gap-3">
              {(profile?.inventory?.bronzeTickets || 0) > 0 && t?.entryFee <= 80 && (
                <div 
                  onClick={() => setSelectedTicket('bronze')}
                  className={cn(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between",
                    selectedTicket === 'bronze' ? "border-amber-600 bg-amber-600/10" : "border-white/5 bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-600/20 p-2 rounded-lg"><Ticket className="w-5 h-5 text-amber-600" /></div>
                    <div>
                      <p className="font-black uppercase text-amber-500">Bronze Ticket</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Valid up to 80 Coins</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-amber-600/30 text-amber-500">{profile?.inventory?.bronzeTickets || 0} Owned</Badge>
                </div>
              )}
              
              {(profile?.inventory?.silverTickets || 0) > 0 && t?.entryFee <= 199 && (
                <div 
                  onClick={() => setSelectedTicket('silver')}
                  className={cn(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between",
                    selectedTicket === 'silver' ? "border-slate-400 bg-slate-400/10" : "border-white/5 bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-400/20 p-2 rounded-lg"><Ticket className="w-5 h-5 text-slate-400" /></div>
                    <div>
                      <p className="font-black uppercase text-slate-300">Silver Ticket</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Valid up to 199 Coins</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-slate-400/30 text-slate-400">{profile?.inventory?.silverTickets || 0} Owned</Badge>
                </div>
              )}

              {(profile?.inventory?.goldenTickets || 0) > 0 && (
                <div 
                  onClick={() => setSelectedTicket('golden')}
                  className={cn(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between relative overflow-hidden",
                    selectedTicket === 'golden' ? "border-yellow-500 bg-yellow-500/10" : "border-white/5 bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-yellow-500/0 w-full animate-shimmer" />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="bg-yellow-500/20 p-2 rounded-lg"><Crown className="w-5 h-5 text-yellow-500" /></div>
                    <div>
                      <p className="font-black uppercase text-yellow-500">Golden Ticket</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Valid for ANY Arena</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 relative z-10">{profile?.inventory?.goldenTickets || 0} Owned</Badge>
                </div>
              )}
            </div>

            <Button 
              onClick={() => handleRegister(selectedTicket)}
              disabled={registering || !selectedTicket}
              className="w-full h-14 bg-primary hover:bg-primary/90 text-black font-black uppercase text-lg mt-6 glow-primary"
            >
              {registering ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `CONFIRM & USE ${selectedTicket} TICKET`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
