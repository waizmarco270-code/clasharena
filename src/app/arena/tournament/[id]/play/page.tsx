
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
  Edit3, 
  Link as LinkIcon, 
  Info,
  CheckCircle2,
  XCircle,
  Settings,
  ShieldAlert,
  Crown,
  ArrowRight
} from 'lucide-react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, setDoc, collection, query, orderBy, addDoc, serverTimestamp, increment, deleteDoc, getDocs } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { default as NextLink } from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

  const matchesQuery = useMemo(() => query(collection(db, 'tournaments', id, 'matches'), orderBy('round', 'asc'), orderBy('matchIndex', 'asc')), [db, id]);
  const { data: matches } = useCollection(matchesQuery);

  const messagesQuery = useMemo(() => query(collection(db, 'tournaments', id, 'messages'), orderBy('createdAt', 'asc')), [db, id]);
  const { data: messages } = useCollection(messagesQuery);

  const [messageText, setMessageText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [ending, setEnding] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;
  const isRegistered = registrations?.some((r: any) => r.userId === user?.id);

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
      toast({ variant: "destructive", title: "NOT ENOUGH WARRIORS", description: "At least 2 warriors required." });
      return;
    }
    setGenerating(true);

    try {
      const existingMatches = await getDocs(collection(db, 'tournaments', id, 'matches'));
      await Promise.all(existingMatches.docs.map(m => deleteDoc(m.ref)));

      const players = [...registrations].sort(() => Math.random() - 0.5);
      const rounds = Math.ceil(Math.log2(t?.maxPlayers || 8));
      const firstRoundSlots = Math.pow(2, rounds);
      
      let currentRoundPlayers = players.map(p => ({ id: p.userId, name: p.username }));
      while (currentRoundPlayers.length < firstRoundSlots) {
        currentRoundPlayers.push({ id: 'bye', name: 'BYE' });
      }

      for (let r = 1; r <= rounds; r++) {
        const matchesInRound = Math.pow(2, rounds - r);
        for (let m = 0; m < matchesInRound; m++) {
          const matchId = `r${r}-m${m}`;
          const matchData = {
            round: r,
            matchIndex: m,
            player1Id: r === 1 ? currentRoundPlayers[m * 2].id : '',
            player1Name: r === 1 ? currentRoundPlayers[m * 2].name : '',
            player2Id: r === 1 ? currentRoundPlayers[m * 2 + 1].id : '',
            player2Name: r === 1 ? currentRoundPlayers[m * 2 + 1].name : '',
            winnerId: '',
            nextMatchId: r < rounds ? `r${r + 1}-m${Math.floor(m / 2)}` : ''
          };

          if (r === 1) {
            if (matchData.player1Id === 'bye') matchData.winnerId = matchData.player2Id;
            else if (matchData.player2Id === 'bye') matchData.winnerId = matchData.player1Id;
          }

          await setDoc(doc(db, 'tournaments', id, 'matches', matchId), matchData);
          
          if (r === 1 && matchData.winnerId && matchData.winnerId !== 'bye') {
             const winnerName = matchData.winnerId === matchData.player1Id ? matchData.player1Name : matchData.player2Name;
             const nextMatchId = `r2-m${Math.floor(m / 2)}`;
             const isPlayer1 = m % 2 === 0;
             await setDoc(doc(db, 'tournaments', id, 'matches', nextMatchId), {
               [isPlayer1 ? 'player1Id' : 'player2Id']: matchData.winnerId,
               [isPlayer1 ? 'player1Name' : 'player2Name']: winnerName
             }, { merge: true });
          }
        }
      }
      toast({ title: "FIXTURES DEPLOYED" });
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
      updateDoc(nextRef, {
        [isPlayer1 ? 'player1Id' : 'player2Id']: winnerId,
        [isPlayer1 ? 'player1Name' : 'player2Name']: winnerName
      });
    }
    toast({ title: "RESULT RECORDED" });
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

      toast({ title: "TOURNAMENT ARCHIVED", description: `${winnerName} IS THE CHAMPION!` });
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
            <TabsTrigger value="fixtures" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><Swords className="w-4 h-4 mr-2" /> Fixtures</TabsTrigger>
            <TabsTrigger value="members" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><Users className="w-4 h-4 mr-2" /> Warriors</TabsTrigger>
            <TabsTrigger value="chat" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><MessageSquare className="w-4 h-4 mr-2" /> Chat Arena</TabsTrigger>
            <TabsTrigger value="protocol" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><ShieldCheck className="w-4 h-4 mr-2" /> Protocol</TabsTrigger>
          </TabsList>

          <TabsContent value="fixtures" className="mt-4 outline-none">
            <Card className="glass border-white/5 h-[70vh] relative overflow-hidden bg-black/40 rounded-[2rem]">
               <div className="absolute inset-0 cursor-grab active:cursor-grabbing overflow-auto p-12 no-scrollbar scroll-smooth">
                 <div className="flex gap-16 min-w-max h-full items-center">
                   {Array.from({ length: totalRounds }).map((_, rIdx) => {
                     const roundNum = rIdx + 1;
                     const roundMatches = matches?.filter((m: any) => m.round === roundNum) || [];
                     return (
                       <div key={roundNum} className="flex flex-col justify-around gap-12 h-full">
                         <div className="text-center mb-4">
                           <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] border-primary/20 text-primary px-4 py-1">
                             {roundNum === totalRounds ? 'GRAND FINAL' : roundNum === totalRounds - 1 ? 'SEMI FINALS' : `ROUND ${roundNum}`}
                           </Badge>
                         </div>
                         {roundMatches.map((m: any) => (
                           <div key={m.id} className="relative">
                             <div className="w-64 space-y-1 z-10 relative">
                               {[1, 2].map(pIdx => {
                                 const pId = pIdx === 1 ? m.player1Id : m.player2Id;
                                 const pName = pIdx === 1 ? m.player1Name : m.player2Name;
                                 const isWinner = m.winnerId === pId && pId !== '' && pId !== 'bye';
                                 const isLoser = m.winnerId !== '' && m.winnerId !== pId && pId !== '' && pId !== 'bye';
                                 const isBye = pId === 'bye';

                                 return (
                                   <div 
                                     key={pIdx} 
                                     onClick={() => isAdmin && pId !== 'bye' && handleMatchWinner(m, pId, pName)}
                                     className={cn(
                                       "p-4 rounded-xl border transition-all flex justify-between items-center",
                                       isAdmin && pId !== 'bye' && !t?.status?.includes('completed') ? "cursor-pointer hover:scale-[1.02]" : "cursor-default",
                                       isWinner ? "bg-green-600/30 border-green-500/50 text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]" : 
                                       isLoser ? "bg-red-600/10 border-red-500/20 text-muted-foreground opacity-50" : 
                                       isBye ? "bg-muted/20 border-white/5 opacity-30 italic" :
                                       "bg-white/5 border-white/10"
                                     )}
                                   >
                                     <div className="flex items-center gap-2">
                                        <span className="text-xs font-black uppercase truncate max-w-[140px] tracking-tight">{pName || 'TBD'}</span>
                                     </div>
                                     {isWinner && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                     {isLoser && <XCircle className="w-4 h-4 text-red-500" />}
                                   </div>
                                 );
                               })}
                             </div>
                             {roundNum < totalRounds && (
                               <div className="absolute left-full top-1/2 -translate-y-1/2 h-[2px] w-16 bg-white/10" />
                             )}
                           </div>
                         ))}
                       </div>
                     );
                   })}
                 </div>
               </div>
               <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                 <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-none">Movable Arena Canvas</Badge>
               </div>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-4 outline-none">
            <Card className="glass border-white/5 p-6 rounded-[2rem]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {registrations?.map((r: any) => (
                  <div key={r.userId} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all group">
                    <Avatar className="h-12 w-12 border-2 border-white/10 group-hover:border-primary/40 transition-all">
                      <AvatarFallback className="font-black bg-muted">{r.username.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <p className="font-black uppercase text-sm truncate">{r.username}</p>
                      <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{r.tag}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-4 outline-none">
            <Card className="glass border-white/5 flex flex-col h-[65vh] rounded-[2rem] overflow-hidden">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-black/20">
                {messages?.map((msg: any) => (
                  <div key={msg.id} className={cn("flex items-start gap-3", msg.userId === user?.id ? "flex-row-reverse" : "")}>
                    <Avatar className="h-9 w-9 border border-white/10">
                      <AvatarImage src={msg.avatarUrl} />
                      <AvatarFallback className="font-black uppercase">{msg.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className={cn("max-w-[80%] space-y-1.5", msg.userId === user?.id ? "items-end flex flex-col" : "")}>
                      <div className="flex items-center gap-2 px-1">
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", msg.isSuperAdmin ? "text-yellow-500" : msg.isAdmin ? "text-green-500" : "text-muted-foreground")}>
                          {msg.username}
                        </span>
                        {msg.isSuperAdmin ? (
                          <CheckCircle2 className="w-3 h-3 text-yellow-500 fill-yellow-500/10" />
                        ) : msg.isAdmin && (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                        {msg.isPinned && <Pin className="w-3 h-3 text-primary animate-pulse" />}
                      </div>
                      <div className={cn(
                        "px-5 py-3 rounded-2xl text-sm shadow-xl", 
                        msg.isPinned ? "bg-primary/20 border border-primary/40 text-white" : 
                        msg.userId === user?.id ? "bg-primary text-white" : "bg-white/5 border border-white/5"
                      )}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-black/40 flex gap-2">
                <Input 
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)} 
                  placeholder={isRegistered || isAdmin ? "Command your troops..." : "Register to access chat"} 
                  disabled={!isRegistered && !isAdmin}
                  className="bg-white/5 rounded-2xl h-14 px-6 border-white/10 focus:ring-primary font-medium"
                />
                <Button type="submit" size="icon" className="h-14 w-14 bg-primary rounded-2xl glow-primary shadow-2xl" disabled={!isRegistered && !isAdmin}>
                  <Send className="w-6 h-6" />
                </Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="protocol" className="mt-4 outline-none">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="glass border-white/5 rounded-[2rem] overflow-hidden">
                  <CardHeader className="bg-white/5 border-b border-white/5 p-8">
                    <CardTitle className="font-headline text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                      <LinkIcon className="w-6 h-6 text-primary" /> CLAN PROTOCOL
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    <div className="bg-black/40 rounded-3xl p-8 border border-white/10 space-y-6">
                       <div className="flex justify-between items-center border-b border-white/5 pb-4">
                         <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Target Clan</span>
                         <span className="text-sm font-black text-primary uppercase italic">{t?.clanUid || 'PENDING ASSIGNMENT'}</span>
                       </div>
                       {t?.clanLink ? (
                         <Button asChild className="w-full h-14 bg-green-600 hover:bg-green-700 font-black uppercase text-lg rounded-2xl shadow-2xl glow-primary">
                            <a href={t.clanLink} target="_blank">DEPLOY TO CLAN <ArrowRight className="ml-2 w-5 h-5" /></a>
                         </Button>
                       ) : (
                         <div className="p-6 bg-muted/20 rounded-2xl text-center border border-dashed border-white/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Waiting for Admin Intel...</p>
                         </div>
                       )}
                    </div>
                    {isAdmin && (
                      <div className="space-y-4 pt-6 border-t border-white/5">
                        <p className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">ADMIN OVERRIDE</p>
                        <div className="grid gap-4">
                          <Input placeholder="Battleground Join Link" value={t?.clanLink || ''} onChange={(e) => updateDoc(tRef, { clanLink: e.target.value })} className="bg-white/5 h-12 rounded-xl" />
                          <Input placeholder="Clan Unique ID" value={t?.clanUid || ''} onChange={(e) => updateDoc(tRef, { clanUid: e.target.value })} className="bg-white/5 h-12 rounded-xl" />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="glass border-white/5 rounded-[2rem]">
                   <CardHeader className="bg-white/5 border-b border-white/5 p-8">
                    <CardTitle className="font-headline text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                      <ShieldAlert className="w-6 h-6 text-primary" /> ARENA RULES
                    </CardTitle>
                  </CardHeader>
                   <CardContent className="p-8">
                      <div className="space-y-4">
                        {t?.rules?.map((rule: string, i: number) => (
                          <div key={i} className="flex gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/20 transition-all">
                             <span className="text-primary font-black text-lg">#{(i+1).toString().padStart(2, '0')}</span>
                             <p className="text-sm font-bold text-muted-foreground leading-relaxed">{rule}</p>
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
