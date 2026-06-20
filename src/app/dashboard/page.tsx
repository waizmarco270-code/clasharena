'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
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
  CheckCircle2
} from 'lucide-react';
import { useDoc, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Dashboard() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  // Setup Form State
  const [setupOpen, setSetupOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', tag: '', townHall: '', avatarUrl: '' });
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profileLoading && profile) {
      const isComplete = profile.username && profile.tag && profile.townHall;
      setSetupOpen(!isComplete);
      setFormData({
        username: profile.username || '',
        tag: profile.tag || '',
        townHall: profile.townHall?.toString() || '',
        avatarUrl: profile.avatarUrl || user?.imageUrl || ''
      });
    } else if (!profileLoading && !profile && user) {
      setSetupOpen(true);
      setFormData(prev => ({ ...prev, avatarUrl: user.imageUrl || '' }));
    }
  }, [profile, profileLoading, user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formDataCld = new FormData();
      formDataCld.append('file', file);
      formDataCld.append('upload_preset', 'ml_default');

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Cloudinary not configured.");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formDataCld }
      );

      const data = await response.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, avatarUrl: data.secure_url }));
        toast({ title: "War Portrait Updated!" });
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    if (!formData.username || !formData.tag || !formData.townHall) {
      toast({ variant: "destructive", title: "Missing Intel!", description: "Fill out all fields warrior." });
      return;
    }

    setIsSubmitting(true);
    const lockDate = new Date();
    lockDate.setDate(lockDate.getDate() + 3);

    const newProfile = {
      username: formData.username,
      tag: formData.tag.startsWith('#') ? formData.tag : `#${formData.tag}`,
      townHall: parseInt(formData.townHall),
      avatarUrl: formData.avatarUrl,
      profileLockedUntil: lockDate.toISOString(),
      balance: profile?.balance ?? 0, // Set to 0 if new
      wins: profile?.wins ?? 0,
      losses: profile?.losses ?? 0,
      earnings: profile?.earnings ?? 0,
      rank: profile?.rank ?? 'Rookie'
    };

    if (userRef) {
      setDoc(userRef, newProfile, { merge: true })
        .then(() => {
          setSetupOpen(false);
          toast({ title: "Identity Secured!", description: "Welcome to the Arena Hub." });
          setIsSubmitting(false);
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'write',
            requestResourceData: newProfile,
          });
          errorEmitter.emit('permission-error', permissionError);
          setIsSubmitting(false);
        });
    }
  };

  const activeTournaments = [
    {
      id: '1',
      name: 'Titan Clash Championship',
      category: 'TH16 Arena',
      prize: 2000,
      image: PlaceHolderImages.find(img => img.id === 'th16-arena')?.imageUrl
    },
    {
      id: '2',
      name: 'Rising Stars Cup',
      category: 'TH15 Arena',
      prize: 1000,
      image: PlaceHolderImages.find(img => img.id === 'th15-arena')?.imageUrl
    }
  ];

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="font-headline text-3xl md:text-4xl font-black mb-2 tracking-tight uppercase">
              COMMAND <span className="text-primary italic">HUB</span>
            </h1>
            <p className="text-muted-foreground font-medium">
              Welcome back, <span className="text-white font-bold">{profile?.username || 'Warrior'}</span>. The arena awaits.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/arena">
              <Button className="bg-primary hover:bg-primary/90 font-black px-8 h-12 rounded-xl glow-primary">
                FIND TOURNAMENT
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass border-white/5 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Wallet className="w-5 h-5 text-primary" />
                <Badge variant="outline" className="text-[10px] border-primary/20">WALLET</Badge>
              </div>
              <p className="text-2xl font-black font-headline">🪙 {profile?.balance || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Available Coins</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <Badge variant="outline" className="text-[10px] border-white/10">CAREER</Badge>
              </div>
              <p className="text-2xl font-black font-headline">{profile?.wins || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Total Victories</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <TrendingUp className="w-5 h-5 text-green-500" />
                <Badge variant="outline" className="text-[10px] border-white/10">STATUS</Badge>
              </div>
              <p className="text-2xl font-black font-headline italic uppercase tracking-tighter">{profile?.rank || 'ROOKIE'}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Current Standing</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Zap className="text-blue-500 w-5 h-5" />
                <Badge variant="outline" className="text-[10px] border-white/10">POWER</Badge>
              </div>
              <p className="text-2xl font-black font-headline uppercase tracking-tighter">TH{profile?.townHall || '??'}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Town Hall Level</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-xl font-bold flex items-center gap-2">
                <Swords className="text-primary w-5 h-5" /> HOT ARENAS
              </h2>
              <Link href="/arena" className="text-xs text-primary font-bold hover:underline">VIEW ALL</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeTournaments.map((t) => (
                <Card key={t.id} className="overflow-hidden glass border-white/5 group hover:border-primary/30 transition-all">
                  <div className="relative h-40">
                    <Image src={t.image || ''} alt={t.name} fill className="object-cover group-hover:scale-105 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-4">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">{t.category}</p>
                      <h3 className="font-headline font-bold text-lg">{t.name}</h3>
                    </div>
                  </div>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Prize Pool</p>
                      <p className="font-bold">🪙 {t.prize}</p>
                    </div>
                    <Link href={`/arena/tournament/${t.id}`}>
                      <Button size="sm" className="bg-white text-black hover:bg-white/90 font-bold px-4 h-9">
                        JOIN
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-primary/5 border border-primary/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <ShieldCheck className="w-24 h-24" />
              </div>
              <CardContent className="p-8">
                <h3 className="font-headline text-2xl font-black mb-2 flex items-center gap-3 italic">
                  FAIR PLAY <span className="text-primary">ENFORCED</span>
                </h3>
                <p className="text-muted-foreground text-sm max-w-lg mb-6 leading-relaxed">
                  Every result is scanned by our advanced AI Vision systems. Any form of cheating leads to an instant ban.
                </p>
                <Link href="/hall-of-champions">
                  <Button variant="outline" className="border-white/10 hover:bg-white/5 font-bold group">
                    VIEW VERIFIED LEDGER
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <h2 className="font-headline text-xl font-bold flex items-center gap-2">
              <Users className="text-primary w-5 h-5" /> RECENT CHAMPIONS
            </h2>
            <Card className="glass border-white/5 overflow-hidden">
              <CardContent className="p-0">
                {[
                  { name: 'SlayerX', win: '+🪙 500', time: '2m ago' },
                  { name: 'DragonKing', win: '+🪙 200', time: '12m ago' },
                  { name: 'ProClash', win: '+🪙 1200', time: '45m ago' },
                  { name: 'KingArthur', win: '+🪙 5000', time: '1h ago' },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center justify-between p-4 ${i !== 3 ? 'border-b border-white/5' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-black text-[10px]">
                        {item.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                    <p className="text-xs font-black text-green-500">{item.win}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Identity Setup Modal */}
      <Dialog open={setupOpen} onOpenChange={() => {}}>
        <DialogContent className="glass border-white/10 max-w-xl p-0 overflow-hidden sm:rounded-3xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary animate-shimmer" />
          <DialogHeader className="pt-8 px-8">
            <DialogTitle className="font-headline text-3xl font-black italic tracking-tighter uppercase text-center">
              ARENA <span className="legendary-text">IDENTITY</span>
            </DialogTitle>
            <DialogDescription className="text-center font-medium">
              Complete your profile to unlock full access.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSetupSubmit} className="p-8 space-y-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-28 w-28 border-4 border-primary/20 p-1 bg-background glow-primary">
                  <AvatarImage src={formData.avatarUrl} className="rounded-full object-cover" />
                  <AvatarFallback className="bg-muted text-2xl font-black">
                    {formData.username?.substring(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  type="button"
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full bg-primary hover:bg-primary/90 h-8 w-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">War Portrait</p>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3 items-start">
              <ShieldAlert className="w-6 h-6 text-primary shrink-0 animate-pulse" />
              <div className="text-[11px] space-y-1">
                <p className="font-black text-primary uppercase tracking-widest">SECURITY PROTOCOL</p>
                <p className="text-muted-foreground leading-relaxed">
                  Identity will be locked for 72 hours for fair play.
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Username</Label>
                <Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="bg-white/5 border-white/10 h-12 font-bold" placeholder="E.g. SlayerX" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Clash Tag</Label>
                <Input value={formData.tag} onChange={(e) => setFormData({...formData, tag: e.target.value})} className="bg-white/5 border-white/10 h-12 font-mono" placeholder="#ABC123" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Town Hall</Label>
              <Select value={formData.townHall} onValueChange={(val) => setFormData({...formData, townHall: val})}>
                <SelectTrigger className="bg-white/5 border-white/10 h-12 font-bold">
                  <SelectValue placeholder="Select TH Level" />
                </SelectTrigger>
                <SelectContent>
                  {[9, 10, 11, 12, 13, 14, 15, 16, 17].map((th) => (
                    <SelectItem key={th} value={th.toString()}>Town Hall {th}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 font-black h-14 rounded-2xl glow-primary text-lg"
              disabled={uploading || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
              SECURE ARENA IDENTITY
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
