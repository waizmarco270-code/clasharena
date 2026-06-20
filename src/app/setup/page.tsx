
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldAlert, Timer, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ProfileSetup() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  
  const userRef = user ? doc(db, 'users', user.uid) : null;
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const [formData, setFormData] = useState({
    username: '',
    tag: '',
    townHall: ''
  });
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        tag: profile.tag || '',
        townHall: profile.townHall?.toString() || ''
      });

      const lockTime = profile.profileLockedUntil ? new Date(profile.profileLockedUntil) : null;
      if (lockTime && lockTime > new Date()) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    }
  }, [profile]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isLocked) return;

    if (!formData.username || !formData.tag || !formData.townHall) {
      toast({ variant: "destructive", title: "Wait!", description: "All fields are required." });
      return;
    }

    const lockDate = new Date();
    lockDate.setDate(lockDate.getDate() + 3);

    const newProfile = {
      username: formData.username,
      tag: formData.tag.startsWith('#') ? formData.tag : `#${formData.tag}`,
      townHall: parseInt(formData.townHall),
      profileLockedUntil: lockDate.toISOString(),
      balance: profile?.balance ?? 0,
      wins: profile?.wins ?? 0,
      losses: profile?.losses ?? 0,
      earnings: profile?.earnings ?? 0,
      rank: profile?.rank ?? 'Rookie'
    };

    try {
      await setDoc(doc(db, 'users', user.uid), newProfile);
      toast({ title: "Profile Secured!", description: "Your details are locked for the next 3 days." });
      router.push('/');
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || profileLoading) return null;
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="glass w-full max-w-xl border-white/5">
        <CardHeader className="space-y-1">
          <CardTitle className="font-headline text-3xl font-black">PLAYER <span className="text-primary italic">SETUP</span></CardTitle>
          <CardDescription>
            Configure your arena identity. Choose wisely.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex gap-4">
              <ShieldAlert className="w-6 h-6 text-primary shrink-0" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-primary uppercase">Security Protocol</p>
                <p className="text-muted-foreground leading-relaxed">
                  Once updated, your <span className="text-white">In-game Name, Clash Tag, and Town Hall</span> will be locked for <span className="text-white">3 days</span> to prevent tournament fraud.
                </p>
              </div>
            </div>

            {isLocked && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Timer className="w-5 h-5 text-yellow-500" />
                  <p className="text-xs font-bold text-yellow-500 uppercase">Profile Locked</p>
                </div>
                <p className="font-mono text-sm font-black text-yellow-500">{timeLeft}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">In-game Name</Label>
                <Input 
                  id="username" 
                  placeholder="e.g. SlayerX" 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  disabled={isLocked}
                  className="bg-white/5 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tag">Clash Tag</Label>
                <Input 
                  id="tag" 
                  placeholder="#QY88PP0" 
                  value={formData.tag}
                  onChange={(e) => setFormData({...formData, tag: e.target.value})}
                  disabled={isLocked}
                  className="bg-white/5 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Town Hall Level</Label>
              <Select 
                disabled={isLocked} 
                value={formData.townHall}
                onValueChange={(val) => setFormData({...formData, townHall: val})}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Select your TH level" />
                </SelectTrigger>
                <SelectContent>
                  {[12, 13, 14, 15, 16, 17].map((th) => (
                    <SelectItem key={th} value={th.toString()}>Town Hall {th}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 font-black h-12 glow-primary"
              disabled={isLocked}
            >
              {isLocked ? 'MODIFICATIONS DISABLED' : 'SECURE IDENTITY'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
