
'use client';

import { useMemo, useState, useEffect, useRef, use } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Swords, 
  Users, 
  Trophy, 
  MessageSquare, 
  ShieldCheck, 
  Loader2, 
  ChevronLeft, 
  Send, 
  Pin, 
  Link as LinkIcon, 
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Crown,
  ArrowRight,
  Move,
  Zap,
  Eye,
  History,
  Layout
} from 'lucide-react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, setDoc, collection, query, orderBy, addDoc, deleteDoc, getDocs, increment } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import { default as NextLink } from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export default function TournamentPlayArena({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const tRef = useMemo(() => doc(db, 'tournaments', id), [db, id]);
  const { data: t, loading: tLoading } = useDoc(tRef);

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile } = useDoc(userRef);

  const regQuery = useMemo(() => query(collection(db, 'tournaments', id, 'registrations')), [db, id]);
  const { data: registrations } = useCollection(regQuery);

  const matchesQuery = useMemo(() => query(collection(db, 'tournaments', id, 'matches')), [db, id]);
  const { data: rawMatches } = useCollection(matchesQuery);

  const messagesQuery = useMemo(() => query(collection(db, 'tournaments', id, 'messages'), orderBy('createdAt', 'asc')), [db, id]);
  const { data: messages } = useCollection(messagesQuery);

  const [messageText, setMessageText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [ending, setEnding] = useState(false);
  const [demoSize, setDemoSize] = useState<number | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;
  const isRegistered = registrations?.some((r: any) => r.userId === user?.id);

  const matches = useMemo(() => {
    if (demoSize) {
      return generateDemoMatches(demoSize);
    }
    if (!rawMatches) return [];
    return [...rawMatches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.matchIndex - b.matchIndex;
    });
  }, [rawMatches, demoSize]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const triggerConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !messageText.trim() || (!isRegistered && !isAdmin)) return;

    const msgData = {
      userId: user.id,
      username: profile?.username || user.firstName || 'Warrior',
      avatarUrl: user.imageUrl,
      text: messageText,
      isPinned: false,
      isAdmin: !!profile?.isAdmin,
      isSuperAdmin: !!profile?.isSuperAdmin,
      createdAt: new Date().toISOString()
    };

    setMessageText('');
    addDoc(collection(db, 'tournaments', id, 'messages'), msgData);
  };

  const generateFixtures = async () => {
    if (!isAdmin || !registrations || generating) return;
    if (registrations.length < 2) {
      toast({ variant: "destructive", title: "NOT ENOUGH WARRIORS", description: "Min 2 warriors required." });
      return;
    }
    setGenerating(true);

    try {
      const existingMatches = await getDocs(collection(db, 'tournaments', id, 'matches'));
      await Promise.all(existingMatches.docs.map(m => deleteDoc(m.ref)));

      const players = [...registrations].sort(() => Math.random() - 0.5);
      const maxSlots = t?.maxPlayers || 8;
      const rounds = Math.ceil(Math.log2(maxSlots));
      const totalInitialSlots = Math.pow(2, rounds);
      
      let initialPlayers = players.map(p => ({ id: p.userId, name: p.username }));
      while (initialPlayers.length < totalInitialSlots) {
        initialPlayers.push({ id: 'bye', name: 'BYE' });
      }

      for (let r = 1; r <= rounds; r++) {
        const matchesInRound = Math.pow(2, rounds - r);
        for (let m = 0; m < matchesInRound; m++) {
          const matchId = `r${r}-m${m}`;
          const matchData: any = {
            round: r,
            matchIndex: m,
            player1Id: r === 1 ? initialPlayers[m * 2].id : '',
            player1Name: r === 1 ? initialPlayers[m * 2].name : '',
            player2Id: r === 1 ? initialPlayers[m * 2 + 1].id : '',
            player2Name: r === 1 ? initialPlayers[m * 2 + 1].name : '',
            winnerId: '',
            nextMatchId: r < rounds ? `r${r + 1}-m${Math.floor(m / 2)}` : ''
          };

          if (r === 1) {
            if (matchData.player1Id === 'bye' && matchData.player2Id !== 'bye') matchData.winnerId = matchData.player2Id;
            else if (matchData.player2Id === 'bye' && matchData.player1Id !== 'bye') matchData.winnerId = matchData.player1Id;
          }

          await setDoc(doc(db, 'tournaments', id, 'matches', matchId), matchData);
          
          if (r === 1 && matchData.winnerId && matchData.winnerId !== 'bye') {
            const winnerName = matchData.winnerId === matchData.player1Id ? matchData.player1Name : matchData.player2Name;
            const nextMatchRef = doc(db, 'tournaments', id, 'matches', `r2-m${Math.floor(m / 2)}`);
            const isP1 = m % 2 === 0;
            await setDoc(nextMatchRef, {
              [isP1 ? 'player1Id' : 'player2Id']: matchData.winnerId,
              [isP1 ? 'player1Name' : 'player2Name']: winnerName
            }, { merge: true });
          }
        }
      }
      toast({ title: "BRACKET DEPLOYED", description: "Warriors matched." });
    } catch (e) {
      toast({ variant: "destructive", title: "GENERATION FAILED" });
    } finally {
      setGenerating(false);
    }
  };

  const handleMatchWinner = async (match: any, winnerId: string, winnerName: string) => {
    if (!isAdmin || !winnerId || winnerId === 'bye' || t?.status === 'completed' || demoSize) return;

    const matchRef = doc(db, 'tournaments', id, 'matches', `r${match.round}-m${match.matchIndex}`);
    await updateDoc(matchRef, { winnerId });

    if (match.nextMatchId) {
      const nextRef = doc(db, 'tournaments', id, 'matches', match.nextMatchId);
      const isPlayer1 = match.matchIndex % 2 === 0;
      await updateDoc(nextRef, {
        [isPlayer1 ? 'player1Id' : 'player2Id']: winnerId,
        [isPlayer1 ? 'player1Name' : 'player2Name']: winnerName
      });
    }
    toast({ title: "RESULT RECORDED", description: `${winnerName} advanced.` });
  };

  const endTournament = async () => {
    if (!isAdmin || !matches || ending) return;
    const rounds = Math.ceil(Math.log2(t?.maxPlayers || 8));
    const finalMatch = matches.find((m: any) => m.round === rounds);
    
    if (!finalMatch || !finalMatch.winnerId) {
      toast({ variant: "destructive", title: "FINAL NOT DECIDED" });
      return;
    }

    setEnding(true);
    try {
      const winnerId = finalMatch.winnerId;
      const winnerName = winnerId === finalMatch.player1Id ? finalMatch.player1Name : finalMatch.player2Name;

      await updateDoc(tRef, { 
        status: 'completed', 
        winnerId, 
        winnerName,
        completedAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'users', winnerId), {
        wins: increment(1),
        tournamentsPlayed: increment(1)
      });

      triggerConfetti();
      toast({ title: "ARENA ARCHIVED", description: `${winnerName} IS THE CHAMPION!` });
      setTimeout(() => router.push('/arena'), 6000);
    } finally {
      setEnding(false);
    }
  };

  function generateDemoMatches(size: number) {
    const rounds = Math.ceil(Math.log2(size));
    const demoMatches = [];
    for (let r = 1; r <= rounds; r++) {
      const count = Math.pow(2, rounds - r);
      for (let m = 0; m < count; m++) {
        demoMatches.push({
          id: `demo-r${r}-m${m}`,
          round: r,
          matchIndex: m,
          player1Name: r === 1 ? `Warrior ${m * 2 + 1}` : '',
          player2Name: r === 1 ? `Warrior ${m * 2 + 2}` : '',
          winnerId: '',
          nextMatchId: r < rounds ? `demo-r${r + 1}-m${Math.floor(m / 2)}` : ''
        });
      }
    }
    return demoMatches;
  }

  if (tLoading) return <PageWrapper><div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></PageWrapper>;

  const totalRounds = Math.ceil(Math.log2(t?.maxPlayers || 8));
  const winnerInfo = t?.status === 'completed' ? { id: t.winnerId, name: t.winnerName } : null;

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <NextLink href={`/arena/tournament/${id}`}><Button size="icon" variant="ghost" className="glass h-10 w-10"><ChevronLeft /></Button></NextLink>
            <div>
              <h1 className="font-headline text-2xl font-black uppercase italic tracking-tighter">{t?.name} <span className="text-primary">ARENA</span></h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Knockout Protocol Phase {t?.status === 'completed' ? 'ARCHIVED' : 'LIVE'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
            {isAdmin && (
               <>
                 <DropdownDemo onSelect={setDemoSize} current={demoSize} />
                 {t?.status !== 'completed' && (
                   <>
                     <Button variant="outline" size="sm" onClick={generateFixtures} disabled={generating} className="bg-primary/10 border-primary/20 text-primary font-black uppercase text-[10px] h-11 px-6 shadow-xl shrink-0">
                       {generating ? <Loader2 className="animate-spin" /> : <Swords className="w-4 h-4 mr-2" />} GENERATE FIXTURES
                     </Button>
                     <Button variant="destructive" size="sm" onClick={endTournament} disabled={ending} className="font-black uppercase text-[10px] h-11 px-6 shadow-xl glow-primary shrink-0">
                       {ending ? <Loader2 className="animate-spin" /> : <Trophy className="w-4 h-4 mr-2" />} END ARENA
                     </Button>
                   </>
                 )}
               </>
            )}
            {t?.status === 'completed' && (
              <Badge className="bg-yellow-500 text-black font-black uppercase h-11 px-6 italic text-sm shadow-xl flex items-center gap-2 shrink-0">
                <Crown className="w-4 h-4" /> CHAMPION: {t.winnerName}
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="fixtures" className="w-full">
          <TabsList className="bg-muted/30 border border-white/5 w-full justify-start overflow-x-auto no-scrollbar h-14 p-1">
            <TabsTrigger value="fixtures" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><Swords className="w-4 h-4 mr-2" /> Bracket</TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><Users className="w-4 h-4 mr-2" /> Warriors</TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><MessageSquare className="w-4 h-4 mr-2" /> Chat Arena</TabsTrigger>
            <TabsTrigger value="protocol" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><ShieldCheck className="w-4 h-4 mr-2" /> Protocol</TabsTrigger>
          </TabsList>

          <TabsContent value="fixtures" className="mt-4 outline-none">
            <Card className="glass border-white/5 h-[80vh] relative overflow-hidden bg-black rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,1)]">
               {/* Professional White-Dot Grid Canvas */}
               <div className="absolute inset-0 opacity-[0.25] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1.2px, transparent 1.2px)', backgroundSize: '40px 40px' }} />
               
               <ScrollArea className="h-full w-full">
                 <div className="p-20 md:p-60 min-w-max min-h-full flex items-center justify-start relative">
                    <div className="flex gap-40 md:gap-60 items-center relative z-10">
                      {Array.from({ length: totalRounds }).map((_, rIdx) => {
                        const roundNum = rIdx + 1;
                        const roundMatches = matches?.filter((m: any) => m.round === roundNum) || [];
                        
                        if (roundMatches.length === 0 && matches.length > 0) return null;

                        return (
                          <div key={roundNum} className="flex flex-col justify-around gap-20 md:gap-40 relative">
                            {/* Round Title */}
                            <div className="text-center mb-12 absolute -top-24 left-1/2 -translate-x-1/2 w-full">
                              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.4em] border-primary/40 text-primary bg-primary/5 px-10 py-4 rounded-full shadow-[0_0_30px_rgba(255,69,0,0.1)] backdrop-blur-3xl border-2">
                                {roundNum === totalRounds ? 'GRAND FINAL' : roundNum === totalRounds - 1 ? 'SEMI FINALS' : `ROUND ${roundNum}`}
                              </Badge>
                            </div>
                            
                            {roundMatches.map((m: any, mIdx: number) => (
                              <div key={m.id || mIdx} className="relative flex items-center">
                                {/* Match Card - Double Sided */}
                                <div className="w-72 md:w-96 space-y-3 z-30 relative group/match">
                                  <div className="absolute -inset-1 bg-primary/5 rounded-[1.5rem] blur-xl opacity-0 group-hover/match:opacity-100 transition-opacity" />
                                  
                                  {[1, 2].map(pIdx => {
                                    const pId = pIdx === 1 ? m.player1Id : m.player2Id;
                                    const pName = pIdx === 1 ? m.player1Name : m.player2Name;
                                    const isWinner = m.winnerId === pId && pId !== '' && pId !== 'bye' && pId !== undefined;
                                    const isLoser = m.winnerId !== '' && m.winnerId !== pId && pId !== '' && pId !== 'bye' && pId !== undefined;
                                    const isBye = pId === 'bye';

                                    return (
                                      <div 
                                        key={pIdx} 
                                        onClick={() => isAdmin && pId && pId !== 'bye' && !t?.status?.includes('completed') && !demoSize && handleMatchWinner(m, pId, pName)}
                                        className={cn(
                                          "p-5 md:p-6 rounded-[1.25rem] border-2 transition-all duration-500 flex justify-between items-center group/player relative overflow-hidden",
                                          isAdmin && pId && pId !== 'bye' && !t?.status?.includes('completed') && !demoSize ? "cursor-pointer hover:scale-[1.05] active:scale-95 hover:border-primary/50" : "cursor-default",
                                          isWinner ? "bg-green-500/20 border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.4)] z-40 scale-[1.02]" : 
                                          isLoser ? "bg-red-500/5 border-red-500/20 opacity-40 grayscale" : 
                                          isBye ? "bg-white/5 border-white/5 opacity-10 italic" :
                                          "bg-black/60 border-white/10 backdrop-blur-3xl"
                                        )}
                                      >
                                        <div className="flex items-center gap-5">
                                           <div className={cn("w-2 h-12 rounded-full", isWinner ? "bg-green-500 shadow-[0_0_20px_#22c55e]" : isLoser ? "bg-red-500" : "bg-primary/30")} />
                                           <div className="flex flex-col">
                                              <span className={cn("text-sm md:text-base font-black uppercase tracking-tighter truncate max-w-[160px] md:max-w-[220px]", isWinner ? "text-green-500" : "text-white/95")}>
                                                {pName || 'TBD'}
                                              </span>
                                              {pId && pId !== 'bye' && <span className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">WARRIOR</span>}
                                           </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {isWinner && <CheckCircle2 className="w-6 h-6 text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]" />}
                                          {isLoser && <XCircle className="w-6 h-6 text-red-500/60" />}
                                          {isAdmin && !isWinner && !isLoser && !isBye && pId && (
                                            <Zap className="w-5 h-5 text-primary opacity-0 group-hover/player:opacity-100 transition-opacity animate-pulse" />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {/* Futuristic Connecting Lines with Junctions */}
                                {roundNum < totalRounds && (
                                  <div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center z-20">
                                    <div className="w-16 md:w-24 h-[3px] bg-gradient-to-r from-primary/30 via-primary/50 to-primary/80 shadow-[0_0_15px_rgba(255,69,0,0.3)]" />
                                    
                                    <div className={cn(
                                      "w-[3px] bg-primary/80 shadow-[0_0_15px_rgba(255,69,0,0.3)]",
                                      mIdx % 2 === 0 ? "origin-top" : "origin-bottom"
                                    )} style={{ 
                                      height: `${Math.pow(2, roundNum - 1) * 160}px`,
                                      marginTop: mIdx % 2 === 0 ? '0' : `-${Math.pow(2, roundNum - 1) * 160}px` 
                                    }} />
                                    
                                    <div className="w-16 md:w-24 h-[3px] bg-primary/80 shadow-[0_0_15px_rgba(255,69,0,0.3)]" />
                                  </div>
                                )}

                                {/* Grand Champion Crown Bracket Connector */}
                                {roundNum === totalRounds && (
                                  <div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center z-20">
                                     <div className="w-20 md:w-32 h-[4px] bg-gradient-to-r from-primary to-yellow-500 shadow-[0_0_20px_rgba(255,69,0,0.4)]" />
                                     <div className={cn(
                                       "w-32 md:w-48 h-32 md:h-48 rounded-[3rem] border-4 border-yellow-500 flex flex-col items-center justify-center bg-black shadow-[0_0_60px_rgba(234,179,8,0.3)] group relative overflow-hidden transition-all duration-700",
                                       winnerInfo ? "scale-[1.1] border-green-500 shadow-[0_0_80px_rgba(34,197,94,0.5)]" : "animate-pulse"
                                     )}>
                                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-50" />
                                        <Crown className={cn("w-12 h-12 md:w-16 md:h-16 mb-2 relative z-10 transition-colors", winnerInfo ? "text-green-500" : "text-yellow-500")} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 relative z-10">CHAMPION</p>
                                        <p className={cn("text-base md:text-xl font-black uppercase italic tracking-tighter relative z-10 mt-2", winnerInfo ? "text-green-500" : "text-white/20")}>
                                          {winnerInfo?.name || 'AWAITING...'}
                                        </p>
                                     </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      
                      {/* Empty State / Initializer */}
                      {matches.length === 0 && (
                        <div className="flex flex-col items-center justify-center w-[80vw] py-20 text-center gap-12">
                           <div className="relative group">
                             <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-150 group-hover:bg-primary/30 transition-all" />
                             <Swords className="w-32 h-32 text-primary relative z-10 animate-float" />
                             <ShieldAlert className="w-16 h-16 text-white absolute -bottom-4 -right-4 z-20 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]" />
                           </div>
                           <div className="space-y-6">
                              <h3 className="font-headline text-4xl font-black uppercase italic text-white/80">Awaiting War Protocol</h3>
                              <p className="text-sm font-black uppercase tracking-[0.5em] text-white/40 max-w-md mx-auto leading-relaxed">The arena canvas is primed. Command Hub must initialize the knockout bracket protocol to commence the battle.</p>
                           </div>
                           {isAdmin && (
                             <Button onClick={generateFixtures} className="bg-primary glow-primary font-black uppercase h-20 px-16 rounded-3xl text-2xl hover:scale-105 transition-all border-t-4 border-white/40 shadow-[0_20px_60px_rgba(255,69,0,0.5)]">
                               INITIALIZE PROTOCOL
                             </Button>
                           )}
                        </div>
                      )}
                    </div>
                 </div>
                 <ScrollBar orientation="horizontal" className="bg-white/5 h-3" />
                 <ScrollBar orientation="vertical" className="bg-white/5 w-3" />
               </ScrollArea>

               {/* Interaction Hint Badges */}
               <div className="absolute bottom-10 left-10 flex flex-col gap-3 z-50">
                 <div className="flex items-center gap-4 bg-black/80 px-8 py-5 rounded-full border-2 border-white/10 backdrop-blur-3xl shadow-[0_0_80px_rgba(0,0,0,0.9)]">
                   <Move className="w-6 h-6 text-primary animate-pulse" />
                   <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white/90">Movable Arena Canvas</span>
                 </div>
                 {demoSize && (
                   <div className="flex items-center gap-4 bg-orange-600 px-8 py-5 rounded-full border-2 border-white/10 backdrop-blur-3xl shadow-2xl animate-pulse">
                     <Eye className="w-6 h-6 text-white" />
                     <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white">PROTOTYPE MODE: {demoSize} PLAYERS</span>
                     <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-white/20" onClick={() => setDemoSize(null)}><XCircle /></Button>
                   </div>
                 )}
               </div>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-4 outline-none">
            <Card className="glass border-white/5 p-10 rounded-[2.5rem] bg-black/40">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {registrations?.map((r: any) => (
                  <div key={r.userId} className="flex items-center gap-5 p-6 rounded-[2rem] bg-white/5 border-2 border-white/5 hover:border-primary/40 hover:bg-white/10 transition-all group shadow-xl">
                    <Avatar className="h-16 w-16 border-4 border-white/10 group-hover:border-primary/50 transition-all shadow-2xl">
                      <AvatarImage src={r.avatarUrl} />
                      <AvatarFallback className="font-black bg-muted text-xl">{r.username.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <p className="font-black uppercase text-lg truncate text-white italic">{r.username}</p>
                      <p className="text-[10px] text-primary font-black uppercase tracking-[0.3em]">{r.tag}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-4 outline-none">
            <Card className="glass border-white/5 flex flex-col h-[70vh] rounded-[2.5rem] overflow-hidden bg-black/40 shadow-2xl">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
                {messages?.map((msg: any) => (
                  <div key={msg.id} className={cn("flex items-start gap-5", msg.userId === user?.id ? "flex-row-reverse" : "")}>
                    <Avatar className="h-12 w-12 border-4 border-white/10 shadow-2xl">
                      <AvatarImage src={msg.avatarUrl} />
                      <AvatarFallback className="font-black uppercase">{msg.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className={cn("max-w-[80%] space-y-3", msg.userId === user?.id ? "items-end flex flex-col" : "")}>
                      <div className="flex items-center gap-3 px-3">
                        <span className={cn("text-[11px] font-black uppercase tracking-[0.3em]", msg.isSuperAdmin ? "text-yellow-500" : msg.isAdmin ? "text-green-500" : "text-muted-foreground")}>
                          {msg.username}
                        </span>
                        {msg.isSuperAdmin ? (
                          <Crown className="w-4 h-4 text-yellow-500" />
                        ) : msg.isAdmin && (
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                        )}
                        {msg.isPinned && <Pin className="w-4 h-4 text-primary animate-pulse" />}
                      </div>
                      <div className={cn(
                        "px-8 py-5 rounded-[2.5rem] text-base font-medium shadow-2xl border-2", 
                        msg.isPinned ? "bg-primary/20 border-primary/40 text-white" : 
                        msg.userId === user?.id ? "bg-primary border-primary/20 text-white" : "bg-white/5 border-white/10 text-white/95"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="p-8 border-t-2 border-white/5 bg-black/60 flex gap-5">
                <Input 
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)} 
                  placeholder={isRegistered || isAdmin ? "Broadcast strategic command..." : "Register to access arena comms"} 
                  disabled={!isRegistered && !isAdmin}
                  className="bg-white/5 rounded-3xl h-20 px-10 border-2 border-white/10 focus:ring-primary text-lg font-bold"
                />
                <Button type="submit" size="icon" className="h-20 w-20 bg-primary rounded-3xl glow-primary shadow-2xl shrink-0 group" disabled={!isRegistered && !isAdmin}>
                  <Send className="w-8 h-8 group-hover:scale-125 transition-transform" />
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="protocol" className="mt-4 outline-none">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="glass border-white/5 rounded-[3rem] overflow-hidden bg-black/40">
                  <CardHeader className="bg-white/5 border-b-2 border-white/5 p-12">
                    <CardTitle className="font-headline text-3xl font-black uppercase italic tracking-tighter flex items-center gap-4">
                      <LinkIcon className="w-10 h-10 text-primary" /> BATTLEGROUND ACCESS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-12 space-y-12">
                    <div className="bg-black/60 rounded-[2.5rem] p-12 border-2 border-white/10 space-y-10">
                       <div className="flex justify-between items-center border-b-2 border-white/5 pb-8">
                         <span className="text-xs font-black uppercase text-muted-foreground tracking-[0.4em]">Clan Protocol Tag</span>
                         <span className="text-2xl font-black text-primary uppercase italic tracking-[0.2em]">{t?.clanUid || 'PENDING INITIALIZATION'}</span>
                       </div>
                       {t?.clanLink ? (
                         <Button asChild className="w-full h-20 bg-green-600 hover:bg-green-700 font-black uppercase text-2xl rounded-[1.5rem] shadow-2xl glow-primary border-t-4 border-white/30">
                            <a href={t.clanLink} target="_blank">JOIN WAR CLAN <ArrowRight className="ml-4 w-8 h-8" /></a>
                         </Button>
                       ) : (
                         <div className="p-12 bg-white/5 rounded-3xl text-center border-2 border-dashed border-white/10">
                            <p className="text-sm font-black uppercase tracking-[0.4em] text-muted-foreground/50 animate-pulse">Awaiting Super Admin Protocol Assignment...</p>
                         </div>
                       )}
                    </div>
                    {isAdmin && (
                      <div className="space-y-8 pt-12 border-t-2 border-white/5">
                        <p className="text-[11px] font-black uppercase text-primary tracking-[0.5em] flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> OVERRIDE COMMANDS</p>
                        <div className="grid gap-8">
                          <div className="space-y-3">
                             <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Clan War Link</Label>
                             <Input placeholder="https://link.clashofclans.com/..." value={t?.clanLink || ''} onChange={(e) => updateDoc(tRef, { clanLink: e.target.value })} className="bg-white/5 h-16 rounded-[1.25rem] border-2 border-white/10 focus:border-primary" />
                          </div>
                          <div className="space-y-3">
                             <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-2">Clan Protocol Tag</Label>
                             <Input placeholder="#2P88YYQR" value={t?.clanUid || ''} onChange={(e) => updateDoc(tRef, { clanUid: e.target.value })} className="bg-white/5 h-16 rounded-[1.25rem] border-2 border-white/10 focus:border-primary" />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="glass border-white/5 rounded-[3rem] bg-black/40">
                   <CardHeader className="bg-white/5 border-b-2 border-white/5 p-12">
                    <CardTitle className="font-headline text-3xl font-black uppercase italic tracking-tighter flex items-center gap-4">
                      <ShieldAlert className="w-10 h-10 text-primary" /> ARENA PROTOCOLS
                    </CardTitle>
                  </CardHeader>
                   <CardContent className="p-12">
                      <div className="space-y-8">
                        {t?.rules?.map((rule: string, i: number) => (
                          <div key={i} className="flex gap-8 p-8 bg-white/5 rounded-[2rem] border-2 border-white/5 hover:border-primary/40 hover:bg-white/10 transition-all shadow-2xl relative group/rule">
                             <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover/rule:opacity-100 transition-opacity" />
                             <span className="text-primary font-black text-3xl italic tracking-tighter">{(i+1).toString().padStart(2, '0')}</span>
                             <p className="text-lg font-bold text-white/90 leading-relaxed tracking-tight">{rule}</p>
                          </div>
                        ))}
                      </div>
                   </CardContent>
                </Card>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}

function DropdownDemo({ onSelect, current }: { onSelect: (size: number) => void, current: number | null }) {
  return (
    <div className="flex items-center gap-2 mr-4 bg-muted/20 px-4 py-1 rounded-xl border border-white/10">
      <Layout className="w-4 h-4 text-muted-foreground" />
      <span className="text-[10px] font-black uppercase text-muted-foreground mr-2">DEMO PREVIEW:</span>
      <div className="flex gap-1">
        {[2, 4, 8, 16, 32, 64].map(size => (
          <Button 
            key={size} 
            size="sm" 
            variant="ghost" 
            onClick={() => onSelect(size)}
            className={cn(
              "h-8 px-2 text-[10px] font-black uppercase",
              current === size ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5"
            )}
          >
            {size}
          </Button>
        ))}
      </div>
    </div>
  );
}

