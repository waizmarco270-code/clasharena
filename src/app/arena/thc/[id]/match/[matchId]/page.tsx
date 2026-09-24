'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Loader2, CheckCircle2, AlertTriangle, ImagePlus, ShieldAlert, Swords } from 'lucide-react';
import { useDoc, useFirestore, useCollection, useAdminStatus } from '@/firebase';
import { doc, collection, query, where, updateDoc, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ThcBattleLobbyPage({ params }: { params: { id: string, matchId: string } }) {
  const { id, matchId } = params;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { isAdmin } = useAdminStatus();

  const { data: t, loading: tLoading } = useDoc(doc(db, 'thc_tournaments', id));
  const { data: match, loading: mLoading } = useDoc(doc(db, 'thc_matches', matchId));
  
  const teamsQuery = useMemo(() => query(collection(db, 'thc_teams'), where('tournamentId', '==', id)), [db, id]);
  const { data: teams, loading: teamsLoading } = useCollection(teamsQuery);

  const [myTeam, setMyTeam] = useState<any>(null);
  const [oppTeam, setOppTeam] = useState<any>(null);
  const [adminImpersonate, setAdminImpersonate] = useState<'team1' | 'team2' | null>(null);
  
  // Timer logic
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
     const interval = setInterval(() => setNow(Date.now()), 1000);
     return () => clearInterval(interval);
  }, []);

  const scheduledTimeString = t?.roundSchedules?.[match?.roundLabel];
  const scheduledTime = scheduledTimeString ? new Date(scheduledTimeString).getTime() : 0;
  
  const isMatchStarted = scheduledTime === 0 || now >= scheduledTime;
  const matchStartTimeDiff = scheduledTime - now;

  // States
  const [checkingIn, setCheckingIn] = useState(false);
  const [fcConfirmOpen, setFcConfirmOpen] = useState(false);
  const [fcInputTag, setFcInputTag] = useState('');
  const [verifyingFc, setVerifyingFc] = useState(false);

  // Result submission
  const [submittingResult, setSubmittingResult] = useState(false);
  const [stars, setStars] = useState<number | ''>('');
  const [avgTime, setAvgTime] = useState('');
  const [screenshot, setScreenshot] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Admin resolution
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!user || !teams || !match) return;
    const team1 = teams.find(t => t.id === match.team1Id);
    const team2 = teams.find(t => t.id === match.team2Id);
    
    if (isAdmin && adminImpersonate === 'team1') {
       setMyTeam(team1 || { name: 'TBD' });
       setOppTeam(team2 || { name: 'TBD' });
       return;
    }
    if (isAdmin && adminImpersonate === 'team2') {
       setMyTeam(team2 || { name: 'TBD' });
       setOppTeam(team1 || { name: 'TBD' });
       return;
    }

    if (team1?.players.includes(user.id)) {
       setMyTeam(team1);
       setOppTeam(team2 || { name: 'TBD' });
    } else if (team2?.players.includes(user.id)) {
       setMyTeam(team2);
       setOppTeam(team1 || { name: 'TBD' });
    } else {
       // user is admin or spectator
       setMyTeam(null);
       setOppTeam(null);
    }
  }, [user, teams, match, isAdmin, adminImpersonate]);

  if (tLoading || mLoading || teamsLoading) return <PageWrapper><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></PageWrapper>;
  if (!match) return <PageWrapper><div className="text-center py-20 text-white font-black uppercase">Match not found.</div></PageWrapper>;

  const isTeam1 = myTeam?.id === match.team1Id;
  const myCheckIn = isTeam1 ? match.team1CheckIn : match.team2CheckIn;
  const oppCheckIn = isTeam1 ? match.team2CheckIn : match.team1CheckIn;
  
  const myFcSent = isTeam1 ? match.team1FcSent : match.team2FcSent;
  const oppFcSent = isTeam1 ? match.team2FcSent : match.team1FcSent;

  const myStars = isTeam1 ? match.team1Stars : match.team2Stars;
  
  const hasSubmitted = myStars > 0 || (isTeam1 ? match.team1Screenshot !== '' : match.team2Screenshot !== '');

  const handleCheckIn = async () => {
    if (!myTeam) return;
    setCheckingIn(true);
    try {
       await updateDoc(doc(db, 'thc_matches', match.id), {
          [isTeam1 ? 'team1CheckIn' : 'team2CheckIn']: true
       });
       toast({ title: 'Checked In Successfully' });
    } catch (e) {
       toast({ variant: 'destructive', title: 'Check in failed' });
    } finally {
       setCheckingIn(false);
    }
  };

  const handleFcConfirm = async () => {
    if (fcInputTag !== oppTeam.clanTag) {
       toast({ variant: 'destructive', title: 'Clan Tag Mismatch', description: 'Please enter the exact opponent clan tag to verify you sent it to the right clan.' });
       return;
    }
    setVerifyingFc(true);
    try {
       const updateData: any = {
          [isTeam1 ? 'team1FcSent' : 'team2FcSent']: true
       };
       // If opponent already sent FC, match is live
       if (oppFcSent) {
          updateData.status = 'live';
       }
       await updateDoc(doc(db, 'thc_matches', match.id), updateData);
       toast({ title: 'FC Verified' });
       setFcConfirmOpen(false);
    } catch (e) {
       toast({ variant: 'destructive', title: 'Verification failed' });
    } finally {
       setVerifyingFc(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadToCloudinary(file, { folder: 'bracket_bgs' });
      setScreenshot(res.url);
      toast({ title: 'Screenshot Uploaded' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitResult = async () => {
    if (stars === '' || !avgTime || !screenshot) {
       toast({ variant: 'destructive', title: 'Fill all fields and upload screenshot' });
       return;
    }
    setSubmittingResult(true);
    try {
       const updateData: any = {
          [isTeam1 ? 'team1Stars' : 'team2Stars']: Number(stars),
          [isTeam1 ? 'team1AvgTime' : 'team2AvgTime']: Number(avgTime),
          [isTeam1 ? 'team1Screenshot' : 'team2Screenshot']: screenshot,
       };
       
       // If both have submitted, move to disputed for admin review
       const oppStars = isTeam1 ? match.team2Stars : match.team1Stars;
       if (oppStars > 0 || (isTeam1 ? match.team2Screenshot !== '' : match.team1Screenshot !== '')) {
          updateData.status = 'disputed';
       }

       await updateDoc(doc(db, 'thc_matches', match.id), updateData);
       toast({ title: 'Result Submitted', description: 'Awaiting Admin Verification' });
    } catch (e) {
       toast({ variant: 'destructive', title: 'Submission failed' });
    } finally {
       setSubmittingResult(false);
    }
  };

  const adminDeclareWinner = async (winnerId: string) => {
     setResolving(true);
     try {
        await updateDoc(doc(db, 'thc_matches', match.id), {
           status: 'completed',
           winnerId
        });
        
        // Auto-advance logic for Upper Bracket
        if (match.bracket === 'upper' && match.round) {
           const q = query(collection(db, 'thc_matches'), where('tournamentId', '==', id), where('bracket', '==', 'upper'));
           const snap = await getDocs(q);
           const upperMatches = snap.docs.map(d => ({ id: d.id, ...d.data() as any })).sort((a: any, b: any) => a.matchNumber - b.matchNumber);
           
           const qFinal = query(collection(db, 'thc_matches'), where('tournamentId', '==', id), where('bracket', '==', 'final'));
           const snapFinal = await getDocs(qFinal);
           const finalMatches = snapFinal.docs.map(d => ({ id: d.id, ...d.data() as any })).sort((a: any, b: any) => a.matchNumber - b.matchNumber);
           
           const currentRoundMatches = upperMatches.filter((m: any) => m.round === match.round);
           const currentMatchIndex = currentRoundMatches.findIndex((m: any) => m.id === match.id);
           
           if (currentMatchIndex !== -1) {
              const nextRound = match.round + 1;
              const nextRoundMatches = upperMatches.filter((m: any) => m.round === nextRound);
              
              let nextMatchTarget = null;
              
              if (nextRoundMatches.length > 0) {
                 const nextMatchIndex = Math.floor(currentMatchIndex / 2);
                 nextMatchTarget = nextRoundMatches[nextMatchIndex];
              } else if (finalMatches.length > 0) {
                 // Next is Grand Final
                 nextMatchTarget = finalMatches.find((m: any) => m.round === 1);
              }
              
              if (nextMatchTarget) {
                 const isTeam1 = currentMatchIndex % 2 === 0;
                 await updateDoc(doc(db, 'thc_matches', nextMatchTarget.id), {
                    [isTeam1 ? 'team1Id' : 'team2Id']: winnerId
                 });
              }
           }
        }
        
        // Handle auto-advancing in Lower Bracket
        if (match.bracket === 'lower' && match.round) {
           const qLb = query(collection(db, 'thc_matches'), where('tournamentId', '==', id), where('bracket', '==', 'lower'));
           const snapLb = await getDocs(qLb);
           const lbMatches = snapLb.docs.map(d => ({ id: d.id, ...d.data() as any })).sort((a: any, b: any) => a.matchNumber - b.matchNumber);
           
           const currentRoundMatches = lbMatches.filter((m: any) => m.round === match.round);
           const currentMatchIndex = currentRoundMatches.findIndex((m: any) => m.id === match.id);
           
           if (currentMatchIndex !== -1) {
              const nextRound = match.round + 1;
              const nextRoundMatches = lbMatches.filter((m: any) => m.round === nextRound);
              let nextMatchTarget = null;
              
              if (nextRoundMatches.length > 0) {
                 // Lower bracket topologies vary, but generally 2 winners go to 1 match in the next round, OR they face upper bracket droppers.
                 // For simplicity, we just find the first available slot in the next LB round.
                 nextMatchTarget = nextRoundMatches.find((m: any) => !m.team1Id || !m.team2Id);
              } else {
                 // Push to Grand Final if no more LB rounds
                 const qFinal = query(collection(db, 'thc_matches'), where('tournamentId', '==', id), where('bracket', '==', 'final'));
                 const snapFinal = await getDocs(qFinal);
                 const finalMatches = snapFinal.docs.map(d => ({ id: d.id, ...d.data() as any })).sort((a: any, b: any) => a.matchNumber - b.matchNumber);
                 nextMatchTarget = finalMatches.find((m: any) => m.round === 1);
              }
              
              if (nextMatchTarget) {
                 const isLbTeam1 = !nextMatchTarget.team1Id;
                 await updateDoc(doc(db, 'thc_matches', nextMatchTarget.id), {
                    [isLbTeam1 ? 'team1Id' : 'team2Id']: winnerId
                 });
              }
           }
        }
        
        // Handle Loser
        const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id;

        // Grand Final Logic
        if (match.roundLabel === 'Grand Final') {
           if (t.format === 'single_elimination' || winnerId === match.team1Id) {
              // Tournament Over
              const qLbFinal = query(collection(db, 'thc_matches'), where('tournamentId', '==', id), where('roundLabel', '==', 'LB Final'));
              const snapLbFinal = await getDocs(qLbFinal);
              let thirdPlaceId = null;
              if (!snapLbFinal.empty) {
                 const lbFinal = snapLbFinal.docs[0].data();
                 thirdPlaceId = lbFinal.winnerId === lbFinal.team1Id ? lbFinal.team2Id : lbFinal.team1Id;
              }
              await updateDoc(doc(db, 'thc_tournaments', id), {
                 status: 'completed',
                 results: {
                    firstPlace: winnerId,
                    secondPlace: loserId,
                    thirdPlace: thirdPlaceId,
                    claimed: { first: false, second: false, third: false }
                 }
              });
           } else if (t.format === 'double_elimination' && winnerId === match.team2Id) {
              // Trigger Grand Final Reset
              const qReset = query(collection(db, 'thc_matches'), where('tournamentId', '==', id), where('roundLabel', '==', 'Grand Final Reset'));
              const snapReset = await getDocs(qReset);
              if (!snapReset.empty) {
                 await updateDoc(doc(db, 'thc_matches', snapReset.docs[0].id), {
                    team1Id: match.team1Id,
                    team2Id: match.team2Id
                 });
                 toast({ title: 'Grand Final Reset Triggered!' });
              }
           }
        }
        
        if (match.roundLabel === 'Grand Final Reset') {
           // Tournament Over
           const qLbFinal = query(collection(db, 'thc_matches'), where('tournamentId', '==', id), where('roundLabel', '==', 'LB Final'));
           const snapLbFinal = await getDocs(qLbFinal);
           let thirdPlaceId = null;
           if (!snapLbFinal.empty) {
              const lbFinal = snapLbFinal.docs[0].data();
              thirdPlaceId = lbFinal.winnerId === lbFinal.team1Id ? lbFinal.team2Id : lbFinal.team1Id;
           }
           await updateDoc(doc(db, 'thc_tournaments', id), {
              status: 'completed',
              results: {
                 firstPlace: winnerId,
                 secondPlace: loserId,
                 thirdPlace: thirdPlaceId,
                 claimed: { first: false, second: false, third: false }
              }
           });
        }

        if (loserId && loserId !== 'BYE') {
           if (t.format === 'double_elimination' && match.bracket === 'upper') {
              // Drop to LB
              const qLb = query(collection(db, 'thc_matches'), where('tournamentId', '==', id), where('bracket', '==', 'lower'));
              const snapLb = await getDocs(qLb);
              const lbMatches = snapLb.docs.map(d => ({ id: d.id, ...d.data() as any })).sort((a: any, b: any) => a.matchNumber - b.matchNumber);
              
              // Find first empty slot in LB for their drop round (or any empty slot)
              // UB R1 -> LB R1, UB R2 -> LB R2...
              let lbTargetMatch = lbMatches.find((m: any) => m.round === match.round && (!m.team1Id || !m.team2Id));
              if (!lbTargetMatch) {
                 lbTargetMatch = lbMatches.find((m: any) => !m.team1Id || !m.team2Id);
              }
              
              if (lbTargetMatch) {
                 const isLbTeam1 = !lbTargetMatch.team1Id;
                 await updateDoc(doc(db, 'thc_matches', lbTargetMatch.id), {
                    [isLbTeam1 ? 'team1Id' : 'team2Id']: loserId
                 });
              }
           } else {
              // Eliminate Team
              await updateDoc(doc(db, 'thc_teams', loserId), {
                 status: 'eliminated'
              });
           }
        }
        
        toast({ title: 'Match Resolved!', description: 'Bracket auto-advanced successfully.' });
     } catch (e) {
        toast({ variant: 'destructive', title: 'Resolution failed' });
     } finally {
        setResolving(false);
     }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href={`/arena/thc/${id}/match/schedule`} className="inline-flex items-center text-[10px] font-black uppercase text-muted-foreground hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> BACK TO SCHEDULE
        </Link>

        {/* Match Header */}
        <div className="text-center py-8">
           <Badge className="bg-primary text-black font-black uppercase tracking-widest text-[9px] mb-4">{match.roundLabel}</Badge>
           <div className="flex items-center justify-center gap-8 md:gap-16">
              <div className="text-center">
                 <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-2xl bg-zinc-900 border-2 border-white/10 overflow-hidden mb-3">
                    {match.team1Id !== 'BYE' && teams?.find(t => t.id === match.team1Id)?.logoUrl && (
                       <img src={typeof teams.find(t => t.id === match.team1Id)?.logoUrl === 'string' ? teams.find(t => t.id === match.team1Id)?.logoUrl : (teams.find(t => t.id === match.team1Id)?.logoUrl as any)?.url} className="w-full h-full object-cover" />
                    )}
                 </div>
                 <h2 className="text-lg md:text-2xl font-black uppercase text-white truncate max-w-[150px]">{teams?.find(t => t.id === match.team1Id)?.name || 'TBD'}</h2>
              </div>
              
              <div className="text-4xl font-black italic text-red-500 font-headline drop-shadow-2xl">VS</div>
              
              <div className="text-center">
                 <div className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-2xl bg-zinc-900 border-2 border-white/10 overflow-hidden mb-3">
                    {match.team2Id !== 'BYE' && teams?.find(t => t.id === match.team2Id)?.logoUrl && (
                       <img src={typeof teams.find(t => t.id === match.team2Id)?.logoUrl === 'string' ? teams.find(t => t.id === match.team2Id)?.logoUrl : (teams.find(t => t.id === match.team2Id)?.logoUrl as any)?.url} className="w-full h-full object-cover" />
                    )}
                 </div>
                 <h2 className="text-lg md:text-2xl font-black uppercase text-white truncate max-w-[150px]">{teams?.find(t => t.id === match.team2Id)?.name || 'TBD'}</h2>
              </div>
           </div>
           
           <div className="mt-8">
              <Badge variant="outline" className={`font-black uppercase tracking-widest px-4 py-1.5 text-xs ${
                 match.status === 'live' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 
                 match.status === 'completed' ? 'border-green-500 text-green-500 bg-green-500/10' : 
                 match.status === 'disputed' ? 'border-red-500 text-red-500 bg-red-500/10' :
                 'border-white/20 text-muted-foreground bg-white/5'
              }`}>
                 {match.status === 'live' ? 'MATCH IS LIVE' : match.status === 'completed' ? 'MATCH COMPLETED' : match.status === 'disputed' ? 'AWAITING ADMIN VERIFICATION' : 'WAITING FOR TEAMS'}
              </Badge>
           </div>
           
           {match.status === 'completed' && match.winnerId && (
              <div className={`mt-8 max-w-xl mx-auto p-6 rounded-2xl border-2 ${myTeam?.id === match.winnerId ? 'bg-green-500/10 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)]' : myTeam && myTeam.id !== match.winnerId ? 'bg-red-500/10 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'bg-blue-500/10 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]'}`}>
                 <h2 className={`text-4xl font-headline font-black italic uppercase drop-shadow-xl ${myTeam?.id === match.winnerId ? 'text-green-500' : myTeam && myTeam.id !== match.winnerId ? 'text-red-500' : 'text-blue-500'}`}>
                    {myTeam?.id === match.winnerId ? 'VICTORY!' : myTeam && myTeam.id !== match.winnerId ? 'DEFEAT' : 'MATCH CONCLUDED'}
                 </h2>
                 <p className="text-sm font-bold uppercase mt-2 text-white">
                    {myTeam?.id === match.winnerId ? 'Congratulations, you advance to the next round!' : myTeam && myTeam.id !== match.winnerId ? `${teams?.find((t: any) => t.id === match.winnerId)?.name} won the match.` : `Winner: ${teams?.find((t: any) => t.id === match.winnerId)?.name}`}
                 </p>
              </div>
           )}
           
           {isAdmin && match.status !== 'completed' && (
              <div className="mt-8 flex justify-center gap-4 bg-primary/10 p-4 rounded-xl border border-primary/20 max-w-xl mx-auto">
                 <div className="w-full text-center space-y-2">
                    <p className="text-[10px] text-primary font-black uppercase">Admin Test Controls</p>
                    <div className="flex gap-2 justify-center">
                       <Button onClick={() => setAdminImpersonate('team1')} variant={adminImpersonate === 'team1' ? 'default' : 'outline'} size="sm" className="font-black uppercase text-[10px]">Play as Team 1</Button>
                       <Button onClick={() => setAdminImpersonate('team2')} variant={adminImpersonate === 'team2' ? 'default' : 'outline'} size="sm" className="font-black uppercase text-[10px]">Play as Team 2</Button>
                       {adminImpersonate && <Button onClick={() => setAdminImpersonate(null)} variant="destructive" size="sm" className="font-black uppercase text-[10px]">Reset</Button>}
                    </div>
                 </div>
              </div>
           )}
        </div>

        {/* Player Actions */}
        {myTeam && match.status !== 'completed' && match.status !== 'disputed' && (
           <Card className="glass border-primary/20 bg-black/60 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />
              <CardContent className="p-6 md:p-8 space-y-8">
                 {/* Step 1: Check in */}
                 <div className={`space-y-4 ${myCheckIn || !isMatchStarted ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${myCheckIn ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-white'}`}>
                          {myCheckIn ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                       </div>
                       <h3 className="text-xl font-black uppercase text-white">Check In</h3>
                    </div>
                    
                    {!isMatchStarted ? (
                       <div className="ml-11 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl">
                          <p className="text-xs text-yellow-500 font-bold uppercase mb-2">Round starts in:</p>
                          <p className="text-2xl font-black text-white">
                             {Math.floor(matchStartTimeDiff / (1000 * 60 * 60 * 24))}d {Math.floor((matchStartTimeDiff / (1000 * 60 * 60)) % 24)}h {Math.floor((matchStartTimeDiff / 1000 / 60) % 60)}m {Math.floor((matchStartTimeDiff / 1000) % 60)}s
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-2 uppercase">Scheduled Time: {new Date(scheduledTime).toLocaleString()}</p>
                       </div>
                    ) : (
                       <>
                          <p className="text-xs text-muted-foreground ml-11">You have 10 minutes to check in. Failure to do so will result in an automatic disqualification.</p>
                          <div className="ml-11">
                             <Button onClick={handleCheckIn} disabled={checkingIn || myCheckIn} className="w-full md:w-auto h-12 px-8 bg-primary text-black font-black uppercase glow-primary">
                                {checkingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : myCheckIn ? 'Checked In' : 'Check In Now'}
                             </Button>
                          </div>
                       </>
                    )}
                 </div>

                 {/* Step 2: Send FC */}
                 <div className={`space-y-4 ${(!myCheckIn || !oppCheckIn || myFcSent) ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${myFcSent ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-white'}`}>
                          {myFcSent ? <CheckCircle2 className="w-5 h-5" /> : '2'}
                       </div>
                       <h3 className="text-xl font-black uppercase text-white">Friendly Challenge (FC)</h3>
                    </div>
                    
                    {myCheckIn && oppCheckIn && !myFcSent && (
                       <div className="ml-11 bg-red-500/10 border border-red-500/30 p-4 rounded-xl space-y-3">
                          <p className="text-xs text-red-200 font-bold uppercase"><AlertTriangle className="w-4 h-4 inline mr-1" /> Opponent is ready!</p>
                          <p className="text-sm text-white">Go to Clash of Clans and send a Friendly Challenge to:</p>
                          <div className="bg-black/50 p-3 rounded-lg flex justify-between items-center border border-white/10">
                             <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground">Opponent Clan Tag</p>
                                <p className="text-lg font-black text-white">{oppTeam.clanTag}</p>
                             </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Important: Select 'Esports Modifier' when sending the challenge.</p>
                          <Button onClick={() => setFcConfirmOpen(true)} className="w-full bg-red-600 text-white font-black uppercase mt-2 h-12">
                             I have sent/accepted the FC
                          </Button>
                       </div>
                    )}
                    {(!myCheckIn || !oppCheckIn) && (
                       <p className="text-xs text-muted-foreground ml-11">Waiting for both teams to check in...</p>
                    )}
                 </div>

                 {/* Step 3: Submit Results */}
                 <div className={`space-y-4 ${match.status !== 'live' || hasSubmitted ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${hasSubmitted ? 'bg-green-500/20 text-green-500' : 'bg-white/10 text-white'}`}>
                          {hasSubmitted ? <CheckCircle2 className="w-5 h-5" /> : '3'}
                       </div>
                       <h3 className="text-xl font-black uppercase text-white">Submit Results</h3>
                    </div>
                    
                    {match.status === 'live' && !hasSubmitted && (
                       <div className="ml-11 space-y-4 bg-black/40 p-5 rounded-xl border border-white/5">
                          <p className="text-xs text-muted-foreground mb-4">When the war is over, submit your team's total stars, average time, and a screenshot of the final result screen.</p>
                          
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-white uppercase tracking-widest">Total Stars Gained</Label>
                                <Input type="number" value={stars} onChange={e => setStars(Number(e.target.value))} className="bg-black/50 border-white/10" />
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-white uppercase tracking-widest">Avg Time (e.g. 1m 30s = 90)</Label>
                                <Input type="number" placeholder="Seconds" value={avgTime} onChange={e => setAvgTime(e.target.value)} className="bg-black/50 border-white/10" />
                             </div>
                          </div>
                          
                          <div className="space-y-2">
                             <Label className="text-[10px] font-bold text-white uppercase tracking-widest">Result Screenshot</Label>
                             <div className="flex gap-2 items-center">
                                <Input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />
                                <Button onClick={() => imageInputRef.current?.click()} disabled={uploadingImage} variant="outline" className="bg-black/50 border-white/10 font-bold text-xs uppercase flex-1 h-12">
                                   {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImagePlus className="w-4 h-4 mr-2" />}
                                   Upload Image
                                </Button>
                             </div>
                             {screenshot && (
                                <div className="mt-2 h-24 w-full relative rounded-xl overflow-hidden border border-white/20">
                                   <img src={screenshot} alt="Result" className="w-full h-full object-cover" />
                                </div>
                             )}
                          </div>

                          <Button onClick={handleSubmitResult} disabled={submittingResult} className="w-full bg-primary text-black font-black uppercase h-12 mt-2 glow-primary">
                             {submittingResult ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Results'}
                          </Button>
                       </div>
                    )}
                 </div>
              </CardContent>
           </Card>
        )}

        {/* Admin Resolution Panel */}
        {isAdmin && (match.status === 'disputed' || match.status === 'completed' || match.status === 'live') && (
           <Card className="glass border-red-500/30 bg-black">
              <CardHeader className="bg-red-500/10 border-b border-red-500/20">
                 <CardTitle className="text-lg font-black uppercase text-red-500 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" /> Admin Resolution Panel
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                 <div className="grid md:grid-cols-2 gap-8">
                    {/* Team 1 Data */}
                    <div className="space-y-3">
                       <h4 className="font-black text-white uppercase">{teams?.find(t => t.id === match.team1Id)?.name || 'Team 1'}</h4>
                       <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex justify-between">
                          <span className="text-xs text-muted-foreground uppercase font-bold">Stars Claimed</span>
                          <span className="text-sm font-black text-white">{match.team1Stars}</span>
                       </div>
                       <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex justify-between">
                          <span className="text-xs text-muted-foreground uppercase font-bold">Avg Time</span>
                          <span className="text-sm font-black text-white">{match.team1AvgTime}s</span>
                       </div>
                       <div className="mt-2 h-32 bg-zinc-900 rounded-lg border border-white/10 overflow-hidden relative group">
                          {match.team1Screenshot ? (
                             <img src={match.team1Screenshot} className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(match.team1Screenshot, '_blank')} />
                          ) : (
                             <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground uppercase font-black">No Screenshot</div>
                          )}
                       </div>
                       {match.status !== 'completed' && (
                          <Button onClick={() => adminDeclareWinner(match.team1Id)} disabled={resolving} className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase h-10 mt-2">
                             Declare Winner
                          </Button>
                       )}
                    </div>

                    {/* Team 2 Data */}
                    <div className="space-y-3">
                       <h4 className="font-black text-white uppercase">{teams?.find(t => t.id === match.team2Id)?.name || 'Team 2'}</h4>
                       <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex justify-between">
                          <span className="text-xs text-muted-foreground uppercase font-bold">Stars Claimed</span>
                          <span className="text-sm font-black text-white">{match.team2Stars}</span>
                       </div>
                       <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex justify-between">
                          <span className="text-xs text-muted-foreground uppercase font-bold">Avg Time</span>
                          <span className="text-sm font-black text-white">{match.team2AvgTime}s</span>
                       </div>
                       <div className="mt-2 h-32 bg-zinc-900 rounded-lg border border-white/10 overflow-hidden relative">
                          {match.team2Screenshot ? (
                             <img src={match.team2Screenshot} className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(match.team2Screenshot, '_blank')} />
                          ) : (
                             <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground uppercase font-black">No Screenshot</div>
                          )}
                       </div>
                       {match.status !== 'completed' && (
                          <Button onClick={() => adminDeclareWinner(match.team2Id)} disabled={resolving} className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase h-10 mt-2">
                             Declare Winner
                          </Button>
                       )}
                    </div>
                 </div>
                 
                 {match.status === 'completed' && (
                    <div className="mt-6 bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-center">
                       <p className="text-sm font-black text-green-500 uppercase">WINNER: {teams?.find(t => t.id === match.winnerId)?.name}</p>
                    </div>
                 )}
              </CardContent>
           </Card>
        )}
      </div>

      {/* FC Confirmation Popup (Unclosable by clicking outside via interactOutside preventDefault usually, but Dialog enforces it mostly) */}
      <Dialog open={fcConfirmOpen} onOpenChange={() => {}}>
         <DialogContent className="glass border-white/10 bg-black/95 sm:max-w-md" onInteractOutside={e => e.preventDefault()}>
            <DialogHeader>
               <DialogTitle className="font-headline font-black italic uppercase text-xl text-white flex items-center gap-2">
                  <Swords className="w-5 h-5 text-red-500" /> Verify FC Sent
               </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
               <p className="text-sm text-muted-foreground">To verify you have sent the challenge, please type the opponent's exact Clan Tag below.</p>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-white tracking-widest">Opponent Clan Tag</Label>
                  <Input 
                     value={fcInputTag} 
                     onChange={e => setFcInputTag(e.target.value)} 
                     className="bg-black/50 border-white/20 h-12 font-black uppercase text-center tracking-widest"
                     placeholder="#XXXXXXX"
                  />
               </div>
               <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setFcConfirmOpen(false)} className="bg-transparent border-white/10 font-bold uppercase">Cancel</Button>
                  <Button onClick={handleFcConfirm} disabled={verifyingFc || !fcInputTag} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase">
                     {verifyingFc ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                  </Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
