
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
  ChevronLeft,
  QrCode,
  IndianRupee
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

  // Winner UPI verification states
  const [winnerUpiQr, setWinnerUpiQr] = useState('');
  const [winnerUpiId, setWinnerUpiId] = useState('');
  const [winnerUpiName, setWinnerUpiName] = useState('');
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Admin payment proof states
  const [adminPaymentProof, setAdminPaymentProof] = useState('');
  const [uploadingPaymentProof, setUploadingPaymentProof] = useState(false);
  const adminProofInputRef = useRef<HTMLInputElement>(null);

  // Winner receive proof states
  const [winnerReceiveProof, setWinnerReceiveProof] = useState('');
  const [uploadingReceiveProof, setUploadingReceiveProof] = useState(false);
  const receiveProofInputRef = useRef<HTMLInputElement>(null);

  // Load user profile to auto-fill UPI QR/ID/Name
  const userRef = useMemo(() => userId ? doc(db, 'users', userId) : null, [db, userId]);
  const { data: profile } = useDoc(userRef);

  useEffect(() => {
    if (profile && claim?.rewardType === 'money') {
      if (!winnerUpiId) setWinnerUpiId(profile.upiId || '');
      if (!winnerUpiQr) setWinnerUpiQr(profile.upiQrUrl || '');
      if (!winnerUpiName) setWinnerUpiName(profile.username || '');
    }
  }, [profile, claim]);

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

  // Money Reward Verification Handlers
  const handleWinnerSubmitUpi = async () => {
    if (!winnerUpiQr || !winnerUpiId.trim() || !winnerUpiName.trim() || loading) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'reward-claims', claim.id), {
        upiQrUrl: winnerUpiQr,
        upiId: winnerUpiId.trim(),
        upiName: winnerUpiName.trim(),
        status: 'money_verifying'
      });
      toast({ title: "UPI DETAILS SUBMITTED", description: "Verification portal is now in Verification Mode." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "SUBMISSION FAILED", description: "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleWinnerQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setWinnerUpiQr(data.secure_url);
        toast({ title: "QR SCREENSHOT READY" });
      }
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "UPLOAD FAILED" });
    } finally {
      setUploadingQr(false);
    }
  };

  const handleAdminConfirmPayment = async () => {
    if (!adminPaymentProof || loading) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'reward-claims', claim.id), {
        proofImageUrl: adminPaymentProof,
        status: 'money_paid'
      });
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audience: 'user',
            userId: claim.userId,
            title: 'Payment Dispatched! 💸',
            body: `Admin has sent your reward for "${claim.tournamentName}". Upload receipt to complete verification!`,
            data: {
              type: 'reward_fulfillment',
              claimId: claim.id
            }
          })
        });
      } catch (e) {
        console.error("Failed to send player payment notification:", e);
      }
      toast({ title: "PAYMENT MARKED AS SENT" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "SUBMISSION FAILED" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminPaymentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPaymentProof(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setAdminPaymentProof(data.secure_url);
        toast({ title: "PAYMENT PROOF READY" });
      }
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "UPLOAD FAILED" });
    } finally {
      setUploadingPaymentProof(false);
    }
  };

  const handleWinnerConfirmReceive = async () => {
    if (!winnerReceiveProof || loading) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'reward-claims', claim.id), {
        proofImageUrl2: winnerReceiveProof,
        status: 'money_confirming'
      });
      toast({ title: "RECEIVE PROOF DISPATCHED", description: "Awaiting final admin approval." });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "SUBMISSION FAILED" });
    } finally {
      setLoading(false);
    }
  };

  const handleWinnerReceiveProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceiveProof(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setWinnerReceiveProof(data.secure_url);
        toast({ title: "RECEIPT PROOF READY" });
      }
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "UPLOAD FAILED" });
    } finally {
      setUploadingReceiveProof(false);
    }
  };

  const handleAdminFinalConfirmation = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'reward-claims', claim.id), {
        status: 'completed',
        completedAt: new Date().toISOString()
      });
      const amount = parseInt(claim.rewardValue) || 0;
      await updateDoc(doc(db, 'users', claim.userId), {
        earnings: increment(amount)
      });
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audience: 'user',
            userId: claim.userId,
            title: 'Victory Verified! 🏆',
            body: `Your reward of ₹ ${claim.rewardValue} for "${claim.tournamentName}" has been verified and processed.`,
            data: {
              type: 'reward_fulfillment',
              claimId: claim.id
            }
          })
        });
      } catch (e) {
        console.error("Failed to send final payment confirmation notification:", e);
      }
      toast({ title: "REWARD FULLY PROCESSED & VERIFIED" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "CONFIRMATION FAILED" });
    } finally {
      setLoading(false);
    }
  };

  const isWinner = userId === claim.userId;
  const status = claim.status;

  if (claim.rewardType === 'money') {
    return (
      <Card className="glass border-orange-500/40 bg-orange-500/5 overflow-hidden animate-in fade-in zoom-in duration-700 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 animate-pulse" />
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-500/20 rounded-2xl border border-orange-500/30">
                   <Trophy className="w-6 h-6 text-orange-500 animate-bounce" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em]">Victory Verification Portal</p>
                   <CardTitle className="font-headline text-2xl font-black uppercase italic tracking-tighter">Congratulations, <span className="text-white">{claim.username}</span></CardTitle>
                </div>
             </div>
             <Badge className="bg-orange-500 text-black font-black uppercase">{status.replace('_', ' ')}</Badge>
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
                <p className="text-xs font-bold uppercase text-orange-500">1st Position (Champion)</p>
             </div>
             <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
                <p className="text-[8px] font-black text-muted-foreground uppercase">Reward Prize</p>
                <p className="text-xs font-bold uppercase text-primary">₹ {claim.rewardValue}</p>
             </div>
          </div>

          {isWinner && status === 'pending' && (
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="text-center md:text-left space-y-2">
                  <p className="text-sm font-bold text-white">Congratulations, You successfully Win the tournament! Follow the process below to get your rewards instantly.</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">All fields are mandatory. Double-check your details to ensure instant processing.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">UPI Name</Label>
                        <Input 
                          value={winnerUpiName} 
                          onChange={e => setWinnerUpiName(e.target.value)} 
                          placeholder="e.g. JOHN DOE" 
                          className="bg-white/5 h-12 font-bold uppercase"
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">UPI ID</Label>
                        <Input 
                          value={winnerUpiId} 
                          onChange={e => setWinnerUpiId(e.target.value)} 
                          placeholder="e.g. john@okaxis" 
                          className="bg-white/5 h-12 font-mono"
                        />
                     </div>
                  </div>

                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Upload UPI QR Code Screenshot</Label>
                     <div onClick={() => qrInputRef.current?.click()} className="relative h-32 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 cursor-pointer overflow-hidden transition-all">
                        {winnerUpiQr ? (
                          <Image src={winnerUpiQr} alt="UPI QR" fill className="object-contain bg-black" />
                        ) : (
                          <>
                             {uploadingQr ? <Loader2 className="animate-spin text-primary" /> : <ImagePlus className="w-8 h-8 text-muted-foreground opacity-40" />}
                             <p className="text-[9px] font-black uppercase text-muted-foreground">Select QR Screenshot</p>
                          </>
                        )}
                        <input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={handleWinnerQrUpload} />
                     </div>
                  </div>
               </div>

               <Button 
                 onClick={handleWinnerSubmitUpi} 
                 disabled={!winnerUpiQr || !winnerUpiId.trim() || !winnerUpiName.trim() || loading} 
                 className="w-full h-14 bg-orange-600 hover:bg-orange-700 font-black uppercase rounded-2xl shadow-xl glow-primary"
               >
                  {loading ? <Loader2 className="animate-spin" /> : 'CONFIRM VERIFICATION & SUBMIT UPI'}
               </Button>
            </div>
          )}

          {isAdmin && status === 'pending' && (
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center space-y-4 animate-pulse">
               <Clock className="w-10 h-10 mx-auto text-muted-foreground opacity-40" />
               <div>
                  <h4 className="font-black text-sm uppercase">AWAITING WINNER VERIFICATION DETAILS...</h4>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">
                     Winner ({claim.username}) needs to upload their UPI Name, UPI ID, and UPI QR Code before payment can be processed.
                  </p>
               </div>
            </div>
          )}

          {isWinner && status === 'money_verifying' && (
            <div className="bg-white/5 p-6 rounded-3xl text-center space-y-4 border border-white/10">
               <Loader2 className="w-10 h-10 animate-spin mx-auto text-orange-500" />
               <div className="space-y-2">
                  <p className="text-sm font-bold text-white uppercase">Verification Mode Activated</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black leading-relaxed">
                     Wait 5-10 minutes until verification gets completed.<br />
                     Our admins are currently checking your details and initiating the instant UPI payout.
                  </p>
               </div>
            </div>
          )}

          {isAdmin && status === 'money_verifying' && (
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-orange-600/10 p-4 rounded-xl border border-orange-500/20 text-center flex items-center justify-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-orange-500" />
                  <p className="text-xs font-black uppercase text-orange-500 tracking-wider">Winner verified his fields</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
                        <p className="text-[8px] font-black text-muted-foreground uppercase">UPI Name</p>
                        <p className="text-sm font-bold uppercase text-white">{claim.upiName}</p>
                     </div>
                     <div className="bg-black/40 p-4 rounded-2xl border border-white/5 space-y-1">
                        <p className="text-[8px] font-black text-muted-foreground uppercase">UPI ID</p>
                        <p className="text-sm font-bold font-mono text-primary select-all">{claim.upiId}</p>
                     </div>
                     <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20 space-y-1">
                        <p className="text-[8px] font-black text-primary uppercase">Payment Amount (Pre-filled)</p>
                        <p className="text-xl font-black font-headline text-white">₹ {claim.rewardValue}</p>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Scan Winner QR Code to Pay</Label>
                     <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden border-2 border-white/10 bg-black">
                        {claim.upiQrUrl && (
                          <a href={claim.upiQrUrl} target="_blank">
                            <Image src={claim.upiQrUrl} alt="Winner QR" fill className="object-contain" />
                          </a>
                        )}
                     </div>
                  </div>
               </div>

               <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Upload Payment Screenshot / Proof</Label>
                     <div onClick={() => adminProofInputRef.current?.click()} className="relative aspect-video w-full max-w-md mx-auto rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 cursor-pointer overflow-hidden transition-all">
                        {adminPaymentProof ? (
                          <Image src={adminPaymentProof} alt="Payment Proof" fill className="object-contain bg-black" />
                        ) : (
                          <>
                             {uploadingPaymentProof ? <Loader2 className="animate-spin text-primary" /> : <ImagePlus className="w-8 h-8 text-muted-foreground opacity-40" />}
                             <p className="text-[9px] font-black uppercase text-muted-foreground">Select Payment Done Screenshot</p>
                          </>
                        )}
                        <input type="file" ref={adminProofInputRef} className="hidden" accept="image/*" onChange={handleAdminPaymentProofUpload} />
                     </div>
                  </div>

                  <Button 
                    onClick={handleAdminConfirmPayment} 
                    disabled={!adminPaymentProof || loading} 
                    className="w-full h-14 bg-green-600 hover:bg-green-700 font-black uppercase text-lg rounded-2xl shadow-xl glow-primary"
                  >
                     {loading ? <Loader2 className="animate-spin" /> : 'CONFIRM PAYMENT FOR WINNER'}
                  </Button>
               </div>
            </div>
          )}

          {isWinner && status === 'money_paid' && (
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-green-600/10 p-4 rounded-xl border border-green-500/20 text-center">
                  <h4 className="font-black text-base uppercase text-green-500">Payment Dispatched by Admin</h4>
                  <p className="text-[10px] text-muted-foreground uppercase font-black mt-1">Review the payment proof below and upload your screenshot confirming you received the amount.</p>
               </div>

               <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest block text-center">Admin Payment Proof Screenshot</Label>
                  <div className="relative aspect-video w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-white/10 bg-black">
                     {claim.proofImageUrl && (
                       <a href={claim.proofImageUrl} target="_blank">
                         <Image src={claim.proofImageUrl} alt="Admin Proof" fill className="object-contain" />
                       </a>
                     )}
                  </div>
               </div>

               <div className="pt-4 border-t border-white/5 space-y-4">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block text-center">Upload Payment Received Proof Screenshot</Label>
                  <div onClick={() => receiveProofInputRef.current?.click()} className="relative aspect-video w-full max-w-md mx-auto rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 cursor-pointer overflow-hidden transition-all">
                     {winnerReceiveProof ? (
                       <Image src={winnerReceiveProof} alt="Receive Proof" fill className="object-contain bg-black" />
                     ) : (
                       <>
                          {uploadingReceiveProof ? <Loader2 className="animate-spin text-primary" /> : <ImagePlus className="w-8 h-8 text-muted-foreground opacity-40" />}
                          <p className="text-[9px] font-black uppercase text-muted-foreground">Select Your Received Receipt Screenshot</p>
                       </>
                     )}
                     <input type="file" ref={receiveProofInputRef} className="hidden" accept="image/*" onChange={handleWinnerReceiveProofUpload} />
                  </div>

                  <Button 
                    onClick={handleWinnerConfirmReceive} 
                    disabled={!winnerReceiveProof || loading} 
                    className="w-full h-14 bg-orange-600 hover:bg-orange-700 font-black uppercase rounded-2xl shadow-xl glow-primary animate-shimmer"
                  >
                     {loading ? <Loader2 className="animate-spin" /> : 'CONFIRM PAYMENT RECEIVED'}
                  </Button>
               </div>
            </div>
          )}

          {isAdmin && status === 'money_paid' && (
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 text-center space-y-4">
               <Loader2 className="w-10 h-10 animate-spin mx-auto text-muted-foreground opacity-40" />
               <div>
                  <h4 className="font-black text-sm uppercase">AWAITING WINNER CONFIRMATION...</h4>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">
                     Winner has been paid. Waiting for the winner to verify the receipt and upload their payment received proof.
                  </p>
               </div>
            </div>
          )}

          {isWinner && status === 'money_confirming' && (
            <div className="bg-white/5 p-6 rounded-3xl text-center space-y-4 border border-white/10">
               <Loader2 className="w-10 h-10 animate-spin mx-auto text-orange-500" />
               <div>
                  <p className="text-sm font-bold text-white uppercase">Awaiting Admin Finalization</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black mt-1 leading-relaxed">
                     You have confirmed receiving the reward. We are verifying your uploaded proof.<br />
                     Once admin reviews and clicks final confirmation, the process will complete!
                  </p>
               </div>
            </div>
          )}

          {isAdmin && status === 'money_confirming' && (
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-500/20 text-center">
                  <h4 className="font-black text-base uppercase text-blue-500">Winner Submitted Payment Received Screenshot</h4>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-primary tracking-widest block text-center">Admin Dispatched Payment Proof</Label>
                     <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-black">
                        {claim.proofImageUrl && (
                          <a href={claim.proofImageUrl} target="_blank">
                            <Image src={claim.proofImageUrl} alt="Admin Proof" fill className="object-contain" />
                          </a>
                        )}
                     </div>
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase text-primary tracking-widest block text-center">Winner Received Payment Proof</Label>
                     <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-black">
                        {claim.proofImageUrl2 && (
                          <a href={claim.proofImageUrl2} target="_blank">
                            <Image src={claim.proofImageUrl2} alt="Winner Proof" fill className="object-contain" />
                          </a>
                        )}
                     </div>
                  </div>
               </div>

               <Button 
                 onClick={handleAdminFinalConfirmation} 
                 disabled={loading} 
                 className="w-full h-14 bg-green-600 hover:bg-green-700 font-black uppercase text-lg rounded-2xl shadow-xl glow-primary"
               >
                  {loading ? <Loader2 className="animate-spin" /> : 'FINAL CONFIRMATION & ARCHIVE PROCESS'}
               </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

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

  const tournamentQuery = useMemo(() => query(collection(db, 'tournaments'), orderBy('startTime', 'desc'), limit(15)), [db]);
  const { data: allT, loading: tournamentLoading } = useCollection(tournamentQuery);
  const latestTournaments = useMemo(() => {
    if (!allT) return [];
    return allT
      .filter(t => t.status === 'open' || t.status === 'upcoming')
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 3);
  }, [allT]);

  // Reward Claims Monitoring (Priority 1)
  const claimsQuery = useMemo(() => {
    if (!user) return null;
    if (isAdmin) return query(collection(db, 'reward-claims'), where('status', 'in', ['pending', 'approved', 'verifying', 'reviewing', 'money_verifying', 'money_paid', 'money_confirming']), limit(5));
    return query(collection(db, 'reward-claims'), where('userId', '==', user.id), where('status', 'in', ['pending', 'approved', 'verifying', 'reviewing', 'money_verifying', 'money_paid', 'money_confirming']), limit(5));
  }, [db, user, isAdmin]);
  const { data: activeClaims } = useCollection(claimsQuery);

  const [setupOpen, setSetupOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', tag: '', townHall: '', upiId: '', upiQrUrl: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSetup, setShowConfirmSetup] = useState(false);

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

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.tag.trim() || !formData.townHall) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter your Username, Clash Tag, and Town Hall level."
      });
      return;
    }
    setShowConfirmSetup(true);
  };

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
      setDoc(userRef, newProfile, { merge: true }).then(() => { 
        setSetupOpen(false); 
        toast({ title: "Identity Secured!" }); 
      }).finally(() => setIsSubmitting(false));
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
               ) : latestTournaments.length > 0 ? (
                  <div className="space-y-4">
                    {latestTournaments.map((t) => (
                      <Card key={t.id} className="glass border-white/5 bg-black/20 overflow-hidden rounded-[2rem] hover:border-primary/30 transition-all group relative animate-in fade-in slide-in-from-left-4 duration-500">
                         <div className="relative h-40">
                            <Image src={t.imageUrl || 'https://picsum.photos/seed/latest/800/400'} alt="Latest Arena" fill className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                            <div className="absolute bottom-4 left-6 right-6">
                               <div className="flex items-center gap-2 mb-2">
                                  <Badge className={cn("uppercase font-black text-[9px] px-2 py-0.5 rounded", t.status === 'open' ? "bg-red-600 animate-pulse" : "bg-blue-600")}>
                                     {t.status === 'open' ? 'LIVE RECRUITMENT' : 'UPCOMING'}
                                  </Badge>
                                  <Badge variant="outline" className="glass text-[9px] font-black uppercase text-white px-2 py-0.5 rounded">TH {t.townHall || 'ANY'}</Badge>
                               </div>
                               <h3 className="text-2xl font-headline font-black uppercase italic tracking-tighter text-white">{t.name}</h3>
                            </div>
                         </div>
                         <CardContent className="p-5 flex justify-between items-center bg-black/35">
                            <div className="space-y-0.5">
                               <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Reward Pool</p>
                               <p className="text-lg font-headline font-black text-primary">{t.prizePool}</p>
                            </div>
                            <NextLink href={`/arena/tournament/${t.id}`}>
                               <Button className="bg-white text-black font-black uppercase h-10 px-6 rounded-xl hover:scale-105 transition-transform text-xs">
                                 JOIN BATTLE <ArrowRight className="ml-2 w-3.5 h-3.5" />
                               </Button>
                            </NextLink>
                         </CardContent>
                      </Card>
                    ))}
                  </div>
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
            <form id="setup-form" onSubmit={handlePreSubmit} className="space-y-8 pb-8">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 border-4 border-primary/20 p-1 bg-background glow-primary"><AvatarImage src={user?.imageUrl} className="rounded-full object-cover" /><AvatarFallback className="bg-muted">??</AvatarFallback></Avatar>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3 items-start"><ShieldAlert className="w-6 h-6 text-primary shrink-0 animate-pulse" /><div className="text-[11px]"><p className="font-black text-primary uppercase tracking-widest">SECURITY PROTOCOL</p><p className="text-muted-foreground">Username, Tag, and Town Hall will be locked for 72 hours.</p></div></div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Username</Label><Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="Enter Your Ingame Name" className="bg-muted/10 h-12 font-bold" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Clash Tag</Label><Input value={formData.tag} onChange={(e) => setFormData({...formData, tag: e.target.value})} placeholder="Enter Clash Tag (e.g. #9Q8YYGG2)" className="bg-muted/10 h-12 font-mono uppercase" /></div>
                <div className="space-y-2 md:col-span-2"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Town Hall</Label><Select value={formData.townHall} onValueChange={(val) => setFormData({...formData, townHall: val})}><SelectTrigger className="bg-muted/10 h-12 font-bold"><SelectValue placeholder="Select TH Level" /></SelectTrigger><SelectContent>{[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((th) => (<SelectItem key={th} value={th.toString()}>Town Hall {th}</SelectItem>))}</SelectContent></Select></div>
              </div>
            </form>
          </ScrollArea>
          <div className="p-6 border-t border-border/20 bg-background/50"><Button form="setup-form" type="submit" className="w-full bg-primary text-white font-black h-14 rounded-2xl shadow-xl glow-primary" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck className="mr-2" />}SECURE IDENTITY</Button></div>
        </DialogContent>
      </Dialog>

      {/* Double Confirmation Warning Modal */}
      <Dialog open={showConfirmSetup} onOpenChange={setShowConfirmSetup}>
        <DialogContent className="glass border-red-500/20 max-w-md p-8 overflow-hidden bg-zinc-950/95 text-center rounded-[2.5rem] outline-none z-[100]">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative mx-auto mb-6 w-20 h-20 rounded-full border-2 border-red-500 bg-zinc-900 flex items-center justify-center shadow-[0_0_24px_rgba(239,68,68,0.4)] pointer-events-none">
            <ShieldAlert className="w-10 h-10 text-red-500 animate-pulse" />
          </div>

          <h3 className="font-headline text-2xl font-black uppercase italic tracking-tight text-white mb-2 leading-none">
            CONFIRM <span className="text-red-500">IDENTITY</span>
          </h3>
          <p className="text-[10px] font-black tracking-[0.2em] text-red-500 uppercase mb-6">
            CRITICAL ACCOUNT VERIFICATION
          </p>

          <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-5 mb-6 text-left space-y-3">
            <p className="text-xs text-white font-semibold leading-relaxed">
              ⚠️ <span className="text-red-500 font-black uppercase">REAL INFORMATION ONLY</span>: Enter your actual Clash of Clans details. Using a fake name or tag (#UID) will result in immediate tournament disqualification and account ban.
            </p>
            <p className="text-[11px] text-muted-foreground leading-normal font-medium border-t border-white/5 pt-2">
              🔒 <span className="text-white font-bold">LOCK PROTOCOL</span>: You will not be able to edit or change your profile details for <span className="text-primary font-bold">3 days</span> after setup completes.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={(e) => {
                setShowConfirmSetup(false);
                handleSetupSubmit(e);
              }}
              disabled={isSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-6 rounded-2xl glow-primary uppercase tracking-widest text-xs"
            >
              {isSubmitting ? "SECURING IDENTITY..." : "I UNDERSTAND, CONFIRM"}
            </Button>
            <button
              onClick={() => setShowConfirmSetup(false)}
              className="text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:text-white transition-colors mt-2"
            >
              BACK TO SETUP
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
