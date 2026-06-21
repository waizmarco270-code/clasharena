
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
  Settings
} from 'lucide-react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, setDoc, collection, query, orderBy, addDoc, serverTimestamp, increment, deleteDoc, getDocs } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function TournamentPlayArena({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

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
  const [activeTab, setActiveTab] = useState('fixtures');
  const [generating, setGenerating] = useState(false);
  const [ending, setEnding] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });

  const isSuperAdmin = user?.id === "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16" || profile?.isSuperAdmin;
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
    await addDoc(collection(db, 'tournaments', id, 'messages'), msgData);
  };

  const generateFixtures = async () => {
    if (!isAdmin || !registrations || generating) return;
    setGenerating(true);

    try {
      // Clear existing matches
      const existingMatches = await getDocs(collection(db, 'tournaments', id, 'matches'));
      await Promise.all(existingMatches.docs.map(m => deleteDoc(m.ref)));

      // Randomize players
      const players = [...registrations].sort(() => Math.random() - 0.5);
      const numPlayers = players.length;
      
      // Determine rounds needed (nearest power of 2)
      const rounds = Math.ceil(Math.log2(numPlayers));
      let currentRoundPlayers = players.map(p => ({ id: p.userId, name: p.username }));

      // Fill with Byes if needed
      const totalFirstRoundSlots = Math.pow(2, rounds);
      while (currentRoundPlayers.length < totalFirstRoundSlots) {
        currentRoundPlayers.push({ id: 'bye', name: 'BYE' });
      }

      // Generate Rounds
      let matchesToCreate: any[] = [];
      let previousRoundMatches: any[] = [];

      for (let r = 1; r <= rounds; r++) {
        const matchesInRound = Math.pow(2, rounds - r);
        let roundMatches: any[] = [];

        for (let m = 0; m < matchesInRound; m++) {
          const matchId = `r${r}-m${m}`;
          const matchData: any = {
            round: r,
            matchIndex: m,
            player1Id: r === 1 ? currentRoundPlayers[m * 2].id : '',
            player1Name: r === 1 ? currentRoundPlayers[m * 2].name : '',
            player2Id: r === 1 ? currentRoundPlayers[m * 2 + 1].id : '',
            player2Name: r === 1 ? currentRoundPlayers[m * 2 + 1].name : '',
            winnerId: '',
            nextMatchId: r < rounds ? `r${r + 1}-m${Math.floor(m / 2)}` : ''
          };

          // Auto-advance Byes
          if (r === 1) {
            if (matchData.player1Id === 'bye') { matchData.winnerId = matchData.player2Id; }
            else if (matchData.player2Id === 'bye') { matchData.winnerId = matchData.player1Id; }
          }

          roundMatches.push(matchData);
          matchesToCreate.push({ id: matchId, data: matchData });
        }
        previousRoundMatches = roundMatches;
      }

      // Batch Write
      await Promise.all(matchesToCreate.map(m => setDoc(doc(db, 'tournaments', id, 'matches', m.id), m.data)));
      
      // Update advanced winners
      for (const m of matchesToCreate) {
        if (m.data.winnerId && m.data.nextMatchId) {
          const winnerName = m.data.winnerId === m.data.player1Id ? m.data.player1Name : m.data.player2Name;
          const nextRef = doc(db, 'tournaments', id, 'matches', m.data.nextMatchId);
          const isPlayer1 = parseInt(m.id.split('m')[1]) % 2 === 0;
          await updateDoc(nextRef, {
            [isPlayer1 ? 'player1Id' : 'player2Id']: m.data.winnerId,
            [isPlayer1 ? 'player1Name' : 'player2Name']: winnerName
          });
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
      await updateDoc(nextRef, {
        [isPlayer1 ? 'player1Id' : 'player2Id']: winnerId,
        [isPlayer1 ? 'player1Name' : 'player2Name']: winnerName
      });
    }
    toast({ title: "RESULT RECORDED" });
  };

  const endTournament = async () => {
    if (!isAdmin || !matches || ending) return;
    const finalMatch = matches.find((m: any) => m.nextMatchId === '');
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

      // Update Winner Stats
      const winnerRef = doc(db, 'users', winnerId);
      await updateDoc(winnerRef, {
        wins: increment(1),
        tournamentsPlayed: increment(1)
      });

      // Update All Participants Played count
      await Promise.all(registrations.map(r => {
        if (r.userId !== winnerId) {
          return updateDoc(doc(db, 'users', r.userId), { tournamentsPlayed: increment(1) });
        }
        return Promise.resolve();
      }));

      toast({ title: "TOURNAMENT ARCHIVED", description: `${winnerName} IS THE CHAMPION!` });
      router.push('/arena');
    } finally {
      setEnding(false);
    }
  };

  if (tLoading) return <PageWrapper><div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/arena/tournament/${id}`}><Button size="icon" variant="ghost"><ChevronLeft /></Button></Link>
            <div>
              <h1 className="font-headline text-2xl font-black uppercase italic tracking-tighter">{t?.name} <span className="text-primary">ARENA</span></h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Knockout Protocol Active</p>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {isAdmin && t?.status !== 'completed' && (
               <>
                 <Button variant="outline" size="sm" onClick={generateFixtures} disabled={generating} className="bg-primary/10 border-primary/20 text-primary font-black uppercase text-[10px] flex-1 md:flex-none">
                   {generating ? <Loader2 className="animate-spin" /> : <Swords className="w-4 h-4 mr-2" />} GENERATE FIXTURES
                 </Button>
                 <Button variant="destructive" size="sm" onClick={endTournament} disabled={ending} className="font-black uppercase text-[10px] flex-1 md:flex-none shadow-xl glow-primary">
                   {ending ? <Loader2 className="animate-spin" /> : <Trophy className="w-4 h-4 mr-2" />} END ARENA
                 </Button>
               </>
            )}
            {t?.status === 'completed' && (
              <Badge className="bg-yellow-500 text-black font-black uppercase h-10 px-6 italic text-sm shadow-xl">WINNER: {t.winnerName}</Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="fixtures" className="w-full">
          <TabsList className="glass border-white/5 w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="fixtures"><Swords className="w-4 h-4 mr-2" /> Fixtures</TabsTrigger>
            <TabsTrigger value="members"><Users className="w-4 h-4 mr-2" /> Warriors</TabsTrigger>
            <TabsTrigger value="chat"><MessageSquare className="w-4 h-4 mr-2" /> Chat Arena</TabsTrigger>
            <TabsTrigger value="protocol"><ShieldCheck className="w-4 h-4 mr-2" /> Protocol</TabsTrigger>
          </TabsList>

          <TabsContent value="fixtures" className="mt-4">
            <Card className="glass border-white/5 h-[70vh] relative overflow-hidden bg-black/40">
               <div 
                 className="absolute inset-0 cursor-grab active:cursor-grabbing overflow-auto p-20 no-scrollbar"
                 onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); }}
                 onMouseMove={(e) => {
                   if (!isDragging) return;
                   const dx = e.clientX - dragStart.x;
                   const dy = e.clientY - dragStart.y;
                   e.currentTarget.scrollLeft -= dx;
                   e.currentTarget.scrollTop -= dy;
                   setDragStart({ x: e.clientX, y: e.clientY });
                 }}
                 onMouseUp={() => setIsDragging(false)}
               >
                 <div className="flex gap-20 min-w-max p-10">
                   {Array.from({ length: Math.ceil(Math.log2(t?.maxPlayers || 8)) }).map((_, rIdx) => {
                     const round = rIdx + 1;
                     const roundMatches = matches?.filter((m: any) => m.round === round) || [];
                     return (
                       <div key={round} className="flex flex-col justify-around gap-8">
                         <h3 className="text-center font-black text-xs uppercase tracking-widest text-primary mb-4">ROUND {round}</h3>
                         {roundMatches.map((m: any) => (
                           <div key={m.id} className="relative group">
                             <div className="w-64 space-y-1">
                               {[1, 2].map(pIdx => {
                                 const pId = pIdx === 1 ? m.player1Id : m.player2Id;
                                 const pName = pIdx === 1 ? m.player1Name : m.player2Name;
                                 const isWinner = m.winnerId === pId && pId !== '';
                                 const isLoser = m.winnerId !== '' && m.winnerId !== pId && pId !== '';
                                 return (
                                   <div 
                                     key={pIdx} 
                                     onClick={() => isAdmin && handleMatchWinner(m, pId, pName)}
                                     className={cn(
                                       "p-4 rounded-xl border transition-all flex justify-between items-center cursor-pointer",
                                       isWinner ? "bg-green-600/20 border-green-500/50 text-white" : 
                                       isLoser ? "bg-red-600/10 border-red-500/20 text-muted-foreground opacity-50" : 
                                       "bg-white/5 border-white/10 hover:border-primary/50"
                                     )}
                                   >
                                     <span className="text-xs font-black uppercase truncate max-w-[120px]">{pName || 'TBD'}</span>
                                     {isWinner && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                     {isLoser && <XCircle className="w-4 h-4 text-red-500" />}
                                   </div>
                                 );
                               })}
                             </div>
                             {/* Connector lines logic can be added here for more visual flair */}
                           </div>
                         ))}
                       </div>
                     );
                   })}
                 </div>
               </div>
               <div className="absolute bottom-4 right-4 flex gap-2">
                 <Badge variant="outline" className="bg-black/60 text-[9px] font-black uppercase">Movable Canvas</Badge>
               </div>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-4">
            <Card className="glass border-white/5">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {registrations?.map((r: any) => (
                    <div key={r.userId} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <Avatar className="h-10 w-10 border border-white/10">
                        <AvatarFallback className="font-black">{r.username.substring(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-black uppercase text-sm">{r.username}</p>
                        <p className="text-[10px] text-primary font-bold uppercase">{r.tag}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="mt-4">
            <Card className="glass border-white/5 flex flex-col h-[65vh]">
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {messages?.map((msg: any) => (
                  <div key={msg.id} className={cn("flex items-start gap-3", msg.userId === user?.id ? "flex-row-reverse" : "")}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={msg.avatarUrl} />
                      <AvatarFallback>{msg.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className={cn("max-w-[70%] space-y-1", msg.userId === user?.id ? "items-end flex flex-col" : "")}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">{msg.username}</span>
                        {msg.isSuperAdmin ? <CheckCircle2 className="w-3 h-3 text-yellow-500" /> : msg.isAdmin && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      </div>
                      <div className={cn("px-4 py-2 rounded-2xl text-sm", msg.isPinned ? "bg-yellow-500/20 border border-yellow-500/30 text-yellow-200" : msg.userId === user?.id ? "bg-primary text-white" : "bg-white/5 border border-white/5")}>
                        {msg.isPinned && <Pin className="w-3 h-3 inline mr-2" />}
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-black/20 flex gap-2">
                <Input 
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)} 
                  placeholder={isRegistered || isAdmin ? "Command your troops..." : "Register to chat"} 
                  disabled={!isRegistered && !isAdmin}
                  className="bg-white/5 rounded-xl h-12"
                />
                <Button type="submit" size="icon" className="h-12 w-12 bg-primary" disabled={!isRegistered && !isAdmin}><Send className="w-5 h-5" /></Button>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="protocol" className="mt-4">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass border-white/5">
                  <CardHeader><CardTitle className="font-headline text-lg uppercase italic">CLAN INTEL</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/10 space-y-4">
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase text-muted-foreground">Clan Link</span>
                         <span className="text-sm font-bold text-primary truncate max-w-[200px]">{t?.clanLink || 'PENDING'}</span>
                       </div>
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase text-muted-foreground">Clan Tag</span>
                         <span className="text-sm font-bold text-primary">{t?.clanUid || 'PENDING'}</span>
                       </div>
                       {t?.clanLink && (
                         <Button asChild className="w-full bg-green-600 font-black uppercase"><a href={t.clanLink} target="_blank">JOIN CLAN PROTOCOL</a></Button>
                       )}
                    </div>
                    {isAdmin && (
                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <p className="text-[10px] font-black uppercase text-primary">ADMIN OVERRIDE</p>
                        <Input placeholder="Clan Join Link" onChange={(e) => updateDoc(tRef, { clanLink: e.target.value })} className="bg-white/5" />
                        <Input placeholder="Clan UID/Tag" onChange={(e) => updateDoc(tRef, { clanUid: e.target.value })} className="bg-white/5" />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="glass border-white/5">
                   <CardHeader><CardTitle className="font-headline text-lg uppercase italic">ARENA RULES</CardTitle></CardHeader>
                   <CardContent className="space-y-4">
                      {t?.rules?.map((rule: string, i: number) => (
                        <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                           <span className="text-primary font-black"># {i+1}</span>
                           <p className="text-xs font-medium text-muted-foreground">{rule}</p>
                        </div>
                      ))}
                   </CardContent>
                </Card>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
