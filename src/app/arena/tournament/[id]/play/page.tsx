
'use client';

import { useMemo, useState, useEffect, useRef, use } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus, 
  Link as LinkIcon, 
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Crown,
  ArrowRight,
  Move
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
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;
  const isRegistered = registrations?.some((r: any) => r.userId === user?.id);

  const matches = useMemo(() => {
    if (!rawMatches) return [];
    return [...rawMatches].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.matchIndex - b.matchIndex;
    });
  }, [rawMatches]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      const rounds = Math.ceil(Math.log2(t?.maxPlayers || 8));
      const totalSlots = Math.pow(2, rounds);
      
      let initialPlayers = players.map(p => ({ id: p.userId, name: p.username }));
      while (initialPlayers.length < totalSlots) {
        initialPlayers.push({ id: 'bye', name: 'BYE' });
      }

      // Generate all matches for all rounds
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

          // Auto-advance Byes
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
      toast({ title: "BRACKET DEPLOYED", description: "Warriors have been matched." });
    } catch (e) {
      toast({ variant: "destructive", title: "GENERATION FAILED" });
    } finally {
      setGenerating(false);
    }
  };

  const handleMatchWinner = async (match: any, winnerId: string, winnerName: string) => {
    if (!isAdmin || !winnerId || winnerId === 'bye' || t?.status === 'completed') return;

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

      toast({ title: "ARENA ARCHIVED", description: `${winnerName} IS THE CHAMPION!` });
      router.push('/arena');
    } finally {
      setEnding(false);
    }
  };

  if (tLoading) return <PageWrapper><div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></PageWrapper>;

  const totalRounds = Math.ceil(Math.log2(t?.maxPlayers || 8));

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
          <div className="flex gap-2 w-full md:w-auto">
            {isAdmin && t?.status !== 'completed' && (
               <>
                 <Button variant="outline" size="sm" onClick={generateFixtures} disabled={generating} className="bg-primary/10 border-primary/20 text-primary font-black uppercase text-[10px] h-11 px-6 shadow-xl">
                   {generating ? <Loader2 className="animate-spin" /> : <Swords className="w-4 h-4 mr-2" />} GENERATE FIXTURES
                 </Button>
                 <Button variant="destructive" size="sm" onClick={endTournament} disabled={ending} className="font-black uppercase text-[10px] h-11 px-6 shadow-xl glow-primary">
                   {ending ? <Loader2 className="animate-spin" /> : <Trophy className="w-4 h-4 mr-2" />} END ARENA
                 </Button>
               </>
            )}
            {t?.status === 'completed' && (
              <Badge className="bg-yellow-500 text-black font-black uppercase h-11 px-6 italic text-sm shadow-xl flex items-center gap-2">
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
            <Card className="glass border-white/5 h-[75vh] relative overflow-hidden bg-black rounded-[2rem]">
               {/* Pro White-Dot Grid Layer */}
               <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
               
               <ScrollArea className="h-full w-full">
                 <div className="p-20 min-w-max min-h-full flex items-center justify-start">
                    <div className="flex gap-32 items-stretch">
                      {Array.from({ length: totalRounds }).map((_, rIdx) => {
                        const roundNum = rIdx + 1;
                        const roundMatches = matches?.filter((m: any) => m.round === roundNum) || [];
                        
                        if (roundMatches.length === 0 && isAdmin) return null;

                        return (
                          <div key={roundNum} className="flex flex-col justify-around gap-20 relative">
                            <div className="text-center mb-10 sticky top-0 z-20">
                              <Badge variant="outline" className="text-[11px] font-black uppercase tracking-[0.3em] border-primary/40 text-primary bg-primary/10 px-8 py-2.5 rounded-full shadow-2xl backdrop-blur-xl">
                                {roundNum === totalRounds ? 'GRAND FINAL' : roundNum === totalRounds - 1 ? 'SEMI FINALS' : `ROUND ${roundNum}`}
                              </Badge>
                            </div>
                            
                            {roundMatches.map((m: any) => (
                              <div key={m.id} className="relative flex items-center">
                                <div className="w-72 space-y-2 z-10 relative">
                                  {[1, 2].map(pIdx => {
                                    const pId = pIdx === 1 ? m.player1Id : m.player2Id;
                                    const pName = pIdx === 1 ? m.player1Name : m.player2Name;
                                    const isWinner = m.winnerId === pId && pId !== '' && pId !== 'bye';
                                    const isLoser = m.winnerId !== '' && m.winnerId !== pId && pId !== '' && pId !== 'bye';
                                    const isBye = pId === 'bye';

                                    return (
                                      <div 
                                        key={pIdx} 
                                        onClick={() => isAdmin && pId && pId !== 'bye' && !t?.status?.includes('completed') && handleMatchWinner(m, pId, pName)}
                                        className={cn(
                                          "p-5 rounded-2xl border transition-all duration-300 flex justify-between items-center group/player",
                                          isAdmin && pId && pId !== 'bye' && !t?.status?.includes('completed') ? "cursor-pointer hover:scale-[1.02] active:scale-95" : "cursor-default",
                                          isWinner ? "bg-green-500/20 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] z-20" : 
                                          isLoser ? "bg-red-500/10 border-red-500/30 opacity-40 grayscale" : 
                                          isBye ? "bg-white/5 border-white/5 opacity-20 italic" :
                                          "bg-white/5 border-white/10 backdrop-blur-md"
                                        )}
                                      >
                                        <div className="flex items-center gap-4">
                                           <div className={cn("w-2 h-8 rounded-full", isWinner ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : isLoser ? "bg-red-500" : "bg-primary/30")} />
                                           <span className="text-sm font-black uppercase truncate max-w-[160px] tracking-tight text-white">{pName || 'TBD'}</span>
                                        </div>
                                        {isWinner && <CheckCircle2 className="w-5 h-5 text-green-500 animate-pulse" />}
                                        {isLoser && <XCircle className="w-5 h-5 text-red-500" />}
                                        {isAdmin && !isWinner && !isLoser && !isBye && pId && (
                                          <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover/player:opacity-100 transition-opacity translate-x-[-10px] group-hover/player:translate-x-0" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {/* Connection Brackets (SVG Style Lines) */}
                                {roundNum < totalRounds && (
                                  <div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center z-0">
                                    <div className="w-16 h-[2px] bg-white/10" />
                                    <div className={cn(
                                      "w-[2px] bg-white/10",
                                      m.matchIndex % 2 === 0 ? "translate-y-1/2" : "-translate-y-1/2"
                                    )} style={{ height: '140px' }} />
                                    <div className="w-16 h-[2px] bg-white/10" />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      
                      {matches.length === 0 && (
                        <div className="flex flex-col items-center justify-center w-[80vw] py-20 text-center gap-8">
                           <div className="relative">
                             <Swords className="w-24 h-24 text-primary/10 animate-pulse" />
                             <ShieldAlert className="w-10 h-10 text-primary absolute bottom-0 right-0" />
                           </div>
                           <div className="space-y-4">
                              <h3 className="font-headline text-3xl font-black uppercase italic text-white/50">Ready for Deployment</h3>
                              <p className="text-xs font-black uppercase tracking-[0.3em] text-white/30 max-w-sm">Command Hub must initialize the bracket protocol to start the war.</p>
                           </div>
                           {isAdmin && (
                             <Button onClick={generateFixtures} className="bg-primary glow-primary font-black uppercase h-16 px-12 rounded-2xl text-lg hover:scale-105 transition-transform">
                               INITIALIZE BRACKET
                             </Button>
                           )}
                        </div>
                      )}
                    </div>
                 </div>
                 <ScrollBar orientation="horizontal" className="bg-white/5" />
                 <ScrollBar orientation="vertical" className="bg-white/5" />
               </ScrollArea>

               <div className="absolute bottom-8 left-8 flex items-center gap-3 bg-white/5 px-6 py-3 rounded-full border border-white/10 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                 <Move className="w-4 h-4 text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Movable Arena Canvas</span>
               </div>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-4 outline-none">
            <Card className="glass border-white/5 p-8 rounded-[2rem]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {registrations?.map((r: any) => (
                  <div key={r.userId} className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/40 hover:bg-white/10 transition-all group">
                    <Avatar className="h-14 w-14 border-2 border-white/10 group-hover:border-primary/50 transition-all shadow-xl">
                      <AvatarImage src={r.avatarUrl} />
                      <AvatarFallback className="font-black bg-muted text-lg">{r.username.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <p className="font-black uppercase text-base truncate text-white">{r.username}</p>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">{r.tag}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-4 outline-none">
            <Card className="glass border-white/5 flex flex-col h-[65vh] rounded-[2rem] overflow-hidden">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-black/40">
                {messages?.map((msg: any) => (
                  <div key={msg.id} className={cn("flex items-start gap-4", msg.userId === user?.id ? "flex-row-reverse" : "")}>
                    <Avatar className="h-10 w-10 border-2 border-white/10 shadow-lg">
                      <AvatarImage src={msg.avatarUrl} />
                      <AvatarFallback className="font-black uppercase">{msg.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className={cn("max-w-[75%] space-y-2", msg.userId === user?.id ? "items-end flex flex-col" : "")}>
                      <div className="flex items-center gap-2 px-2">
                        <span className={cn("text-[11px] font-black uppercase tracking-widest", msg.isSuperAdmin ? "text-yellow-500" : msg.isAdmin ? "text-green-500" : "text-muted-foreground")}>
                          {msg.username}
                        </span>
                        {msg.isSuperAdmin ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500/10" />
                        ) : msg.isAdmin && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        )}
                        {msg.isPinned && <Pin className="w-3.5 h-3.5 text-primary animate-pulse" />}
                      </div>
                      <div className={cn(
                        "px-6 py-4 rounded-3xl text-sm font-medium shadow-2xl", 
                        msg.isPinned ? "bg-primary/20 border border-primary/40 text-white" : 
                        msg.userId === user?.id ? "bg-primary text-white" : "bg-white/5 border border-white/5 text-white/90"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="p-6 border-t border-white/5 bg-black/60 flex gap-4">
                <Input 
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)} 
                  placeholder={isRegistered || isAdmin ? "Broadcast command..." : "Register to access comms"} 
                  disabled={!isRegistered && !isAdmin}
                  className="bg-white/5 rounded-2xl h-16 px-8 border-white/10 focus:ring-primary text-base"
                />
                <Button type="submit" size="icon" className="h-16 w-16 bg-primary rounded-2xl glow-primary shadow-2xl shrink-0" disabled={!isRegistered && !isAdmin}>
                  <Send className="w-7 h-7" />
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="protocol" className="mt-4 outline-none">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="glass border-white/5 rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="bg-white/5 border-b border-white/5 p-10">
                    <CardTitle className="font-headline text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                      <LinkIcon className="w-8 h-8 text-primary" /> BATTLEGROUND ACCESS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-10 space-y-10">
                    <div className="bg-black/60 rounded-[2rem] p-10 border border-white/10 space-y-8">
                       <div className="flex justify-between items-center border-b border-white/5 pb-6">
                         <span className="text-xs font-black uppercase text-muted-foreground tracking-[0.2em]">Clan ID Tag</span>
                         <span className="text-lg font-black text-primary uppercase italic tracking-widest">{t?.clanUid || 'PENDING'}</span>
                       </div>
                       {t?.clanLink ? (
                         <Button asChild className="w-full h-16 bg-green-600 hover:bg-green-700 font-black uppercase text-xl rounded-2xl shadow-2xl glow-primary border-t border-white/20">
                            <a href={t.clanLink} target="_blank">JOIN CLAN <ArrowRight className="ml-3 w-6 h-6" /></a>
                         </Button>
                       ) : (
                         <div className="p-10 bg-white/5 rounded-2xl text-center border border-dashed border-white/10">
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/50">Awaiting Admin Protocol Assignment...</p>
                         </div>
                       )}
                    </div>
                    {isAdmin && (
                      <div className="space-y-6 pt-10 border-t border-white/5">
                        <p className="text-xs font-black uppercase text-primary tracking-[0.4em]">OVERRIDE ACCESS</p>
                        <div className="grid gap-6">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Clan Direct Link</Label>
                             <Input placeholder="https://link.clashofclans.com/..." value={t?.clanLink || ''} onChange={(e) => updateDoc(tRef, { clanLink: e.target.value })} className="bg-white/5 h-14 rounded-2xl" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Clan Unique Tag</Label>
                             <Input placeholder="#2P88YYQR" value={t?.clanUid || ''} onChange={(e) => updateDoc(tRef, { clanUid: e.target.value })} className="bg-white/5 h-14 rounded-2xl" />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="glass border-white/5 rounded-[2.5rem]">
                   <CardHeader className="bg-white/5 border-b border-white/5 p-10">
                    <CardTitle className="font-headline text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                      <ShieldAlert className="w-8 h-8 text-primary" /> ARENA RULES
                    </CardTitle>
                  </CardHeader>
                   <CardContent className="p-10">
                      <div className="space-y-6">
                        {t?.rules?.map((rule: string, i: number) => (
                          <div key={i} className="flex gap-6 p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all shadow-xl">
                             <span className="text-primary font-black text-2xl italic">{(i+1).toString().padStart(2, '0')}</span>
                             <p className="text-base font-bold text-white/80 leading-relaxed">{rule}</p>
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

