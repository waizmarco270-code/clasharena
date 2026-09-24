'use client';

import { useMemo, useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowRight, ChevronLeft, Loader2, PlayCircle, Shield, Swords, Trophy, Users, Zap, Crown, UserPlus, Info, ScrollText, AlertCircle } from 'lucide-react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, collection, query, where, setDoc, deleteDoc, getDocs, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { isBefore, isAfter } from 'date-fns';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import { CoinIcon } from '@/components/ui/coin-icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAdminStatus } from '@/firebase';
import { generateThcBracket } from '@/lib/bracket-generator';
import { AvatarFrame } from '@/components/cosmetics/AvatarFrame';

function TeamPlayerRow({ playerId, isCaptain }: { playerId: string, isCaptain: boolean }) {
  const db = useFirestore();
  const { data: userProfile, loading } = useDoc(doc(db, 'users', playerId));
  
  if (loading) return (
     <div className="bg-black/50 p-3 rounded-xl border border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
        <div className="h-4 bg-zinc-800 w-24 rounded animate-pulse" />
     </div>
  );

  return (
     <div className="bg-black/50 p-3 rounded-xl border border-white/5 flex items-center gap-3">
        <AvatarFrame 
           avatarId={userProfile?.equippedAvatar || 'default'} 
           imageUrl={userProfile?.photoURL} 
           username={userProfile?.username || 'Unknown'} 
           className="w-12 h-12" 
        />
        <div>
           <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-white">{userProfile?.username || 'Unknown Player'}</p>
              {isCaptain && <Crown className="w-3.5 h-3.5 text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />}
           </div>
           <p className="text-[10px] font-black text-muted-foreground uppercase mt-0.5">{userProfile?.tag || 'NO CLASH TAG'}</p>
        </div>
     </div>
  );
}

const getThColorClass = (th: number) => {
  switch (th) {
    case 9: return 'text-zinc-400';
    case 10: return 'text-red-500';
    case 11: return 'text-orange-500';
    case 12: return 'text-blue-500';
    case 13: return 'text-cyan-400';
    case 14: return 'text-green-500';
    case 15: return 'text-purple-500';
    case 16: return 'text-yellow-500';
    case 17: return 'text-rose-500';
    case 18: return 'text-indigo-400';
    default: return 'text-primary';
  }
};

const getThBgClass = (th: number) => {
  switch (th) {
    case 9: return 'bg-zinc-500 text-white';
    case 10: return 'bg-red-500 text-white';
    case 11: return 'bg-orange-500 text-white';
    case 12: return 'bg-blue-600 text-white';
    case 13: return 'bg-cyan-500 text-white';
    case 14: return 'bg-green-600 text-white';
    case 15: return 'bg-purple-600 text-white';
    case 16: return 'bg-yellow-500 text-black';
    case 17: return 'bg-rose-600 text-white';
    case 18: return 'bg-indigo-500 text-white';
    default: return 'bg-primary text-black';
  }
};

const getThBorderClass = (th: number) => {
  switch (th) {
    case 9: return 'border-zinc-500/30';
    case 10: return 'border-red-500/30';
    case 11: return 'border-orange-500/30';
    case 12: return 'border-blue-500/30';
    case 13: return 'border-cyan-500/30';
    case 14: return 'border-green-500/30';
    case 15: return 'border-purple-500/30';
    case 16: return 'border-yellow-500/30';
    case 17: return 'border-rose-500/30';
    case 18: return 'border-indigo-500/30';
    default: return 'border-primary/30';
  }
};

export default function ThcLobbyPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const { data: t, loading: tLoading } = useDoc(doc(db, 'thc_tournaments', id));
  
  const teamsQuery = useMemo(() => query(collection(db, 'thc_teams'), where('tournamentId', '==', id)), [db, id]);
  const { data: teams, loading: teamsLoading } = useCollection(teamsQuery);

  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const { isAdmin } = useAdminStatus();
  const [generating, setGenerating] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [thRules, setThRules] = useState<string[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);

  const matchesQuery = useMemo(() => query(collection(db, 'thc_matches'), where('tournamentId', '==', id)), [db, id]);
  const { data: allMatches } = useCollection(matchesQuery);

  const uniqueRounds = useMemo(() => {
     if (!allMatches) return [];
     const rounds = new Set<string>();
     allMatches.forEach(m => rounds.add(m.roundLabel));
     return Array.from(rounds).sort();
  }, [allMatches]);

  const [roundSchedules, setRoundSchedules] = useState<Record<string, string>>({});

  useEffect(() => {
     if (t?.roundSchedules) setRoundSchedules(t.roundSchedules);
  }, [t]);

  const handleSaveSchedules = async () => {
     try {
        await setDoc(doc(db, 'thc_tournaments', id), { roundSchedules }, { merge: true });
        toast({ title: 'Schedules saved!' });
        setScheduleModalOpen(false);
     } catch (e) {
        toast({ variant: 'destructive', title: 'Failed to save' });
     }
  };

  const handleGenerateBracket = async () => {
    if (!teams || teams.length < 2) {
      toast({ variant: 'destructive', title: 'Not enough teams' });
      return;
    }
    setGenerating(true);
    try {
      await generateThcBracket(id, teams, t.format);
      toast({ title: 'Bracket Generated!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setGenerating(false);
    }
  };

  const [injecting, setInjecting] = useState(false);
  const [demoCount, setDemoCount] = useState('7');
  const [clearing, setClearing] = useState(false);

  const injectDemoTeams = async () => {
    const count = parseInt(demoCount);
    if (isNaN(count) || count <= 0) return toast({ variant: 'destructive', title: 'Enter a valid number' });
    setInjecting(true);
    try {
      const demoNames = ['Alpha Strike', 'Beta Blockers', 'Gamma Rays', 'Delta Force', 'Epsilon Elite', 'Zeta Zappers', 'Eta Enigma', 'Theta Titans', 'Omega Ops', 'Sigma Squad', 'Kappa Kings', 'Rho Raiders', 'Phi Phantoms', 'Chi Champions', 'Psi Predators', 'Tau Terminators'];

      for (let i = 0; i < count; i++) {
        const teamRef = doc(collection(db, 'thc_teams'));
        const rName = demoNames[i % demoNames.length] + (i >= demoNames.length ? ` ${i}` : '');
        await setDoc(teamRef, {
          id: teamRef.id,
          tournamentId: id,
          name: rName,
          clanTag: `#DEMO${Math.floor(Math.random() * 10000)}`,
          clanLink: 'https://link.clashofclans.com/',
          logoUrl: `https://picsum.photos/seed/demo${i}${Date.now()}/100`,
          captainId: `demo_user_${Date.now()}_${i}`,
          players: [`demo_user_${Date.now()}_${i}`],
          paymentStatus: 'paid',
          status: 'registered',
          createdAt: new Date().toISOString()
        });
      }
      toast({ title: `${count} Demo Teams Injected! 🔥` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to inject demo teams' });
    } finally {
      setInjecting(false);
    }
  };

  const clearDemoTeams = async () => {
    setClearing(true);
    try {
      // Find all matches for this tournament to delete
      const matchesSnap = await getDocs(query(collection(db, 'thc_matches'), where('tournamentId', '==', id)));
      // Find all demo teams
      const allTeamsSnap = await getDocs(query(collection(db, 'thc_teams'), where('tournamentId', '==', id)));
      
      const batch = writeBatch(db);
      
      // Delete matches
      matchesSnap.forEach(doc => {
         batch.delete(doc.ref);
      });

      // Delete demo teams
      let deletedTeamsCount = 0;
      allTeamsSnap.forEach(doc => {
         const data = doc.data();
         if (data.captainId && data.captainId.startsWith('demo_user_')) {
            batch.delete(doc.ref);
            deletedTeamsCount++;
         }
      });

      await batch.commit();
      toast({ title: `Cleared Matches and ${deletedTeamsCount} Demo Teams! 🧹` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Failed to clear demo data' });
    } finally {
      setClearing(false);
    }
  };

  const handleClaimReward = async (position: 'first' | 'second' | 'third', amount: number) => {
     if (!user || amount <= 0 || claiming) return;
     setClaiming(true);
     try {
        const batch = writeBatch(db);
        // Add vCash to user
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', user.id)));
        let currentVcash = 0;
        if (!userSnap.empty) currentVcash = userSnap.docs[0].data().vCash || 0;
        batch.update(userRef, { vCash: currentVcash + amount });
        
        // Update claimed status
        const tRef = doc(db, 'thc_tournaments', id);
        batch.update(tRef, { [`results.claimed.${position}`]: true });
        
        await batch.commit();
        toast({ title: 'Reward Claimed!', description: `₹${amount} vCash has been added to your wallet.` });
     } catch(e) {
        toast({ variant: 'destructive', title: 'Failed to claim reward' });
     } finally {
        setClaiming(false);
     }
  };

  const handleOpenRules = async () => {
    setRulesModalOpen(true);
    if (thRules.length > 0) return;
    setLoadingRules(true);
    try {
      const docRef = doc(db, 'app-settings', 'th-rules');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const allRules = snap.data();
        setThRules(allRules[t.townHall?.toString()] || ['No specific rules found for this Town Hall level.']);
      } else {
        setThRules(['Rules have not been configured.']);
      }
    } catch (e) {
      setThRules(['Failed to load rules.']);
    } finally {
      setLoadingRules(false);
    }
  };

  const myTeam = useMemo(() => {
    if (!user || !teams) return null;
    return teams.find(team => team.players.includes(user.id));
  }, [user, teams]);

  if (tLoading || teamsLoading) {
    return <PageWrapper><div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></PageWrapper>;
  }

  if (!t) {
    return <PageWrapper><div className="text-center py-20"><h2 className="text-2xl font-black text-white">ARENA NOT FOUND</h2></div></PageWrapper>;
  }

  const now = new Date();
  const regStart = new Date(t.registrationStartTime);
  const regEnd = new Date(t.registrationEndTime);
  const tourStart = new Date(t.startTime);
  
  let status = 'UPCOMING';
  if (isAfter(now, regStart) && isBefore(now, regEnd)) status = 'OPEN';
  if (isAfter(now, regEnd) && isBefore(now, tourStart)) status = 'STARTING_SOON';
  if (isAfter(now, tourStart)) status = 'LIVE';
  if (t.status === 'completed') status = 'COMPLETED';

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto space-y-6">
        <Link href="/arena" className="inline-flex items-center text-[10px] font-black uppercase text-muted-foreground hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> BACK TO ARENA HUB
        </Link>

        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden glass border-white/10 group animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="absolute inset-0">
            <Image src={(typeof t.imageUrl === 'string' ? t.imageUrl : t.imageUrl?.url) || 'https://picsum.photos/seed/coc/800/400'} alt={t.name} fill className="object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-700" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
          </div>
          
          <div className="relative p-6 md:p-10 flex flex-col md:flex-row gap-6 md:items-end justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary text-black font-black uppercase tracking-widest text-[10px] border-none shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                  {status}
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-black/50 text-white font-black uppercase tracking-widest text-[10px] backdrop-blur-md">
                  <Zap className="w-3 h-3 mr-1 text-primary" /> TH {t.townHall}
                </Badge>
                <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 font-black uppercase tracking-widest text-[10px] backdrop-blur-md">
                  <Users className="w-3 h-3 mr-1" /> {t.mode} BATTLES
                </Badge>
                <Button onClick={handleOpenRules} variant="outline" size="sm" className="h-6 text-[10px] bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest rounded-full px-3 ml-2 border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                   <ScrollText className="w-3 h-3 mr-1" /> View Rules
                </Button>
              </div>
              
              <h1 className="text-3xl md:text-5xl font-headline font-black italic uppercase text-white drop-shadow-2xl">
                {t.name}
              </h1>
              
              <p className="text-sm font-medium text-white/70 max-w-xl">
                Form your squad, pay the entry fee, and clash against the best teams in the arena. Do you have what it takes to claim the Town Hall Cup?
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
               {t.rewards?.top1 && (
                 <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-[2px] rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.3)] animate-pulse">
                    <div className="bg-black/90 backdrop-blur-md border border-white/10 rounded-[14px] p-4 text-center min-w-[160px]">
                       <p className="text-[10px] font-black uppercase text-yellow-500 mb-1 tracking-widest">Top Prize</p>
                       <p className="text-2xl font-black text-white italic">₹ {t.rewards.top1}</p>
                    </div>
                 </div>
               )}
               <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center min-w-[160px]">
                  <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Team Entry Fee</p>
                  <p className="text-2xl font-black text-white flex items-center justify-center gap-2">
                    {t.entryFee === 0 ? 'FREE' : <><CoinIcon /> {t.entryFee}</>}
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Reward Claim Banner */}
        {status === 'COMPLETED' && t.results && myTeam && [t.results.firstPlace, t.results.secondPlace, t.results.thirdPlace].includes(myTeam.id) && (
           <Card className="glass border-green-500/50 bg-green-500/10 p-6 flex flex-col md:flex-row items-center justify-between gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-4">
                 <Crown className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] animate-bounce" />
                 <div>
                    <h3 className="text-2xl font-black italic uppercase text-white drop-shadow-md">
                       {myTeam.id === t.results.firstPlace ? 'CHAMPIONS!' : myTeam.id === t.results.secondPlace ? 'RUNNER UP!' : 'THIRD PLACE!'}
                    </h3>
                    <p className="text-sm font-bold text-green-300">
                       {myTeam.id === t.results.firstPlace && t.rewards?.top1 ? `You won ₹ ${t.rewards.top1}!` : 
                        myTeam.id === t.results.secondPlace && t.rewards?.top2 ? `You won ₹ ${t.rewards.top2}!` : 
                        myTeam.id === t.results.thirdPlace && t.rewards?.top3 ? `You won ₹ ${t.rewards.top3}!` : 
                        'Congratulations on your placement!'}
                    </p>
                 </div>
              </div>
              <div className="flex-shrink-0">
                 {(() => {
                    const pos = myTeam.id === t.results.firstPlace ? 'first' : myTeam.id === t.results.secondPlace ? 'second' : 'third';
                    const amountStr = pos === 'first' ? t.rewards?.top1 : pos === 'second' ? t.rewards?.top2 : t.rewards?.top3;
                    const amount = parseInt(amountStr || '0', 10);
                    
                    if (amount === 0) return null; // No prize set
                    
                    if (t.results.claimed?.[pos]) {
                       return <Badge className="bg-white text-black font-black uppercase text-xs px-4 py-2">Reward Claimed ✅</Badge>;
                    }
                    
                    if (myTeam.captainId === user?.id) {
                       return (
                          <Button onClick={() => handleClaimReward(pos, amount)} disabled={claiming} className="bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase glow-yellow h-12 px-8">
                             {claiming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Claim Prize Money'}
                          </Button>
                       );
                    } else {
                       return <div className="text-right"><p className="text-[10px] font-black uppercase text-muted-foreground">Reward has been sent to your captain.</p><p className="text-xs font-bold text-white uppercase mt-1">Must tell him to claim the prize money.</p></div>;
                    }
                 })()}
              </div>
           </Card>
        )}

        {/* Action Bar */}
        <div className="grid grid-cols-1 gap-4">
           {isAdmin && (
              <Card className="glass border-red-500/30 bg-red-500/10 flex flex-col md:flex-row items-center justify-between p-4 gap-4">
                 <div>
                    <p className="text-[10px] font-black uppercase text-red-400 tracking-widest">Admin Control Center</p>
                    <h3 className="text-lg font-black text-white uppercase mt-1">Status: {status}</h3>
                 </div>
                 <div className="flex gap-2 flex-wrap items-center">
                    <Input 
                       type="number" 
                       value={demoCount} 
                       onChange={e => setDemoCount(e.target.value)} 
                       className="w-16 bg-black/50 border-red-500/30 text-center font-black"
                       placeholder="Qty"
                    />
                    <Button onClick={injectDemoTeams} disabled={injecting} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/20 font-black uppercase">
                       {injecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Inject'}
                    </Button>
                    <Button onClick={clearDemoTeams} disabled={clearing} variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/20 font-black uppercase">
                       {clearing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Reset Bracket & Demo Teams'}
                    </Button>
                    <Button onClick={handleGenerateBracket} disabled={generating || status === 'COMPLETED'} className="bg-red-600 text-white font-black uppercase glow-red">
                       {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Force Generate Bracket'}
                    </Button>
                    <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
                       <DialogTrigger asChild>
                          <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/20 font-black uppercase">
                             Set Round Timings
                          </Button>
                       </DialogTrigger>
                       <DialogContent className="glass bg-black/95 border-white/10 text-white max-w-md">
                          <DialogHeader>
                             <DialogTitle className="font-black uppercase text-xl text-primary">Round Schedules</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                             {uniqueRounds.map(round => (
                                <div key={round} className="flex flex-col gap-2 bg-white/5 p-3 rounded-lg border border-white/10">
                                   <label className="text-[10px] font-black uppercase text-muted-foreground">{round} Time (IST)</label>
                                   <Input 
                                      type="datetime-local" 
                                      value={roundSchedules[round] || ''}
                                      onChange={(e) => setRoundSchedules(prev => ({ ...prev, [round]: e.target.value }))}
                                      className="bg-black/50 border-white/10 text-white"
                                   />
                                </div>
                             ))}
                          </div>
                          <Button onClick={handleSaveSchedules} className="w-full bg-primary text-black font-black uppercase glow-primary mt-4">Save Timings</Button>
                       </DialogContent>
                    </Dialog>
                 </div>
              </Card>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myTeam ? (
                 <Card className="glass border-primary/20 bg-primary/5 flex items-center justify-between p-4">
                    <div>
                       <p className="text-[10px] font-black uppercase text-primary tracking-widest">Your Roster</p>
                       <h3 className="text-lg font-black text-white uppercase mt-1">{myTeam.name}</h3>
                    </div>
                    <div className="flex gap-2">
                       <Link href={`/arena/thc/${id}/match/schedule`}>
                          <Button className="bg-white text-black font-black uppercase">Match Lobby</Button>
                       </Link>
                    </div>
                 </Card>
              ) : (
                 <Card className="glass border-white/5 flex items-center justify-between p-4">
                    <div>
                       <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Team Registration</p>
                       <h3 className="text-lg font-black text-white uppercase mt-1">Form Your Squad</h3>
                    </div>
                    <Link href={`/arena/thc/${id}/register`}>
                       <Button disabled={status !== 'OPEN'} className="bg-primary text-black font-black uppercase glow-primary">
                          Register Team <ArrowRight className="w-4 h-4 ml-2" />
                       </Button>
                    </Link>
                 </Card>
              )}
              
              <Card className="glass border-white/5 flex flex-col items-center justify-center p-4">
                 <Link href={`/arena/thc/${id}/bracket`} className="w-full">
                    <Button variant="outline" className="w-full border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 font-black uppercase h-12">
                       <Trophy className="w-4 h-4 mr-2" /> View Bracket
                    </Button>
                 </Link>
              </Card>
           </div>
        </div>

        {/* Teams List */}
        <div>
           <h2 className="text-xl font-headline font-black italic uppercase text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Registered Teams <span className="text-muted-foreground text-sm">({teams?.length || 0}{t.maxTeams ? `/${t.maxTeams}` : ''})</span>
           </h2>
           
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {teams?.map(team => (
                 <button 
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className="relative group rounded-2xl overflow-hidden border border-white/5 bg-black/40 hover:border-primary/50 transition-all text-left"
                 >
                    <div className="h-20 relative bg-zinc-900">
                       <Image src={(typeof team.logoUrl === 'string' ? team.logoUrl : team.logoUrl?.url) || 'https://picsum.photos/seed/team/200/100'} alt={team.name} fill className="object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                    </div>
                    <div className="p-3">
                       <h4 className="font-black text-white uppercase truncate text-sm">{team.name}</h4>
                       <p className="text-[10px] text-muted-foreground font-bold mt-1 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {team.players.length} / {t.teamSize} Players
                       </p>
                    </div>
                 </button>
              ))}
              {teams?.length === 0 && (
                 <div className="col-span-full text-center py-12 text-muted-foreground font-black uppercase text-xs tracking-widest bg-white/[0.02] rounded-2xl border border-white/5">
                    No teams registered yet. Be the first!
                 </div>
              )}
           </div>
        </div>

      </div>

      {/* Admin Match Overview */}
      {isAdmin && allMatches && allMatches.length > 0 && (
         <div className="mt-12 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
               <Shield className="w-5 h-5 text-red-500" />
               <h2 className="text-xl font-headline font-black italic uppercase text-red-500">Admin Match Overview</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
               {allMatches.map(m => {
                  const t1 = teams?.find(t => t.id === m.team1Id);
                  const t2 = teams?.find(t => t.id === m.team2Id);
                  return (
                     <Card key={m.id} className="glass border-white/10 bg-black/40 flex flex-col p-4 relative overflow-hidden">
                        {m.status === 'disputed' && <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />}
                        <div className="flex justify-between items-start mb-4 relative z-10">
                           <Badge className="bg-white/10 text-white font-black uppercase text-[9px]">{m.roundLabel}</Badge>
                           <Badge variant="outline" className={`font-black uppercase text-[9px] ${
                              m.status === 'live' ? 'text-yellow-500 border-yellow-500' :
                              m.status === 'completed' ? 'text-green-500 border-green-500' :
                              m.status === 'disputed' ? 'text-red-500 border-red-500' :
                              'text-muted-foreground border-white/20'
                           }`}>
                              {m.status}
                           </Badge>
                        </div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                           <div className="text-center w-2/5">
                              <p className="font-black uppercase text-xs truncate">{t1?.name || (m.team1Id === 'BYE' ? 'BYE' : 'TBD')}</p>
                           </div>
                           <div className="text-center w-1/5 text-[10px] font-black text-muted-foreground italic">VS</div>
                           <div className="text-center w-2/5">
                              <p className="font-black uppercase text-xs truncate">{t2?.name || (m.team2Id === 'BYE' ? 'BYE' : 'TBD')}</p>
                           </div>
                        </div>
                        <Link href={`/arena/thc/${id}/match/${m.id}`} className="relative z-10">
                           <Button variant="secondary" className="w-full text-xs font-black uppercase">Enter Lobby as Admin</Button>
                        </Link>
                     </Card>
                  );
               })}
            </div>
         </div>
      )}

      {/* Team Details Modal */}
      <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
         <DialogContent className="glass border-white/10 bg-black/95">
            <DialogHeader>
               <DialogTitle className="font-headline font-black italic uppercase text-2xl text-white">
                  {selectedTeam?.name}
               </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
               <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                  <Image src={(typeof selectedTeam?.logoUrl === 'string' ? selectedTeam.logoUrl : selectedTeam?.logoUrl?.url) || 'https://picsum.photos/seed/team/100/100'} alt="Logo" width={48} height={48} className="rounded-lg object-cover" />
                  <div>
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">CoC Clan Tag</p>
                     <p className="font-black text-white">{selectedTeam?.clanTag}</p>
                  </div>
               </div>

               <div>
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Roster ({selectedTeam?.players?.length}/{t.teamSize})</h4>
                  <div className="space-y-2">
                     {selectedTeam?.players?.map((playerId: string, idx: number) => (
                        <TeamPlayerRow key={idx} playerId={playerId} isCaptain={playerId === selectedTeam.captainId} />
                     ))}
                  </div>
               </div>
            </div>
         </DialogContent>
      </Dialog>

      <Dialog open={rulesModalOpen} onOpenChange={setRulesModalOpen}>
         <DialogContent className={`glass bg-black/95 ${getThBorderClass(t.townHall)} text-white max-w-lg p-0 overflow-hidden`}>
            <div className="p-6 border-b border-white/5">
               <DialogTitle className={`font-headline font-black italic uppercase text-2xl ${getThColorClass(t.townHall)} flex items-center gap-2`}>
                  <ScrollText className="w-6 h-6" /> TH-{t.townHall} Official Rules
               </DialogTitle>
               <p className="text-xs text-muted-foreground mt-1 uppercase font-bold tracking-widest">Tournament Regulations</p>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
               {loadingRules ? (
                  <div className={`flex justify-center py-8`}><Loader2 className={`w-8 h-8 animate-spin ${getThColorClass(t.townHall)}`} /></div>
               ) : (
                  <div className="space-y-3">
                     {thRules.map((rule, idx) => (
                        <div key={idx} className="flex gap-3 items-start bg-white/5 border border-white/5 p-3 rounded-lg">
                           <div className={`bg-black/50 border border-white/10 w-6 h-6 rounded flex items-center justify-center font-black text-xs ${getThColorClass(t.townHall)} shrink-0 mt-0.5`}>
                              {idx + 1}
                           </div>
                           <p className="text-sm font-medium text-white/90 leading-relaxed" dangerouslySetInnerHTML={{ __html: rule.replace(/\*\*(.*?)\*\*/g, `<span class="${getThColorClass(t.townHall)} font-black">$1</span>`) }} />
                        </div>
                     ))}
                  </div>
               )}
            </div>
            <div className="p-4 border-t border-white/5 bg-black/50">
               <Button onClick={() => setRulesModalOpen(false)} className={`w-full ${getThBgClass(t.townHall)} font-black uppercase`}>Understood</Button>
            </div>
         </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
