'use client';

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CancelCountdownButton } from '@/components/vs-arena/CancelCountdownButton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useUser } from '@clerk/nextjs';
import { useFirestore, useProfile } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Swords, Zap, Shield, Loader2, AlertCircle, History, PlayCircle, Calendar, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { PlayerTHBadge } from '@/components/PlayerTHBadge';
import { format } from 'date-fns';

export default function VSArenaPage() {
  const { user, isLoaded } = useUser();
  const db = useFirestore();
  const { profile, loading: profileLoading } = useProfile();
  const { toast } = useToast();
  const router = useRouter();

  const [openChallenges, setOpenChallenges] = useState<any[]>([]);
  const [myActiveChallenges, setMyActiveChallenges] = useState<any[]>([]);
  const [myHistory, setMyHistory] = useState<any[]>([]);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [historyLimit, setHistoryLimit] = useState(5);
  const [loading, setLoading] = useState(true);
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [wagerAmount, setWagerAmount] = useState<number>(30);
  const [targetTH, setTargetTH] = useState<string>("16");
  const [isCreating, setIsCreating] = useState(false);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [selectedChallengeToAccept, setSelectedChallengeToAccept] = useState<any | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTH, setFilterTH] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Fix Target TH default
  useEffect(() => {
    if (profile?.clashData?.townHallLevel) {
      setTargetTH(profile.clashData.townHallLevel.toString());
    } else if (profile?.townHall) {
      setTargetTH(profile.townHall.toString());
    }
  }, [profile]);

  useEffect(() => {
    if (!db || !user?.id) return;
    
    // 1. Listen to ALL open challenges
    const openQ = query(collection(db, 'vs-challenges'), where('status', '==', 'open'));
    
    const unsubOpen = onSnapshot(openQ, (snapshot) => {
      const challenges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
      setOpenChallenges(challenges);
      setLoading(false);
    });

    let creatorDocs: any[] = [];
    let acceptorDocs: any[] = [];

    const updateMyChallenges = () => {
       const merged = [...creatorDocs, ...acceptorDocs];
       const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
       
       unique.sort((a, b) => {
         const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
         const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
         return timeB - timeA;
       });

       const active = unique.filter(c => c.status === 'active' || c.status === 'disputed');
       const history = unique.filter(c => c.status === 'completed' || c.status === 'cancelled');
       
       setMyActiveChallenges(active);
       setMyHistory(history);

       const startOfDay = new Date();
       startOfDay.setHours(0,0,0,0);
       const createdToday = creatorDocs.filter(c => {
          if (!c.createdAt) return false;
          const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
          return date >= startOfDay;
       });
       setTodayCount(createdToday.length);
    };

    const myCreatorQ = query(collection(db, 'vs-challenges'), where('creatorId', '==', user.id));
    const unsubCreator = onSnapshot(myCreatorQ, (snapshot) => {
       creatorDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       updateMyChallenges();
    });

    const myAcceptorQ = query(collection(db, 'vs-challenges'), where('acceptorId', '==', user.id));
    const unsubAcceptor = onSnapshot(myAcceptorQ, (snapshot) => {
       acceptorDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       updateMyChallenges();
    });

    return () => {
      unsubOpen();
      unsubCreator();
      unsubAcceptor();
    };
  }, [db, user?.id]);

  const handleCreateChallenge = async () => {
    if (!user || !profile) return;
    if (wagerAmount < 30) {
      toast({ variant: 'destructive', title: 'Invalid Wager', description: 'Minimum wager is 30 ⚡' });
      return;
    }
    
    if ((profile.vCashBalance || 0) < wagerAmount) {
      toast({ variant: 'destructive', title: 'Insufficient V-Cash', description: 'You do not have enough V-Cash to create this challenge. Please top up in your Wallet.' });
      return;
    }
    
    setIsCreating(true);
    try {
      const res = await fetch('/api/vs-arena/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wager: Number(wagerAmount),
          mode: '1v1',
          creatorTH: Number(targetTH)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: 'Challenge Created!', description: 'Your challenge is now live in the lobby.' });
      setCreateModalOpen(false);
      setWagerAmount(30);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Creation Failed', description: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleAcceptChallengeClick = (challenge: any) => {
    if (!user) {
      alert("Authentication Required! Please log in.");
      toast({ variant: 'destructive', title: 'Authentication Required', description: 'Please log in.' });
      return;
    }
    if (!profile) {
      alert("Profile not found! Please complete your player profile setup in the Profile tab first.");
      router.push('/profile');
      return;
    }
    setSelectedChallengeToAccept(challenge);
  };

  const executeAcceptChallenge = async () => {
    if (!selectedChallengeToAccept || !profile) return;
    
    const challengeId = selectedChallengeToAccept.id;

    setIsAccepting(challengeId);
    try {
      const res = await fetch('/api/vs-arena/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: 'Challenge Accepted!', description: 'Redirecting to Battle Room...' });
      router.push(`/vs-arena/battle/${challengeId}`);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Accept Failed', description: err.message });
      setIsAccepting(null);
    }
  };

  // Commander Stats Logic
  const completedHistory = myHistory.filter(c => c.status === 'completed');
  const totalBattles = completedHistory.length;
  let wins = 0;
  let losses = 0;
  let totalEarnings = 0;
  
  let currentStreak = 0;
  let highestStreak = 0;
  let streakCounter = 0;

  // Iterate oldest to newest to build accurate streak history
  [...completedHistory].reverse().forEach(challenge => {
     const isCreator = challenge.creatorId === user?.id;
     const iWon = (isCreator && challenge.winnerId === challenge.creatorId) || (!isCreator && challenge.winnerId === challenge.acceptorId);
     
     if (iWon) {
        wins++;
        const winnerPayout = Math.floor(challenge.wager * 2 * 0.8);
        totalEarnings += winnerPayout;
        
        streakCounter++;
        if (streakCounter > highestStreak) highestStreak = streakCounter;
     } else {
        losses++;
        streakCounter = 0;
     }
  });

  currentStreak = streakCounter;
  const winRate = totalBattles > 0 ? Math.round((wins / totalBattles) * 100) : 0;

  if (!isLoaded || profileLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <PageWrapper>
      <div className="relative min-h-screen pb-20">
        
        {/* Background Effects */}
        <div className="absolute top-0 inset-x-0 h-[500px] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full opacity-50 mix-blend-screen" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto space-y-10 px-4 pt-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black uppercase mb-4">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live High Stakes
              </div>
              <h1 className="text-5xl md:text-7xl font-headline font-black uppercase italic tracking-tighter drop-shadow-xl text-white">
                VS <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">ARENA</span>
              </h1>
              <p className="text-muted-foreground font-medium mt-2 max-w-xl text-sm">
                Enter the ultimate battleground. Wager your V-Cash against other warriors. Winner takes all. 
              </p>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
              <Card className="glass border-green-500/30 bg-green-500/5 px-6 py-4 w-full md:w-auto">
                <p className="text-[10px] uppercase font-black text-muted-foreground">Your V-Cash Vault</p>
                <p className="text-3xl font-headline font-black text-green-400 drop-shadow-md">⚡ {profile?.vCashBalance || 0}</p>
              </Card>
              <Button 
                onClick={() => setCreateModalOpen(true)}
                className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black text-lg uppercase tracking-wider rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] transition-all"
              >
                <Swords className="w-5 h-5 mr-2" /> Create Battle
              </Button>
            </div>
          </div>

          <Tabs defaultValue="lobby" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-black/40 border border-white/5 h-12 p-1 mx-auto md:mx-0">
              <TabsTrigger value="lobby" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black"><Zap className="w-3 h-3 md:mr-2" /> <span className="hidden md:inline">Lobby</span></TabsTrigger>
              <TabsTrigger value="active" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-red-600 data-[state=active]:text-white"><PlayCircle className="w-3 h-3 md:mr-2" /> <span className="hidden md:inline">Active</span></TabsTrigger>
              <TabsTrigger value="history" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-white/10 data-[state=active]:text-white"><History className="w-3 h-3 md:mr-2" /> <span className="hidden md:inline">Log</span></TabsTrigger>
            </TabsList>

            {/* TAB: LOBBY */}
            <TabsContent value="lobby" className="mt-8 space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" /> Open Challenges
                </h2>
                <Badge variant="outline" className={`font-black tracking-widest text-[9px] ${todayCount >= 3 ? 'text-red-500 border-red-500/20 bg-red-500/10' : 'text-primary border-primary/20 bg-primary/10'}`}>
                  {todayCount}/3 DAILY CHALLENGES USED
                </Badge>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-[200px] rounded-2xl glass border-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <Input 
                      placeholder="Search Commander Name..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-black/50 border-white/10 text-white max-w-sm"
                    />
                    <Select value={filterTH} onValueChange={setFilterTH}>
                      <SelectTrigger className="w-full md:w-48 bg-black/50 border-white/10 text-white">
                        <SelectValue placeholder="All Town Halls" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-white/10 text-white">
                        <SelectItem value="all">All Town Halls</SelectItem>
                        {Array.from({ length: 10 }, (_, i) => 18 - i).map((th) => (
                          <SelectItem key={th} value={th.toString()}>Town Hall {th}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full md:w-48 bg-black/50 border-white/10 text-white">
                        <SelectValue placeholder="Sort By Newest" />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-white/10 text-white">
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="highest">Highest Wager</SelectItem>
                        <SelectItem value="lowest">Lowest Wager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(() => {
                    let filtered = [...openChallenges];
                    
                    if (searchQuery) {
                      filtered = filtered.filter(c => c.creatorName?.toLowerCase().includes(searchQuery.toLowerCase()));
                    }
                    if (filterTH !== "all") {
                      filtered = filtered.filter(c => c.reqTh?.toString() === filterTH);
                    }
                    
                    if (sortBy === "highest") {
                      filtered.sort((a, b) => b.wager - a.wager);
                    } else if (sortBy === "lowest") {
                      filtered.sort((a, b) => a.wager - b.wager);
                    } else {
                      // Newest (already sorted by default in onSnapshot, but let's ensure)
                      filtered.sort((a, b) => {
                        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
                        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
                        return timeB - timeA;
                      });
                    }

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-20 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl">
                          <Swords className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                          <h3 className="text-lg font-black uppercase text-muted-foreground">No matches found</h3>
                          <p className="text-sm text-muted-foreground mt-2">Adjust your filters or be the first to create a battle!</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((challenge) => (
                    <Card key={challenge.id} className="glass border-white/10 relative overflow-hidden group hover:border-red-500/50 transition-all duration-300">
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-red-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <CardHeader className="pb-2 border-b border-white/5">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-black/50">
                              <Image src={challenge.creatorAvatar || '/placeholder-avatar.png'} alt="Creator" width={40} height={40} className="object-cover" />
                            </div>
                            <div>
                              <p className="font-black text-sm uppercase text-white">{challenge.creatorName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-white/10">1v1 MODE</Badge>
                              </div>
                            </div>
                          </div>
                          <PlayerTHBadge userId={challenge.creatorId} />
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-4 pb-4">
                        <div className="bg-black/50 rounded-xl p-4 flex flex-col items-center justify-center border border-white/5 relative overflow-hidden">
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[100px] font-black text-white/[0.02] uppercase pointer-events-none">VS</div>
                          <p className="text-[10px] uppercase font-black text-muted-foreground mb-1 z-10">Wager Amount</p>
                          <p className="text-3xl font-headline font-black text-green-400 drop-shadow-md z-10 flex items-center gap-2">
                            ⚡ {challenge.wager}
                          </p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold mt-2 z-10">Total Pool: ⚡ {challenge.wager * 2}</p>
                        </div>

                        {challenge.creatorId === user?.id ? (
                           <CancelCountdownButton challengeId={challenge.id} createdAtStr={challenge.createdAt} />
                        ) : (
                          <Button 
                            onClick={() => handleAcceptChallengeClick(challenge)}
                            disabled={isAccepting !== null}
                            className="w-full mt-4 h-12 font-black uppercase tracking-widest text-sm transition-all bg-primary text-black hover:bg-primary/90 glow-primary shadow-lg hover:shadow-xl"
                          >
                            {isAccepting === challenge.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <>Accept Challenge <Swords className="w-4 h-4 ml-2" /></>
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
            </>
          )}
        </TabsContent>

            {/* TAB: ACTIVE BATTLES */}
            <TabsContent value="active" className="mt-8 space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-red-500" /> Active Battles
                </h2>
              </div>
              {myActiveChallenges.length === 0 ? (
                <div className="text-center py-20 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl">
                  <Shield className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-black uppercase text-muted-foreground">No Active Battles</h3>
                  <p className="text-sm text-muted-foreground mt-2">You don't have any running battles. Accept or create one from the Lobby.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myActiveChallenges.map((challenge) => (
                    <Card key={challenge.id} className="glass border-red-500/30 relative overflow-hidden group">
                      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-red-500/10 via-transparent to-transparent" />
                      <CardHeader className="pb-2 border-b border-white/5">
                         <div className="flex justify-between items-center">
                            <Badge className="bg-red-500 animate-pulse text-white font-black">LIVE</Badge>
                            {challenge.status === 'disputed' && <Badge className="bg-yellow-500 text-black font-black">DISPUTED</Badge>}
                         </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                         <div className="flex justify-between items-center mb-6">
                            <div className="text-center">
                               <Image src={challenge.creatorAvatar || '/placeholder-avatar.png'} alt="Creator" width={40} height={40} className="rounded-full mx-auto border-2 border-white/10" />
                               <p className="text-[10px] font-black uppercase mt-1 text-white">{challenge.creatorName}</p>
                            </div>
                            <span className="text-red-500 font-black italic">VS</span>
                            <div className="text-center">
                               <Image src={challenge.acceptorAvatar || '/placeholder-avatar.png'} alt="Acceptor" width={40} height={40} className="rounded-full mx-auto border-2 border-white/10" />
                               <p className="text-[10px] font-black uppercase mt-1 text-white">{challenge.acceptorName}</p>
                            </div>
                         </div>
                         <div className="bg-black/50 p-2 rounded-lg text-center border border-white/5 mb-4">
                            <p className="text-[10px] uppercase text-muted-foreground font-black">Locked Pool</p>
                            <p className="text-xl font-black text-green-500">⚡ {challenge.pool}</p>
                         </div>
                         <Button onClick={() => router.push(`/vs-arena/battle/${challenge.id}`)} className="w-full bg-red-600 hover:bg-red-500 font-black uppercase tracking-widest text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                            Rejoin Battle
                         </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB: BATTLE LOG */}
            <TabsContent value="history" className="mt-8 space-y-6">
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-white/50" /> Battle Log
                </h2>
              </div>

              {/* COMMANDER STATS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <div className="bg-black/40 border border-white/5 p-4 rounded-2xl text-center shadow-lg flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Total Battles</p>
                    <p className="text-3xl font-black text-white">{totalBattles}</p>
                 </div>
                 <div className="bg-black/40 border border-white/5 p-4 rounded-2xl text-center shadow-lg flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Win Rate</p>
                    <p className="text-3xl font-black text-blue-500 leading-none mb-1">{winRate}%</p>
                    <p className="text-[9px] uppercase font-bold text-white/50 tracking-widest">{wins} WON - {losses} LOST</p>
                 </div>
                 <div className="bg-black/40 border border-white/5 p-4 rounded-2xl text-center shadow-[0_0_15px_rgba(34,197,94,0.1)] flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-black text-green-500/70 tracking-widest mb-1">Total Earnings</p>
                    <p className="text-3xl font-black text-green-500">
                       ⚡ {totalEarnings}
                    </p>
                 </div>
                 <div className="bg-black/40 border border-white/5 p-4 rounded-2xl text-center shadow-[0_0_15px_rgba(249,115,22,0.1)] flex flex-col justify-center">
                    <p className="text-[10px] uppercase font-black text-orange-500/70 tracking-widest mb-1">Win Streak</p>
                    <p className="text-3xl font-black text-orange-500 leading-none mb-1">🔥 {currentStreak}</p>
                    <p className="text-[9px] uppercase font-bold text-white/50 tracking-widest">ALL-TIME BEST: {highestStreak}</p>
                 </div>
              </div>

              {myHistory.length === 0 ? (
                 <div className="text-center py-20 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl">
                  <History className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-black uppercase text-muted-foreground">No History</h3>
                  <p className="text-sm text-muted-foreground mt-2">Your completed battles will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myHistory.slice(0, historyLimit).map(challenge => {
                    const isCreator = challenge.creatorId === user?.id;
                    const iWon = (isCreator && challenge.winnerId === challenge.creatorId) || (!isCreator && challenge.winnerId === challenge.acceptorId);
                    const isCancelled = challenge.status === 'cancelled';
                    
                    return (
                      <div key={challenge.id} onClick={() => router.push(`/vs-arena/battle/${challenge.id}`)} className="glass border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${isCancelled ? 'bg-zinc-500/10 border-zinc-500/30' : iWon ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                             {isCancelled ? <AlertCircle className="text-zinc-500 w-5 h-5" /> : iWon ? <Trophy className="text-green-500 w-5 h-5" /> : <AlertCircle className="text-red-500 w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-black uppercase text-white">
                              {isCancelled ? 'CANCELLED/REFUNDED' : iWon ? 'VICTORY' : 'DEFEAT'}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                               <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {challenge.createdAt?.toDate ? format(challenge.createdAt.toDate(), 'MMM dd, HH:mm') : ''}
                               </p>
                               <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                                  <Zap className="w-3 h-3 text-primary" /> Wager: ⚡ {challenge.wager}
                               </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Wager Outcome</p>
                          {isCancelled ? (
                            <p className="text-lg font-black text-zinc-400">REFUNDED</p>
                          ) : iWon ? (
                            <p className="text-lg font-black text-green-500">+ ⚡ {challenge.wager}</p>
                          ) : (
                            <p className="text-lg font-black text-red-500">- ⚡ {challenge.wager}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  
                  {myHistory.length > historyLimit && (
                    <div className="flex justify-center mt-6 pt-4 border-t border-white/5">
                      <Button variant="outline" onClick={() => setHistoryLimit(prev => prev + 5)} className="bg-black/40 border-white/10 font-black uppercase text-[10px] h-10 px-8 hover:bg-white/10">LOAD MORE</Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* Create Challenge Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="glass border-red-500/30 max-w-md p-0 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />
          
          <div className="p-6">
            <DialogHeader className="mb-6">
              <DialogTitle className="font-headline text-3xl font-black italic uppercase flex items-center gap-2">
                CREATE <span className="text-red-500">BATTLE</span>
              </DialogTitle>
              <DialogDescription>
                Set your wager. The system will match you with opponents of the same Town Hall level.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Mode Selection */}
              <div className="grid grid-cols-3 gap-3">
                <button className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-500/20 border-2 border-red-500 text-red-500 glow-red">
                  <span className="font-black text-lg">1v1</span>
                  <span className="text-[9px] uppercase font-bold">DUEL</span>
                </button>
                <button disabled className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border-2 border-transparent text-white/40 cursor-not-allowed grayscale">
                  <span className="font-black text-lg">3v3</span>
                  <span className="text-[9px] uppercase font-bold">SOON</span>
                </button>
                <button disabled className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border-2 border-transparent text-white/40 cursor-not-allowed grayscale">
                  <span className="font-black text-lg">5v5</span>
                  <span className="text-[9px] uppercase font-bold">SOON</span>
                </button>
              </div>

              {/* TH Selection */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Target Town Hall
                </label>
                <Select value={targetTH} onValueChange={setTargetTH}>
                  <SelectTrigger className="w-full h-14 bg-black/50 border-white/20 font-black text-white">
                    <SelectValue placeholder="Select Town Hall" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10 text-white">
                    {Array.from({ length: 10 }, (_, i) => 18 - i).map((th) => (
                      <SelectItem key={th} value={th.toString()} className="font-bold hover:bg-white/5 cursor-pointer">
                        Town Hall {th}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-primary/80 font-medium">
                  Only players with Town Hall {targetTH} will be able to accept your challenge.
                </p>
              </div>

              <div className="pt-2 space-y-4">
                <div className="flex items-center justify-between px-4 py-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">Wager Amount ( ⚡ )</span>
                  <div className="relative group">
                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                    <Input 
                      type="number"
                      placeholder="Min 30"
                      value={wagerAmount}
                      onChange={(e) => setWagerAmount(Number(e.target.value))}
                      className="pl-9 h-10 w-32 bg-transparent border-b-2 border-white/20 rounded-none focus:border-green-500 text-right font-black text-lg transition-colors text-green-400"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center px-2">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Pool: <span className="text-green-500">⚡ {wagerAmount * 2}</span></p>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Winner Takes: <span className="text-green-500">⚡ {wagerAmount * 2}</span></p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="bg-black/50 p-6 border-t border-white/10 sm:justify-between">
             <Button variant="ghost" onClick={() => setCreateModalOpen(false)} className="text-muted-foreground hover:text-white uppercase font-black text-xs">Cancel</Button>
             <Button 
               onClick={handleCreateChallenge}
               disabled={isCreating || !wagerAmount || wagerAmount < 30 || (profile?.vCashBalance || 0) < wagerAmount || todayCount >= 3}
               className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest px-8 shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all hover:scale-105 disabled:opacity-50"
             >
               {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : todayCount >= 3 ? 'LIMIT REACHED' : 'CONFIRM & DEPLOY'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Challenge Modal */}
      <Dialog open={!!selectedChallengeToAccept} onOpenChange={(open) => !open && setSelectedChallengeToAccept(null)}>
        <DialogContent className="glass border-primary/30 max-w-md p-0 overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-orange-500 to-primary" />
          
          {selectedChallengeToAccept && (
            <>
              <div className="p-6">
                <DialogHeader className="mb-6">
                  <DialogTitle className="font-headline text-3xl font-black italic uppercase flex items-center gap-2">
                    ACCEPT <span className="text-primary">BATTLE</span>
                  </DialogTitle>
                  <DialogDescription>
                    You are about to accept a challenge from <span className="text-white font-bold">{selectedChallengeToAccept.creatorName}</span>.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Match Info */}
                  <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Town Hall</span>
                      <PlayerTHBadge userId={selectedChallengeToAccept.creatorId} />
                    </div>
                    {profile?.townHall !== selectedChallengeToAccept.reqTh && (
                      <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-[10px] font-bold uppercase">
                        <AlertCircle className="w-4 h-4" /> Town Hall Mismatch. You are TH {profile?.townHall || 0}.
                      </div>
                    )}
                    
                    <div className="h-px bg-white/5 w-full" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Wager Amount</span>
                      <span className="text-xl font-black text-green-500 flex items-center gap-1">⚡ {selectedChallengeToAccept.wager}</span>
                    </div>
                  </div>

                  {/* Balance Check */}
                  <div className={`p-4 rounded-xl border ${((profile?.vCashBalance || 0) < selectedChallengeToAccept.wager) ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white">Your V-Cash Vault</span>
                      <span className={`text-lg font-black ${((profile?.vCashBalance || 0) < selectedChallengeToAccept.wager) ? 'text-red-500' : 'text-green-500'}`}>
                        ⚡ {profile?.vCashBalance || 0}
                      </span>
                    </div>
                    {((profile?.vCashBalance || 0) < selectedChallengeToAccept.wager) && (
                      <p className="text-[9px] text-red-400 font-bold uppercase mt-2">Insufficient V-Cash to accept this battle.</p>
                    )}
                  </div>
                </div>
              </div>
              
              <DialogFooter className="bg-black/50 p-6 border-t border-white/10 sm:justify-between">
                <Button variant="ghost" onClick={() => setSelectedChallengeToAccept(null)} className="text-muted-foreground hover:text-white uppercase font-black text-xs">Cancel</Button>
                
                {((profile?.vCashBalance || 0) < selectedChallengeToAccept.wager) ? (
                  <Button 
                    onClick={() => router.push('/wallet')}
                    className="bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest px-8 shadow-[0_0_15px_rgba(22,163,74,0.5)] transition-all hover:scale-105"
                  >
                    RECHARGE V-CASH
                  </Button>
                ) : (
                  <Button 
                    onClick={executeAcceptChallenge}
                    disabled={isAccepting !== null || profile?.townHall !== selectedChallengeToAccept.reqTh}
                    className="bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest px-8 shadow-[0_0_15px_rgba(255,69,0,0.5)] transition-all hover:scale-105 disabled:opacity-50"
                  >
                    {isAccepting === selectedChallengeToAccept.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CONFIRM BATTLE'}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
