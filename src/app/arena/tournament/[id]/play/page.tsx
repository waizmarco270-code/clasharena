
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
  Move, 
  Zap, 
  Layout, 
  Plus, 
  Minus, 
  Maximize2, 
  Minimize2, 
  Monitor, 
  Check, 
  Lock, 
  Pin, 
  Reply, 
  X, 
  Clock, 
  Camera, 
  ImagePlus, 
  AlertCircle, 
  ArrowRight,
  Save,
  Link as LinkIcon
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
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

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

  const logsQuery = useMemo(() => query(collection(db, 'tournaments', id, 'battle-logs'), orderBy('createdAt', 'desc')), [db, id]);
  const { data: battleLogs } = useCollection(logsQuery);

  const pinnedMessages = useMemo(() => messages?.filter(m => m.isPinned) || [], [messages]);

  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [lastSentTime, setLastSentTime] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  
  const [generating, setGenerating] = useState(false);
  const [ending, setEnding] = useState(false);
  const [demoSize, setDemoSize] = useState<number | null>(null);
  const [demoMatches, setDemoMatches] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Protocol States
  const [editClanUid, setEditClanUid] = useState('');
  const [editClanLink, setEditClanLink] = useState('');
  const [savingProtocol, setSavingProtocol] = useState(false);

  // Battle Log States
  const [logImageUrl, setLogImageUrl] = useState('');
  const [logCaption, setLogCaption] = useState('');
  const [uploadingLog, setUploadingLog] = useState(false);
  const logInputRef = useRef<HTMLInputElement>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;
  const isRegistered = registrations?.some((r: any) => r.userId === user?.id);
  
  const hasFullAccess = isRegistered || isAdmin;
  const isTournamentCompleted = t?.status === 'completed';

  useEffect(() => {
    if (t) {
      setEditClanUid(t.clanUid || '');
      setEditClanLink(t.clanLink || '');
    }
  }, [t]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    if (demoSize) setDemoMatches(generateDemoMatches(demoSize));
    else setDemoMatches([]);
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
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, replyingTo]);

  const handleSaveProtocol = async () => {
    if (!isAdmin || savingProtocol) return;
    setSavingProtocol(true);
    try {
      await updateDoc(tRef, {
        clanUid: editClanUid,
        clanLink: editClanLink,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "PROTOCOL UPDATED", description: "Clan intel secured and deployed." });
    } catch (e) {
      toast({ variant: "destructive", title: "UPDATE FAILED" });
    } finally {
      setSavingProtocol(false);
    }
  };

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
    if (!user || !messageText.trim() || !hasFullAccess) return;
    if (isTournamentCompleted && !isAdmin) return;
    if (!isAdmin) {
      const now = Date.now();
      if (now - lastSentTime < 10000) return;
      setLastSentTime(now);
      setCooldown(10);
    }
    const msgData: any = {
      userId: user.id,
      username: profile?.username || user.firstName || 'Warrior',
      avatarUrl: user.imageUrl,
      text: messageText,
      isPinned: false,
      isAdmin: !!profile?.isAdmin,
      isSuperAdmin: !!profile?.isSuperAdmin,
      createdAt: new Date().toISOString()
    };
    if (replyingTo) msgData.replyTo = { id: replyingTo.id, username: replyingTo.username, text: replyingTo.text };
    setMessageText('');
    setReplyingTo(null);
    addDoc(collection(db, 'tournaments', id, 'messages'), msgData);
  };

  const togglePinMessage = async (msg: any) => {
    if (!isAdmin) return;
    await updateDoc(doc(db, 'tournaments', id, 'messages', msg.id), { isPinned: !msg.isPinned });
  };

  const handleLogUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    setUploadingLog(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) { setLogImageUrl(data.secure_url); toast({ title: "LOG PHOTO READY" }); }
    } finally { setUploadingLog(false); }
  };

  const saveBattleLog = async () => {
    if (!isAdmin || !logImageUrl || !logCaption.trim()) return;
    await addDoc(collection(db, 'tournaments', id, 'battle-logs'), {
      imageUrl: logImageUrl,
      caption: logCaption,
      uploadedBy: profile?.username || user?.firstName || 'Admin',
      createdAt: new Date().toISOString()
    });
    setLogImageUrl('');
    setLogCaption('');
    toast({ title: "BATTLE LOG DEPLOYED" });
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
      while (initialPlayers.length < totalInitialSlots) initialPlayers.push({ id: 'bye', name: 'BYE' });
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
      toast({ title: "BRACKET DEPLOYED" });
    } catch (e) { toast({ variant: "destructive", title: "GENERATION FAILED" }); } finally { setGenerating(false); }
  };

  const handleMatchWinner = async (match: any, winnerId: string, winnerName: string) => {
    if (!isAdmin || !winnerId || winnerId === 'bye' || t?.status === 'completed') return;
    if (demoSize) {
      const updated = demoMatches.map(m => {
        if (m.id === match.id) return { ...m, winnerId };
        if (m.id === match.nextMatchId) {
          const isP1 = match.matchIndex % 2 === 0;
          return { ...m, [isP1 ? 'player1Id' : 'player2Id']: winnerId, [isP1 ? 'player1Name' : 'player2Name']: winnerName };
        }
        return m;
      });
      setDemoMatches(updated);
      if (match.round === totalRounds) triggerConfetti();
      return;
    }
    await updateDoc(doc(db, 'tournaments', id, 'matches', `r${match.round}-m${match.matchIndex}`), { winnerId });
    if (match.nextMatchId) {
      const isPlayer1 = match.matchIndex % 2 === 0;
      await updateDoc(doc(db, 'tournaments', id, 'matches', match.nextMatchId), { [isPlayer1 ? 'player1Id' : 'player2Id']: winnerId, [isPlayer1 ? 'player1Name' : 'player2Name']: winnerName });
    }
    if (match.round === totalRounds) triggerConfetti();
  };

  const endTournament = async () => {
    if (!isAdmin || !matches || ending) return;
    const finalMatch = matches.find((m: any) => m.round === totalRounds);
    if (!finalMatch || !finalMatch.winnerId) { toast({ variant: "destructive", title: "FINAL NOT DECIDED" }); return; }
    setEnding(true);
    try {
      const winnerId = finalMatch.winnerId;
      const winnerName = winnerId === finalMatch.player1Id ? finalMatch.player1Name : finalMatch.player2Name;
      
      // Update tournament
      await updateDoc(tRef, { status: 'completed', winnerId, winnerName, completedAt: new Date().toISOString() });
      
      // Update winner stats
      await updateDoc(doc(db, 'users', winnerId), { wins: increment(1), tournamentsPlayed: increment(1) });

      // Create Fulfillment Claim Record
      const claimRef = doc(collection(db, 'reward-claims'));
      const claimData = {
        tournamentId: id,
        tournamentName: t.name,
        userId: winnerId,
        username: winnerName,
        rewardType: t.rewardType,
        rewardValue: t.rewardValue || '0',
        rewardItemName: t.rewardItemName || '',
        rewardImageUrl: t.rewardImageUrl || '',
        status: t.rewardType === 'coin' ? 'completed' : 'pending',
        proofImageUrl: '',
        createdAt: new Date().toISOString()
      };
      
      // Handle automatic coin credit
      if (t.rewardType === 'coin') {
        const amount = parseInt(t.rewardValue) || 0;
        await updateDoc(doc(db, 'users', winnerId), {
          balance: increment(amount),
          earnings: increment(amount)
        });
        claimData.completedAt = new Date().toISOString();
      }

      await setDoc(claimRef, claimData);

      triggerConfetti();
      toast({ title: "ARENA ARCHIVED", description: `${winnerName} IS THE CHAMPION!` });
      setTimeout(() => router.push('/arena'), 6000);
    } finally { setEnding(false); }
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
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Knockout Protocol Phase {t?.status === 'completed' ? 'ARCHIVED' : 'LIVE'}</p>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
              {isAdmin && (
                 <>
                   <DropdownDemo onSelect={setDemoSize} current={demoSize} />
                   {t?.status !== 'completed' && (
                     <><Button variant="outline" size="sm" onClick={generateFixtures} disabled={generating} className="bg-primary/10 border-primary/20 text-primary font-black uppercase text-[10px] h-11 px-6 shadow-xl shrink-0">{generating ? <Loader2 className="animate-spin" /> : <Swords className="w-4 h-4 mr-2" />} GENERATE FIXTURES</Button><Button variant="destructive" size="sm" onClick={endTournament} disabled={ending} className="font-black uppercase text-[10px] h-11 px-6 shadow-xl glow-primary shrink-0">{ending ? <Loader2 className="animate-spin" /> : <Trophy className="w-4 h-4 mr-2" />} END ARENA</Button></>
                   )}
                 </>
              )}
              {t?.status === 'completed' && !demoSize && (
                <Badge className="bg-yellow-500 text-black font-black uppercase h-11 px-6 italic text-sm shadow-xl flex items-center gap-2 shrink-0"><Crown className="w-4 h-4" /> CHAMPION: {t.winnerName}</Badge>
              )}
            </div>
          </div>
        )}
        <Tabs defaultValue="fixtures" className={cn("w-full", isFullscreen ? "h-full" : "")}>
          {!isFullscreen && (
            <TabsList className="bg-muted/30 border border-white/5 w-full justify-start overflow-x-auto no-scrollbar h-14 p-1">
              <TabsTrigger value="fixtures" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><Swords className="w-4 h-4 mr-2" /> Bracket</TabsTrigger>
              <TabsTrigger value="logs" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><Camera className="w-4 h-4 mr-2" /> Battle Logs</TabsTrigger>
              {hasFullAccess ? (<><TabsTrigger value="members" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><Users className="w-4 h-4 mr-2" /> Warriors</TabsTrigger><TabsTrigger value="chat" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><MessageSquare className="w-4 h-4 mr-2" /> Chat Arena</TabsTrigger><TabsTrigger value="protocol" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><ShieldCheck className="w-4 h-4 mr-2" /> Protocol</TabsTrigger></>) : (<Badge variant="outline" className="h-full px-4 rounded-lg bg-black/40 text-[9px] font-black uppercase opacity-60 flex items-center gap-2"><Lock className="w-3 h-3" /> PARTICIPANTS ONLY</Badge>)}
            </TabsList>
          )}
          <TabsContent value="fixtures" className={cn("mt-4 outline-none relative group", isFullscreen ? "m-0 h-full" : "h-[80vh]")}>
            <Card className={cn("glass border-white/5 relative overflow-hidden bg-[#0a0a0a] shadow-2xl transition-all duration-300", isFullscreen ? "h-full rounded-none border-0" : "h-full rounded-[2.5rem]")}>
               <div className="absolute top-6 left-6 z-50 flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl">
                 <Button size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" onClick={() => setZoom(prev => Math.max(0.4, prev - 0.2))}><Minus className="w-4 h-4" /></Button>
                 <span className="text-[10px] font-black text-white w-12 text-center">{Math.round(zoom * 100)}%</span>
                 <Button size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" onClick={() => setZoom(prev => Math.min(2, prev + 0.2))}><Plus className="w-4 h-4" /></Button>
                 <div className="w-[1px] h-4 bg-white/20 mx-1" /><Button size="icon" variant="ghost" className="h-9 w-9 text-white hover:bg-white/10" onClick={() => setZoom(1)}><Monitor className="w-4 h-4" /></Button>
                 <div className="w-[1px] h-4 bg-white/20 mx-1" /><Button size="icon" variant="ghost" className={cn("h-9 w-9 text-white hover:bg-white/10", isFullscreen ? "text-primary" : "")} onClick={() => setIsFullscreen(!isFullscreen)}>{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
               </div>
               <ScrollArea className="h-full w-full">
                 <div className="p-40 min-w-max min-h-full transition-transform duration-300 origin-top-left" style={{ transform: `scale(${zoom})` }}>
                    <div className="flex gap-40 items-center relative z-10">
                      {Array.from({ length: totalRounds }).map((_, rIdx) => {
                        const roundNum = rIdx + 1;
                        const roundMatches = matches?.filter((m: any) => m.round === roundNum) || [];
                        if (roundMatches.length === 0 && matches.length > 0) return null;
                        return (
                          <div key={roundNum} className="flex flex-col justify-around gap-20 relative">
                            <div className="text-center mb-10"><Badge className="bg-white/5 text-white/40 border-white/10 uppercase font-black text-[10px] px-6 py-2 rounded-full tracking-widest">{roundNum === totalRounds ? 'Grand Final' : `Round ${roundNum}`}</Badge></div>
                            {roundMatches.map((m: any, mIdx: number) => (
                              <div key={m.id || mIdx} className="relative flex items-center">
                                <div className="w-64 space-y-2 z-30 relative">
                                  {[1, 2].map(pIdx => {
                                    const pId = pIdx === 1 ? m.player1Id : m.player2Id;
                                    const pName = pIdx === 1 ? m.player1Name : m.player2Name;
                                    const isWinner = m.winnerId === pId && pId !== '' && pId !== 'bye';
                                    const isLoser = m.winnerId !== '' && m.winnerId !== pId && pId !== '' && pId !== 'bye';
                                    return (<div key={pIdx} onClick={() => isAdmin && pId && pId !== 'bye' && (demoSize || t?.status !== 'completed') && handleMatchWinner(m, pId, pName)} className={cn("h-12 px-4 rounded-xl border-2 flex items-center justify-between group/p transition-all", isAdmin && pId && pId !== 'bye' && (demoSize || t?.status !== 'completed') ? "cursor-pointer hover:border-primary/50" : "cursor-default", isWinner ? "bg-green-600 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]" : isLoser ? "bg-red-900/40 border-red-600/50 opacity-60" : "bg-black/60 border-white/10")}><div className="flex items-center gap-3 overflow-hidden"><div className={cn("w-1.5 h-6 rounded-full", isWinner ? "bg-white" : "bg-primary/40")} /><span className={cn("text-sm font-black uppercase truncate", isWinner || isLoser ? "text-white" : "text-white/60")}>{pName || 'TBD'}</span></div>{isWinner && <CheckCircle2 className="w-4 h-4 text-white" />}{isLoser && <XCircle className="w-4 h-4 text-white/40" />}</div>);
                                  })}
                                </div>
                                {roundNum < totalRounds && (<svg className="absolute left-full top-1/2 -translate-y-1/2 w-40 h-[400px] pointer-events-none overflow-visible"><path d={`M 0 200 L 40 200 L 40 ${mIdx % 2 === 0 ? 300 : 100} L 80 ${mIdx % 2 === 0 ? 300 : 100}`} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/10" /></svg>)}
                                {roundNum === totalRounds && (<div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center gap-10 ml-20"><div className="w-20 h-0.5 bg-primary/20" /><div className="flex flex-col items-center gap-3">{winnerInfo && (<p className="text-[10px] font-black uppercase text-yellow-500 animate-bounce tracking-[0.3em]">CHAMPION</p>)}<div className={cn("h-36 w-36 rounded-[2rem] border-4 flex flex-col items-center justify-center bg-black transition-all duration-700 relative", winnerInfo ? "border-yellow-500 shadow-[0_0_80px_rgba(234,179,8,0.5)] scale-110" : "border-white/10 grayscale opacity-30")}><div className={cn("absolute -top-6 -right-6 h-12 w-12 rounded-full flex items-center justify-center bg-yellow-500 shadow-2xl transition-transform", winnerInfo ? "scale-100 rotate-12" : "scale-0")}><Crown className="w-6 h-6 text-black" /></div><Crown className={cn("w-14 h-14 mb-2", winnerInfo ? "text-yellow-500" : "text-white/10")} /><p className="text-xs font-black uppercase text-white truncate max-w-[120px] mt-1 text-center">{winnerInfo?.name || 'AWAITING'}</p></div></div></div>)}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                 </div>
                 <ScrollBar orientation="horizontal" className="bg-white/5 h-3" /><ScrollBar orientation="vertical" className="bg-white/5 w-3" />
               </ScrollArea>
               <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </Card>
          </TabsContent>
          <TabsContent value="logs" className="mt-4 outline-none">
            <div className="flex flex-col gap-8">
              {isAdmin && (
                <Card className="glass border-primary/20 bg-primary/5 p-8 rounded-[2rem]">
                  <h3 className="font-headline text-xl font-black uppercase italic mb-6 flex items-center gap-3"><Camera className="text-primary" /> COMMANDER LOG UPLOAD</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Battle Screenshot</Label>
                      <div className="relative cursor-pointer group" onClick={() => logInputRef.current?.click()}>{logImageUrl ? (<div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-primary/40"><Image src={logImageUrl} alt="Log Preview" fill className="object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><ImagePlus className="w-8 h-8 text-white" /></div></div>) : (<div className="aspect-video w-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all">{uploadingLog ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <ImagePlus className="w-8 h-8 text-muted-foreground" />}<p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Select Screenshot</p></div>)}<input type="file" ref={logInputRef} className="hidden" accept="image/*" onChange={handleLogUpload} /></div>
                    </div>
                    <div className="flex flex-col justify-between py-2">
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Battle Caption</Label><Input value={logCaption} onChange={(e) => setLogCaption(e.target.value)} placeholder="e.g. Round 1 Epic Destruction by Marco" className="bg-white/5 h-12" /></div>
                      <Button onClick={saveBattleLog} disabled={!logImageUrl || !logCaption.trim() || uploadingLog} className="w-full h-14 bg-primary font-black uppercase rounded-xl mt-4 glow-primary">{uploadingLog ? <Loader2 className="animate-spin" /> : <Plus className="w-5 h-5 mr-2" />} DEPLOY BATTLE LOG</Button>
                    </div>
                  </div>
                </Card>
              )}
              <Card className="glass border-white/5 p-8 rounded-[2rem] bg-black/40 min-h-[400px] flex flex-col">
                <h3 className="font-headline text-2xl font-black uppercase italic tracking-tighter mb-8 flex items-center gap-3"><Zap className="text-primary" /> BATTLE LEDGER</h3>
                {!battleLogs || battleLogs.length === 0 ? (<div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-40"><AlertCircle className="w-16 h-16 text-muted-foreground" /><p className="font-black uppercase tracking-[0.3em] text-sm">No Battle Logs Detected</p></div>) : (<div className="px-10"><Carousel className="w-full max-w-4xl mx-auto"><CarouselContent>{battleLogs.map((log: any) => (<CarouselItem key={log.id}><div className="relative aspect-video w-full rounded-3xl overflow-hidden border border-white/10 group"><Image src={log.imageUrl} alt={log.caption} fill className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" /><div className="absolute bottom-0 left-0 right-0 p-8"><Badge className="bg-primary mb-2 shadow-lg">BATTLE RECORD</Badge><h4 className="text-2xl font-black uppercase italic text-white drop-shadow-2xl">{log.caption}</h4><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Logged by {log.uploadedBy}</p></div></div></CarouselItem>))}</CarouselContent><CarouselPrevious className="h-12 w-12 bg-black/60 border-primary/40 text-primary" /><CarouselNext className="h-12 w-12 bg-black/60 border-primary/40 text-primary" /></Carousel></div>)}
              </Card>
            </div>
          </TabsContent>
          {(!isFullscreen && hasFullAccess) && (
            <>
              <TabsContent value="members" className="mt-4 outline-none"><Card className="glass border-white/5 p-8 rounded-[2rem] bg-black/40"><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{registrations?.map((r: any) => (<div key={r.userId} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/40 transition-all"><Avatar className="h-12 w-12 border-2 border-white/10 group-hover:border-primary/20"><AvatarImage src={r.avatarUrl} /><AvatarFallback className="font-black text-sm">{r.username.substring(0,2).toUpperCase()}</AvatarFallback></Avatar><div className="overflow-hidden"><p className="font-black uppercase text-sm truncate text-white">{r.username}</p><p className="text-[9px] text-primary font-black uppercase tracking-widest">{r.tag}</p></div></div>))}</div></Card></TabsContent>
              <TabsContent value="chat" className="mt-4 outline-none"><Card className="glass border-white/5 flex flex-col h-[75vh] rounded-[2rem] overflow-hidden bg-black/40">{pinnedMessages.length > 0 && (<div className="bg-primary/10 border-b border-primary/20 p-2 flex items-center gap-3 overflow-x-auto no-scrollbar"><Pin className="w-4 h-4 text-primary shrink-0 ml-2" />{pinnedMessages.map((pm: any) => (<div key={pm.id} className="bg-black/40 px-3 py-1.5 rounded-full border border-primary/20 flex items-center gap-2 shrink-0 max-w-[200px]"><p className="text-[10px] font-bold text-white truncate">{pm.text}</p><Button size="icon" variant="ghost" className="h-4 w-4 text-primary" onClick={() => togglePinMessage(pm)}><X className="w-2 h-2" /></Button></div>))}</div>)}<div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">{messages?.map((msg: any) => (<div key={msg.id} className={cn("flex items-start gap-3 group", msg.userId === user?.id ? "flex-row-reverse" : "")}><Avatar className="h-8 w-8 border-2 border-white/10"><AvatarImage src={msg.avatarUrl} /><AvatarFallback className="text-xs">{msg.username[0]}</AvatarFallback></Avatar><div className={cn("max-w-[80%] space-y-1", msg.userId === user?.id ? "items-end flex flex-col" : "")}><div className="flex items-center gap-2 px-1"><span className="text-[9px] font-black uppercase text-muted-foreground">{msg.username}</span>{msg.isAdmin && <Badge variant="outline" className="text-[8px] h-3 px-1 border-primary/30 text-primary">ADMIN</Badge>}</div><div className="relative">{msg.replyTo && (<div className="bg-black/30 border-l-4 border-primary/50 p-2 mb-1 rounded-t-lg text-[10px] opacity-80"><p className="font-black text-primary uppercase">{msg.replyTo.username}</p><p className="text-white truncate">{msg.replyTo.text}</p></div>)}<div className={cn("px-4 py-2.5 rounded-2xl text-sm relative", msg.userId === user?.id ? "bg-primary text-white rounded-tr-none" : "bg-white/5 text-white/90 border border-white/5 rounded-tl-none", msg.isPinned ? "border-primary/50 ring-1 ring-primary/20" : "")}>{msg.text}{msg.isPinned && <Pin className="w-3 h-3 text-primary absolute -top-1.5 -right-1.5 fill-primary" />}</div><div className={cn("absolute -top-6 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", msg.userId === user?.id ? "right-0" : "left-0")}><Button size="icon" variant="ghost" className="h-6 w-6 rounded-full bg-black/60" onClick={() => setReplyingTo(msg)}><Reply className="w-3 h-3" /></Button>{isAdmin && (<Button size="icon" variant="ghost" className={cn("h-6 w-6 rounded-full bg-black/60", msg.isPinned ? "text-primary" : "")} onClick={() => togglePinMessage(msg)}><Pin className="w-3 h-3" /></Button>)}</div></div></div></div>))}</div><div className="p-4 border-t border-white/5 bg-black/40 space-y-3">{replyingTo && (<div className="bg-white/5 border-l-4 border-primary p-3 rounded-lg flex items-center justify-between"><div className="overflow-hidden"><p className="text-[10px] font-black text-primary uppercase">Replying to {replyingTo.username}</p><p className="text-xs text-muted-foreground truncate">{replyingTo.text}</p></div><Button size="icon" variant="ghost" onClick={() => setReplyingTo(null)}><X className="w-4 h-4" /></Button></div>)}<form onSubmit={handleSendMessage} className="flex gap-3 relative"><div className="flex-1 relative"><Input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder={isTournamentCompleted && !isAdmin ? "Arena archived. Chat is locked." : cooldown > 0 && !isAdmin ? `Wait ${cooldown}s...` : "Type a message..."} className="bg-white/5 rounded-xl h-12 pr-12" disabled={(cooldown > 0 && !isAdmin) || (isTournamentCompleted && !isAdmin)} />{cooldown > 0 && !isAdmin && !isTournamentCompleted && (<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-primary"><Clock className="w-3.5 h-3.5 animate-spin" /><span className="text-[10px] font-black">{cooldown}s</span></div>)}{isTournamentCompleted && !isAdmin && (<div className="absolute right-3 top-1/2 -translate-y-1/2"><Lock className="w-4 h-4 text-muted-foreground" /></div>)}</div><Button type="submit" size="icon" className="h-12 w-12 bg-primary rounded-xl shrink-0" disabled={!messageText.trim() || (cooldown > 0 && !isAdmin) || (isTournamentCompleted && !isAdmin)}><Send className="w-5 h-5" /></Button></form></div></Card></TabsContent>
              <TabsContent value="protocol" className="mt-4 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="glass border-white/5 rounded-[2rem] overflow-hidden bg-black/40 p-8 space-y-8">
                    <h3 className="font-headline text-xl font-black uppercase italic tracking-tighter flex items-center gap-3"><Monitor className="text-primary" /> War Clan Access</h3>
                    <div className="bg-black/60 rounded-2xl p-6 border border-white/5 space-y-6">
                      {isAdmin ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">War Clan Tag</Label>
                            <Input 
                              value={editClanUid} 
                              onChange={(e) => setEditClanUid(e.target.value)} 
                              placeholder="e.g. #ABC123XY"
                              className="bg-white/5 h-12 uppercase"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Invite Link</Label>
                            <div className="relative">
                              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                              <Input 
                                value={editClanLink} 
                                onChange={(e) => setEditClanLink(e.target.value)} 
                                placeholder="https://link.clashofclans.com/..."
                                className="bg-white/5 h-12 pl-10"
                              />
                            </div>
                          </div>
                          <Button 
                            onClick={handleSaveProtocol} 
                            disabled={savingProtocol}
                            className="w-full h-12 bg-primary font-black uppercase rounded-xl glow-primary"
                          >
                            {savingProtocol ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />} SAVE PROTOCOL
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <span className="text-[10px] font-black uppercase text-muted-foreground">War Clan Tag</span>
                            <span className="text-lg font-black text-primary uppercase">{t?.clanUid || 'AWAITING ADMIN'}</span>
                          </div>
                          {t?.clanLink && (
                            <Button asChild className="w-full h-14 bg-green-600 font-black uppercase rounded-xl shadow-xl glow-primary">
                              <a href={t.clanLink} target="_blank">JOIN CLAN PROTOCOL <ArrowRight className="ml-2 w-4 h-4" /></a>
                            </Button>
                          )}
                          {!t?.clanLink && (
                            <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                              <p className="text-[10px] font-black text-muted-foreground uppercase italic tracking-widest">Waiting for clan link deployment</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                  <Card className="glass border-white/5 rounded-[2rem] bg-black/40 p-8 space-y-8">
                    <h3 className="font-headline text-xl font-black uppercase italic tracking-tighter flex items-center gap-3"><ShieldAlert className="text-primary" /> War Protocols</h3>
                    <div className="space-y-4">
                      {t?.rules?.map((rule: string, i: number) => (
                        <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 group hover:border-primary/40 transition-all">
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
  return (<div className="flex items-center gap-2 mr-4 bg-muted/20 px-4 py-1 rounded-xl border border-white/10 shrink-0"><Layout className="w-4 h-4 text-muted-foreground" /><span className="text-[10px] font-black uppercase text-muted-foreground mr-2">DEMO MODE:</span><div className="flex gap-1">{[2, 4, 8, 16, 32, 64].map(size => (<Button key={size} size="sm" variant="ghost" onClick={() => onSelect(current === size ? null : size)} className={cn("h-8 px-2 text-[10px] font-black uppercase", current === size ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5")}>{size}</Button>))}</div></div>);
}
