'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, Timer, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ProfileSetup() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  
  const userRef = user ? doc(db, 'users', user.uid) : null;
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const [formData, setFormData] = useState({
    username: '',
    tag: '',
    townHall: '',
    avatarUrl: ''
  });
  const [uploading, setUploading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        tag: profile.tag || '',
        townHall: profile.townHall?.toString() || '',
        avatarUrl: profile.avatarUrl || user?.photoURL || ''
      });

      const lockTime = profile.profileLockedUntil ? new Date(profile.profileLockedUntil) : null;
      if (lockTime && lockTime > new Date()) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    }
  }, [profile, user]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (profile?.profileLockedUntil) {
        const target = new Date(profile.profileLockedUntil).getTime();
        const now = new Date().getTime();
        const diff = target - now;

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(null);
          setIsLocked(false);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [profile]);

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = (height / width) * maxDim;
              width = maxDim;
            } else {
              width = (width / height) * maxDim;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.85);
        };
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      let uploadFile: Blob | File = file;
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "Compressing...", description: "Optimizing your photo for the arena." });
        uploadFile = await compressImage(file);
      }

      const formDataCld = new FormData();
      formDataCld.append('file', uploadFile);
      formDataCld.append('upload_preset', 'ml_default');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formDataCld }
      );

      const data = await response.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, avatarUrl: data.secure_url }));
        toast({ title: "Photo Updated!", description: "Looking sharp, warrior." });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload photo." });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isLocked) return;

    if (!formData.username || !formData.tag || !formData.townHall) {
      toast({ variant: "destructive", title: "Missing Intel!", description: "All fields are required to enter the arena." });
      return;
    }

    const lockDate = new Date();
    lockDate.setDate(lockDate.getDate() + 3);

    const newProfile = {
      username: formData.username,
      tag: formData.tag.startsWith('#') ? formData.tag : `#${formData.tag}`,
      townHall: parseInt(formData.townHall),
      avatarUrl: formData.avatarUrl,
      profileLockedUntil: lockDate.toISOString(),
      balance: profile?.balance ?? 250,
      wins: profile?.wins ?? 0,
      losses: profile?.losses ?? 0,
      earnings: profile?.earnings ?? 0,
      rank: profile?.rank ?? 'Rookie'
    };

    try {
      setDoc(doc(db, 'users', user.uid), newProfile);
      toast({ title: "Identity Secured!", description: "Redirecting to the Command Center..." });
      router.push('/arena');
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || profileLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background/50 selection:bg-primary selection:text-white">
      <Card className="glass w-full max-w-xl border-white/5 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary animate-shimmer" />
        <CardHeader className="space-y-1 text-center pt-8">
          <CardTitle className="font-headline text-4xl font-black italic tracking-tighter uppercase">
            ARENA <span className="legendary-text">IDENTITY</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium">
            Complete your profile to unlock competitive access.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-primary/20 p-1 bg-background glow-primary transition-transform group-hover:scale-105 duration-500">
                  <AvatarImage src={formData.avatarUrl} className="rounded-full object-cover" />
                  <AvatarFallback className="bg-muted text-3xl font-black">
                    {formData.username?.substring(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                {!isLocked && (
                  <Button 
                    type="button"
                    size="icon"
                    className="absolute bottom-1 right-1 rounded-full bg-primary hover:bg-primary/90 shadow-2xl border-2 border-background h-10 w-10 animate-pulse"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                  </Button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em]">War Portrait</p>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex gap-4 items-start">
              <ShieldAlert className="w-8 h-8 text-primary shrink-0 animate-pulse" />
              <div className="text-xs space-y-3">
                <p className="font-black text-primary uppercase tracking-widest text-sm">SECURITY PROTOCOL</p>
                <p className="text-muted-foreground leading-relaxed font-medium">
                  To maintain <span className="text-white font-bold underline decoration-primary/40 underline-offset-2">competitive integrity</span>, your identity details will be <span className="text-white font-bold">LOCKED for 72 hours</span> after confirmation. Fake IDs will lead to a permanent ban.
                </p>
              </div>
            </div>

            {isLocked && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-4">
                  <Timer className="w-6 h-6 text-yellow-500 animate-spin-slow" style={{ animationDuration: '3s' }} />
                  <div>
                    <p className="text-xs font-black text-yellow-500 uppercase tracking-widest">Identity Cooldown</p>
                    <p className="text-[10px] text-muted-foreground font-bold">SECURED AGAINST CHANGES</p>
                  </div>
                </div>
                <p className="font-headline text-xl font-black text-yellow-500 glow-text">{timeLeft}</p>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="username" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">In-game Name</Label>
                <Input 
                  id="username" 
                  placeholder="e.g. SlayerX" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  disabled={isLocked}
                  className="bg-white/5 border-white/10 h-14 focus:border-primary/50 transition-all font-bold text-lg"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="tag" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Clash Tag</Label>
                <Input 
                  id="tag" 
                  placeholder="#QY88PP0" 
                  value={formData.tag}
                  onChange={(e) => setFormData({...formData, tag: e.target.value})}
                  disabled={isLocked}
                  className="bg-white/5 border-white/10 h-14 focus:border-primary/50 transition-all font-mono font-bold text-lg"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Town Hall Level</Label>
              <Select 
                disabled={isLocked} 
                value={formData.townHall}
                onValueChange={(val) => setFormData({...formData, townHall: val})}
              >
                <SelectTrigger className="bg-white/5 border-white/10 h-14 font-bold text-lg focus:ring-primary/20">
                  <SelectValue placeholder="Select your TH level" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((th) => (
                    <SelectItem key={th} value={th.toString()} className="font-bold hover:bg-primary/10 py-3">Town Hall {th}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="pb-8">
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 font-black h-16 rounded-2xl glow-primary text-xl tracking-tighter transition-transform active:scale-95"
              disabled={isLocked || uploading}
            >
              {isLocked ? (
                <span className="flex items-center gap-3">IDENTITY SECURED <CheckCircle2 className="w-6 h-6" /></span>
              ) : uploading ? (
                <span className="flex items-center gap-3 italic">SYNCHRONIZING... <Loader2 className="w-6 h-6 animate-spin" /></span>
              ) : (
                'SECURE ARENA IDENTITY'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
