
'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
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
  Timer,
  Clock,
  Gift,
  ExternalLink,
  Camera,
  ImagePlus,
  AlertTriangle,
  Send,
  Link as LinkIcon,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, setDoc, query, collection, where, orderBy, limit, increment, getDoc, updateDoc } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { default as NextLink } from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { getRankByWins, getRankByType, RANKS, RankType } from '@/lib/rank-utils';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

function PollCard({ poll, userId }: { poll: any, userId: string }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const userVoteRef = useMemo(() => doc(db, 'polls', poll.id, 'votes', userId), [db, poll.id, userId]);
  const { data: userVoteDoc } = useDoc(userVoteRef);
  
  const isVoted = !!userVoteDoc;
  const userSelectedIndices: number[] = userVoteDoc?.indices || [];

  const handleVote = async (index: number) => {
    if (isVoted && !poll.allowMultiple) return;
    
    let newIndices = [...userSelectedIndices];
    let incrementMap: Record<string, any> = {};

    if (poll.allowMultiple) {
      if (newIndices.includes(index)) {
        newIndices = newIndices.filter(i => i !== index);
        incrementMap[`voteCounts.${index}`] = increment(-1);
        incrementMap.totalVotes = increment(-1);
      } else {
        newIndices.push(index);
        incrementMap[`voteCounts.${index}`] = increment(1);
        incrementMap.totalVotes = increment(1);
      }
    } else {
      if (newIndices.includes(index)) return;

      if (newIndices.length > 0) {
        const oldIdx = newIndices[0];
        incrementMap[`voteCounts.${oldIdx}`] = increment(-1);
        incrementMap[`voteCounts.${index}`] = increment(1);
        newIndices = [index];
      } else {
        incrementMap[`voteCounts.${index}`] = increment(1);
        incrementMap.totalVotes = increment(1);
        newIndices = [index];
      }
    }

    try {
      await updateDoc(doc(db, 'polls', poll.id), incrementMap);
      await setDoc(userVoteRef, { id: userId, indices: newIndices, updatedAt: new Date().toISOString() });
      toast({ title: "VOTE REGISTERED" });
    } catch (e) {
      console.error("Voting error", e);
    }
  };

  return (
    <Card className="glass border-primary/20 bg-primary/5 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
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
             const count = poll.voteCounts?.[i] || 0;
             const pct = poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
             const isSelected = userSelectedIndices.includes(i);
             
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
           <span>Total Warriors Voted: {poll.totalVotes || 0}</span>
           {poll.allowMultiple && <span className="text-primary italic">Multiple Choices Enabled</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function RewardVerificationCard({ claim, isAdmin, userId }: { claim: any, isAdmin: boolean, userId: string }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [itemLink, setItemLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [showClaimPopup, setShowClaimPopup] = useState(false);
  const [timer, setTimer] = useState(15);
  const [uploading, setUploading] = useState<number | null>(null);
  const [proofs, setProofs] = useState({ ss1: '', ss2: '' });
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (showClaimPopup && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showClaimPopup, timer]);

  const handleAdminDeployLink = async () => {
    if (!itemLink.trim() || loading) return;
    setLoading(true);
    await updateDoc(doc(db, 'reward-claims', claim.id), {
      itemLink: itemLink.trim(),
      status: 'approved'
    });
    setLoading(false);
    toast({ title: "ITEM LINK DEPLOYED" });
  };

  const handleImageUpload = async (num: 1 | 2, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(num);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setProofs(prev => ({ ...prev, [num === 1 ? 'ss1' : 'ss2']: data.secure_url }));
        toast({ title: `SCREENSHOT ${num} READY` });
      }
    } finally {
      setUploading(null);
    }
  };

  const handleWinnerConfirmSubmission = async () => {
    if (!proofs.ss1 || !proofs.ss2 || loading) return;
    setLoading(true);
    await updateDoc(doc(db, 'reward-claims', claim.id), {
      proofImageUrl: proofs.ss1,
      proofImageUrl2: proofs.ss2,
      status: 'reviewing'
    });
    setLoading(false);
    toast({ title: "INTEL DISPATCHED", description: "Admin will verify your proofs now." });
  };

  const handleAdminFinalApproval = async () => {
    if (loading) return;
    setLoading(true);
    await updateDoc(doc(db, 'reward-claims', claim.id), {
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    setLoading(false);
    toast({ title: "REWARD VERIFIED & ARCHIVED" });
  };

  const isWinner = userId === claim.userId;
  const status = claim.status;

  return (
    <Card className="glass border-yellow-500/40 bg-yellow-500/5 overflow-hidden animate-in fade-in zoom-in duration-700 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 animate-pulse" />
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
           <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/20 rounded-2xl border border-yellow-500/30">
                 <Trophy className="w-6 h-6 text-yellow-500 animate-bounce" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em]">Victory Verification Portal</p>
                 <CardTitle className="font-headline text-2xl font-black uppercase italic tracking-tighter">Congratulations, <span className="text-white">{claim.username}</span></CardTitle>
              </div>
           </div>
           <Badge className="bg-yellow-500 text-black font-black uppercase">{status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
              <p className="text-[8px] font-black text-muted-foreground uppercase">Arena Mission</p>
              <p className="text-xs font-bold uppercase truncate">{claim.tournamentName}</p>
           </div>
           <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
              <p className="text-[8px] font-black text-muted-foreground uppercase">Victory Rank</p>
              <p className="text-xs font-bold uppercase text-yellow-500">1st Position (Champion)</p>
           </div>
           <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
              <p className="text-[8px] font-black text-muted-foreground uppercase">Reward Prize</p>
              <p className="text-xs font-bold uppercase text-primary">{claim.rewardItemName || `₹ ${claim.rewardValue}`}</p>
           </div>
        </div>

        {/* ADMIN SIDE: DEPLOY LINK */}
        {isAdmin && status === 'pending' && claim.rewardType === 'item' && (
          <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20 space-y-4 animate-in slide-in-from-bottom-4 duration-500">
             <div className="flex items-center gap-2 text-primary">
                <LinkIcon className="w-4 h-4" />
                <h4 className="text-xs font-black uppercase tracking-widest">Deploy Item Giveaway Link</h4>
             </div>
             <Input 
               value={itemLink} 
               onChange={e => setItemLink(e.target.value)} 
               placeholder="PASTE CLASH OF CLANS ITEM LINK HERE..." 
               className="bg-white/5 border-white/10 h-12 font-bold"
             />
             <Button onClick={handleAdminDeployLink} disabled={!itemLink.trim() || loading} className="w-full h-12 bg-primary font-black uppercase rounded-xl">
                {loading ? <Loader2 className="animate-spin" /> : 'CONFIRM LINK DEPLOYMENT'}
             </Button>
          </div>
        )}

        {/* WINNER SIDE: WAITING OR CLAIMING */}
        {isWinner && (
          <>
            {status === 'pending' && (
              <div className="bg-white/5 p-6 rounded-3xl text-center space-y-2 border border-white/10 italic">
                 <Loader2 className="w-8 h-8 animate-spin mx-auto text-yellow-500 mb-2" />
                 <p className="text-sm font-bold text-white">SECURE LINK GENERATION IN PROGRESS...</p>
                 <p className="text-[10px] text-muted-foreground uppercase font-black">You will get your rewards link here within 5-10 min of approval.</p>
              </div>
            )}

            {status === 'approved' && (
              <div className="space-y-4">
                 <div className="bg-green-600/10 p-6 rounded-3xl border border-green-500/20 flex flex-col items-center gap-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                    <div className="text-center">
                       <h4 className="font-black text-lg uppercase italic">REWARD LINK IS READY</h4>
                       <p className="text-[10px] text-muted-foreground uppercase font-black">Open the portal to claim your item legendary warrior.</p>
                    </div>
                    <Button onClick={() => setShowClaimPopup(true)} className="w-full h-14 bg-green-600 hover:bg-green-700 font-black text-xl rounded-2xl glow-primary">
                       CLAIM REWARD <ChevronRight className="ml-2" />
                    </Button>
                 </div>
              </div>
            )}

            {(status === 'verifying' || status === 'reviewing') && (
              <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
                 <div className="flex items-center gap-3 text-yellow-500">
                    <Camera className="w-6 h-6" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Upload Proof of Claim (2 Screenshots)</h4>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map(num => (
                      <div key={num} onClick={() => (num === 1 ? fileInputRef1 : fileInputRef2).current?.click()} className="relative aspect-video rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 cursor-pointer overflow-hidden transition-all">
                         {proofs[num === 1 ? 'ss1' : 'ss2'] ? (
                           <Image src={proofs[num === 1 ? 'ss1' : 'ss2']} alt="Proof" fill className="object-cover" />
                         ) : (
                           <>
                             {uploading === num ? <Loader2 className="animate-spin text-primary" /> : <ImagePlus className="w-8 h-8 text-muted-foreground opacity-40" />}
                             <p className="text-[9px] font-black uppercase text-muted-foreground">Select SS #{num}</p>
                           </>
                         )}
                         <input type="file" ref={num === 1 ? fileInputRef1 : fileInputRef2} className="hidden" accept="image/*" onChange={e => handleImageUpload(num as any, e)} />
                      </div>
                    ))}
                 </div>

                 {status === 'verifying' ? (
                   <Button onClick={handleWinnerConfirmSubmission} disabled={!proofs.ss1 || !proofs.ss2 || loading} className="w-full h-14 bg-primary font-black uppercase rounded-2xl">
                      {loading ? <Loader2 className="animate-spin" /> : 'CONFIRM SUBMISSION & SECURE REWARD'}
                   </Button>
                 ) : (
                   <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-500/20 text-center">
                      <p className="text-xs font-bold text-blue-500 uppercase tracking-widest flex items-center justify-center gap-2">
                        <Timer className="w-4 h-4" /> SUBMITTED • ADMIN IS REVIEWING YOUR PROOFS
                      </p>
                   </div>
                 )}
              </div>
            )}
          </>
        )}

        {/* ADMIN SIDE: REVIEW PROOFS & STATUS MONITORING */}
        {isAdmin && (status === 'approved' || status === 'verifying') && (
           <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col items-center gap-4 animate-pulse">
              <Clock className="w-10 h-10 text-muted-foreground opacity-40" />
              <div className="text-center">
                 <h4 className="font-black text-sm uppercase">WAITING FOR WARRIOR...</h4>
                 <p className="text-[10px] text-muted-foreground uppercase font-black">
                   {status === 'approved' ? 'The champion has received the link and is claiming the reward.' : 'The champion is uploading proof screenshots.'}
                 </p>
              </div>
           </div>
        )}

        {isAdmin && status === 'reviewing' && (
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
             <div className="flex items-center gap-3 text-blue-500">
                <ShieldCheck className="w-6 h-6" />
                <h4 className="text-xs font-black uppercase tracking-widest">Verification Dossier (Submitted by {claim.username})</h4>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <a href={claim.proofImageUrl} target="_blank" className="relative aspect-video rounded-xl overflow-hidden border border-white/10"><Image src={claim.proofImageUrl} alt="SS1" fill className="object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><ExternalLink className="w-6 h-6 text-white" /></div></a>
                <a href={claim.proofImageUrl2} target="_blank" className="relative aspect-video rounded-xl overflow-hidden border border-white/10"><Image src={claim.proofImageUrl2} alt="SS2" fill className="object-cover" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><ExternalLink className="w-6 h-6 text-white" /></div></a>
             </div>
             <Button onClick={handleAdminFinalApproval} disabled={loading} className="w-full h-14 bg-green-600 hover:bg-green-700 font-black uppercase text-lg rounded-2xl shadow-xl glow-primary">
                {loading ? <Loader2 className="animate-spin" /> : 'CONFIRM PROOFS & ARCHIVE VICTORY'}
             </Button>
          </div>
        )}
      </CardContent>

      {/* CLAIM POPUP WITH TIMER */}
      <Dialog open={showClaimPopup} onOpenChange={() => { if (timer === 0) setShowClaimPopup(false); }}>
        <DialogContent className="glass border-red-500/40 max-w-lg p-0 overflow-hidden outline-none rounded-[2.5rem]">
           <div className="bg-red-600 p-6 flex items-center gap-4">
              <ShieldAlert className="w-10 h-10 text-white animate-pulse" />
              <div>
                 <DialogTitle className="text-white font-headline text-xl font-black uppercase italic">INTEGRITY PROTOCOL</DialogTitle>
                 <p className="text-[10px] font-black text-white/80 uppercase">Most Important Security Step</p>
              </div>
           </div>
           <div className="p-8 space-y-6">
              <div className="bg-black/40 border border-white/10 p-6 rounded-3xl space-y-4">
                 <div className="flex gap-4 items-start">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                    <p className="text-sm font-bold uppercase text-white/90">Click "CLAIM REWARD" to open Clash of Clans.</p>
                 </div>
                 <div className="flex gap-4 items-start">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                    <p className="text-sm font-bold uppercase text-white/90">TAKE 2 SCREENSHOTS: One of the 'Claim' screen and one of the Reward added to your base.</p>
                 </div>
              </div>
              <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-3xl space-y-2">
                 <div className="flex items-center gap-2 text-red-500"><AlertTriangle className="w-5 h-5" /><h5 className="text-xs font-black uppercase">BAN WARNING</h5></div>
                 <p className="text-[10px] leading-relaxed text-muted-foreground uppercase font-bold">FAILURE TO PROVIDE VALID SCREENSHOT PROOFS WILL RESULT IN A **LIFETIME BAN** FROM THE CLASH ARENA ECOSYSTEM. NO EXCEPTIONS.</p>
              </div>
           </div>
           <div className="p-6 border-t border-white/10 bg-black/40 flex flex-col gap-3">
              {timer > 0 ? (
                <Button disabled className="w-full h-14 bg-white/5 text-muted-foreground font-black uppercase rounded-2xl">
                   READY IN {timer} SECONDS...
                </Button>
              ) : (
                <Button asChild onClick={async () => {
                   await updateDoc(doc(db, 'reward-claims', claim.id), { status: 'verifying' });
                   setShowClaimPopup(false);
                }} className="w-full h-16 bg-green-600 hover:bg-green-700 font-black text-xl uppercase rounded-2xl shadow-xl glow-primary">
                   <a href={claim.itemLink} target="_blank">CLAIM REWARD <ExternalLink className="ml-2" /></a>
                </Button>
              )}
              {timer > 10 && <p className="text-[9px] text-center text-muted-foreground uppercase font-black">Reading instructions is mandatory for arena integrity.</p>}
           </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StatSkeleton() {
  return (
    <Card className="glass border-white/5 bg-white/5 p-6 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-6 rounded-lg bg-white/10" />
        <Skeleton className="h-4 w-12 rounded-full bg-white/10" />
      </div>
      <Skeleton className="h-8 w-20 bg-white/10" />
      <Skeleton className="h-3 w-24 bg-white/10" />
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

  const pollsQuery = useMemo(() => query(collection(db, 'polls'), orderBy('createdAt', 'desc'), limit(5)), [db]);
  const { data: allPolls, loading: pollsLoading } = useCollection(pollsQuery);
  const activePoll = useMemo(() => allPolls?.find(p => p.isActive), [allPolls]);

  const tournamentQuery = useMemo(() => query(collection(db, 'tournaments'), orderBy('startTime', 'asc'), limit(10)), [db]);
  const { data: allT, loading: tournamentLoading } = useCollection(tournamentQuery);
  const latestT = useMemo(() => allT?.find(t => t.status === 'open'), [allT]);

  // Reward Claims Monitoring (Priority 1)
  const claimsQuery = useMemo(() => {
    if (!user) return null;
    if (isAdmin) return query(collection(db, 'reward-claims'), where('status', 'in', ['pending', 'approved', 'verifying', 'reviewing']), limit(5));
    return query(collection(db, 'reward-claims'), where('userId', '==', user.id), where('status', 'in', ['pending', 'approved', 'verifying', 'reviewing']), limit(1));
  }, [db, user, isAdmin]);
  const { data: activeClaims } = useCollection(claimsQuery);

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
          <div className="fixed-bg">
            <Image src={dashboardBg} alt="Dashboard Background" fill className="object-cover opacity-50 saturate-150" priority />
            <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/10 to-background" />
          </div>
        )}

        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1 text-foreground">
                <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tight uppercase leading-none">COMMAND <span className="text-primary italic">HUB</span></h1>
                {isSuperAdmin ? <CheckCircle2 className="w-6 h-6 text-yellow-500 fill-yellow-500/20" /> : isAdmin && <CheckCircle2 className="w-6 h-6 text-green-500" />}
              </div>
              <p className="text-muted-foreground font-medium">Welcome back, <span className="text-foreground font-bold">{profile?.username || user?.firstName || 'Warrior'}</span>.</p>
            </div>
            <NextLink href="/arena"><Button className="bg-primary text-white font-black px-8 h-12 rounded-xl glow-primary shadow-xl uppercase text-[10px] tracking-widest animate-shimmer">DEPLOY TO ARENA</Button></NextLink>
          </div>

          {/* Reward Verification Portal (Top Priority) */}
          {activeClaims && activeClaims.length > 0 && user && (
            <div className="space-y-4">
               {activeClaims.map((claim: any) => (
                 <RewardVerificationCard key={claim.id} claim={claim} isAdmin={isAdmin} userId={user.id} />
               ))}
            </div>
          )}

          {pollsLoading ? (
            <Card className="glass border-white/5 p-6 space-y-4">
              <Skeleton className="h-4 w-32 bg-white/10" />
              <Skeleton className="h-8 w-full max-w-md bg-white/10" />
              <div className="space-y-2">
                <Skeleton className="h-12 w-full bg-white/10" />
                <Skeleton className="h-12 w-full bg-white/10" />
              </div>
            </Card>
          ) : activePoll && user ? (
            <div className="grid grid-cols-1 gap-6">
               <PollCard poll={activePoll} userId={user.id} />
            </div>
          ) : null}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {profileLoading ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : (
              <>
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
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
            <div className="lg:col-span-2 space-y-8">
               {tournamentLoading ? (
                 <Card className="glass border-white/5 h-64 overflow-hidden rounded-3xl">
                    <Skeleton className="h-full w-full bg-white/10 animate-pulse" />
                 </Card>
               ) : latestT ? (
                 <Card className="glass border-white/5 bg-black/20 overflow-hidden rounded-3xl animate-in fade-in slide-in-from-left-4 duration-700">
                    <div className="relative h-48">
                       <Image src={latestT.imageUrl || 'https://picsum.photos/seed/latest/800/400'} alt="Latest Arena" fill className="object-cover opacity-60" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                       <div className="absolute bottom-6 left-6 right-6">
                          <div className="flex items-center gap-2 mb-2">
                             <Badge className="bg-red-600 animate-pulse uppercase font-black text-[10px]">LIVE RECRUITMENT</Badge>
                             <Badge variant="outline" className="glass text-[10px] font-black uppercase text-white">TH {latestT.townHall || 'ANY'}</Badge>
                          </div>
                          <h3 className="text-3xl font-headline font-black uppercase italic tracking-tighter text-white">{latestT.name}</h3>
                       </div>
                    </div>
                    <CardContent className="p-6 flex justify-between items-center">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase text-muted-foreground">Reward Pool</p>
                          <p className="text-xl font-headline font-black text-primary">{latestT.prizePool}</p>
                       </div>
                       <NextLink href={`/arena/tournament/${latestT.id}`}>
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
                       <div key={i} className="glass p-4 rounded-2xl border-white/5 flex gap-4 items-center hover:bg-white/5 transition-colors cursor-default">
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
               <Card className="glass border-white/5 bg-white/5 p-6 rounded-3xl text-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-700">
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
