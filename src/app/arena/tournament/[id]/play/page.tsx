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
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Crown,
  ArrowRight,
  Move,
  Zap,
  Layout,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Monitor,
  Check
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
  const [demoMatches, setDemoMatches] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;
  const isRegistered = registrations?.some((r: any) => r.userId === user?.id);

  // Initialize demo matches when demo size changes
  useEffect(() => {
    if (demoSize) {
      setDemoMatches(generateDemoMatches(demoSize));
    } else {
      setDemoMatches([]);
    }
  }, [demoSize]);

  const matches = useMemo(() => {
    if (demoSize) return demoMatches;
    if (!rawMatches) return [];
    return [...rawMatches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.matchIndex - b.matchIndex;
    });
  }, [rawMatches, demoSize, demoMatches]);

  const totalRounds = useMemo(() => {
    const size = demoSize || t?.maxPlayers || 8;
    return Math.ceil(Math.log2(size));
  }, [demoSize, t?.maxPlayers]);

  const winnerInfo = useMemo(() => {
    if (demoSize) {
      const finalMatch = demoMatches.find(m => m.round === totalRounds);
      if (finalMatch?.winnerId) {
        return { id: finalMatch.winnerId, name: finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player1Name : finalMatch.player2Name };
      }
      return null;
    }
    return t?.status === 'completed' ? { id: t.winnerId, name: t.winnerName } : null;
  }, [t, demoSize, demoMatches, totalRounds]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const triggerConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
    function randomInRange(min: number, max: number) { return Math.random() * (max - min) + min; }
    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
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
      while (initialPlayers.length < totalInitialSlots) { initialPlayers.push({ id: 'bye', name: 'BYE' }); }
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
            await setDoc(nextMatchRef, { [isP1 ? 'player1Id' : 'player2Id']: matchData.winnerId, [isP1 ? 'player1Name' : 'player2Name']: winnerName }, { merge: true });
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
    if (!isAdmin || !winnerId || winnerId === 'bye' || t?.status === 'completed') return;

    if (demoSize) {
      const updated = demoMatches.map(m => {
        if (m.id === match.id) return { ...m, winnerId };
        if (m.id === match.nextMatchId) {
          const isP1 = match.matchIndex % 2 === 0;
          return { 
            ...m, 
            [isP1 ? 'player1Id' : 'player2Id']: winnerId, 
            [isP1 ? 'player1Name' : 'player2Name']: winnerName 
          };
        }
        return m;
      });
      setDemoMatches(updated);
      
      if (match.round === totalRounds) {
        triggerConfetti();
        toast({ title: "DEMO VICTORY", description: `${winnerName} is the Champion!` });
      }
      return;
    }

    const matchRef = doc(db, 'tournaments', id, 'matches', `r${match.round}-m${match.matchIndex}`);
    await updateDoc(matchRef, { winnerId });
    if (match.nextMatchId) {
      const nextRef = doc(db, 'tournaments', id, 'matches', match.nextMatchId);
      const isPlayer1 = match.matchIndex % 2 === 0;
      await updateDoc(nextRef, { [isPlayer1 ? 'player1Id' : 'player2Id']: winnerId, [isPlayer1 ? 'player1Name' : 'player2Name']: winnerName });
    }
    
    if (match.round === totalRounds) {
      triggerConfetti();
      toast({ title: "ARENA CHAMPION", description: `${winnerName} has claimed the crown!` });
    } else {
      toast({ title: "RESULT RECORDED", description: `${winnerName} advanced.` });
    }
  };

  const endTournament = async () => {
    if (!isAdmin || !matches || ending) return;
    const finalMatch = matches.find((m: any) => m.round === totalRounds);
    if (!finalMatch || !finalMatch.winnerId) {
      toast({ variant: "destructive", title: "FINAL NOT DECIDED" });
      return;
    }
    setEnding(true);
    try {
      const winnerId = finalMatch.winnerId;
      const winnerName = winnerId === finalMatch.player1Id ? finalMatch.player1Name : finalMatch.player2Name;
      await updateDoc(tRef, { status: 'completed', winnerId, winnerName, completedAt: new Date().toISOString() });
      await updateDoc(doc(db, 'users', winnerId), { wins: increment(1), tournamentsPlayed: increment(1) });
      triggerConfetti();
      toast({ title: "ARENA ARCHIVED", description: `${winnerName} IS THE CHAMPION!` });
      setTimeout(() => router.push('/arena'), 6000);
    } finally {
      setEnding(false);
    }
  };

  function generateDemoMatches(size: number) {
    const rounds = Math.ceil(Math.log2(size));
    const demoArr = [];
    for (let r = 1; r <= rounds; r++) {
      const count = Math.pow(2, rounds - r);
      for (let m = 0; m < count; m++) {
        demoArr.push({
          id: `demo-r${r}-m${m}`,
          round: r,
          matchIndex: m,
          player1Id: r === 1 ? `w${m * 2 + 1}` : '',
          player1Name: r === 1 ? `Warrior ${m * 2 + 1}` : '',
          player2Id: r === 1 ? `w${m * 2 + 2}` : '',
          player2Name: r === 1 ? `Warrior ${m * 2 + 2}` : '',
          winnerId: '',
          nextMatchId: r < rounds ? `demo-r${r + 1}-m${Math.floor(m / 2)}` : ''
        });
      }
    }
    return demoArr;
  }

  if (tLoading) return <PageWrapper><div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className={cn("max-w-7xl mx-auto flex flex-col gap-6 pb-20", isFullscreen ? "fixed inset-0 z-[100] bg-background p-0 max-w-none h-screen overflow-hidden" : "")}>
        
        {!isFullscreen && (
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
              {t?.status === 'completed' && !demoSize && (
                <Badge className="bg-yellow-500 text-black font-black uppercase h-11 px-6 italic text-sm shadow-xl flex items-center gap-2 shrink-0">
                  <Crown className="w-4 h-4" /> CHAMPION: {t.winnerName}
                </Badge>
              )}
            </div>
          </div>
        )}

        <Tabs defaultValue="fixtures" className={cn("w-full", isFullscreen ? "h-full" : "")}>
          {!isFullscreen && (
            <TabsList className="bg-muted/30 border border-white/5 w-full justify-start overflow-x-auto no-scrollbar h-14 p-1">
              <TabsTrigger value="fixtures" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><Swords className="w-4 h-4 mr-2" /> Bracket</TabsTrigger>
              <TabsTrigger value="members" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><Users className="w-4 h-4 mr-2" /> Warriors</TabsTrigger>
              <TabsTrigger value="chat" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><MessageSquare className="w-4 h-4 mr-2" /> Chat Arena</TabsTrigger>
              <TabsTrigger value="protocol" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><ShieldCheck className="w-4 h-4 mr-2" /> Protocol</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="fixtures" className={cn("mt-4 outline-none relative group", isFullscreen ? "m-0 h-full" : "h-[80vh]")}>
            <Card className={cn(
              "glass border-white/5 relative overflow-hidden bg-[#0a0a0a] shadow-2xl transition-all duration-300",
              isFullscreen ? "h-full rounded-none border-0" : "h-full rounded-[2.5rem]"
            )}>
               <div className="absolute top-6 left-6 z-50 flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl">
                 <Button size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" onClick={() => setZoom(prev => Math.max(0.4, prev - 0.2))}><Minus className="w-4 h-4" /></Button>
                 <span className="text-[10px] font-black text-white w-12 text-center">{Math.round(zoom * 100)}%</span>
                 <Button size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" onClick={() => setZoom(prev => Math.min(2, prev + 0.2))}><Plus className="w-4 h-4" /></Button>
                 <div className="w-[1px] h-4 bg-white/20 mx-1" />
                 <Button size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" onClick={() => setZoom(1)}><Monitor className="w-4 h-4" /></Button>
                 <div className="w-[1px] h-4 bg-white/20 mx-1" />
                 <Button 
                    size="icon" 
                    variant="ghost" 
                    className={cn("h-9 w-9 text-white hover:bg-white/10", isFullscreen ? "text-primary" : "")} 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
               </div>

               <div className="absolute top-6 right-6 z-50">
                 <Badge variant="outline" className="bg-primary/20 border-primary/40 text-primary font-black uppercase tracking-widest px-4 py-2 flex items-center gap-2 shadow-xl backdrop-blur-md">
                   {demoSize ? `DEMO: ${demoSize} WARRIORS` : <><Move className="w-4 h-4 animate-pulse" /> Battlefield View</>}
                 </Badge>
               </div>

               <ScrollArea className="h-full w-full">
                 <div 
                   className="p-40 min-w-max min-h-full transition-transform duration-300 origin-top-left"
                   style={{ transform: `scale(${zoom})` }}
                 >
                    <div className="flex gap-40 items-center relative z-10">
                      {Array.from({ length: totalRounds }).map((_, rIdx) => {
                        const roundNum = rIdx + 1;
                        const roundMatches = matches?.filter((m: any) => m.round === roundNum) || [];
                        if (roundMatches.length === 0 && matches.length > 0) return null;

                        return (
                          <div key={roundNum} className="flex flex-col justify-around gap-20 relative">
                            <div className="text-center mb-10">
                              <Badge className="bg-white/5 text-white/40 border-white/10 uppercase font-black text-[10px] px-6 py-2 rounded-full tracking-widest">
                                {roundNum === totalRounds ? 'Grand Final' : `Round ${roundNum}`}
                              </Badge>
                            </div>
                            
                            {roundMatches.map((m: any, mIdx: number) => (
                              <div key={m.id || mIdx} className="relative flex items-center">
                                <div className="w-64 space-y-2 z-30 relative">
                                  {[1, 2].map(pIdx => {
                                    const pId = pIdx === 1 ? m.player1Id : m.player2Id;
                                    const pName = pIdx === 1 ? m.player1Name : m.player2Name;
                                    const isWinner = m.winnerId === pId && pId !== '' && pId !== 'bye';
                                    const isLoser = m.winnerId !== '' && m.winnerId !== pId && pId !== '' && pId !== 'bye';

                                    return (
                                      <div 
                                        key={pIdx} 
                                        onClick={() => isAdmin && pId && pId !== 'bye' && (demoSize || t?.status !== 'completed') && handleMatchWinner(m, pId, pName)}
                                        className={cn(
                                          "h-12 px-4 rounded-xl border-2 flex items-center justify-between group/p transition-all",
                                          isAdmin && pId && pId !== 'bye' && (demoSize || t?.status !== 'completed') ? "cursor-pointer hover:border-primary/50" : "cursor-default",
                                          isWinner ? "bg-green-600 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]" : 
                                          isLoser ? "bg-red-900/40 border-red-600/50 opacity-60" : "bg-black/60 border-white/10"
                                        )}
                                      >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                          <div className={cn("w-1.5 h-6 rounded-full", isWinner ? "bg-white" : "bg-primary/40")} />
                                          <span className={cn(
                                            "text-sm font-black uppercase truncate",
                                            isWinner || isLoser ? "text-white" : "text-white/60"
                                          )}>
                                            {pName || 'TBD'}
                                          </span>
                                        </div>
                                        {isWinner && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        {isLoser && <XCircle className="w-4 h-4 text-white/40" />}
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {roundNum < totalRounds && (
                                  <svg className="absolute left-full top-1/2 -translate-y-1/2 w-40 h-[400px] pointer-events-none overflow-visible">
                                    <path 
                                      d={`M 0 200 L 40 200 L 40 ${mIdx % 2 === 0 ? 300 : 100} L 80 ${mIdx % 2 === 0 ? 300 : 100}`}
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2.5"
                                      className="text-white/10"
                                    />
                                  </svg>
                                )}

                                {roundNum === totalRounds && (
                                  <div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center gap-10 ml-20">
                                     <div className="w-20 h-0.5 bg-primary/20" />
                                     <div className="flex flex-col items-center gap-3">
                                       {winnerInfo && (
                                         <p className="text-[10px] font-black uppercase text-yellow-500 animate-bounce tracking-[0.3em]">CHAMPION</p>
                                       )}
                                       <div className={cn(
                                         "h-36 w-36 rounded-[2rem] border-4 flex flex-col items-center justify-center bg-black transition-all duration-700 relative",
                                         winnerInfo ? "border-yellow-500 shadow-[0_0_80px_rgba(234,179,8,0.5)] scale-110" : "border-white/10 grayscale opacity-30"
                                       )}>
                                          <div className={cn(
                                            "absolute -top-6 -right-6 h-12 w-12 rounded-full flex items-center justify-center bg-yellow-500 shadow-2xl transition-transform",
                                            winnerInfo ? "scale-100 rotate-12" : "scale-0"
                                          )}>
                                            <Crown className="w-6 h-6 text-black" />
                                          </div>
                                          <Crown className={cn("w-14 h-14 mb-2", winnerInfo ? "text-yellow-500" : "text-white/10")} />
                                          <p className="text-xs font-black uppercase text-white truncate max-w-[120px] mt-1 text-center">
                                            {winnerInfo?.name || 'AWAITING'}
                                          </p>
                                       </div>
                                     </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      
                      {matches.length === 0 && (
                        <div className="flex flex-col items-center justify-center w-[80vw] py-20 text-center gap-6">
                           <Swords className="w-20 h-20 text-primary/20 animate-pulse" />
                           <p className="text-sm font-black uppercase tracking-[0.5em] text-white/20">Protocol Ready for Initialization</p>
                           {isAdmin && <Button onClick={generateFixtures} className="bg-primary px-10 h-14 rounded-2xl font-black uppercase">Begin War Phase</Button>}
                        </div>
                      )}
                    </div>
                 </div>
                 <ScrollBar orientation="horizontal" className="bg-white/5 h-3" />
                 <ScrollBar orientation="vertical" className="bg-white/5 w-3" />
               </ScrollArea>
               <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </Card>
          </TabsContent>

          {!isFullscreen && (
            <>
              <TabsContent value="members" className="mt-4 outline-none">
                <Card className="glass border-white/5 p-8 rounded-[2rem] bg-black/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {registrations?.map((r: any) => (
                      <div key={r.userId} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/40 transition-all">
                        <Avatar className="h-12 w-12 border-2 border-white/10 group-hover:border-primary/20">
                          <AvatarImage src={r.avatarUrl} />
                          <AvatarFallback className="font-black text-sm">{r.username.substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="font-black uppercase text-sm truncate text-white">{r.username}</p>
                          <p className="text-[9px] text-primary font-black uppercase tracking-widest">{r.tag}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="chat" className="mt-4 outline-none">
                <Card className="glass border-white/5 flex flex-col h-[70vh] rounded-[2rem] overflow-hidden bg-black/40">
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                    {messages?.map((msg: any) => (
                      <div key={msg.id} className={cn("flex items-start gap-3", msg.userId === user?.id ? "flex-row-reverse" : "")}>
                        <Avatar className="h-10 w-10 border-2 border-white/10">
                          <AvatarImage src={msg.avatarUrl} />
                          <AvatarFallback className="text-xs">{msg.username[0]}</AvatarFallback>
                        </Avatar>
                        <div className={cn("max-w-[80%] space-y-1", msg.userId === user?.id ? "items-end flex flex-col" : "")}>
                          <span className="text-[9px] font-black uppercase text-muted-foreground px-2">{msg.username}</span>
                          <div className={cn("px-5 py-3 rounded-2xl text-sm", msg.userId === user?.id ? "bg-primary text-white" : "bg-white/5 text-white/90 border border-white/5")}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleSendMessage} className="p-6 border-t border-white/5 bg-black/40 flex gap-3">
                    <Input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type a message..." className="bg-white/5 rounded-xl h-14" />
                    <Button type="submit" size="icon" className="h-14 w-14 bg-primary rounded-xl shrink-0"><Send className="w-5 h-5" /></Button>
                  </form>
                </Card>
              </TabsContent>

              <TabsContent value="protocol" className="mt-4 outline-none">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="glass border-white/5 rounded-[2rem] overflow-hidden bg-black/40 p-8 space-y-8">
                      <h3 className="font-headline text-xl font-black uppercase italic tracking-tighter flex items-center gap-3"><Monitor className="text-primary" /> War Clan Access</h3>
                      <div className="bg-black/60 rounded-2xl p-6 border border-white/5 space-y-6">
                         <div className="flex justify-between items-center border-b border-white/5 pb-4">
                           <span className="text-[10px] font-black uppercase text-muted-foreground">War Clan Tag</span>
                           <span className="text-lg font-black text-primary uppercase">{t?.clanUid || 'AWAITING ADMIN'}</span>
                         </div>
                         {t?.clanLink && (
                           <Button asChild className="w-full h-14 bg-green-600 font-black uppercase rounded-xl shadow-xl">
                              <a href={t.clanLink} target="_blank">JOIN CLAN PROTOCOL <ArrowRight className="ml-2 w-4 h-4" /></a>
                           </Button>
                         )}
                      </div>
                    </Card>

                    <Card className="glass border-white/5 rounded-[2rem] bg-black/40 p-8 space-y-8">
                       <h3 className="font-headline text-xl font-black uppercase italic tracking-tighter flex items-center gap-3"><ShieldAlert className="text-primary" /> War Protocols</h3>
                       <div className="space-y-4">
                        {t?.rules?.map((rule: string, i: number) => (
                          <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                             <span className="text-primary font-black">{(i+1)}</span>
                             <p className="text-sm font-medium text-white/80">{rule}</p>
                          </div>
                        ))}
                       </div>
                    </Card>
                 </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </PageWrapper>
  );
}

function DropdownDemo({ onSelect, current }: { onSelect: (size: number | null) => void, current: number | null }) {
  return (
    <div className="flex items-center gap-2 mr-4 bg-muted/20 px-4 py-1 rounded-xl border border-white/10 shrink-0">
      <Layout className="w-4 h-4 text-muted-foreground" />
      <span className="text-[10px] font-black uppercase text-muted-foreground mr-2">DEMO MODE:</span>
      <div className="flex gap-1">
        {[2, 4, 8, 16, 32, 64].map(size => (
          <Button 
            key={size} 
            size="sm" 
            variant="ghost" 
            onClick={() => onSelect(current === size ? null : size)}
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
