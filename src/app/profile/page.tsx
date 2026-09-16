'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CoinIcon } from '@/components/ui/coin-icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, Trophy, Swords, Zap, Timer, QrCode, Edit3, ShieldCheck,
  Loader2, ImagePlus, CreditCard, CheckCircle2, PackageCheck, Eye,
  Gift, IndianRupee, Lock, Check, ChevronRight, ChevronLeft, ExternalLink,
  History, Clock, ArrowRight, UserCog, Medal, Ticket, Save, Crown
} from 'lucide-react';
import { useFirestore, useCollection, useProfile, useBackgrounds } from '@/firebase';
import { doc, setDoc, query, collection, where, orderBy, updateDoc, arrayUnion, limit, increment } from 'firebase/firestore';
import Link from 'next/link';
import { useUser } from "@clerk/nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { RANKS, getRankByWins, getRankByType, RankType } from '@/lib/rank-utils';
import { cn } from '@/lib/utils';
import { AccountSlots } from '@/components/AccountSlots';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import { formatDistanceToNow } from 'date-fns';
import { useCosmetics } from '@/hooks/use-cosmetics';
import { AvatarFrame } from '@/components/cosmetics/AvatarFrame';
const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export default function ProfilePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { profile } = useProfile();
  const { backgrounds: bgData } = useBackgrounds();
  const profileBg = bgData?.profile;

  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;
  const { cosmetics, loading: cosmeticsLoading } = useCosmetics();

  const [activeTab, setActiveTab] = useState('overview');
  const [activeAvatarTab, setActiveAvatarTab] = useState('OWNED');
  const [previewAvatar, setPreviewAvatar] = useState<any>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // --- Profile Edit State ---
  const [editOpen, setEditOpen] = useState(false);
  const [formData, setFormData] = useState({ upiId: '', upiQrUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // --- Rank Logic ---
  const currentRankInfo = useMemo(() => getRankByWins(profile?.wins || 0), [profile?.wins]);
  const activeBadgeInfo = useMemo(() => getRankByType(profile?.activeBadge as RankType || currentRankInfo.type), [profile?.activeBadge, currentRankInfo.type]);

  // --- Data Queries ---
  const winningsQuery = useMemo(() => {
    if (!user) return null;
    return query(collection(db, 'reward-claims'), where('userId', '==', user.id), limit(20));
  }, [db, user?.id]);
  const { data: rawWinnings } = useCollection(winningsQuery);
  const myWinnings = useMemo(() => {
    if (!rawWinnings) return [];
    return [...rawWinnings].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rawWinnings]);

  // --- Withdrawal Queries (Only run if Payout Hub is active) ---
  const withdrawalsQuery = useMemo(() => {
    if (!user?.id || activeTab !== 'payouts') return null;
    return query(collection(db, 'withdrawals'), where('userId', '==', user.id), orderBy('createdAt', 'desc'), limit(5));
  }, [user?.id, db, activeTab]);
  const { data: withdrawals } = useCollection(withdrawalsQuery);
  const pendingWithdrawal = withdrawals?.find(w => w.status === 'pending');

  useEffect(() => {
    if (profile) {
      setFormData({
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
      const result = await uploadToCloudinary(file, { folder: 'qr' });
      setFormData(prev => ({ ...prev, upiQrUrl: result.url })); 
      toast({ title: "QR Updated!" });
    } catch (err) { 
      toast({ variant: "destructive", title: "Upload Failed" }); 
    } finally { 
      setUploading(false); 
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRef || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDoc(userRef, {
        upiId: formData.upiId,
        upiQrUrl: formData.upiQrUrl
      });
      setEditOpen(false); 
      toast({ title: "Payment Settings Updated!" });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetActiveBadge = async (rankType: RankType) => {
    if (!userRef) return;
    await updateDoc(userRef, { activeBadge: rankType });
    toast({ title: "BADGE EQUIPPED" });
  };


  const [purchasingAvatar, setPurchasingAvatar] = useState<string | null>(null);

  const handleEquipAvatar = async (avatarId: string) => {
    if (!userRef) return;
    
    if (avatarId === 'default' || profile?.unlockedAvatars?.includes(avatarId) || isSuperAdmin) {
      await updateDoc(userRef, { equippedAvatar: avatarId });
      toast({ title: "AVATAR EQUIPPED" });
      return;
    }

    const price = cosmetics[avatarId]?.price;
    if (price === undefined || price === null) {
      toast({ variant: 'destructive', title: 'LOCKED', description: 'Item Not Found.' });
      return;
    }
    setPurchasingAvatar(avatarId);
  };

  const confirmPurchaseAvatar = async () => {
    if (!purchasingAvatar || !userRef) return;
    const price = cosmetics[purchasingAvatar]?.price || 0;
    if ((profile?.balance || 0) < price) {
      toast({ variant: 'destructive', title: 'INSUFFICIENT COINS', description: `You need ${price} coins to buy this avatar.` });
      setPurchasingAvatar(null);
      return;
    }

    try {
      await updateDoc(userRef, {
        balance: increment(-price),
        unlockedAvatars: arrayUnion(purchasingAvatar),
        equippedAvatar: purchasingAvatar
      });
      toast({ title: "AVATAR UNLOCKED!", description: `Deducted ${price} coins.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err.message });
    } finally {
      setPurchasingAvatar(null);
    }
  };

  const handlePurchaseAvatar = async (avatar: any) => {
    if (!userRef || !profile) return;
    if (avatar.price > 0 && (profile.balance || 0) < avatar.price) {
      toast({ variant: 'destructive', title: 'INSUFFICIENT COINS', description: `You need ${avatar.price} coins.` });
      return;
    }
    setIsPurchasing(true);
    try {
      await updateDoc(userRef, {
        balance: increment(-avatar.price),
        unlockedAvatars: arrayUnion(avatar.id),
        equippedAvatar: avatar.id
      });
      toast({ title: 'PURCHASED & EQUIPPED', description: `${avatar.name} is now yours!` });
      setPreviewAvatar(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err.message });
    } finally {
      setIsPurchasing(false);
    }
  };

  const AVATAR_TABS = ['OWNED', 'ALL', 'VIP', 'GOLD', 'LEGENDARY', 'MYTHIC'];
  
  const filteredCosmetics = useMemo(() => {
    const items = Object.values(cosmetics);
    if (activeAvatarTab === 'ALL') return items;
    if (activeAvatarTab === 'OWNED') {
      return items.filter(item => item.id === 'default' || profile?.unlockedAvatars?.includes(item.id) || isSuperAdmin);
    }
    return items.filter(item => item.tier === activeAvatarTab);
  }, [cosmetics, activeAvatarTab, profile?.unlockedAvatars, isSuperAdmin]);

  // Glow color based on rank
  const getRankGlow = () => {
    if (profile?.equippedAvatar === 'rainbow_vip_glow') {
      return 'shadow-[0_0_40px_rgba(255,255,255,0.2)] border-white/20';
    }
    switch (activeBadgeInfo.type) {
      case 'LEGENDARY': return 'shadow-[0_0_30px_rgba(239,68,68,0.5)] border-red-500/50';
      case 'CHAMPION': return 'shadow-[0_0_30px_rgba(168,85,247,0.5)] border-purple-500/50';
      case 'EXPERT': return 'shadow-[0_0_30px_rgba(59,130,246,0.5)] border-blue-500/50';
      case 'PRO': return 'shadow-[0_0_30px_rgba(234,179,8,0.5)] border-yellow-500/50';
      default: return 'shadow-lg border-white/10';
    }
  };

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        {/* Legendary Animated Background */}
        <div className="fixed inset-0 pointer-events-none z-[-1]">
          {profileBg ? (
             <Image src={profileBg} alt="Profile Background" fill className="object-cover opacity-30 saturate-150 animate-pulse-slow" priority />
          ) : (
             <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto space-y-8 pb-20 pt-6 px-4">
          
          {/* Commander Identity Card */}
          <div className={cn("relative rounded-3xl overflow-hidden glass p-6 md:p-10 transition-all duration-700 hover:scale-[1.01] bg-gradient-to-br from-black/60 to-black/80 backdrop-blur-xl border", getRankGlow())}>
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ShieldCheck className="w-64 h-64 rotate-12" />
            </div>
            
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
              {/* Hexagon Avatar or VIP Circle */}
              <div className="relative group">
                <AvatarFrame 
                  avatarId={profile?.equippedAvatar || 'default'} 
                  imageUrl={user?.imageUrl} 
                  username={profile?.username}
                  className="w-32 h-32 md:w-40 md:h-40"
                />
                {/* Active Badge overlapping avatar */}
                <div className="absolute -bottom-4 -right-4 bg-background p-1.5 rounded-full shadow-2xl z-20">
                   <div className={cn("flex items-center justify-center w-12 h-12 rounded-full", activeBadgeInfo.className)}>
                     <Trophy className="w-6 h-6 text-white" />
                   </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h1 className="text-4xl md:text-5xl font-headline font-black italic uppercase tracking-tight text-white drop-shadow-md">
                      {profile?.username || user?.firstName || 'WARRIOR'}
                    </h1>
                    {isSuperAdmin ? <CheckCircle2 className="w-6 h-6 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" /> : isAdmin && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                  </div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <Badge variant="outline" className="text-xs font-black uppercase tracking-widest text-primary border-primary/30 bg-primary/10">
                      {profile?.tag || '#NEWBIE'}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-black uppercase tracking-widest border-white/20 bg-white/5">
                      TH {profile?.townHall || '1'}
                    </Badge>
                    <Badge variant="secondary" className={cn("text-xs font-black uppercase tracking-widest text-white", activeBadgeInfo.className)}>
                      {activeBadgeInfo.label}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                  <Button onClick={() => setEditOpen(true)} className="rounded-xl font-black uppercase text-xs h-10 px-6 gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all hover:scale-105">
                    <Wallet className="w-4 h-4" /> Payment Settings
                  </Button>
                  <Link href="/wallet">
                    <Button className="rounded-xl font-black uppercase text-xs h-10 px-6 gap-2 bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(255,69,0,0.5)] transition-all hover:scale-105">
                      <Zap className="w-4 h-4" /> Recharge
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(val) => {
            if (val === 'payouts') {
              router.push('/wallet/withdraw');
            } else {
              setActiveTab(val);
            }
          }} className="w-full space-y-6">
            <TabsList className="bg-black/40 border border-white/10 rounded-2xl h-14 p-1 w-full flex">
              <TabsTrigger value="overview" className="flex-1 rounded-xl font-black uppercase tracking-widest text-xs md:text-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all">
                <UserCog className="w-4 h-4 mr-2 hidden md:block" /> Intel
              </TabsTrigger>
              <TabsTrigger value="avatars" className="flex-1 rounded-xl font-black uppercase tracking-widest text-xs md:text-sm data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(168,85,247,0.5)] transition-all">
                <Crown className="w-4 h-4 mr-2 hidden md:block" /> Avatars
              </TabsTrigger>
              <TabsTrigger value="payouts" className="flex-1 rounded-xl font-black uppercase tracking-widest text-xs md:text-sm data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(22,163,74,0.5)] transition-all">
                <Zap className="w-4 h-4 mr-2 hidden md:block" /> Payouts
              </TabsTrigger>
            </TabsList>

            {/* ============================== */}
            {/* OVERVIEW TAB */}
            {/* ============================== */}
            <TabsContent value="overview" className="space-y-6 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Asset Vaults Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Economy Vault */}
                <Card className="glass border-white/10 hover:border-white/20 transition-all shadow-xl group overflow-hidden">
                  <CardHeader className="pb-2 border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-primary" /> Economy Vault
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 grid grid-cols-2 gap-4">
                    <div className="bg-black/30 rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center gap-2 group-hover:scale-[1.02] transition-transform">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Arena Coins</span>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-white">{profile?.balance || 0}</span>
                        <div className="p-1.5 bg-primary/20 rounded-lg"><Wallet className="w-5 h-5 text-primary" /></div>
                      </div>
                    </div>
                    <div className="bg-green-500/5 rounded-2xl p-4 border border-green-500/20 flex flex-col items-center justify-center gap-2 group-hover:scale-[1.02] transition-transform">
                      <span className="text-[10px] font-black text-green-500/70 uppercase tracking-widest">V-Cash Balance</span>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-black text-green-400">{profile?.vCashBalance || 0}</span>
                        <div className="p-1.5 bg-green-500/20 rounded-lg"><Zap className="w-5 h-5 text-green-500" /></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ticket Inventory */}
                <Card className="glass border-white/10 hover:border-white/20 transition-all shadow-xl group overflow-hidden">
                  <CardHeader className="pb-2 border-b border-white/5 bg-white/[0.02]">
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-amber-500" /> Ticket Inventory
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex items-center justify-between gap-4">
                    <div className="flex-1 bg-gradient-to-b from-amber-900/40 to-black/40 border border-amber-900/50 rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
                       <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Bronze</span>
                       <span className="text-2xl font-black text-amber-500">{profile?.inventory?.bronzeTickets || 0}</span>
                    </div>
                    <div className="flex-1 bg-gradient-to-b from-slate-800/40 to-black/40 border border-slate-700/50 rounded-2xl p-3 flex flex-col items-center justify-center gap-1">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Silver</span>
                       <span className="text-2xl font-black text-slate-300">{profile?.inventory?.silverTickets || 0}</span>
                    </div>
                    <div className="flex-1 bg-gradient-to-b from-yellow-600/30 to-black/40 border border-yellow-500/40 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                       <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest drop-shadow-md">Golden</span>
                       <span className="text-2xl font-black text-yellow-400 drop-shadow-md">{profile?.inventory?.goldenTickets || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Combat Stats */}
              <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                <div className="glass p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1 hover:bg-white/5 transition-colors group">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-full mb-1 group-hover:scale-110 transition-transform"><Swords className="w-5 h-5" /></div>
                  <span className="text-2xl font-black text-white">{profile?.tournamentsPlayed || 0}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center">Tourneys</span>
                </div>
                <div className="glass p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1 hover:bg-white/5 transition-colors group">
                  <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-full mb-1 group-hover:scale-110 transition-transform"><Trophy className="w-5 h-5" /></div>
                  <span className="text-2xl font-black text-white">{profile?.wins || 0}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center">Victories</span>
                </div>
                <div className="glass p-4 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1 hover:bg-white/5 transition-colors group">
                  <div className="p-2 bg-primary/10 text-primary rounded-full mb-1 group-hover:scale-110 transition-transform"><Wallet className="w-5 h-5" /></div>
                  <span className="text-2xl font-black text-white">{profile?.earnings || 0}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center">Earnings</span>
                </div>
                <div className="hidden md:flex glass p-4 rounded-2xl border border-white/5 flex-col items-center justify-center gap-1 hover:bg-white/5 transition-colors group">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-full mb-1 group-hover:scale-110 transition-transform"><Medal className="w-5 h-5" /></div>
                  <span className="text-xl font-black text-white">{currentRankInfo.type}</span>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center">Current Rank</span>
                </div>
              </div>

              {/* Game Accounts Slots */}
              <AccountSlots />

              {/* Rank Roadmap */}
              <Card className="glass border-white/10 relative overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                    <Zap className="w-4 h-4 text-yellow-500" /> Rank Roadmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 -translate-y-1/2 rounded-full" />
                    <ScrollArea className="w-full">
                      <div className="flex items-center justify-between min-w-[600px] pb-4 px-4">
                        {RANKS.map((r, i) => {
                          const isUnlocked = profile?.unlockedBadges?.includes(r.type) || (profile?.wins || 0) >= r.winsRequired;
                          const isCurrentGoal = !isUnlocked && (profile?.wins || 0) < r.winsRequired;
                          const isActive = activeBadgeInfo.type === r.type;

                          return (
                            <div key={r.type} className="relative flex flex-col items-center gap-3 z-10">
                              <div className={cn(
                                "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500",
                                isUnlocked ? r.className : "bg-muted/50 border border-white/5",
                                isActive && "ring-4 ring-offset-4 ring-offset-background ring-primary shadow-2xl scale-110",
                                isCurrentGoal && "ring-2 ring-primary/30 animate-pulse"
                              )}>
                                {isUnlocked ? <Trophy className="w-6 h-6 text-white drop-shadow-md" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
                              </div>
                              <div className="text-center">
                                <p className={cn("text-xs font-black uppercase tracking-widest", isUnlocked ? "text-foreground" : "text-muted-foreground")}>{r.type}</p>
                                <p className="text-[9px] text-muted-foreground font-bold">{isUnlocked ? 'UNLOCKED' : `${profile?.wins || 0} / ${r.winsRequired} WINS`}</p>
                              </div>
                              {isUnlocked && !isActive && (
                                <Button size="sm" variant="outline" className="h-6 text-[9px] font-black uppercase tracking-widest mt-1 hover:bg-white/10" onClick={() => handleSetActiveBadge(r.type)}>
                                  Equip
                                </Button>
                              )}
                              {isUnlocked && isActive && (
                                <Badge className="mt-1 bg-primary/20 text-primary border-none text-[9px] tracking-widest">EQUIPPED</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>

              {/* Career Winnings History */}
              <Card className="glass border-white/10 overflow-hidden">
                <CardHeader className="bg-white/5 pb-4">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                    <PackageCheck className="w-4 h-4 text-primary" /> Career Winnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {myWinnings.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center opacity-60">
                      <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">No victories yet</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Win tournaments to build your legacy.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {myWinnings.map((w: any) => {
                        let dateText = 'Just now';
                        if (w.createdAt) {
                          try {
                            if (typeof w.createdAt.toDate === 'function') {
                              dateText = formatDistanceToNow(w.createdAt.toDate(), { addSuffix: true });
                            } else if (typeof w.createdAt === 'string' || typeof w.createdAt === 'number') {
                              dateText = formatDistanceToNow(new Date(w.createdAt), { addSuffix: true });
                            }
                          } catch (e) {
                            dateText = 'Recently';
                          }
                        }

                        const rType = w.rewardType || 'coin';
                        const rValue = w.rewardValue || w.coinReward || 0;

                        return (
                          <div key={w.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Trophy className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-foreground uppercase">{w.tournamentName || 'Tournament Victory'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {rType === 'coin' && <span className="text-xs font-black text-primary"><CoinIcon /> {rValue}</span>}
                                  {rType === 'v-cash' && <span className="text-xs font-black text-green-500">⚡ {rValue}</span>}
                                  {rType === 'ticket' && <span className="text-xs font-black text-amber-500">🎫 {rValue} {w.rewardTicketType || ''} Ticket</span>}
                                  {rType !== 'coin' && rType !== 'v-cash' && rType !== 'ticket' && <span className="text-xs font-black text-primary">🎁 {w.rewardItemName || rValue}</span>}
                                  
                                  {w.status === 'pending' && <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20">Processing</Badge>}
                                  {w.status === 'completed' && <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-500 border-green-500/20">Paid</Badge>}
                                </div>
                              </div>
                            </div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase">
                              {dateText}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>

            {/* ============================== */}
            {/* AVATARS TAB */}
            {/* ============================== */}
            <TabsContent value="avatars" className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="glass border-white/10">
                <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                    <Crown className="w-4 h-4 text-purple-500" /> Avatar Collection
                  </CardTitle>
                  <Tabs value={activeAvatarTab} onValueChange={setActiveAvatarTab} className="w-full md:w-auto">
                    <TabsList className="bg-black/40 border border-white/5 flex overflow-x-auto h-auto py-1 px-1">
                      {AVATAR_TABS.map(tab => (
                        <TabsTrigger key={tab} value={tab} className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-full px-4 py-1.5 uppercase font-black text-[10px] tracking-widest">
                          {tab}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredCosmetics.map((avatar) => {
                    const isEquipped = profile?.equippedAvatar === avatar.id || (!profile?.equippedAvatar && avatar.id === 'default');
                    const isUnlocked = avatar.id === 'default' || profile?.unlockedAvatars?.includes(avatar.id) || isSuperAdmin;
                    
                    const getTierCardGlow = (tier: string, isEquipped: boolean) => {
                      if (isEquipped) return 'bg-primary/20 border-primary shadow-[0_0_25px_rgba(255,69,0,0.5)]';
                      const base = 'bg-black/20 hover:bg-white/5 transition-all duration-500';
                      if (tier === 'MYTHIC') return `${base} border-fuchsia-500/40 shadow-[0_0_30px_rgba(217,70,239,0.2)] hover:shadow-[0_0_50px_rgba(217,70,239,0.5)] hover:border-fuchsia-400/60`;
                      if (tier === 'LEGENDARY') return `${base} border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:shadow-[0_0_40px_rgba(239,68,68,0.3)]`;
                      if (tier === 'GOLD') return `${base} border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.1)] hover:shadow-[0_0_30px_rgba(234,179,8,0.2)]`;
                      return `${base} border-white/5`;
                    };
                    
                    return (
                      <div key={avatar.id} className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border ${getTierCardGlow(avatar.tier, isEquipped)} cursor-pointer h-48 group overflow-visible mt-4`} onClick={() => setPreviewAvatar(avatar)}>
                         {avatar.tier !== 'DEFAULT' && (
                           <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase shadow-lg z-30 ${
                             avatar.tier === 'VIP' ? 'bg-gradient-to-r from-red-500 to-purple-500 text-white' : 
                             avatar.tier === 'GOLD' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black shadow-[0_0_15px_rgba(250,204,21,0.6)] border border-yellow-300/50' : 
                             avatar.tier === 'LEGENDARY' ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.8)] border border-red-400/50 animate-pulse' :
                             'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 text-white shadow-[0_0_25px_rgba(217,70,239,0.9)] border border-fuchsia-400/80 animate-pulse'
                           }`}>
                             {avatar.tier}
                           </div>
                         )}
                         
                         <AvatarFrame 
                           avatarId={avatar.id} 
                           imageUrl={user?.imageUrl} 
                           username={profile?.username}
                           className="w-20 h-20 group-hover:scale-110 transition-transform"
                         />
                         
                         <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-center text-white">{avatar.name}</p>
                         
                         {!isUnlocked && (
                           <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 bg-black/80 rounded-full px-2 py-0.5 flex items-center justify-center border border-white/10 shadow-lg">
                              <Lock className="w-3 h-3 text-muted-foreground mr-1" />
                              <span className="text-[8px] font-black text-yellow-500">{avatar.price > 0 ? `${avatar.price} COINS` : 'VIP PASS'}</span>
                           </div>
                         )}
                         {isEquipped && <Badge className="absolute top-2 right-2 bg-primary text-[8px] px-1 border-none z-30">Equipped</Badge>}
                      </div>
                    )
                  })}
                  {filteredCosmetics.length === 0 && (
                    <div className="col-span-full py-10 text-center text-muted-foreground text-xs uppercase font-black">
                      No cosmetics found in this category.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================== */}
            {/* PAYOUT HUB TAB */}
            {/* ============================== */}
            <TabsContent value="payouts" className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center justify-center p-12 text-center glass rounded-3xl border border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.1)]">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                   <Zap className="w-10 h-10 text-green-500 animate-pulse" />
                </div>
                <h3 className="font-headline text-3xl font-black italic uppercase tracking-wider text-white mb-2">
                  SMART PAYOUT HUB
                </h3>
                <p className="text-muted-foreground font-bold mb-8 max-w-md">
                  We have upgraded to a new Smart Payout Hub! You can now view your Unplayed Balance refunds vs Winnings fee breakdown before withdrawing.
                </p>
                <Link href="/wallet/withdraw">
                  <Button className="h-14 px-8 bg-green-600 hover:bg-green-500 text-white font-black text-lg uppercase tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-105">
                    Go to Payout Hub <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </TabsContent>

          </Tabs>

        </div>
      </div>

      {/* PAYMENT SETTINGS MODAL */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px] glass border-white/10">
          <DialogHeader>
            <DialogTitle className="font-headline italic text-2xl uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" /> Payment Settings
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Configure your UPI details for cashouts.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4 mt-2">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">UPI ID (For Withdrawals)</Label>
                <Input value={formData.upiId} onChange={e => setFormData(prev => ({...prev, upiId: e.target.value}))} placeholder="username@upi" className="bg-black/50 border-white/10 text-white font-bold" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">UPI QR Code Image</Label>
                <div className="flex items-center gap-4">
                  {formData.upiQrUrl ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-primary/50 group">
                      <Image src={formData.upiQrUrl} alt="QR Code" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => qrInputRef.current?.click()}>
                        <Edit3 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" className="h-20 w-20 rounded-xl border-dashed border-white/20 bg-black/50 hover:bg-white/10 hover:border-white/40 flex-col gap-2" onClick={() => qrInputRef.current?.click()}>
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <><ImagePlus className="w-5 h-5 text-muted-foreground" /><span className="text-[9px] font-bold uppercase text-muted-foreground">Upload</span></>}
                    </Button>
                  )}
                  <input type="file" ref={qrInputRef} onChange={handleQrUpload} accept="image/*" className="hidden" />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-12 rounded-xl mt-4">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Payment Intel"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Avatar Purchase Dialog */}
      <Dialog open={!!purchasingAvatar} onOpenChange={(open) => !open && setPurchasingAvatar(null)}>
        <DialogContent className="glass border-primary/20 max-w-sm p-6 rounded-3xl bg-black/95">
          <DialogHeader>
            <DialogTitle className="font-headline italic uppercase text-2xl text-white text-center">Unlock Avatar</DialogTitle>
            <DialogDescription className="text-center text-white/60">
              Are you sure you want to purchase this premium avatar for <span className="font-black text-yellow-400">{purchasingAvatar ? cosmetics[purchasingAvatar]?.price : 0} Coins</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 mt-6">
            <Button variant="ghost" onClick={() => setPurchasingAvatar(null)} className="flex-1 rounded-xl text-white hover:bg-white/10 uppercase font-black text-xs">
              Cancel
            </Button>
            <Button onClick={confirmPurchaseAvatar} className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white uppercase font-black text-xs shadow-[0_0_20px_rgba(255,69,0,0.4)]">
              Buy Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================== */}
      {/* AVATAR PREVIEW MODAL */}
      {/* ============================== */}
      <Dialog open={!!previewAvatar} onOpenChange={(open) => !open && setPreviewAvatar(null)}>
        {previewAvatar && (
          <DialogContent className="sm:max-w-[400px] bg-zinc-950 border border-white/10 text-white p-0 overflow-hidden shadow-2xl">
            <div className={`relative p-8 flex flex-col items-center justify-center min-h-[300px] ${
              previewAvatar.tier === 'MYTHIC' ? 'bg-gradient-to-b from-fuchsia-950/40 to-transparent' : 
              previewAvatar.tier === 'LEGENDARY' ? 'bg-gradient-to-b from-red-950/40 to-transparent' : 
              previewAvatar.tier === 'GOLD' ? 'bg-gradient-to-b from-yellow-950/20 to-transparent' : ''
            }`}>
              {previewAvatar.tier !== 'DEFAULT' && (
                <Badge className={`absolute top-4 left-4 uppercase font-black text-[10px] tracking-widest ${
                  previewAvatar.tier === 'VIP' ? 'bg-gradient-to-r from-red-500 to-purple-500 text-white border-none' : 
                  previewAvatar.tier === 'GOLD' ? 'bg-yellow-500 text-black border-none' : 
                  previewAvatar.tier === 'LEGENDARY' ? 'bg-red-600 text-white border-none' :
                  'bg-fuchsia-600 text-white border-none'
                }`}>
                  {previewAvatar.tier}
                </Badge>
              )}
              
              <AvatarFrame 
                avatarId={previewAvatar.id} 
                imageUrl={user?.imageUrl} 
                username={profile?.username}
                className="w-32 h-32 my-6 scale-125"
              />
              
              <h2 className="mt-8 text-2xl font-black uppercase tracking-wider text-white text-center">
                {previewAvatar.name}
              </h2>
              <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mt-1">
                {previewAvatar.type === 'lottie' ? 'Animated Lottie Frame' : 'Premium CSS Frame'}
              </p>
            </div>

            <div className="p-6 bg-black/40 border-t border-white/5 space-y-4">
              {(() => {
                const isOwned = previewAvatar.id === 'default' || profile?.unlockedAvatars?.includes(previewAvatar.id) || isSuperAdmin;
                const isEquipped = profile?.equippedAvatar === previewAvatar.id || (!profile?.equippedAvatar && previewAvatar.id === 'default');
                
                if (isEquipped) {
                  return (
                    <Button disabled className="w-full bg-primary/20 text-primary border border-primary/50 font-black tracking-widest uppercase h-12">
                      <CheckCircle2 className="w-5 h-5 mr-2" /> Currently Equipped
                    </Button>
                  );
                }
                
                if (isOwned) {
                  return (
                    <Button onClick={() => { handleEquipAvatar(previewAvatar.id); setPreviewAvatar(null); }} className="w-full bg-primary hover:bg-primary/90 text-white font-black tracking-widest uppercase h-12">
                      Equip Avatar
                    </Button>
                  );
                }
                
                // Not owned
                if (previewAvatar.price === 0 && previewAvatar.tier === 'VIP') {
                  return (
                    <Button disabled className="w-full bg-zinc-800 text-zinc-400 font-black tracking-widest uppercase h-12">
                      <Lock className="w-5 h-5 mr-2" /> Requires VIP Pass
                    </Button>
                  );
                }
                
                return (
                  <Button 
                    onClick={() => handlePurchaseAvatar(previewAvatar)} 
                    disabled={isPurchasing}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black tracking-widest uppercase h-12 relative overflow-hidden group"
                  >
                    {isPurchasing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                        <span className="relative z-10 flex items-center">Buy for {previewAvatar.price} Coins</span>
                      </>
                    )}
                  </Button>
                );
              })()}
            </div>
          </DialogContent>
        )}
      </Dialog>

    </PageWrapper>
  );
}
