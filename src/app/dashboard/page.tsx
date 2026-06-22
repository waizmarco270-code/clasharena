'use client';

import { useMemo, useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Swords, 
  Trophy, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Wallet,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Vote,
  Target,
  Crown,
  History,
  Timer
} from 'lucide-react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, setDoc, query, collection, where, orderBy, limit } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { default as NextLink } from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getRankByWins, getRankByType, RANKS, RankType } from '@/lib/rank-utils';
import { Progress } from '@/components/ui/progress';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

function PollCard({ poll, userId }: { poll: any, userId: string }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [voted, setVoted] = useState(false);
  const [userVote, setUserVote] = useState<number[]>([]);
  const [results, setResults] = useState<{ [key: number]: number }>({});
  const [totalVotes, setTotalVotes] = useState(0);

  const votesQuery = useMemo(() => query(collection(db, 'polls', poll.id, 'votes')), [db, poll.id]);
  const { data: allVotes } = useCollection(votesQuery);

  useEffect(() => {
    if (allVotes) {
      const counts: { [key: number]: number } = {};
      let total = 0;
      allVotes.forEach((v: any) => {
        if (v.indices) {
          v.indices.forEach((idx: number) => {
            counts[idx] = (counts[idx] || 0) + 1;
          });
          total++;
          if (v.id === userId) {
            setVoted(true);
            setUserVote(v.indices);
          }
        }
      });
      setResults(counts);
      setTotalVotes(total);
    }
  }, [allVotes, userId]);

  const handleVote = async (index: number) => {
    if (voted && !poll.allowMultiple) return;
    
    let newIndices = [...userVote];
    if (poll.allowMultiple) {
      if (newIndices.includes(index)) {
        newIndices = newIndices.filter(i => i !== index);
      } else {
        newIndices.push(index);
      }
    } else {
      newIndices = [index];
    }

    await setDoc(doc(db, 'polls', poll.id, 'votes', userId), { indices: newIndices });
    toast({ title: "VOTE REGISTERED" });
  };

  return (
    <Card className="glass border-primary/20 bg-primary/5 overflow-hidden animate-in fade-in slide-in-from-top-4">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-primary mb-2">
           <Vote className="w-4 h-4 animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-[0.3em]">Live Community Poll</span>
        </div>
        <CardTitle className="font-headline text-xl font-black uppercase italic text-foreground leading-tight">{poll.question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
           {poll.options.map((opt: string, i: number) => {
             const count = results[i] || 0;
             const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
             const isSelected = userVote.includes(i);
             
             return (
               <button 
                 key={i} 
                 onClick={() => handleVote(i)}
                 className={cn(
                   "relative w-full h-12 rounded-xl border transition-all text-left overflow-hidden group",
                   isSelected ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20 bg-white/5"
                 )}
               >
                  <div 
                    className={cn("absolute inset-0 bg-primary/20 transition-all duration-1000", isSelected ? "opacity-40" : "opacity-0")} 
                    style={{ width: `${pct}%` }} 
                  />
                  <div className="relative px-4 flex justify-between items-center h-full">
                     <span className="text-xs font-black uppercase">{opt}</span>
                     <span className="text-[10px] font-bold">
                        {poll.displayMode === 'percentage' ? `${pct}%` : `${count} VOTES`}
                     </span>
                  </div>
               </button>
             );
           })}
        </div>
        <div className="flex justify-between items-center text-[8px] font-black text-muted-foreground uppercase tracking-widest pt-2">
           <span>Total Warriors Voted: {totalVotes}</span>
           {poll.allowMultiple && <span className="text-primary italic">Multiple Choices Enabled</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);
  const dashboardBg = bgData?.dashboard;

  const pollsQuery = useMemo(() => query(collection(db, 'polls'), where('isActive', '==', true), orderBy('createdAt', 'desc'), limit(1)), [db]);
  const { data: activePolls } = useCollection(pollsQuery);

  const latestTournamentQuery = useMemo(() => query(collection(db, 'tournaments'), where('status', '==', 'open'), orderBy('startTime', 'asc'), limit(1)), [db]);
  const { data: latestT } = useCollection(latestTournamentQuery);

  const [setupOpen, setSetupOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', tag: '', townHall: '', upiId: '', upiQrUrl: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!profileLoading && profile) {
      const isComplete = profile.username && profile.tag && profile.townHall;
      setSetupOpen(!isComplete);
      setFormData({
        username: profile.username || '',
        tag: profile.tag || '',
        townHall: profile.townHall?.toString() || '',
        upiId: profile.upiId || '',
        upiQrUrl: profile.upiQrUrl || ''
      });
    } else if (!profileLoading && !profile && user) {
      setSetupOpen(true);
    }
  }, [profile, profileLoading, user]);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    const lockDate = new Date();
    lockDate.setDate(lockDate.getDate() + 3);
    const newProfile = {
      username: formData.username,
      tag: formData.tag.startsWith('#') ? formData.tag.toUpperCase() : `#${formData.tag.toUpperCase()}`,
      townHall: parseInt(formData.townHall),
      avatarUrl: user.imageUrl,
      upiId: formData.upiId,
      upiQrUrl: formData.upiQrUrl,
      profileLockedUntil: lockDate.toISOString(),
      balance: profile?.balance ?? 0,
      wins: profile?.wins ?? 0,
      tournamentsPlayed: profile?.tournamentsPlayed ?? 0,
      earnings: profile?.earnings ?? 0,
      rank: profile?.rank || 'ROOKIE',
      isAdmin: profile?.isAdmin || (user.id === MASTER_SUPER_ADMIN_ID),
      isSuperAdmin: profile?.isSuperAdmin || (user.id === MASTER_SUPER_ADMIN_ID)
    };
    if (userRef) {
      setDoc(userRef, newProfile, { merge: true }).then(() => { setSetupOpen(false); toast({ title: "Identity Secured!" }); }).finally(() => setIsSubmitting(false));
    }
  };

  // Rank Progress Logic
  const currentRankInfo = useMemo(() => getRankByWins(profile?.wins || 0), [profile?.wins]);
  const activeBadgeInfo = useMemo(() => getRankByType(profile?.activeBadge as RankType || currentRankInfo.type), [profile?.activeBadge, currentRankInfo.type]);
  const nextRank = useMemo(() => {
    const next = RANKS.find(r => r.minWins > (profile?.wins || 0));
    return next || null;
  }, [profile?.wins]);
  const progressToNext = useMemo(() => {
    if (!nextRank) return 100;
    const wins = profile?.wins || 0;
    return Math.min(100, (wins / nextRank.minWins) * 100);
  }, [profile?.wins, nextRank]);

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        {dashboardBg && (
          <div className="fixed inset-0 z-0 pointer-events-none">
            <Image src={dashboardBg} alt="Dashboard Background" fill className="object-cover opacity-50 saturate-150" priority />
            <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/10 to-background" />
          </div>
        )}

        <div className="relative z-10 flex flex-col gap-8">
          {/* Top Activity Ticker */}
          <div className="w-full bg-black/40 border border-white/5 rounded-full px-6 py-2 overflow-hidden whitespace-nowrap backdrop-blur-xl">
             <div className="inline-block animate-[marquee_20s_linear_infinite] hover:[animation-play-state:paused] cursor-default">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary mr-20">⚔️ NEW TOURNAMENT "ELITE WARRIORS" IS NOW OPEN</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white mr-20">🏆 WARRIOR {profile?.username || 'MARCO'} IS RISING IN STANDINGS</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500 mr-20">💰 ₹ 45,000 DISTRIBUTED TO CHAMPIONS THIS MONTH</span>
             </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1 text-foreground">
                <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tight uppercase leading-none">COMMAND <span className="text-primary italic">HUB</span></h1>
                {isSuperAdmin ? <CheckCircle2 className="w-6 h-6 text-yellow-500 fill-yellow-500/20" /> : isAdmin && <CheckCircle2 className="w-6 h-6 text-green-500" />}
              </div>
              <p className="text-muted-foreground font-medium">Welcome back, <span className="text-foreground font-bold">{profile?.username || user?.firstName || 'Warrior'}</span>.</p>
            </div>
            <NextLink href="/arena"><Button className="bg-primary text-white font-black px-8 h-12 rounded-xl glow-primary shadow-xl uppercase text-[10px] tracking-widest">DEPLOY TO ARENA</Button></NextLink>
          </div>

          {/* Active Polls Section */}
          {activePolls && activePolls.length > 0 && user && (
            <div className="grid grid-cols-1 gap-6">
               {activePolls.map((p: any) => <PollCard key={p.id} poll={p} userId={user.id} />)}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass border-border/40 dark:border-white/5 bg-primary/5 hover:bg-primary/10 transition-colors backdrop-blur-xl group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4"><Wallet className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" /><Badge variant="outline" className="text-[10px] border-primary/20">VAULT</Badge></div>
                <p className="text-2xl font-black font-headline text-foreground">🪙 {profile?.balance || 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Available Coins</p>
              </CardContent>
            </Card>
            
            <Card className="glass border-border/40 dark:border-white/5 hover:bg-muted/10 transition-colors backdrop-blur-xl group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={cn("p-1.5 rounded-full", activeBadgeInfo.className)}>
                    <activeBadgeInfo.icon className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="outline" className="text-[10px] border-border/20">STATUS</Badge>
                </div>
                <p className={cn("text-2xl font-black font-headline italic uppercase tracking-tighter", activeBadgeInfo.className, "bg-clip-text text-transparent")}>{activeBadgeInfo.label}</p>
                <div className="mt-3 space-y-1.5">
                   <div className="flex justify-between text-[8px] font-black uppercase">
                      <span className="text-muted-foreground">NEXT RANK: {nextRank?.label || 'MAX'}</span>
                      <span className="text-primary">{Math.round(progressToNext)}%</span>
                   </div>
                   <Progress value={progressToNext} className="h-1.5 bg-white/5" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass border-border/40 dark:border-white/5 hover:bg-muted/10 transition-colors backdrop-blur-xl group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4"><Trophy className="w-5 h-5 text-yellow-500 group-hover:rotate-12 transition-transform" /><Badge variant="outline" className="text-[10px] border-border/20">CAREER</Badge></div>
                <p className="text-2xl font-black font-headline text-foreground">{profile?.wins || 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Total Victories</p>
              </CardContent>
            </Card>

            <Card className="glass border-border/40 dark:border-white/5 hover:bg-muted/10 transition-colors backdrop-blur-xl group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4"><Zap className="text-blue-500 w-5 h-5 group-hover:animate-pulse" /><Badge variant="outline" className="text-[10px] border-border/20">POWER</Badge></div>
                <p className="text-2xl font-black font-headline uppercase tracking-tighter text-foreground">TH{profile?.townHall || '??'}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Current Requirement</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
            <div className="lg:col-span-2 space-y-8">
               {latestT && latestT.length > 0 ? (
                 <Card className="glass border-white/5 bg-black/20 overflow-hidden rounded-3xl">
                    <div className="relative h-48">
                       <Image src={latestT[0].imageUrl || 'https://picsum.photos/seed/latest/800/400'} alt="Latest Arena" fill className="object-cover opacity-60" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                       <div className="absolute bottom-6 left-6 right-6">
                          <div className="flex items-center gap-2 mb-2">
                             <Badge className="bg-red-600 animate-pulse uppercase font-black text-[10px]">LIVE RECRUITMENT</Badge>
                             <Badge variant="outline" className="glass text-[10px] font-black uppercase text-white">TH {latestT[0].townHall || 'ANY'}</Badge>
                          </div>
                          <h3 className="text-3xl font-headline font-black uppercase italic tracking-tighter text-white">{latestT[0].name}</h3>
                       </div>
                    </div>
                    <CardContent className="p-6 flex justify-between items-center">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Reward Pool</p>
                          <p className="text-xl font-headline font-black text-primary">{latestT[0].prizePool}</p>
                       </div>
                       <NextLink href={`/arena/tournament/${latestT[0].id}`}>
                          <Button className="bg-white text-black font-black uppercase h-12 px-8 rounded-xl hover:scale-105 transition-transform">JOIN BATTLE <ArrowRight className="ml-2 w-4 h-4" /></Button>
                       </NextLink>
                    </CardContent>
                 </Card>
               ) : (
                 <div className="bg-muted/20 border border-border/20 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-4 backdrop-blur-2xl">
                    <ShieldAlert className="w-16 h-16 text-primary animate-pulse" />
                    <div className="space-y-2">
                       <h3 className="font-headline text-2xl font-bold uppercase italic text-foreground">No Active Battles</h3>
                       <p className="text-muted-foreground max-w-sm font-medium text-sm">Head over to the Arena to find active tournaments and claim your glory.</p>
                    </div>
                    <NextLink href="/arena"><Button variant="outline" className="mt-4 border-border/20 font-black backdrop-blur-md px-10 h-12 uppercase text-[10px] tracking-widest">BROWSE ARENAS</Button></NextLink>
                 </div>
               )}

               <div className="space-y-4">
                  <h3 className="font-headline text-lg font-black uppercase italic flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" /> MISSION LOGS
                  </h3>
                  <div className="grid gap-3">
                     {[
                       { icon: Target, label: "Match Confirmed", val: "Ameture League Round 1 deployed", color: "text-blue-500" },
                       { icon: Crown, label: "Hall of Champions", val: "New Victory Proof uploaded by Admin", color: "text-yellow-500" },
                       { icon: Timer, label: "System Status", val: "Anti-Cheat AI Protocol V2.1 Operational", color: "text-green-500" }
                     ].map((log, i) => (
                       <div key={i} className="glass p-4 rounded-2xl border-white/5 flex gap-4 items-center">
                          <div className={cn("p-2 rounded-xl bg-white/5 border border-white/5", log.color)}><log.icon className="w-4 h-4" /></div>
                          <div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{log.label}</p>
                             <p className="text-xs font-bold text-white">{log.val}</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
            
            <div className="space-y-6">
               <Card className="glass border-white/5 bg-white/5 p-6 rounded-3xl text-center space-y-4">
                  <div className="relative inline-block">
                     <div className={cn("p-1.5 rounded-full mx-auto", activeBadgeInfo.className)}>
                        <Avatar className="h-24 w-24 border-4 border-background/20 p-1 bg-background">
                           <AvatarImage src={user?.imageUrl} className="rounded-full object-cover" />
                           <AvatarFallback className="bg-muted text-2xl font-black">{profile?.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                        </Avatar>
                     </div>
                  </div>
                  <div>
                     <h3 className="font-headline text-2xl font-black uppercase italic tracking-tighter">{profile?.username || 'WARRIOR'}</h3>
                     <p className="text-primary font-bold text-[10px] tracking-[0.2em]">{profile?.tag || '#??????'}</p>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex justify-center gap-6">
                     <div><p className="text-[8px] font-black text-muted-foreground uppercase">Victories</p><p className="text-lg font-black font-headline">{profile?.wins || 0}</p></div>
                     <div className="w-[1px] h-10 bg-white/5" />
                     <div><p className="text-[8px] font-black text-muted-foreground uppercase">Played</p><p className="text-lg font-black font-headline">{profile?.tournamentsPlayed || 0}</p></div>
                  </div>
                  <NextLink href="/profile" className="block w-full"><Button variant="outline" className="w-full h-12 rounded-xl border-white/10 glass font-black uppercase text-[10px] tracking-widest">VIEW CAREER DOSSIER</Button></NextLink>
               </Card>

               <Card className="glass border-green-600/20 bg-green-600/5 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 text-green-500"><ShieldCheck className="w-6 h-6" /><span className="text-[10px] font-black uppercase tracking-widest">Integrity Protocol</span></div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">Your account is secured by the **Clash Arena Anti-Cheat**. Every match result is analyzed via AI Vision for 100% fairness.</p>
               </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={setupOpen} onOpenChange={() => {}}>
        <DialogContent className="glass border-border/20 max-w-2xl p-0 overflow-hidden h-[95vh] flex flex-col outline-none">
          <DialogHeader className="pt-8 px-8 shrink-0"><DialogTitle className="font-headline text-2xl font-black italic uppercase text-center">ARENA <span className="legendary-text">IDENTITY</span></DialogTitle></DialogHeader>
          <ScrollArea className="flex-1 px-8 py-6">
            <form id="setup-form" onSubmit={handleSetupSubmit} className="space-y-8 pb-8">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 border-4 border-primary/20 p-1 bg-background glow-primary"><AvatarImage src={user?.imageUrl} className="rounded-full object-cover" /><AvatarFallback className="bg-muted">??</AvatarFallback></Avatar>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3 items-start"><ShieldAlert className="w-6 h-6 text-primary shrink-0 animate-pulse" /><div className="text-[11px]"><p className="font-black text-primary uppercase tracking-widest">SECURITY PROTOCOL</p><p className="text-muted-foreground">Username, Tag, and Town Hall will be locked for 72 hours.</p></div></div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Username</Label><Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="bg-muted/10 h-12 font-bold" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Clash Tag</Label><Input value={formData.tag} onChange={(e) => setFormData({...formData, tag: e.target.value})} className="bg-muted/10 h-12 font-mono uppercase" /></div>
                <div className="space-y-2 md:col-span-2"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Town Hall</Label><Select value={formData.townHall} onValueChange={(val) => setFormData({...formData, townHall: val})}><SelectTrigger className="bg-muted/10 h-12 font-bold"><SelectValue placeholder="Select TH Level" /></SelectTrigger><SelectContent>{[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((th) => (<SelectItem key={th} value={th.toString()}>Town Hall {th}</SelectItem>))}</SelectContent></Select></div>
              </div>
            </form>
          </ScrollArea>
          <div className="p-6 border-t border-border/20 bg-background/50"><Button form="setup-form" type="submit" className="w-full bg-primary text-white font-black h-14 rounded-2xl shadow-xl glow-primary" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck className="mr-2" />}SECURE IDENTITY</Button></div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}