'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore } from '@/firebase';
import { doc, setDoc, updateDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ImagePlus, CheckCircle2 } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';

interface ThcCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: any;
}

export function ThcCreateModal({ isOpen, onClose, editData }: ThcCreateModalProps) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    mode: '5v5',
    townHall: 16,
    entryFee: 50,
    format: 'double_elimination',
    maxTeams: 8, // 0 for unlimited
    registrationStartTime: '',
    registrationEndTime: '',
    startTime: '',
    imageUrl: '',
    rewards: { top1: 5000, top2: 2500, top3: 1000 }
  });
  useEffect(() => {
    if (editData && isOpen) {
       setForm({
          name: editData.name || '',
          mode: editData.mode || '5v5',
          townHall: editData.townHall || 16,
          entryFee: editData.entryFee || 50,
          format: editData.format || 'double_elimination',
          maxTeams: editData.maxTeams || 8,
          registrationStartTime: editData.registrationStartTime || '',
          registrationEndTime: editData.registrationEndTime || '',
          startTime: editData.startTime || '',
          imageUrl: editData.imageUrl || '',
          rewards: editData.rewards || { top1: 5000, top2: 2500, top3: 1000 }
       });
    } else if (!isOpen) {
       // Reset on close
       setForm({
          name: '',
          mode: '5v5',
          townHall: 16,
          entryFee: 50,
          format: 'double_elimination',
          maxTeams: 8,
          registrationStartTime: '',
          registrationEndTime: '',
          startTime: '',
          imageUrl: '',
          rewards: { top1: 5000, top2: 2500, top3: 1000 }
       });
    }
  }, [editData, isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const result = await uploadToCloudinary(file, { folder: 'tournaments' });
      if (result && result.url) {
         setForm(prev => ({ ...prev, imageUrl: result.url }));
         toast({ title: 'Image Uploaded' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.registrationStartTime || !form.registrationEndTime || !form.startTime) {
      toast({ variant: 'destructive', title: 'Fill all required fields' });
      return;
    }

    setLoading(true);
    try {
      const tournamentData: any = {
        name: form.name,
        mode: form.mode,
        teamSize: parseInt(form.mode.split('v')[0]),
        townHall: form.townHall,
        entryFee: form.entryFee,
        format: form.format,
        maxTeams: form.maxTeams === 0 ? null : form.maxTeams,
        registrationStartTime: form.registrationStartTime,
        registrationEndTime: form.registrationEndTime,
        startTime: form.startTime,
        imageUrl: form.imageUrl,
        rewards: form.rewards,
        updatedAt: new Date().toISOString()
      };

      if (editData?.id) {
         await updateDoc(doc(db, 'thc_tournaments', editData.id), tournamentData);
         toast({ title: 'THC Event Updated!' });
      } else {
         const tRef = doc(collection(db, 'thc_tournaments'));
         tournamentData.id = tRef.id;
         tournamentData.status = 'upcoming';
         tournamentData.currentTeams = 0;
         tournamentData.createdAt = new Date().toISOString();
         await setDoc(tRef, tournamentData);
         toast({ title: 'THC Arena Deployed!' });
      }

      onClose();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to deploy/update THC' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl glass border-primary/20 p-0 overflow-hidden bg-black/90">
        <DialogHeader className="p-6 border-b border-white/5 bg-primary/5">
          <DialogTitle className="font-headline text-2xl font-black italic uppercase text-primary">{editData?.id ? 'Edit Town Hall Cup (THC)' : 'Deploy Town Hall Cup (THC)'}</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-white uppercase">Cup Name</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. TH-12 Sapphire CUP" 
                className="bg-black/50 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-white uppercase">Required Town Hall</Label>
              <Input 
                type="number"
                value={form.townHall} 
                onChange={(e) => setForm(prev => ({ ...prev, townHall: Number(e.target.value) }))}
                className="bg-black/50 border-white/10"
              />
            </div>
          </div>

          {/* Mode & Format */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-white uppercase">Battle Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm(prev => ({ ...prev, mode: v }))}>
                <SelectTrigger className="bg-black/50 border-white/10">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  <SelectItem value="2v2">2v2</SelectItem>
                  <SelectItem value="3v3">3v3</SelectItem>
                  <SelectItem value="5v5">5v5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-white uppercase">Bracket Format</Label>
              <Select value={form.format} onValueChange={(v) => setForm(prev => ({ ...prev, format: v }))}>
                <SelectTrigger className="bg-black/50 border-white/10">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10">
                  <SelectItem value="single_elimination">Single Elimination</SelectItem>
                  <SelectItem value="double_elimination">Double Elimination</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Capacity & Fees */}
          <div className="grid grid-cols-3 gap-4">
             <div className="space-y-2">
              <Label className="text-xs font-bold text-white uppercase">Max Teams (0 = Unlimited)</Label>
              <Input 
                type="number"
                value={form.maxTeams} 
                onChange={(e) => setForm(prev => ({ ...prev, maxTeams: Number(e.target.value) }))}
                className="bg-black/50 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-white uppercase">Team Entry Fee (Coins)</Label>
              <Input 
                type="number"
                value={form.entryFee} 
                onChange={(e) => setForm(prev => ({ ...prev, entryFee: Number(e.target.value) }))}
                className="bg-black/50 border-white/10"
              />
            </div>
          </div>

          {/* Rewards (V-Cash but showing ₹) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-yellow-500 uppercase">Top 1 Reward</Label>
              <div className="relative">
                 <span className="absolute left-3 top-2.5 text-white/50 font-bold">₹</span>
                 <Input 
                   type="number"
                   value={form.rewards.top1} 
                   onChange={(e) => setForm(prev => ({ ...prev, rewards: { ...prev.rewards, top1: Number(e.target.value) } }))}
                   className="bg-black/50 border-yellow-500/30 pl-8"
                 />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase">Top 2 Reward</Label>
              <div className="relative">
                 <span className="absolute left-3 top-2.5 text-white/50 font-bold">₹</span>
                 <Input 
                   type="number"
                   value={form.rewards.top2} 
                   onChange={(e) => setForm(prev => ({ ...prev, rewards: { ...prev.rewards, top2: Number(e.target.value) } }))}
                   className="bg-black/50 border-gray-400/30 pl-8"
                 />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-amber-700 uppercase">Top 3 Reward</Label>
              <div className="relative">
                 <span className="absolute left-3 top-2.5 text-white/50 font-bold">₹</span>
                 <Input 
                   type="number"
                   value={form.rewards.top3} 
                   onChange={(e) => setForm(prev => ({ ...prev, rewards: { ...prev.rewards, top3: Number(e.target.value) } }))}
                   className="bg-black/50 border-amber-700/30 pl-8"
                 />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-white uppercase">Registration Starts</Label>
              <Input 
                type="datetime-local" 
                value={form.registrationStartTime} 
                onChange={(e) => setForm(prev => ({ ...prev, registrationStartTime: e.target.value }))}
                className="bg-black/50 border-white/10 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-white uppercase">Registration Ends</Label>
              <Input 
                type="datetime-local" 
                value={form.registrationEndTime} 
                onChange={(e) => setForm(prev => ({ ...prev, registrationEndTime: e.target.value }))}
                className="bg-black/50 border-white/10 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-primary uppercase">Tournament Starts</Label>
              <Input 
                type="datetime-local" 
                value={form.startTime} 
                onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                className="bg-black/50 border-primary/30 text-primary font-bold text-xs"
              />
            </div>
          </div>

          {/* Image */}
          <div className="space-y-2">
             <Label className="text-[10px] font-black text-muted-foreground uppercase">Cover Banner</Label>
             <div className="flex gap-2">
                <Input 
                   type="file" 
                   accept="image/*" 
                   ref={imageInputRef}
                   onChange={handleImageUpload} 
                   className="sr-only" 
                />
                <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage} className="w-full bg-black/50 border-white/10 font-bold text-xs uppercase h-12">
                   {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
                   {uploadingImage ? 'Uploading...' : form.imageUrl ? 'Change Image' : 'Upload Image'}
                </Button>
                {form.imageUrl && (
                   <div className="h-12 w-24 relative rounded overflow-hidden border border-white/10">
                      <img src={form.imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                   </div>
                )}
             </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading} className="bg-transparent border-white/10 font-black uppercase">Cancel</Button>
          <Button onClick={handleCreate} disabled={loading} className="bg-primary hover:bg-primary/90 text-black font-black uppercase glow-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Deploy THC
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
