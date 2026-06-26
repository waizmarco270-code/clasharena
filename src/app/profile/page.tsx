
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Wallet, 
  Trophy, 
  Swords, 
  Zap, 
  Timer, 
  QrCode, 
  Edit3, 
  ShieldCheck,
  Loader2,
  ImagePlus,
  CreditCard,
  CheckCircle2,
  PackageCheck,
  Eye,
  Gift,
  IndianRupee,
  Lock,
  Check,
  ChevronRight,
  ChevronLeft,
  ExternalLink
} from 'lucide-react';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, setDoc, query, collection, where, orderBy, updateDoc, arrayUnion } from 'firebase/firestore';
import Link from 'next/link';
import { useUser } from "@clerk/nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { RANKS, getRankByWins, getRankByType, RankType } from '@/lib/rank-utils';
import { cn } from '@/lib/utils';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export default function ProfilePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile } = useDoc(userRef);

  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;

  const [editOpen, setEditOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [formData, setFormData] = useState({ username: '', tag: '', townHall: '', upiId: '', upiQrUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const [selectedProof, setSelectedProof] = useState<any>(null);

  const isLocked = profile?.profileLockedUntil ? new Date(profile.profileLockedUntil) > new Date() : false;

  // Rank Logic
  const currentRankInfo = useMemo(() => getRankByWins(profile?.wins || 0), [profile?.wins]);
  const activeBadgeInfo = useMemo(() => getRankByType(profile?.activeBadge as RankType || currentRankInfo.type), [profile?.activeBadge, currentRankInfo.type]);

  // Winnings Query - Simplified for index-less operation
  const winningsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'reward-claims'), where('userId', '==', user.id));
  }, [db, user?.id]);
  const { data: rawWinnings } = useCollection(winningsQuery);

  // Client-side sort for winnings
  const myWinnings = useMemo(() => {
    if (!rawWinnings) return [];
    return [...rawWinnings].sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [rawWinnings]);

  useEffect(() => {
    if (!profile?.profileLockedUntil) return;
    const timer = setInterval(() => {
      const target = new Date(profile.profileLockedUntil).getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) { setCountdown(''); clearInterval(timer); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdown(`${days}d ${hours}h ${minutes}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, [profile?.profileLockedUntil]);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        tag: profile.tag || '',
        townHall: profile.townHall?.toString() || '',
        upiId: profile.upiId || '',
        upiQrUrl: profile.upiQrUrl || ''
      });
    }
  }, [profile]);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formDataCld = new FormData();
      formDataCld.append('file', file);
      formDataCld.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formDataCld });
      const data = await res.json();
      if (data.secure_url) { setFormData(prev => ({ ...prev, upiQrUrl: data.secure_url })); toast({ title: "QR Updated!" }); }
    } catch (err) { toast({ variant: "destructive", title: "Upload Failed" }); } finally { setUploading(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userRef || isSubmitting) return;
    setIsSubmitting(true);
    const identityUpdate = !isLocked ? {
      username: formData.username,
      tag: formData.tag.startsWith('#') ? formData.tag.toUpperCase() : `#${formData.tag.toUpperCase()}`,
      townHall: parseInt(formData.townHall),
      profileLockedUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    } : {};
    setDoc(userRef, { upiId: formData.upiId, upiQrUrl: formData.upiQrUrl, updatedAt: new Date().toISOString(), ...identityUpdate }, { merge: true })
      .then(() => { setEditOpen(false); toast({ title: "Profile Updated!" }); setIsSubmitting(false); })
      .finally(() => setIsSubmitting(false));
  };

  const handleClaimBadge = async (rankType: RankType) => {
    if (!userRef) return;
    await updateDoc(userRef, {
      unlockedBadges: arrayUnion(rankType),
      activeBadge: rankType, // Auto-set as active on claim
      rank: rankType // Sync legacy rank field
    });
    toast({ title: "BADGE UNLOCKED", description: `You are now a ${rankType}!` });
  };

  const handleSetActiveBadge = async (rankType: RankType) => {
    if (!userRef) return;
    await updateDoc(userRef, { activeBadge: rankType });
    toast({ title: "BADGE EQUIPPED" });
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        <div className="relative rounded-3xl overflow-hidden glass border-white/5 p-6 md:p-10 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <div className={cn("p-1.5 rounded-full", activeBadgeInfo.className)}>
                <Avatar className="h-32 w-32 border-4 border-background/20 p-1 bg-background">
                  <AvatarImage src={user?.imageUrl} className="rounded-full object-cover" />
                  <AvatarFallback className="bg-muted text-2xl font-black">{profile?.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                </Avatar>
              </div>
              <div className={cn("absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[10px] font-black italic shadow-lg flex items-center gap-1", activeBadgeInfo.className)}>
                <activeBadgeInfo.icon className="w-3 h-3" /> TH {profile?.townHall || '??'}
              </div>
            </div>
            <div className="text-center md:text-left flex-1 space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-3">
                <h1 className="font-headline text-4xl font-black mb-1 uppercase tracking-tight">{profile?.username || 'WARRIOR'}</h1>
                {isSuperAdmin ? <CheckCircle2 className="w-8 h-8 text-yellow-500 fill-yellow-500/20" /> : isAdmin && <CheckCircle2 className="w-8 h-8 text-green-500" />}
              </div>
              <p className="text-primary font-bold text-sm tracking-widest">{profile?.tag || '#0000000'} • {activeBadgeInfo.label} Warrior</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <Badge variant="outline" className={cn("bg-white/5 py-1.5 px-4 font-bold text-[10px] uppercase", activeBadgeInfo.className)}>{activeBadgeInfo.label}</Badge>
                {isLocked && <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary py-1.5 px-4 text-[10px] uppercase font-black">LOCKED: {countdown}</Badge>}
                <Button onClick={() => setEditOpen(true)} className="bg-primary font-black h-9 rounded-xl glow-primary gap-2 px-6"><Edit3 className="w-4 h-4" /> <span className="hidden md:inline">EDIT PROFILE</span></Button>
              </div>
            </div>
            <Card className="w-full md:w-auto glass border-primary/20 bg-primary/5"><CardContent className="p-6 flex flex-col items-center"><p className="text-[10px] text-muted-foreground uppercase font-black mb-1">Vault Balance</p><div className="flex items-center gap-2 mb-4"><span className="text-3xl font-headline font-black">🪙 {profile?.balance || 0}</span></div><Link href="/wallet" className="w-full"><Button className="w-full bg-white text-black font-black h-10 shadow-lg"><Wallet className="w-4 h-4 mr-2" /> RECHARGE</Button></Link></CardContent></Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[{ label: 'Tournaments', value: profile?.tournamentsPlayed || '0', icon: <Swords className="text-blue-500 w-4 h-4" /> }, { label: 'Victories', value: profile?.wins || '0', icon: <Trophy className="text-yellow-500 w-4 h-4" /> }, { label: 'Earnings', value: `🪙 ${profile?.earnings || 0}`, icon: <Zap className="text-orange-500 w-4 h-4" /> }, { label: 'Current Rank', value: activeBadgeInfo.label, icon: <ShieldCheck className="text-primary w-4 h-4" /> }].map((stat) => (
                <Card key={stat.label} className="glass border-white/5 text-center p-6 group"><div className="flex justify-center mb-3"><div className="p-2 bg-white/5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">{stat.icon}</div></div><p className="text-2xl font-headline font-black uppercase tracking-tight">{stat.value}</p><p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">{stat.label}</p></Card>
              ))}
            </div>

            {/* Rank Roadmap Section */}
            <Card className="glass border-white/5 overflow-hidden">
               <CardHeader className="border-b border-white/5 bg-white/5">
                 <CardTitle className="font-headline text-lg font-bold flex items-center gap-2 uppercase tracking-tighter">
                   <Zap className="w-5 h-5 text-yellow-500" /> Rank Roadmap
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                  <ScrollArea className="w-full whitespace-nowrap pb-4">
                    <div className="flex gap-6">
                       {RANKS.map((rank) => {
                         const isUnlocked = profile?.unlockedBadges?.includes(rank.type);
                         const canClaim = !isUnlocked && (profile?.wins || 0) >= rank.minWins;
                         const isActive = profile?.activeBadge === rank.type;
                         
                         return (
                           <div key={rank.type} className="flex flex-col items-center gap-4 w-48 shrink-0 relative">
                             <div className={cn(
                               "h-20 w-20 rounded-full flex items-center justify-center transition-all duration-500",
                               rank.className,
                               !isUnlocked && !canClaim ? "grayscale opacity-40 blur-[1px]" : "shadow-xl"
                             )}>
                               <rank.icon className={cn("w-10 h-10 text-white", rank.type === 'CHAMPION' ? "animate-pulse" : "")} />
                             </div>
                             <div className="text-center">
                               <p className="font-black text-sm uppercase italic">{rank.label}</p>
                               <p className="text-[10px] text-muted-foreground font-black">{rank.minWins} WINS REQ.</p>
                             </div>
                             
                             {canClaim ? (
                               <Button onClick={() => handleClaimBadge(rank.type)} className="w-full h-8 bg-green-600 font-black text-[10px] uppercase rounded-xl animate-shimmer border-t border-white/20">
                                 CLAIM BADGE
                               </Button>
                             ) : isUnlocked ? (
                               <Button 
                                 disabled={isActive} 
                                 onClick={() => handleSetActiveBadge(rank.type)} 
                                 variant={isActive ? "default" : "outline"} 
                                 className={cn("w-full h-8 text-[10px] font-black uppercase rounded-xl transition-all", isActive ? "bg-primary border-primary" : "border-white/10 glass")}
                               >
                                 {isActive ? <Check className="w-3 h-3 mr-1" /> : ''} {isActive ? 'EQUIPPED' : 'EQUIP'}
                               </Button>
                             ) : (
                               <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground/60 uppercase">
                                 <Lock className="w-3 h-3" /> {(profile?.wins || 0)} / {rank.minWins} WINS
                               </div>
                             )}
                           </div>
                         );
                       })}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
               </CardContent>
            </Card>

            {/* Winnings Ledger */}
            <Card className="glass border-white/5 overflow-hidden">
               <CardHeader className="border-b border-white/5 bg-white/5"><CardTitle className="font-headline text-lg font-bold flex items-center gap-2 uppercase tracking-tighter"><PackageCheck className="w-5 h-5 text-primary" /> Career Winnings</CardTitle></CardHeader>
               <CardContent className="p-0">
                  <ScrollArea className="max-h-[400px]">
                    {myWinnings && myWinnings.length > 0 ? (
                       <div className="divide-y divide-white/5">
                          {myWinnings.map((claim: any) => (
                            <div key={claim.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                               <div className="flex gap-4 items-center">
                                  <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                     {claim.rewardType === 'money' ? <IndianRupee className="w-5 h-5 text-primary" /> : claim.rewardType === 'coin' ? <Zap className="w-5 h-5 text-primary" /> : <Gift className="w-5 h-5 text-primary" />}
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold uppercase truncate max-w-[150px]">{claim.tournamentName}</p>
                                     <p className="text-[10px] text-muted-foreground uppercase font-black">{claim.rewardType === 'money' ? `₹ ${claim.rewardValue}` : claim.rewardItemName}</p>
                                  </div>
                               </div>
                               <div className="flex items-center gap-3">
                                  <Badge variant={claim.status === 'completed' ? 'default' : 'outline'} className={cn(claim.status === 'completed' ? "bg-green-600" : "border-yellow-500 text-yellow-500", "text-[9px] font-black")}>
                                     {claim.status === 'completed' ? 'DELIVERED' : 'PENDING'}
                                  </Badge>
                                  {claim.proofImageUrl && (
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => setSelectedProof(claim)}><Eye className="w-4 h-4" /></Button>
                                  )}
                               </div>
                            </div>
                          ))}
                       </div>
                    ) : (
                      <div className="p-10 text-center space-y-2 opacity-40"><Trophy className="w-10 h-10 mx-auto mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">No winnings recorded yet</p></div>
                    )}
                  </ScrollArea>
               </CardContent>
            </Card>

            <Card className="glass border-white/5 overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-white/5"><CardTitle className="font-headline text-lg font-bold flex items-center gap-2 uppercase tracking-tighter"><CreditCard className="w-5 h-5 text-primary" /> Payout Protocol</CardTitle></CardHeader>
              <CardContent className="p-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"><div className="space-y-6"><div><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-2 block">Active UPI ID</Label><div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center justify-between"><span className="font-mono font-bold text-primary">{profile?.upiId || 'Not Configured'}</span><QrCode className="w-4 h-4 text-muted-foreground" /></div></div><div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3"><ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" /><p className="text-[10px] leading-relaxed text-muted-foreground uppercase font-bold">Payouts are processed within 24h.</p></div></div><div className="space-y-2"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mb-2 block">Verification QR</Label>{profile?.upiQrUrl ? <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden border-2 border-white/10 glow-primary/20"><Image src={profile.upiQrUrl} alt="UPI QR" fill className="object-cover" /></div> : <div className="aspect-square w-full max-w-[200px] mx-auto rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2"><ImagePlus className="w-8 h-8 text-muted-foreground/30" /><p className="text-[10px] text-muted-foreground uppercase font-bold">No QR Uploaded</p></div>}</div></div></CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="glass border-white/10 max-w-4xl p-0 overflow-hidden outline-none rounded-[2.5rem] flex flex-col h-[75vh]">
          <div className="bg-primary p-6 shrink-0">
             <DialogTitle className="font-headline text-xl uppercase italic text-white">Victory Evidence: {selectedProof?.tournamentName || 'Victory Proof'}</DialogTitle>
          </div>
          <ScrollArea className="flex-1">
             <div className="p-8 space-y-8">
                {selectedProof?.rewardType === 'money' ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                         <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Screenshot 1: Admin Payment Done</Label>
                         <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border-2 border-white/5 bg-black shadow-2xl">
                            {selectedProof.proofImageUrl && <Image src={selectedProof.proofImageUrl} alt="Admin Proof" fill className="object-contain" />}
                            <a href={selectedProof.proofImageUrl} target="_blank" className="absolute top-4 right-4 bg-black/60 p-2 rounded-xl border border-white/20"><ExternalLink className="w-4 h-4 text-white" /></a>
                         </div>
                      </div>
                      <div className="space-y-4">
                         <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Screenshot 2: Payment Received Confirmation</Label>
                         <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border-2 border-white/5 bg-black shadow-2xl">
                            {selectedProof.proofImageUrl2 && <Image src={selectedProof.proofImageUrl2} alt="User Proof" fill className="object-contain" />}
                            <a href={selectedProof.proofImageUrl2} target="_blank" className="absolute top-4 right-4 bg-black/60 p-2 rounded-xl border border-white/20"><ExternalLink className="w-4 h-4 text-white" /></a>
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Screenshot: Delivery Confirmation</Label>
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black">
                         {selectedProof && (typeof selectedProof === 'string' ? (
                           <Image src={selectedProof} alt="Proof" fill className="object-contain" />
                         ) : (
                           <Image src={selectedProof.proofImageUrl} alt="Proof" fill className="object-contain" />
                         ))}
                      </div>
                   </div>
                )}

                {selectedProof && typeof selectedProof === 'object' && (
                   <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                         <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Status</p>
                            <p className="text-xs font-black text-green-500 uppercase">{selectedProof.status}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">
                              {selectedProof.rewardType === 'money' ? 'Reward Prize' : 'Reward Item'}
                            </p>
                            <p className="text-xs font-black text-white uppercase">
                              {selectedProof.rewardType === 'money' ? `₹ ${selectedProof.rewardValue}` : selectedProof.rewardItemName}
                            </p>
                         </div>
                         <div>
                            <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Completed Date</p>
                            <p className="text-xs font-black text-white uppercase">{selectedProof.completedAt ? new Date(selectedProof.completedAt).toLocaleDateString() : 'Pending'}</p>
                         </div>
                      </div>
                   </div>
                )}
             </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass max-w-2xl p-0 h-[95vh] flex flex-col">
          <DialogHeader className="pt-8 px-8 shrink-0"><DialogTitle className="font-headline text-2xl font-black italic uppercase text-center">EDIT <span className="text-primary">IDENTITY</span></DialogTitle></DialogHeader>
          <ScrollArea className="flex-1 px-8 py-6">
            <form id="edit-form" onSubmit={handleUpdateProfile} className="space-y-8 pb-8">
              {isLocked && <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3 items-center"><Timer className="w-6 h-6 text-primary shrink-0" /><div className="text-[11px]"><p className="font-black text-primary uppercase tracking-widest">IDENTITY LOCKED</p><p className="text-muted-foreground">Main fields unlock in: <span className="text-white font-bold">{countdown}</span></p></div></div>}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Username</Label><Input disabled={isLocked} value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="bg-white/5 h-12 font-bold" /></div>
                <div className="space-y-2"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Clash Tag</Label><Input disabled={isLocked} value={formData.tag} onChange={(e) => setFormData({...formData, tag: e.target.value})} className="bg-white/5 h-12 font-mono uppercase" /></div>
                <div className="space-y-2 md:col-span-2"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Town Hall</Label><Select disabled={isLocked} value={formData.townHall} onValueChange={(val) => setFormData({...formData, townHall: val})}><SelectTrigger className="bg-white/5 h-12 font-bold"><SelectValue placeholder="Select TH Level" /></SelectTrigger><SelectContent>{[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((th) => (<SelectItem key={th} value={th.toString()}>Town Hall {th}</SelectItem>))}</SelectContent></Select></div>
              </div>
              <div className="pt-4 border-t border-white/5 space-y-6"><p className="text-[10px] uppercase font-black tracking-widest text-primary">Payout Information</p><div className="grid gap-6 md:grid-cols-2"><div className="space-y-2"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">UPI ID</Label><Input value={formData.upiId} onChange={(e) => setFormData({...formData, upiId: e.target.value})} className="bg-white/5 h-12" /></div><div className="space-y-4"><Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Update QR Screenshot</Label><div className="relative cursor-pointer group" onClick={() => qrInputRef.current?.click()}>{formData.upiQrUrl ? <div className="relative h-40 w-full rounded-2xl overflow-hidden border-2 border-dashed border-primary/40"><Image src={formData.upiQrUrl} alt="UPI QR" fill className="object-cover opacity-60" /></div> : <div className="h-40 w-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5"><ImagePlus className="w-8 h-8 text-muted-foreground" /><p className="text-[10px] font-bold uppercase">Upload QR</p></div>}<input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={handleQrUpload} /></div></div></div></div>
            </form>
          </ScrollArea>
          <div className="p-6 border-t border-white/5 bg-background/50"><Button form="edit-form" type="submit" className="w-full bg-primary font-black h-14 rounded-2xl" disabled={uploading || isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck className="mr-2" />}SAVE CHANGES</Button></div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

