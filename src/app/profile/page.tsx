
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
  Settings, 
  Wallet, 
  Trophy, 
  Swords, 
  Zap, 
  Timer, 
  ShieldAlert, 
  QrCode, 
  Edit3, 
  Clock, 
  ShieldCheck,
  Loader2,
  ImagePlus
} from 'lucide-react';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useUser } from "@clerk/nextjs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function ProfilePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile } = useDoc(userRef);

  const [editOpen, setEditOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
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

  const isLocked = profile?.profileLockedUntil ? new Date(profile.profileLockedUntil) > new Date() : false;

  // Live Countdown Logic
  useEffect(() => {
    if (!profile?.profileLockedUntil) return;

    const timer = setInterval(() => {
      const target = new Date(profile.profileLockedUntil).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown('');
        clearInterval(timer);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [profile?.profileLockedUntil]);

  // Sync form when profile loads
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

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formDataCld }
      );

      const data = await response.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, upiQrUrl: data.secure_url }));
        toast({ title: "QR Updated!" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed" });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userRef || isSubmitting) return;

    setIsSubmitting(true);
    
    // Only set new lock if fields were actually changeable and changed
    const baseProfile = {
      upiId: formData.upiId,
      upiQrUrl: formData.upiQrUrl,
      updatedAt: new Date().toISOString()
    };

    const identityUpdate = !isLocked ? {
      username: formData.username,
      tag: formData.tag.startsWith('#') ? formData.tag.toUpperCase() : `#${formData.tag.toUpperCase()}`,
      townHall: parseInt(formData.townHall),
      profileLockedUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    } : {};

    const updatedData = { ...baseProfile, ...identityUpdate };

    setDoc(userRef, updatedData, { merge: true })
      .then(() => {
        setEditOpen(false);
        toast({ title: "Profile Updated!", description: "Your changes have been saved." });
        setIsSubmitting(false);
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'write',
          requestResourceData: updatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsSubmitting(false);
      });
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        {/* Profile Banner */}
        <div className="relative rounded-3xl overflow-hidden glass border-white/5 p-6 md:p-10 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="absolute top-6 right-6 z-10">
            <Button 
              onClick={() => setEditOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white font-black px-6 h-11 rounded-xl shadow-lg glow-primary border-t border-white/20 gap-2"
            >
              <Edit3 className="w-4 h-4" /> 
              EDIT PROFILE
            </Button>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-primary/20 p-1 bg-background glow-primary">
                <AvatarImage src={user?.imageUrl} className="rounded-full object-cover" />
                <AvatarFallback className="bg-muted text-2xl font-black">
                  {profile?.username?.substring(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-primary px-3 py-1 rounded-full text-[10px] font-black italic shadow-lg">
                TH {profile?.townHall || '??'}
              </div>
            </div>
            
            <div className="text-center md:text-left flex-1">
              <h1 className="font-headline text-4xl font-black mb-1 uppercase tracking-tight">{profile?.username || 'WARRIOR'}</h1>
              <p className="text-primary font-bold text-sm mb-4 tracking-widest">{profile?.tag || '#0000000'} • TOWN HALL {profile?.townHall}</p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <Badge variant="outline" className="bg-white/5 border-white/10 py-1.5 px-4 font-bold uppercase tracking-widest text-[10px]">
                  {profile?.rank || 'ROOKIE'}
                </Badge>
                
                {isLocked && (
                  <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary py-1.5 px-4 font-bold flex gap-2 items-center">
                    <Clock className="w-3 h-3 animate-pulse" /> 
                    <span className="text-[10px] uppercase font-black">LOCKED: {countdown}</span>
                  </Badge>
                )}
              </div>
            </div>

            <Card className="w-full md:w-auto glass border-primary/20 bg-primary/5">
              <CardContent className="p-6 flex flex-col items-center">
                <p className="text-[10px] text-muted-foreground uppercase font-black mb-1 tracking-widest">Available Coins</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-3xl font-headline font-black">🪙 {profile?.balance || 0}</span>
                </div>
                <Button className="w-full bg-white text-black hover:bg-gray-100 font-black h-10 shadow-lg">
                  <Wallet className="w-4 h-4 mr-2" /> RECHARGE
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Career Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tournaments', value: '0', icon: <Swords className="text-blue-500 w-4 h-4" /> },
            { label: 'Victories', value: profile?.wins || '0', icon: <Trophy className="text-yellow-500 w-4 h-4" /> },
            { label: 'Earnings', value: `🪙 ${profile?.earnings || 0}`, icon: <Zap className="text-orange-500 w-4 h-4" /> },
            { label: 'Rank', value: profile?.rank || 'ROOKIE', icon: <ShieldCheck className="text-primary w-4 h-4" /> },
          ].map((stat) => (
            <Card key={stat.label} className="glass border-white/5 text-center p-6 hover:border-primary/20 transition-all group">
              <div className="flex justify-center mb-3">
                <div className="p-2 bg-white/5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">
                  {stat.icon}
                </div>
              </div>
              <p className="text-2xl font-headline font-black uppercase tracking-tight">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">{stat.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass border-white/10 max-w-xl p-0 overflow-hidden sm:rounded-3xl h-[90vh] sm:h-auto flex flex-col">
          <DialogHeader className="pt-8 px-8 shrink-0">
            <DialogTitle className="font-headline text-3xl font-black italic tracking-tighter uppercase text-center">
              EDIT <span className="text-primary">IDENTITY</span>
            </DialogTitle>
            <DialogDescription className="text-center font-medium text-xs">
              Keep your arena records and payout info up to date.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-8 py-6">
            <form id="edit-form" onSubmit={handleUpdateProfile} className="space-y-8 pb-8">
              {isLocked && (
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3 items-center">
                  <Timer className="w-6 h-6 text-primary shrink-0" />
                  <div className="text-[11px]">
                    <p className="font-black text-primary uppercase tracking-widest">IDENTITY LOCKED</p>
                    <p className="text-muted-foreground">Main fields unlock in: <span className="text-white font-bold">{countdown}</span></p>
                  </div>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Username</Label>
                  <Input 
                    disabled={isLocked}
                    value={formData.username} 
                    onChange={(e) => setFormData({...formData, username: e.target.value})} 
                    className="bg-white/5 border-white/10 h-12 font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Clash Tag</Label>
                  <Input 
                    disabled={isLocked}
                    value={formData.tag} 
                    onChange={(e) => setFormData({...formData, tag: e.target.value})} 
                    className="bg-white/5 border-white/10 h-12 font-mono uppercase" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Town Hall</Label>
                <Select 
                  disabled={isLocked}
                  value={formData.townHall} 
                  onValueChange={(val) => setFormData({...formData, townHall: val})}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 h-12 font-bold">
                    <SelectValue placeholder="Select TH Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((th) => (
                      <SelectItem key={th} value={th.toString()}>Town Hall {th}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-6">
                <p className="text-[10px] uppercase font-black tracking-widest text-primary">Payout Information</p>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">UPI ID</Label>
                  <Input 
                    value={formData.upiId} 
                    onChange={(e) => setFormData({...formData, upiId: e.target.value})} 
                    className="bg-white/5 border-white/10 h-12" 
                    placeholder="user@upi" 
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Update QR Screenshot</Label>
                  <div className="relative group cursor-pointer" onClick={() => qrInputRef.current?.click()}>
                    {formData.upiQrUrl ? (
                      <div className="relative h-40 w-full rounded-2xl overflow-hidden border-2 border-dashed border-primary/40">
                        <Image src={formData.upiQrUrl} alt="UPI QR" fill className="object-cover opacity-60" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <ImagePlus className="w-8 h-8 text-white opacity-80" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-40 w-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5">
                        {uploading ? <Loader2 className="animate-spin text-primary" /> : <ImagePlus className="text-muted-foreground" />}
                        <p className="text-[10px] font-bold uppercase">Upload New QR</p>
                      </div>
                    )}
                    <input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={handleQrUpload} />
                  </div>
                </div>
              </div>
            </form>
          </ScrollArea>

          <div className="p-8 shrink-0 border-t border-white/5">
            <Button 
              form="edit-form"
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 font-black h-14 rounded-2xl glow-primary"
              disabled={uploading || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2" />}
              SAVE CHANGES
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
