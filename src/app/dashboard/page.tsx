'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Swords, 
  Trophy, 
  Users, 
  TrendingUp, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Wallet,
  ShieldAlert,
  Timer,
  Camera,
  Loader2,
  QrCode,
  ImagePlus,
  CheckCircle2
} from 'lucide-react';
import { useDoc, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { default as NextLink } from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;

  // Background Image from App Settings
  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);
  const dashboardBg = bgData?.dashboard;

  const [setupOpen, setSetupOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    username: '', 
    tag: '', 
    townHall: '', 
    upiId: '', 
    upiQrUrl: '' 
  });
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

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
    if (!formData.username || !formData.tag || !formData.townHall) {
      toast({ variant: "destructive", title: "Missing Intel!" });
      return;
    }
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
      losses: profile?.losses ?? 0,
      earnings: profile?.earnings ?? 0,
      rank: profile?.rank || 'ROOKIE',
      isAdmin: profile?.isAdmin || (user.id === MASTER_SUPER_ADMIN_ID),
      isSuperAdmin: profile?.isSuperAdmin || (user.id === MASTER_SUPER_ADMIN_ID)
    };
    if (userRef) {
      setDoc(userRef, newProfile, { merge: true })
        .then(() => {
          setSetupOpen(false);
          toast({ title: "Identity Secured!" });
          setIsSubmitting(false);
        })
        .catch(async (serverError) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'write' }));
          setIsSubmitting(false);
        });
    }
  };

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        {/* Dynamic Dashboard Background - Fixed on all devices */}
        {dashboardBg && (
          <div className="fixed inset-0 z-0 pointer-events-none">
            <Image 
              src={dashboardBg} 
              alt="Dashboard Background" 
              fill 
              className="object-cover opacity-50 saturate-150" 
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/10 to-background" />
            <div className="absolute inset-0 backdrop-blur-[0px]" />
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
            <NextLink href="/arena"><Button className="bg-primary text-white font-black px-8 h-12 rounded-xl glow-primary shadow-xl">FIND TOURNAMENT</Button></NextLink>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass border-border/40 dark:border-white/5 bg-primary/5 hover:bg-primary/10 transition-colors backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4"><Wallet className="w-5 h-5 text-primary" /><Badge variant="outline" className="text-[10px] border-primary/20">WALLET</Badge></div>
                <p className="text-2xl font-black font-headline text-foreground">🪙 {profile?.balance || 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Coins</p>
              </CardContent>
            </Card>
            <Card className="glass border-border/40 dark:border-white/5 hover:bg-muted/10 transition-colors backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4"><Trophy className="w-5 h-5 text-yellow-500" /><Badge variant="outline" className="text-[10px] border-border/20">CAREER</Badge></div>
                <p className="text-2xl font-black font-headline text-foreground">{profile?.wins || 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Victories</p>
              </CardContent>
            </Card>
            <Card className="glass border-border/40 dark:border-white/5 hover:bg-muted/10 transition-colors backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4"><TrendingUp className="w-5 h-5 text-green-500" /><Badge variant="outline" className="text-[10px] border-border/20">STATUS</Badge></div>
                <p className="text-2xl font-black font-headline italic uppercase tracking-tighter text-foreground">{profile?.rank || 'ROOKIE'}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Standing</p>
              </CardContent>
            </Card>
            <Card className="glass border-border/40 dark:border-white/5 hover:bg-muted/10 transition-colors backdrop-blur-xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4"><Zap className="text-blue-500 w-5 h-5" /><Badge variant="outline" className="text-[10px] border-border/20">POWER</Badge></div>
                <p className="text-2xl font-black font-headline uppercase tracking-tighter text-foreground">TH{profile?.townHall || '??'}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Town Hall</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
               <div className="bg-muted/20 border border-border/20 rounded-3xl p-10 flex flex-col items-center justify-center text-center gap-4 backdrop-blur-2xl">
                  <Swords className="w-16 h-16 text-primary animate-pulse" />
                  <div className="space-y-2">
                     <h3 className="font-headline text-2xl font-bold uppercase italic text-foreground">No Active Battles</h3>
                     <p className="text-muted-foreground max-w-sm font-medium">Head over to the Arena to find active tournaments and claim your glory.</p>
                  </div>
                  <NextLink href="/arena"><Button variant="outline" className="mt-4 border-border/20 font-black backdrop-blur-md">BROWSE ARENAS</Button></NextLink>
               </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={setupOpen} onOpenChange={() => {}}>
        <DialogContent className="glass border-border/20 max-w-2xl p-0 overflow-hidden h-[95vh] flex flex-col">
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
          <div className="p-6 border-t border-border/20 bg-background/50"><Button form="setup-form" type="submit" className="w-full bg-primary text-white font-black h-14 rounded-2xl shadow-xl glow-primary" disabled={uploading || isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck className="mr-2" />}SECURE IDENTITY</Button></div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}