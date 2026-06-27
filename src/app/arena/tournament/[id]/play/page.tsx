'use client';

import { useMemo, useState, useEffect, useRef, use } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Plus, 
  Minus, 
  Maximize2, 
  Minimize2, 
  Monitor, 
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
  Link as LinkIcon,
  Zap
} from 'lucide-react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, setDoc, collection, query, orderBy, addDoc, deleteDoc, getDocs, increment, limit, serverTimestamp } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import { default as NextLink } from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import Image from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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

  const logsQuery = useMemo(() => query(collection(db, 'tournaments', id, 'battle-logs'), orderBy('createdAt', 'desc'), limit(10)), [db, id]);
  const { data: battleLogs } = useCollection(logsQuery);
  
  const [generating, setGenerating] = useState(false);
  const [ending, setEnding] = useState(false);
  const [demoSize, setDemoSize] = useState<number | null>(null);
  const [demoMatches, setDemoMatches] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Custom Clan states
  const [editClan1Tag, setEditClan1Tag] = useState('');
  const [editClan1Link, setEditClan1Link] = useState('');
  const [editClan2Tag, setEditClan2Tag] = useState('');
  const [editClan2Link, setEditClan2Link] = useState('');
  const [savingProtocol, setSavingProtocol] = useState(false);

  // Dialog status states
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

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
      setEditClan1Tag(t.clan1Tag || '#2J9VCQ99C');
      setEditClan1Link(t.clan1Link || 'https://link.clashofclans.com/en?action=OpenClanProfile&tag=2J9VCQ99C');
      setEditClan2Tag(t.clan2Tag || '#2RGY920RY');
      setEditClan2Link(t.clan2Link || 'https://link.clashofclans.com/en?action=OpenClanProfile&tag=2RGY920RY');
    }
  }, [t]);

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

  const handleSaveProtocol = async () => {
    if (!isAdmin || savingProtocol) return;
    setSavingProtocol(true);
    try {
      await updateDoc(tRef, {
        clan1Tag: editClan1Tag,
        clan1Link: editClan1Link,
        clan2Tag: editClan2Tag,
        clan2Link: editClan2Link,
        updatedAt: serverTimestamp()
      });
      toast({ title: "PROTOCOL UPDATED", description: "Clan configurations secured." });
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

  const handleLogUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    setUploadingLog(true);
    try {
      const result = await uploadToCloudinary(file, { folder: 'battle-logs' });
      if (result.url) { setLogImageUrl(result.url); toast({ title: "LOG PHOTO READY" }); }
    } finally { setUploadingLog(false); }
  };

  const saveBattleLog = async () => {
    if (!isAdmin || !logImageUrl || !logCaption.trim()) return;
    await addDoc(collection(db, 'tournaments', id, 'battle-logs'), {
      imageUrl: logImageUrl,
      caption: logCaption,
      uploadedBy: profile?.username || user?.firstName || 'Admin',
      createdAt: serverTimestamp()
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

      // Generate Clan Assignments & Codes
      const totalPlayers = registrations.length;
      const updatePromises = registrations.map(async (p: any) => {
        let assignedClan = 'Clan 1';
        const codeNum = Math.floor(1000 + Math.random() * 9000);
        const joinCode = `ARENA-${codeNum}`;

        if (totalPlayers >= 8) {
          const playerIdx = initialPlayers.findIndex(ip => ip.id === p.userId);
          if (playerIdx !== -1) {
            assignedClan = (playerIdx % 2 === 0) ? 'Clan 1' : 'Clan 2';
          }
        } else {
          assignedClan = 'Clan 1';
        }

        const regDocRef = doc(db, 'tournaments', id, 'registrations', p.userId);
        return updateDoc(regDocRef, { assignedClan, joinCode });
      });
      await Promise.all(updatePromises);

      toast({ title: "BRACKET & CLANS DEPLOYED" });
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
    if (!isAdmin || !matches || ending || !registrations || !t) return;
    const finalMatch = matches.find((m: any) => m.round === totalRounds);
    if (!finalMatch || !finalMatch.winnerId) { toast({ variant: "destructive", title: "FINAL NOT DECIDED" }); return; }
    setEnding(true);
    try {
      const winnerId = finalMatch.winnerId;
      const winnerName = winnerId === finalMatch.player1Id ? finalMatch.player1Name : finalMatch.player2Name;
      
      await updateDoc(tRef, { status: 'completed', winnerId, winnerName, completedAt: serverTimestamp() });
      
      await Promise.all(registrations.map(reg => 
        updateDoc(doc(db, 'users', reg.userId), { tournamentsPlayed: increment(1) })
      ));

      await updateDoc(doc(db, 'users', winnerId), { wins: increment(1) });

      const claimRef = doc(collection(db, 'reward-claims'));
      const claimData: any = {
        tournamentId: id,
        tournamentName: t.name || '',
        userId: winnerId,
        username: winnerName || '',
        rewardType: t.rewardType || '',
        rewardValue: t.rewardValue || '0',
        rewardItemName: t.rewardItemName || '',
        rewardImageUrl: t.rewardImageUrl || '',
        status: t.rewardType === 'coin' ? 'completed' : 'pending',
        upiId: '',
        upiName: '',
        upiQrUrl: '',
        proofImageUrl: '',
        proofImageUrl2: '',
        createdAt: serverTimestamp()
      };
      
      if (t.rewardType === 'coin') {
        const amount = parseInt(t.rewardValue) || 0;
        await updateDoc(doc(db, 'users', winnerId), {
          balance: increment(amount),
          earnings: increment(amount)
        });
        claimData.completedAt = serverTimestamp();
      }

      await setDoc(claimRef, claimData);

      triggerConfetti();
      toast({ title: "ARENA ARCHIVED", description: `${winnerName} IS THE CHAMPION!` });
      setEndDialogOpen(false);
      setTimeout(() => router.push('/arena'), 6000);
    } finally { setEnding(false); }
  };

  const handleCancelTournament = async () => {
    if (!isAdmin || !t || cancelling) return;
    if (!cancelReason.trim()) {
      toast({ variant: "destructive", title: "REASON REQUIRED", description: "Cancellation reason is mandatory." });
      return;
    }
    setCancelling(true);
    try {
      await updateDoc(tRef, {
        status: 'cancelled',
        cancelReason: cancelReason.trim(),
        cancelledAt: serverTimestamp()
      });

      if (t.entryFee > 0 && registrations && registrations.length > 0) {
        const refundPromises = registrations.map(async (reg: any) => {
          await updateDoc(doc(db, 'users', reg.userId), {
            balance: increment(t.entryFee)
          });
          const refundRef = doc(collection(db, 'recharge-requests'));
          await setDoc(refundRef, {
            userId: reg.userId,
            username: reg.username || 'Warrior',
            amount: t.entryFee,
            transactionId: `cancel_refund_${id}_${reg.userId}`,
            status: 'approved',
            method: 'Refund',
            createdAt: serverTimestamp()
          });
        });
        await Promise.all(refundPromises);
      }

      toast({ title: "TOURNAMENT CANCELLED", description: "All entry fees have been fully refunded." });
      setCancelDialogOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "CANCELLATION FAILED" });
    } finally {
      setCancelling(false);
    }
  };

  const handleKickPlayer = async (userId: string, username: string) => {
    if (!isAdmin || !t) return;
    if (!confirm(`Are you sure you want to kick ${username} from this tournament?`)) return;
    try {
      await deleteDoc(doc(db, 'tournaments', id, 'registrations', userId));
      await updateDoc(tRef, { currentPlayers: increment(-1) });

      if (t.entryFee > 0) {
        await updateDoc(doc(db, 'users', userId), {
          balance: increment(t.entryFee)
        });
        const refundRef = doc(collection(db, 'recharge-requests'));
        await setDoc(refundRef, {
          userId,
          username,
          amount: t.entryFee,
          transactionId: `kick_refund_${id}_${userId}`,
          status: 'approved',
          method: 'Refund',
          createdAt: serverTimestamp()
        });
      }

      toast({ title: "WARRIOR KICKED", description: `${username} has been removed and refunded.` });
    } catch (e) {
      toast({ variant: "destructive", title: "KICK FAILED" });
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

  // Render Cancelled Screen
  if (t?.status === 'cancelled') {
    const userReg = registrations?.find((r: any) => r.userId === user?.id);
    const hasRefund = t.entryFee > 0 && userReg;

    return (
      <PageWrapper>
        <div className="max-w-md mx-auto py-20 text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="relative inline-flex p-6 bg-red-950/40 rounded-3xl border border-red-500/20 shadow-2xl">
            <ShieldAlert className="w-16 h-16 text-red-500 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-black uppercase italic tracking-tighter text-red-500">ARENA DECOMMISSIONED</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tournament Cancelled by Command Center</p>
          </div>
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] text-left space-y-4">
            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider mb-1">Reason for Cancellation</p>
              <p className="text-sm font-bold text-white leading-relaxed">{t.cancelReason || 'Schedule adjustment or server updates.'}</p>
            </div>
            {hasRefund && (
              <div className="pt-4 border-t border-white/5 bg-green-500/5 p-3 rounded-xl border border-green-500/10 text-center">
                <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Entry Fee Refunded</p>
                <p className="text-lg font-black text-white mt-1">🪙 {t.entryFee} Coins Credited</p>
              </div>
            )}
            <p className="text-[9px] text-center text-muted-foreground uppercase font-black tracking-widest pt-2">We apologize for the inconvenience.</p>
          </div>
          <NextLink href="/arena" className="block">
            <Button className="w-full bg-white text-black hover:bg-white/90 font-headline font-black italic uppercase tracking-wider rounded-xl h-12 shadow-lg">
              RETURN TO ARENA BOARD
            </Button>
          </NextLink>
        </div>
      </PageWrapper>
    );
  }

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
                     <>
                       <Button variant="outline" size="sm" onClick={generateFixtures} disabled={generating} className="bg-primary/10 border-primary/20 text-primary font-black uppercase text-[10px] h-11 px-6 shadow-xl shrink-0">
                         {generating ? <Loader2 className="animate-spin" /> : <Swords className="w-4 h-4 mr-2" />} GENERATE FIXTURES
                       </Button>
                       <Button variant="destructive" size="sm" onClick={() => setEndDialogOpen(true)} disabled={ending} className="font-black uppercase text-[10px] h-11 px-6 shadow-xl glow-primary shrink-0">
                         {ending ? <Loader2 className="animate-spin" /> : <Trophy className="w-4 h-4 mr-2" />} END ARENA
                       </Button>
                       <Button variant="ghost" size="sm" onClick={() => setCancelDialogOpen(true)} disabled={cancelling} className="bg-red-950/20 border border-red-500/20 text-red-500 hover:bg-red-900/30 font-black uppercase text-[10px] h-11 px-6 shadow-xl shrink-0">
                         <X className="w-4 h-4 mr-2" /> CANCEL ARENA
                       </Button>
                     </>
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
              {hasFullAccess ? (
                <>
                  <TabsTrigger value="members" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><Users className="w-4 h-4 mr-2" /> Warriors</TabsTrigger>
                  <TabsTrigger value="chat" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><MessageSquare className="w-4 h-4 mr-2" /> Chat Arena</TabsTrigger>
                  <TabsTrigger value="protocol" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><ShieldCheck className="w-4 h-4 mr-2" /> Protocol</TabsTrigger>
                  <TabsTrigger value="rules" className="data-[state=active]:bg-primary h-full px-6 rounded-lg font-black uppercase text-[10px]"><ShieldAlert className="w-4 h-4 mr-2" /> Rules</TabsTrigger>
                </>
              ) : (
                <Badge variant="outline" className="h-full px-4 rounded-lg bg-black/40 text-[9px] font-black uppercase opacity-60 flex items-center gap-2"><Lock className="w-3 h-3" /> PARTICIPANTS ONLY</Badge>
              )}
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
              <TabsContent value="members" className="mt-4 outline-none">
                <Card className="glass border-white/5 p-8 rounded-[2rem] bg-black/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {registrations?.map((r: any) => (
                      <div key={r.userId} className="relative flex flex-col justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/40 transition-all gap-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-white/10 group-hover:border-primary/20">
                            <AvatarImage src={r.avatarUrl} />
                            <AvatarFallback className="font-black text-sm">{r.username.substring(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="overflow-hidden">
                            <p className="font-black uppercase text-sm truncate text-white">{r.username}</p>
                            <p className="text-[9px] text-primary font-black uppercase tracking-widest">{r.tag}</p>
                          </div>
                        </div>

                        {/* Clan & Join Code Data (Admin/SuperAdmin only) */}
                        {isAdmin && (
                          <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-muted-foreground uppercase">Assigned Clan:</span>
                              <Badge className={cn("text-[9px] font-black uppercase", r.assignedClan === 'Clan 2' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white')}>
                                {r.assignedClan || 'Clan 1'}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-muted-foreground uppercase">Join Code:</span>
                              <span className="text-[10px] font-mono font-bold text-yellow-500 bg-white/5 px-2 py-0.5 rounded">
                                {r.joinCode || 'AWAITING'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Kick Player button (Admin/SuperAdmin only) */}
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleKickPlayer(r.userId, r.username)}
                            className="w-full mt-2 h-9 text-[9px] font-black uppercase bg-red-950/20 text-red-500 border border-red-500/10 hover:bg-red-900/30 rounded-xl"
                          >
                            <X className="w-3.5 h-3.5 mr-1" /> KICK WARRIOR
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
              
              <TabsContent value="chat" className="mt-4 outline-none">
                <Card className="glass border-white/5 flex flex-col h-[75vh] rounded-[2rem] overflow-hidden bg-black/40 items-center justify-center space-y-4">
                   <MessageSquare className="w-12 h-12 text-muted-foreground opacity-50" />
                   <h3 className="font-headline text-2xl font-black uppercase italic text-white/50">Chat Coming Soon</h3>
                   <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest text-center max-w-sm">The Arena Chat feature is currently undergoing maintenance and upgrades.</p>
                </Card>
              </TabsContent>
              
              <TabsContent value="protocol" className="mt-4 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="glass border-white/5 rounded-[2rem] overflow-hidden bg-black/40 p-8 space-y-8">
                    <h3 className="font-headline text-xl font-black uppercase italic tracking-tighter flex items-center gap-3"><Monitor className="text-primary" /> War Clan Access</h3>
                    <div className="bg-black/60 rounded-2xl p-6 border border-white/5 space-y-6">
                      {isAdmin ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Clan 1 Tag</Label>
                            <Input 
                              value={editClan1Tag} 
                              onChange={(e) => setEditClan1Tag(e.target.value)} 
                              placeholder="#2J9VCQ99C"
                              className="bg-white/5 h-12 uppercase"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Clan 1 Invite Link</Label>
                            <div className="relative">
                              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                              <Input 
                                value={editClan1Link} 
                                onChange={(e) => setEditClan1Link(e.target.value)} 
                                placeholder="https://link.clashofclans.com/..."
                                className="bg-white/5 h-12 pl-10 text-xs"
                              />
                            </div>
                          </div>
                          <div className="space-y-2 pt-2 border-t border-white/5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Clan 2 Tag</Label>
                            <Input 
                              value={editClan2Tag} 
                              onChange={(e) => setEditClan2Tag(e.target.value)} 
                              placeholder="#2RGY920RY"
                              className="bg-white/5 h-12 uppercase"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Clan 2 Invite Link</Label>
                            <div className="relative">
                              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                              <Input 
                                value={editClan2Link} 
                                onChange={(e) => setEditClan2Link(e.target.value)} 
                                placeholder="https://link.clashofclans.com/..."
                                className="bg-white/5 h-12 pl-10 text-xs"
                              />
                            </div>
                          </div>
                          <Button 
                            onClick={handleSaveProtocol} 
                            disabled={savingProtocol}
                            className="w-full h-12 bg-primary text-white font-black uppercase rounded-xl glow-primary mt-4"
                          >
                            {savingProtocol ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />} SAVE CLAN PROTOCOLS
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {(() => {
                            const userReg = registrations?.find((r: any) => r.userId === user?.id);
                            const userClan = userReg?.assignedClan || 'Clan 1';
                            const userJoinCode = userReg?.joinCode || 'AWAITING CODE';
                            
                            const activeClanName = userClan === 'Clan 2' ? 'CLASH ARENA 2' : 'CLASH ARENA 1';
                            const activeClanTag = userClan === 'Clan 2' ? (t?.clan2Tag || '#2RGY920RY') : (t?.clan1Tag || '#2J9VCQ99C');
                            const activeClanLink = userClan === 'Clan 2' ? (t?.clan2Link || 'https://link.clashofclans.com/en?action=OpenClanProfile&tag=2RGY920RY') : (t?.clan1Link || 'https://link.clashofclans.com/en?action=OpenClanProfile&tag=2J9VCQ99C');

                            return (
                              <div className="space-y-6">
                                <div className="flex flex-col items-center gap-1 p-4 rounded-xl border border-white/5 bg-white/[0.01] text-center">
                                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Your Assigned Clan</span>
                                  <span className="text-xl font-black text-primary italic tracking-tight uppercase">{activeClanName}</span>
                                  <span className="text-[10px] font-bold text-white/60 tracking-wider font-mono">{activeClanTag}</span>
                                </div>

                                <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-center space-y-2">
                                  <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest block">Your Clan Verification Code</span>
                                  <span className="text-2xl font-mono font-black text-white bg-black/40 px-4 py-1.5 rounded-lg inline-block border border-white/10 select-all cursor-pointer" title="Click to select code">
                                    {userJoinCode}
                                  </span>
                                  <p className="text-[8px] text-muted-foreground uppercase font-black tracking-wider leading-relaxed">
                                    You must paste this code in the Clash of Clans invitation text box when joining.
                                  </p>
                                </div>

                                {activeClanLink ? (
                                  <Button asChild className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase rounded-xl shadow-xl glow-primary">
                                    <a href={activeClanLink} target="_blank">JOIN ARENA <ArrowRight className="ml-2 w-4 h-4" /></a>
                                  </Button>
                                ) : (
                                  <div className="text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase italic tracking-widest">Waiting for clan link deployment</p>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
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

              <TabsContent value="rules" className="mt-4 outline-none">
                <Card className="glass border-white/5 rounded-[2rem] bg-black/40 p-8 space-y-8">
                  <h3 className="font-headline text-2xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                    <ShieldAlert className="text-primary" /> ARENA ENGAGEMENT RULES
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {[
                        { title: "Clan Assignment", desc: "You must join only your assigned clan (CLASH ARENA 1 or CLASH ARENA 2) using your unique verification code. Access to the opposing clan is prohibited." },
                        { title: "Invite Verification", desc: "Copy your verification code (ARENA-XXXX) and paste it in the invite request message. Invites without valid matching codes will be rejected by administrators." },
                      ].map((item, i) => (
                        <div key={i} className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-2 hover:border-primary/20 transition-all">
                          <h4 className="font-bold text-sm text-primary uppercase">{i + 1}. {item.title}</h4>
                          <p className="text-xs font-medium text-muted-foreground leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-4">
                      {[
                        { title: "Target Rules", desc: "You are strictly required to attack only your assigned match opponent's base (as shown in the Fixtures bracket). Attacking any other base will result in instant dismissal and ban." },
                        { title: "ESPORTS MODE ACTIVATED", desc: "All battles and matchups will run strictly in eSports mode settings. Competitive rules are actively monitored." }
                      ].map((item, i) => (
                        <div key={i} className={cn("p-5 border rounded-2xl space-y-2 hover:border-primary/20 transition-all", item.title === "ESPORTS MODE ACTIVATED" ? "bg-primary/5 border-primary/20" : "bg-white/5 border-white/5")}>
                          <h4 className={cn("font-bold text-sm uppercase", item.title === "ESPORTS MODE ACTIVATED" ? "text-primary glow-primary filter drop-shadow-[0_0_6px_rgba(255,69,0,0.7)]" : "text-primary")}>
                            {i + 3}. {item.title}
                          </h4>
                          <p className="text-xs font-medium text-muted-foreground leading-relaxed">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      {/* End Tournament Confirmation */}
      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent className="glass border-primary/20 max-w-md p-6 rounded-3xl bg-black/90">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-headline text-2xl font-black italic uppercase text-center flex items-center justify-center gap-2 text-white">
              <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" /> END TOURNAMENT
            </DialogTitle>
            <DialogDescription className="text-center text-xs uppercase font-bold text-muted-foreground tracking-wider">
              Confirm Tournament Archival
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-center">
            <p className="text-sm font-medium text-white/90">
              This action will confirm the champion, distribute the rewards ledger, and lock the tournament permanently.
            </p>
          </div>
          <div className="flex gap-4 mt-4">
            <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setEndDialogOpen(false)}>
              CANCEL
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl h-12 font-black uppercase" onClick={endTournament} disabled={ending}>
              {ending ? <Loader2 className="animate-spin mr-2" /> : <Trophy className="w-4 h-4 mr-2" />} CONFIRM END
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Tournament Confirmation */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="glass border-red-500/20 max-w-md p-6 rounded-3xl bg-black/90">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-headline text-2xl font-black italic uppercase text-center flex items-center justify-center gap-2 text-red-500">
              <ShieldAlert className="w-6 h-6 animate-pulse" /> CANCEL TOURNAMENT
            </DialogTitle>
            <DialogDescription className="text-center text-xs uppercase font-bold text-muted-foreground tracking-wider">
              Confirm Decommissioning & Refunds
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs font-bold uppercase tracking-wider text-white">Reason for Cancellation</p>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Technical updates, timezone overlaps..."
              className="min-h-[80px] bg-white/5 border-white/10 rounded-xl text-xs font-medium"
            />
            <p className="text-[10px] text-muted-foreground font-semibold uppercase leading-normal">
              Warning: All registrations will be removed, and coin entry fees will be refunded instantly to players' wallets.
            </p>
          </div>
          <div className="flex gap-4 mt-4">
            <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold" onClick={() => setCancelDialogOpen(false)}>
              ABORT
            </Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-12 font-black uppercase" onClick={handleCancelTournament} disabled={!cancelReason.trim() || cancelling}>
              {cancelling ? <Loader2 className="animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />} DECOMMISSION
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

function DropdownDemo({ onSelect, current }: { onSelect: (size: number | null) => void, current: number | null }) {
  return (<div className="flex items-center gap-2 mr-4 bg-muted/20 px-4 py-1 rounded-xl border border-white/10 shrink-0"><Layout className="w-4 h-4 text-muted-foreground" /><span className="text-[10px] font-black uppercase text-muted-foreground mr-2">DEMO MODE:</span><div className="flex gap-1">{[2, 4, 8, 16, 32, 64].map(size => (<Button key={size} size="sm" variant="ghost" onClick={() => onSelect(current === size ? null : size)} className={cn("h-8 px-2 text-[10px] font-black uppercase", current === size ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5")}>{size}</Button>))}</div></div>);
}

function Layout({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}
