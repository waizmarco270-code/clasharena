'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@clerk/nextjs';
import { useFirestore, useProfile } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2, Swords, ShieldAlert, UploadCloud, CheckCircle2, AlertTriangle, ShieldCheck, Crown, Clock, Eye, Gavel, XCircle, Link as LinkIcon, MessageSquare, ArrowLeft, PlayCircle } from 'lucide-react';
import { RoundAutoWinButton } from '@/components/vs-arena/RoundAutoWinButton';
import { FinalClaimTimeoutButton } from '@/components/vs-arena/FinalClaimTimeoutButton';
import { PingOpponentButton } from '@/components/vs-arena/PingOpponentButton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import TournamentChat from '@/components/chat/TournamentChat';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import { VsRules } from '@/components/vs-arena/VsRules';
import { VsInstructions } from '@/components/vs-arena/VsInstructions';
import confetti from 'canvas-confetti';

export default function VSBattleRoom() {
  const { id } = useParams();
  const challengeId = id as string;
  const { user, isLoaded } = useUser();
  const { profile } = useProfile();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Clan Setup State
  const [clanTag, setClanTag] = useState('');
  const [clanLink, setClanLink] = useState('');
  const [isSettingUpClan, setIsSettingUpClan] = useState(false);

  // Round Submission State
  const [activeRound, setActiveRound] = useState<string>('1');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  
  const [roundStars, setRoundStars] = useState<string>('');
  const [roundPercent, setRoundPercent] = useState<string>('');
  const [roundMin, setRoundMin] = useState<string>('');
  const [roundSec, setRoundSec] = useState<string>('');
  const [isSubmittingRound, setIsSubmittingRound] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showVictory, setShowVictory] = useState(true);

  useEffect(() => {
    if (!db || !challengeId) return;
    
    const docRef = doc(db, 'vs-challenges', challengeId);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setChallenge({ id: snap.id, ...snap.data() });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Battle not found' });
        router.push('/vs-arena');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, challengeId, router, toast]);

  // Handle Confetti
  useEffect(() => {
    if (challenge?.status === 'completed' && challenge?.winnerId === user?.id) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
      }, 250);
      return () => clearInterval(interval);
    }
  }, [challenge?.status, challenge?.winnerId, user?.id]);

  const handleClaim = async (claim: 'win' | 'loss') => {
    setIsClaiming(true);
    try {
      const res = await fetch('/api/vs-arena/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, claim })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Claim Submitted!' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Claim Failed', description: err.message });
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isLoaded || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!challenge) return null;

  const isCreator = challenge.creatorId === user?.id;
  const isAcceptor = challenge.acceptorId === user?.id;
  const isAdmin = profile?.isSuperAdmin === true || profile?.isAdmin === true;

  if (!isCreator && !isAcceptor && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-4">
        <ShieldAlert className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-black uppercase">Access Denied</h1>
        <p className="text-muted-foreground">You are not a participant in this battle.</p>
        <Button onClick={() => router.push('/vs-arena')} variant="outline">Go Back</Button>
      </div>
    );
  }

  const isHistoryMode = challenge.status === 'completed' || challenge.status === 'cancelled' || challenge.status === 'pending_settlement';

  const handleClanSetup = async () => {
     if (!clanTag || !clanLink) return toast({ variant: 'destructive', title: 'Missing Info', description: 'Enter both Clan Tag and Link' });
     setIsSettingUpClan(true);
     try {
       const res = await fetch('/api/vs-arena/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ challengeId, clanTag, clanLink })
       });
       const data = await res.json();
       if (!res.ok) throw new Error(data.error);
       toast({ title: 'Clan Setup Complete!' });
     } catch(err: any) {
       toast({ variant: 'destructive', title: 'Setup Failed', description: err.message });
     } finally {
       setIsSettingUpClan(false);
     }
  };

  const handleFileSelect = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const submitRound = async (roundId: string) => {
    if (!roundStars || !roundPercent || !roundMin || !roundSec || !proofFile) {
       return toast({ variant: 'destructive', title: 'Missing Info', description: 'Fill all inputs and upload a screenshot.' });
    }
    const percentNum = Number(roundPercent);
    const minNum = Number(roundMin);
    const secNum = Number(roundSec);

    if (percentNum < 0 || percentNum > 100) return toast({ variant: 'destructive', title: 'Invalid %', description: 'Percentage must be 0-100' });
    if (minNum < 0 || secNum < 0 || secNum > 59) return toast({ variant: 'destructive', title: 'Invalid Time', description: 'Enter a valid time.' });

    const totalSeconds = (minNum * 60) + secNum;

    setIsSubmittingRound(true);
    try {
      const uploadRes = await uploadToCloudinary(proofFile, { folder: 'vs_proofs' });
      if (!uploadRes.url) throw new Error("Screenshot upload failed");

      const res = await fetch('/api/vs-arena/round/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId,
          roundId,
          stars: roundStars,
          percent: percentNum,
          timeSeconds: totalSeconds,
          proofUrl: uploadRes.url
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: 'Round Submitted!', description: 'Your stats have been recorded.' });
      
      // Reset form
      setProofFile(null);
      setProofPreview(null);
      setRoundStars('');
      setRoundPercent('');
      setRoundMin('');
      setRoundSec('');
      
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: err.message });
    } finally {
      setIsSubmittingRound(false);
    }
  };

  const handleAdminAction = async (action: string, winnerId: string | null) => {
    setAdminActionLoading(action);
    try {
      const res = await fetch('/api/admin/arenahub/action', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ challengeId, action, winnerId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Admin Action Success', description: `Challenge updated successfully.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Admin Action Failed', description: err.message });
    } finally {
      setAdminActionLoading(null);
    }
  };

  const formatTime = (seconds: number) => {
     const m = Math.floor(seconds / 60);
     const s = seconds % 60;
     return `${m}m ${s}s`;
  };

  const scores = challenge.scores || { creator: 0, acceptor: 0 };
  const rounds = challenge.rounds || {};
  const isMatchComplete = challenge.status === 'active' && (scores.creator >= 2 || scores.acceptor >= 2 || (rounds['1']?.winnerId && rounds['2']?.winnerId && rounds['3']?.winnerId));

  return (
    <PageWrapper>
      <div className="relative min-h-screen pb-20">
        <div className="absolute top-0 inset-x-0 h-[400px] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 via-background to-background z-10" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto space-y-6 px-4 pt-8">
          
          <div className="flex justify-start">
             <Button variant="ghost" onClick={() => router.push('/vs-arena')} className="text-white hover:bg-white/10 gap-2 mb-4">
                <ArrowLeft className="w-4 h-4" /> Back to Arena
             </Button>
          </div>

          {(challenge.status === 'pending_settlement' || challenge.status === 'disputed') && (
            <div className="bg-orange-500/20 border border-orange-500/30 p-4 rounded-xl text-orange-400 text-sm font-black uppercase text-center animate-pulse flex flex-col items-center gap-2">
               <ShieldAlert className="w-6 h-6" />
               MATCH IS {challenge.status === 'disputed' ? 'DISPUTED' : 'PENDING SETTLEMENT'}. WAITING FOR ADMIN DECISION.
            </div>
          )}

          {/* Header Scoreboard */}
          <div className="flex flex-col items-center text-center mb-8">
            <h1 className="text-3xl md:text-5xl font-headline font-black uppercase italic tracking-tighter text-white flex items-center gap-4">
              <span className="text-muted-foreground text-2xl">{scores.creator}</span>
              <span>VS <span className="text-red-500">BATTLE</span></span>
              <span className="text-muted-foreground text-2xl">{scores.acceptor}</span>
            </h1>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" /> Best of 3 • eSports Mode
            </p>
          </div>

          {/* Clan Setup Banner */}
          {!challenge.clanLink && isCreator && !isHistoryMode && (
             <Card className="glass border-orange-500/30 bg-orange-950/20 shadow-lg">
                <CardHeader>
                   <CardTitle className="text-lg font-black uppercase text-orange-500 flex items-center gap-2"><Swords className="w-5 h-5" /> Action Required: Setup Clan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <p className="text-sm text-white/80">Create a brand new level 1 clan named <strong>CA - 1vs1</strong> in Clash of Clans, then input the details below.</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-black text-muted-foreground">Clan Tag</Label>
                         <Input placeholder="#CG8... " value={clanTag} onChange={(e) => setClanTag(e.target.value)} className="bg-black/50 border-white/10" />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] uppercase font-black text-muted-foreground">Clan Invite Link</Label>
                         <Input placeholder="https://link.clashofclans.com/..." value={clanLink} onChange={(e) => setClanLink(e.target.value)} className="bg-black/50 border-white/10" />
                      </div>
                   </div>
                   <Button onClick={handleClanSetup} disabled={isSettingUpClan} className="w-full bg-orange-600 hover:bg-orange-700 font-black uppercase text-white">
                      {isSettingUpClan ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Setup'}
                   </Button>
                </CardContent>
             </Card>
          )}

          {!challenge.clanLink && isAcceptor && !isHistoryMode && (
             <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl flex items-center justify-center gap-2 text-orange-500 font-black uppercase text-sm animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" /> Waiting for Challenger to setup the Clan...
             </div>
          )}

          {challenge.clanLink && (
             <div className="flex flex-col items-center justify-center mb-6 space-y-4">
                {!rulesAccepted && !isHistoryMode ? (
                   <Card className="glass border-red-500/30 bg-red-950/20 max-w-2xl w-full">
                      <CardContent className="p-6 text-center space-y-4">
                         <h3 className="font-black text-red-500 uppercase text-lg flex justify-center items-center gap-2">
                           <AlertTriangle className="w-5 h-5" /> Important: TH-{challenge.reqTh} Rules Apply!
                         </h3>
                         <p className="text-sm text-white/80">You MUST read the TH-specific rules in the INSTRUCTIONS & RULES tab before playing. Breaking equipment or troop caps will result in a penalty!</p>
                         <Button onClick={() => setRulesAccepted(true)} className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.5)]">I Have Read The Rules</Button>
                      </CardContent>
                   </Card>
                ) : (
                   <a href={challenge.clanLink} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto animate-in zoom-in duration-300">
                      <Button size="lg" className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-widest text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] gap-2 h-14">
                         <LinkIcon className="w-5 h-5" /> JOIN BATTLE CLAN
                      </Button>
                   </a>
                )}
             </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Players & Tabs */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Versus Profiles & Escrow */}
              <Card className="glass border-white/10 relative overflow-hidden bg-black/60 backdrop-blur-xl">
                <CardContent className="p-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    
                    {/* Creator */}
                    <div className="flex flex-col items-center gap-3 w-full md:w-1/3">
                      <div className="relative">
                        <div className={`absolute -inset-4 rounded-full blur-lg opacity-50 ${challenge.winnerId === challenge.creatorId ? 'bg-green-500' : (isHistoryMode && challenge.winnerId ? 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.8)]' : 'bg-red-500/20')}`} />
                        <Image src={challenge.creatorAvatar || '/placeholder-avatar.png'} alt="Creator" width={80} height={80} className="rounded-full border-2 border-white/20 relative z-10" />
                        {challenge.status === 'completed' && challenge.winnerId === challenge.creatorId && (
                           <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-500 drop-shadow-lg z-20 animate-bounce" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-black text-lg uppercase text-white">{challenge.creatorName}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Creator (TH {challenge.reqTh})</p>
                        {challenge.creatorClaim && (
                           <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${challenge.creatorClaim === 'win' ? 'text-green-500' : challenge.creatorClaim === 'loss' ? 'text-red-500' : 'text-zinc-500'}`}>CLAIMED: {challenge.creatorClaim}</p>
                        )}
                        {isAcceptor && challenge.status === 'active' && (
                           <PingOpponentButton challengeId={challenge.id} targetUserId={challenge.creatorId} />
                        )}
                      </div>
                    </div>

                    {/* Escrow Pool */}
                    <div className="flex flex-col items-center justify-center w-full md:w-1/3 relative">
                      <div className="w-px h-full absolute left-1/2 -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent -z-10" />
                      <div className="bg-black border border-white/10 rounded-2xl p-4 flex flex-col items-center shadow-[0_0_30px_rgba(34,197,94,0.15)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors" />
                        <p className="text-[9px] uppercase font-black text-muted-foreground mb-1 tracking-widest">Locked Pool</p>
                        <p className="text-4xl font-headline font-black text-green-400 drop-shadow-md">
                          ⚡ {challenge.pool}
                        </p>
                        {challenge.status === 'active' && (
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-yellow-500 font-bold uppercase animate-pulse">
                            <Clock className="w-3 h-3" /> Awaiting Results
                          </div>
                        )}
                        {challenge.status === 'completed' && (
                           <div className="flex items-center gap-1.5 mt-2 text-[10px] text-green-500 font-bold uppercase">
                           <CheckCircle2 className="w-3 h-3" /> Settled
                         </div>
                        )}
                        {challenge.status === 'pending_settlement' && (
                           <div className="flex items-center gap-1.5 mt-2 text-[10px] text-orange-500 font-bold uppercase text-center leading-tight">
                           <AlertTriangle className="w-3 h-3" /> Pending Admin<br/>Settlement
                         </div>
                        )}
                      </div>
                    </div>

                    {/* Acceptor */}
                    <div className="flex flex-col items-center gap-3 w-full md:w-1/3">
                      <div className="relative">
                        <div className={`absolute -inset-4 rounded-full blur-lg opacity-50 ${challenge.winnerId === challenge.acceptorId ? 'bg-green-500' : (isHistoryMode && challenge.winnerId ? 'bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.8)]' : 'bg-blue-500/20')}`} />
                        <Image src={challenge.acceptorAvatar || '/placeholder-avatar.png'} alt="Acceptor" width={80} height={80} className="rounded-full border-2 border-white/20 relative z-10" />
                        {challenge.status === 'completed' && challenge.winnerId === challenge.acceptorId && (
                           <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-500 drop-shadow-lg z-20 animate-bounce" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="font-black text-lg uppercase text-white">{challenge.acceptorName || 'WAITING...'}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Challenger (TH {challenge.reqTh})</p>
                        {challenge.acceptorClaim && (
                           <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${challenge.acceptorClaim === 'win' ? 'text-green-500' : challenge.acceptorClaim === 'loss' ? 'text-red-500' : 'text-zinc-500'}`}>CLAIMED: {challenge.acceptorClaim}</p>
                        )}
                        {isCreator && challenge.status === 'active' && challenge.acceptorId && (
                           <PingOpponentButton challengeId={challenge.id} targetUserId={challenge.acceptorId} />
                        )}
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>

              {/* Final Match Declaration */}
              {isMatchComplete && !isAdmin && (isCreator || isAcceptor) && !(isCreator ? challenge.creatorClaim : challenge.acceptorClaim) && (
                 <Card className="glass border-green-500/50 bg-green-950/20 shadow-[0_0_20px_rgba(34,197,94,0.15)] animate-in slide-in-from-bottom-4 duration-500">
                    <CardHeader className="text-center pb-2">
                       <CardTitle className="text-xl font-black uppercase text-green-400">Match Concluded</CardTitle>
                       <CardDescription className="text-white/80">The rounds are complete. Based on the rules and results above, please declare the final outcome of the match.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-4 justify-center mt-4">
                       <Button onClick={() => handleClaim('win')} disabled={isClaiming} className="bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest w-40 h-12 shadow-lg">
                          {isClaiming ? <Loader2 className="w-5 h-5 animate-spin" /> : 'I WON'}
                       </Button>
                       <Button onClick={() => handleClaim('loss')} disabled={isClaiming} className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest w-40 h-12 shadow-lg">
                          {isClaiming ? <Loader2 className="w-5 h-5 animate-spin" /> : 'I LOST'}
                       </Button>
                    </CardContent>
                 </Card>
              )}

              {/* Final Claim Timeout */}
              {challenge.status === 'pending_settlement' && challenge.pendingSettlementSince && (isCreator || isAcceptor) && (
                 <FinalClaimTimeoutButton 
                    challengeId={challenge.id} 
                    pendingSince={challenge.pendingSettlementSince} 
                    myClaim={isCreator ? challenge.creatorClaim : challenge.acceptorClaim}
                    oppClaim={isCreator ? challenge.acceptorClaim : challenge.creatorClaim}
                 />
              )}

              {/* Main Content Tabs */}
              <Tabs defaultValue="rounds" className="w-full">
                <TabsList className="bg-black/40 border border-white/5 h-12 w-full grid grid-cols-2 rounded-xl p-1 mb-6">
                  <TabsTrigger value="rounds" className="data-[state=active]:bg-primary rounded-lg font-black uppercase text-[10px]">ROUNDS (BATTLE LOGS)</TabsTrigger>
                  <TabsTrigger value="rules" className="data-[state=active]:bg-primary rounded-lg font-black uppercase text-[10px]">INSTRUCTIONS & RULES</TabsTrigger>
                </TabsList>
                
                <TabsContent value="rounds" className="space-y-6">
                   {[1, 2, 3].map((roundNum) => {
                      const rId = roundNum.toString();
                      const roundData = rounds[rId] || {};
                      const crSub = roundData.creatorSubmission;
                      const acSub = roundData.acceptorSubmission;
                      
                      const amICreator = challenge.creatorId === user?.id;
                      const amIAcceptor = challenge.acceptorId === user?.id;
                      
                      const mySub = amICreator ? crSub : (amIAcceptor ? acSub : null);
                      const isRoundClosed = !!roundData.winnerId;
                      const isDraw = isRoundClosed && roundData.winnerId === 'draw';
                      const amIParticipant = amICreator || amIAcceptor;
                      const iWonRound = isRoundClosed && amIParticipant && ((amICreator && roundData.winnerId === challenge.creatorId) || (amIAcceptor && roundData.winnerId === challenge.acceptorId));
                      const iLostRound = isRoundClosed && amIParticipant && !isDraw && !iWonRound;

                      let cardStyle = 'border-white/5';
                      if (isRoundClosed) {
                         if (isDraw) cardStyle = 'border-zinc-500 shadow-[0_0_15px_rgba(113,113,122,0.1)] bg-zinc-900/40';
                         else if (iWonRound) cardStyle = 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.15)] bg-green-950/40';
                         else if (iLostRound) cardStyle = 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-red-950/40';
                         else cardStyle = 'border-primary/50 shadow-[0_0_15px_rgba(255,100,0,0.1)] bg-primary/5';
                      }

                      return (
                         <Card key={roundNum} className={`glass relative overflow-hidden transition-all duration-500 ${cardStyle}`}>
                            <div className={`absolute top-0 inset-x-0 h-1 ${isRoundClosed ? (isDraw ? 'bg-zinc-500' : (iWonRound ? 'bg-green-500' : (iLostRound ? 'bg-red-500' : 'bg-primary'))) : 'bg-white/10'}`} />
                            <CardHeader className="pb-4">
                               <div className="flex justify-between items-center">
                                  <CardTitle className="text-lg font-black uppercase text-white flex items-center gap-2">
                                     Round {roundNum}
                                     {isRoundClosed && (
                                        <Badge variant="outline" className={isDraw ? 'border-zinc-500 text-zinc-400' : (roundData.winnerId === challenge.creatorId ? 'border-green-500 text-green-500' : 'border-blue-500 text-blue-500')}>
                                           {isDraw ? 'DRAW' : `Winner: ${roundData.winnerId === challenge.creatorId ? challenge.creatorName : challenge.acceptorName}`}
                                        </Badge>
                                     )}
                                  </CardTitle>
                               </div>
                            </CardHeader>
                            <CardContent>
                               {/* Score Comparison Display */}
                               {(crSub || acSub) && (
                                  <div className="flex justify-between items-center bg-black/40 rounded-xl p-4 border border-white/5 mb-6">
                                     <div className="flex flex-col items-center w-[40%] gap-2">
                                        <div className="flex items-center gap-2">
                                           <Image src={challenge.creatorAvatar || '/placeholder-avatar.png'} alt="Creator" width={24} height={24} className="rounded-full" />
                                           <p className="text-[10px] font-black uppercase text-white truncate max-w-[100px]" title={challenge.creatorName}>{challenge.creatorName}</p>
                                        </div>
                                        {crSub ? (
                                           <div className={`p-3 rounded-xl border w-full text-center ${isRoundClosed ? (roundData.winnerId === challenge.creatorId ? 'bg-green-950/40 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : isDraw ? 'bg-zinc-900/40 border-zinc-500/50' : 'bg-red-950/40 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]') : 'bg-white/5 border-white/10'}`}>
                                              <p className="text-sm font-black text-white">{crSub.stars} Stars</p>
                                              <p className="text-xs text-muted-foreground mt-1">{crSub.percent}% | {formatTime(crSub.timeSeconds)}</p>
                                              <button onClick={() => setViewingProofUrl(crSub.proofUrl)} className="text-[10px] text-blue-400 font-bold uppercase hover:underline flex items-center justify-center gap-1 mx-auto mt-2"><Eye className="w-3 h-3"/> View Proof</button>
                                           </div>
                                        ) : <div className="p-3 rounded-xl border border-dashed border-white/10 w-full text-center bg-white/5 flex items-center justify-center min-h-[80px]"><p className="text-xs text-muted-foreground italic">Waiting...</p></div>}
                                     </div>
                                     <div className="text-red-500 font-black italic text-sm">VS</div>
                                     <div className="flex flex-col items-center w-[40%] gap-2">
                                        <div className="flex items-center gap-2">
                                           {challenge.acceptorId ? (
                                              <>
                                                 <Image src={challenge.acceptorAvatar || '/placeholder-avatar.png'} alt="Acceptor" width={24} height={24} className="rounded-full" />
                                                 <p className="text-[10px] font-black uppercase text-white truncate max-w-[100px]" title={challenge.acceptorName}>{challenge.acceptorName}</p>
                                              </>
                                           ) : (
                                              <p className="text-[10px] font-black uppercase text-muted-foreground">Waiting...</p>
                                           )}
                                        </div>
                                        {acSub ? (
                                           <div className={`p-3 rounded-xl border w-full text-center ${isRoundClosed ? (roundData.winnerId === challenge.acceptorId ? 'bg-green-950/40 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : isDraw ? 'bg-zinc-900/40 border-zinc-500/50' : 'bg-red-950/40 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]') : 'bg-white/5 border-white/10'}`}>
                                              <p className="text-sm font-black text-white">{acSub.stars} Stars</p>
                                              <p className="text-xs text-muted-foreground mt-1">{acSub.percent}% | {formatTime(acSub.timeSeconds)}</p>
                                              <button onClick={() => setViewingProofUrl(acSub.proofUrl)} className="text-[10px] text-blue-400 font-bold uppercase hover:underline flex items-center justify-center gap-1 mx-auto mt-2"><Eye className="w-3 h-3"/> View Proof</button>
                                           </div>
                                        ) : (
                                            <div className="p-3 rounded-xl border border-dashed border-white/10 w-full text-center bg-white/5 flex flex-col items-center justify-center min-h-[80px]">
                                              <p className="text-xs text-muted-foreground italic">Waiting...</p>
                                              {!isRoundClosed && challenge.status === 'active' && amICreator && crSub && <RoundAutoWinButton challengeId={challenge.id} roundId={rId} mySubmittedAt={crSub.submittedAt} />}
                                            </div>
                                         )}
                                     </div>
                                  </div>
                               )}

                               {/* Edit Form (Only visible if participant, challenge active, and hasn't submitted this round) */}
                               {!isHistoryMode && challenge.status === 'active' && (amICreator || amIAcceptor) && !mySub && challenge.clanLink && (
                                  <div className="space-y-4 pt-4 border-t border-white/5">
                                     <h4 className="font-black uppercase text-sm text-white">Submit Round {roundNum} Stats</h4>
                                     
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                           <Label className="text-[10px] uppercase font-black text-muted-foreground">Stars</Label>
                                           <Select value={roundStars} onValueChange={setRoundStars}>
                                             <SelectTrigger className="bg-black/50 border-white/10"><SelectValue placeholder="Stars" /></SelectTrigger>
                                             <SelectContent>
                                                <SelectItem value="0">0 Stars</SelectItem>
                                                <SelectItem value="1">1 Star</SelectItem>
                                                <SelectItem value="2">2 Stars</SelectItem>
                                                <SelectItem value="3">3 Stars</SelectItem>
                                             </SelectContent>
                                           </Select>
                                        </div>
                                        <div className="space-y-2">
                                           <Label className="text-[10px] uppercase font-black text-muted-foreground">Destruction %</Label>
                                           <Input type="number" min={0} max={100} placeholder="e.g. 100" value={roundPercent} onChange={e => setRoundPercent(e.target.value)} className="bg-black/50 border-white/10" />
                                        </div>
                                        <div className="space-y-2">
                                           <Label className="text-[10px] uppercase font-black text-muted-foreground">Minutes</Label>
                                           <Input type="number" min={0} placeholder="Min" value={roundMin} onChange={e => setRoundMin(e.target.value)} className="bg-black/50 border-white/10" />
                                        </div>
                                        <div className="space-y-2">
                                           <Label className="text-[10px] uppercase font-black text-muted-foreground">Seconds</Label>
                                           <Input type="number" min={0} max={59} placeholder="Sec" value={roundSec} onChange={e => setRoundSec(e.target.value)} className="bg-black/50 border-white/10" />
                                        </div>
                                     </div>

                                     {!proofPreview ? (
                                        <div className="border-2 border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => document.getElementById(`proof-upload-${rId}`)?.click()}>
                                           <UploadCloud className="w-6 h-6 text-white/50 mb-2" />
                                           <p className="font-black uppercase text-xs text-white">Upload Screenshot</p>
                                           <input id={`proof-upload-${rId}`} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                        </div>
                                     ) : (
                                        <div className="relative rounded-xl overflow-hidden border border-white/20 group h-32">
                                           <img src={proofPreview} alt="Proof" className="w-full h-full object-cover opacity-80" />
                                           <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                              <Button variant="outline" size="sm" onClick={() => document.getElementById(`proof-upload-${rId}`)?.click()}>Change</Button>
                                           </div>
                                           <input id={`proof-upload-${rId}`} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                                        </div>
                                     )}

                                     <Button 
                                       onClick={() => submitRound(rId)} 
                                       disabled={isSubmittingRound}
                                       className="w-full bg-primary hover:bg-primary/80 font-black uppercase tracking-widest text-white"
                                     >
                                        {isSubmittingRound ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Round Result'}
                                     </Button>
                                  </div>
                               )}

                            </CardContent>
                         </Card>
                      );
                   })}
                </TabsContent>

                <TabsContent value="rules">
                   <VsInstructions reqTh={challenge.reqTh} />
                </TabsContent>
              </Tabs>

              {/* Admin Panel */}
              {isAdmin && (challenge.status === 'active' || challenge.status === 'disputed' || challenge.status === 'pending_settlement') && (
                <Card className="glass border-blue-500/30 bg-blue-950/20 mt-6">
                   <CardHeader>
                     <CardTitle className="text-lg font-black uppercase text-blue-500 flex items-center gap-2"><Gavel className="w-5 h-5" /> Admin Settlement</CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     {challenge.status === 'pending_settlement' && (
                        <div className="bg-orange-500/20 border border-orange-500/30 p-4 rounded-xl text-orange-400 text-sm font-bold uppercase text-center animate-pulse">
                           Manual Settlement Mode is ON. Please review rounds and force win the correct player.
                        </div>
                     )}
                     <div className="grid grid-cols-2 gap-4">
                       <Button 
                         variant="outline" 
                         className="border-green-500/50 text-green-500 hover:bg-green-500/10 font-black uppercase"
                         disabled={!!adminActionLoading}
                         onClick={() => handleAdminAction('force_win', challenge.creatorId)}
                       >
                         {adminActionLoading === 'force_win' ? <Loader2 className="w-4 h-4 animate-spin" /> : `Force Win: ${challenge.creatorName}`}
                       </Button>
                       <Button 
                         variant="outline" 
                         className="border-green-500/50 text-green-500 hover:bg-green-500/10 font-black uppercase"
                         disabled={!!adminActionLoading}
                         onClick={() => handleAdminAction('force_win', challenge.acceptorId)}
                       >
                         {adminActionLoading === 'force_win' ? <Loader2 className="w-4 h-4 animate-spin" /> : `Force Win: ${challenge.acceptorName}`}
                       </Button>
                     </div>
                     <Button 
                       variant="outline" 
                       className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 font-black uppercase"
                       disabled={!!adminActionLoading}
                       onClick={() => handleAdminAction('cancel', null)}
                     >
                       {adminActionLoading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-2" /> Cancel & Refund Pool</>}
                     </Button>
                   </CardContent>
                </Card>
              )}

            </div>

            {/* Right Column: Chat */}
            <div className={`fixed inset-0 z-[100] bg-black lg:relative lg:z-auto lg:bg-transparent lg:block lg:col-span-1 h-[100dvh] lg:h-[600px] rounded-2xl overflow-hidden lg:border lg:border-white/10 lg:sticky lg:top-24 transition-transform duration-300 ${isChatOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
              <div className="h-full pt-12 lg:pt-0 pb-safe">
                 {isHistoryMode ? (
                    <div className="w-full h-full bg-black/60 flex flex-col items-center justify-center p-6 text-center border border-white/5">
                       <ShieldCheck className="w-16 h-16 text-muted-foreground/50 mb-4" />
                       <h3 className="text-xl font-black uppercase text-muted-foreground">Match Concluded</h3>
                       <p className="text-sm text-muted-foreground/70 mt-2">Chat is locked in History mode to preserve records.</p>
                    </div>
                 ) : (
                    <TournamentChat tournamentId={`vs_${challengeId}`} isActive={true} onUnreadCountChange={() => {}} />
                 )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Chat Sidebar Handle */}
      <button onClick={() => setIsChatOpen(!isChatOpen)} className={`lg:hidden fixed top-1/2 -translate-y-1/2 right-0 z-[9999] text-white py-4 px-2 rounded-l-2xl shadow-[-5px_0_20px_rgba(255,100,0,0.4)] transition-all flex flex-col items-center justify-center gap-2 border border-r-0 border-white/20 ${isChatOpen ? 'bg-red-600 hover:bg-red-500 shadow-[-5px_0_20px_rgba(220,38,38,0.4)]' : 'bg-primary hover:bg-primary/90'}`}>
         {isChatOpen ? <XCircle className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
         <span className="text-[10px] font-black uppercase tracking-widest" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{isChatOpen ? 'CLOSE' : 'CHAT'}</span>
      </button>

      {/* Proof Viewer Dialog */}
      <Dialog open={!!viewingProofUrl} onOpenChange={(open) => !open && setViewingProofUrl(null)}>
        <DialogContent className="max-w-4xl bg-black border-white/10 p-2 rounded-xl overflow-hidden flex items-center justify-center">
           {viewingProofUrl && <img src={viewingProofUrl} alt="Round Proof" className="w-full h-auto object-contain max-h-[85vh] rounded-lg" />}
        </DialogContent>
      </Dialog>
      {/* Winner Congratulations Dialog */}
      <Dialog open={showVictory && challenge.status === 'completed' && challenge.winnerId === user?.id} onOpenChange={(open) => setShowVictory(open)}>
        <DialogContent className="max-w-md bg-black border border-green-500/50 p-6 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center shadow-[0_0_50px_rgba(34,197,94,0.3)]">
           <Crown className="w-20 h-20 text-yellow-500 mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
           <DialogTitle className="text-3xl font-headline font-black italic uppercase text-white mb-2">VICTORY!</DialogTitle>
           <DialogDescription className="text-lg text-white/80 font-bold mb-6">
              You won the match! <br/>
              <span className="text-green-400 text-2xl font-black mt-2 block">+ ⚡ {challenge.pool}</span>
              <span className="text-xs text-muted-foreground font-normal">added to your wallet</span>
           </DialogDescription>
           <Button onClick={() => router.push('/vs-arena')} className="w-full bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest h-14 shadow-[0_0_20px_rgba(34,197,94,0.4)]">Return to Arena</Button>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
