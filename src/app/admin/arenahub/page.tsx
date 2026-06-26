'use client';

import { useMemo, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Zap, 
  Edit3, 
  Loader2,
  Trophy,
  Gift,
  IndianRupee,
  Calendar,
  Clock,
  Swords,
  ImagePlus,
  Camera,
  X,
  Wallet
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ArenaHubPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const tournamentsQuery = useMemo(() => query(collection(db, 'tournaments'), orderBy('startTime', 'desc')), [db]);
  const { data: tournaments } = useCollection(tournamentsQuery);

  const [tOpen, setTOpen] = useState(false);
  const [tLoading, setTLoading] = useState(false);
  const [editTId, setEditTId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingReward, setUploadingReward] = useState(false);
  const tThumbInputRef = useRef<HTMLInputElement>(null);
  const tRewardInputRef = useRef<HTMLInputElement>(null);
  
  const [tForm, setTForm] = useState({
    name: '', type: 'paid', subCategory: 'knockout', maxPlayers: 8, entryFee: 0,
    rewardType: 'coin', rewardValue: '', rewardItemName: '', rewardImageUrl: '',
    prizePool: '', rules: [] as string[], imageUrl: '', townHall: 0,
    registrationStartTime: '', registrationEndTime: '', startTime: ''
  });

  const resetTForm = () => {
    setTForm({
      name: '', type: 'paid', subCategory: 'knockout', maxPlayers: 8,
      entryFee: 0, rewardType: 'coin', rewardValue: '', rewardItemName: '',
      rewardImageUrl: '', prizePool: '', rules: [], imageUrl: '', townHall: 0,
      registrationStartTime: '', registrationEndTime: '', startTime: ''
    });
    setEditTId(null);
    setNewRule('');
  };

  const handleTournamentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setTForm(prev => ({ ...prev, imageUrl: data.secure_url }));
        toast({ title: "BANNER READY" });
      }
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleRewardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReward(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setTForm(prev => ({ ...prev, rewardImageUrl: data.secure_url }));
        toast({ title: "REWARD PHOTO READY" });
      }
    } finally {
      setUploadingReward(false);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setTLoading(true);

    let poolSummary = '';
    if (tForm.rewardType === 'money') poolSummary = `₹ ${tForm.rewardValue}`;
    else if (tForm.rewardType === 'coin') poolSummary = `🪙 ${tForm.rewardValue}`;
    else poolSummary = `${tForm.rewardItemName}`;

    const tournamentData = {
      ...tForm,
      prizePool: poolSummary,
      updatedAt: new Date().toISOString()
    };

    const formatRegTime = (startStr: string, endStr: string) => {
      try {
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
        const start = new Date(startStr).toLocaleString('en-US', options);
        const end = new Date(endStr).toLocaleString('en-US', options);
        return `${start} - ${end}`;
      } catch (e) {
        return "";
      }
    };

    const regTimeline = (tForm.registrationStartTime && tForm.registrationEndTime)
      ? formatRegTime(tForm.registrationStartTime, tForm.registrationEndTime)
      : "";

    if (editTId) {
      const updateBody = `Arena "${tournamentData.name}" has been updated.${regTimeline ? ` Registration: ${regTimeline}.` : ''} Check the new battlefield details!`;
      updateDoc(doc(db, 'tournaments', editTId), tournamentData)
        .then(async () => {
          try {
            await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audience: 'broadcast',
                title: 'Tournament Updated! ⚔️',
                body: updateBody,
                imageUrl: tournamentData.imageUrl || undefined,
                redirectUrl: `/arena/tournament/${editTId}`,
                data: {
                  type: 'update_tournament',
                  name: tournamentData.name,
                  id: editTId
                }
              })
            });
          } catch (e) {
            console.error("Failed to send tournament update push alert:", e);
          }
          toast({ title: "ARENA UPDATED" });
          setTOpen(false);
          resetTForm();
        })
        .finally(() => setTLoading(false));
    } else {
      const tRef = doc(collection(db, 'tournaments'));
      const deployBody = `Arena "${tournamentData.name}" has been deployed for Town Hall ${tournamentData.townHall || 'any'}.${regTimeline ? ` Registration: ${regTimeline}.` : ''} Join now!`;
      setDoc(tRef, { 
        ...tournamentData, 
        currentPlayers: 0, 
        status: 'upcoming', 
        createdAt: new Date().toISOString() 
      })
        .then(async () => {
          try {
            await fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audience: 'broadcast',
                title: 'New Tournament Active! ⚔️',
                body: deployBody,
                imageUrl: tournamentData.imageUrl || undefined,
                redirectUrl: `/arena/tournament/${tRef.id}`,
                data: {
                  type: 'new_tournament',
                  name: tournamentData.name,
                  id: tRef.id
                }
              })
            });
          } catch (e) {
            console.error("Failed to send tournament push alert:", e);
          }
          toast({ title: "ARENA DEPLOYED" });
          setTOpen(false);
          resetTForm();
        })
        .finally(() => setTLoading(false));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => { resetTForm(); setTOpen(true); }} className="bg-primary font-black gap-2 h-12 px-6 glow-primary">
          <Plus className="w-5 h-5" /> CREATE TOURNAMENT
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments?.map((t: any) => (
          <Card key={t.id} className="glass border-white/5 overflow-hidden group">
            <div className="relative h-32">
              <Image src={t.imageUrl || 'https://picsum.photos/seed/coc/400/200'} alt={t.name} fill className="object-cover opacity-50" />
              <div className="absolute top-2 right-2 flex gap-1">
                <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/60" onClick={() => { setEditTId(t.id); setTForm({ ...t }); setTOpen(true); }}><Edit3 className="w-4 h-4" /></Button>
                <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => deleteDoc(doc(db, 'tournaments', t.id))}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            <CardContent className="p-4">
              <h3 className="font-bold uppercase italic text-sm truncate">{t.name}</h3>
              <div className="flex justify-between items-center mt-2">
                 <Badge variant="outline" className="text-[9px] font-black">{t.type.toUpperCase()}</Badge>
                 <div className="flex items-center gap-1 text-primary"><Zap className="w-3 h-3" /><span className="text-[10px] font-black">TH {t.townHall || 'ANY'}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={tOpen} onOpenChange={setTOpen}>
        <DialogContent className="glass border-white/10 max-w-4xl max-h-[90vh] !flex !flex-col p-0 overflow-hidden outline-none">
          <div className="p-6 border-b border-white/10 shrink-0">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl font-black italic uppercase">
                {editTId ? 'RECONFIGURE' : 'DEPLOY'} <span className="text-primary">ARENA</span>
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-primary/20">
            <form onSubmit={handleCreateTournament} id="t-form" className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Arena Name</Label><Input value={tForm.name} onChange={e => setTForm({...tForm, name: e.target.value})} required className="bg-white/5" /></div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Tournament Category</Label>
                  <Select value={tForm.type} onValueChange={val => setTForm({...tForm, type: val as any})}>
                    <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="paid">PAID</SelectItem><SelectItem value="free">FREE</SelectItem><SelectItem value="championship">CHAMPIONSHIP</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Sub Category</Label>
                  <Select value={tForm.subCategory} onValueChange={val => setTForm({...tForm, subCategory: val as any})}>
                    <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="knockout">KNOCKOUT</SelectItem><SelectItem value="1vs1">1 VS 1</SelectItem><SelectItem value="tdm">TEAM DEATH MATCH</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">Required Town Hall</Label>
                  <Select value={tForm.townHall.toString()} onValueChange={val => setTForm({...tForm, townHall: parseInt(val)})}>
                    <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="0">NONE (ANY LEVEL)</SelectItem>{[9,10,11,12,13,14,15,16,17,18].map(th => (<SelectItem key={th} value={th.toString()}>TOWN HALL {th}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Max Players</Label><Input type="number" value={tForm.maxPlayers} onChange={e => setTForm({...tForm, maxPlayers: parseInt(e.target.value)})} className="bg-white/5" /></div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Entry Fee (Coins)</Label><Input type="number" value={tForm.entryFee} onChange={e => setTForm({...tForm, entryFee: parseInt(e.target.value)})} className="bg-white/5" /></div>
              </div>

              <div className="space-y-6 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <Label className="text-[12px] font-black uppercase flex items-center gap-2 text-primary"><Trophy className="w-4 h-4" /> REWARD PROTOCOL</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Reward Type</Label>
                    <Select value={tForm.rewardType} onValueChange={val => setTForm({...tForm, rewardType: val as any})}>
                      <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="money">REAL MONEY (INR)</SelectItem><SelectItem value="coin">ARENA COINS</SelectItem><SelectItem value="item">SPECIAL ITEM / GIFT</SelectItem></SelectContent>
                    </Select>
                  </div>

                  {tForm.rewardType === 'item' ? (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Item Name</Label>
                      <Input value={tForm.rewardItemName} onChange={e => setTForm({...tForm, rewardItemName: e.target.value})} placeholder="e.g. Gold Pass / Discord Nitro" className="bg-white/5" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Reward Amount</Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">{tForm.rewardType === 'money' ? <IndianRupee className="w-4 h-4 text-primary" /> : <Wallet className="w-4 h-4 text-primary" />}</div>
                        <Input type="number" value={tForm.rewardValue} onChange={e => setTForm({...tForm, rewardValue: e.target.value})} className="bg-white/5 pl-10" />
                      </div>
                    </div>
                  )}

                  {tForm.rewardType === 'item' && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[10px] font-black uppercase">Item Photo</Label>
                      <div className="flex items-center gap-4">
                        <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-dashed border-primary/20 bg-black/20 flex items-center justify-center shrink-0">
                          {tForm.rewardImageUrl ? (<Image src={tForm.rewardImageUrl} alt="Reward" fill className="object-cover" />) : (<Gift className="w-6 h-6 text-muted-foreground opacity-20" />)}
                        </div>
                        <Button type="button" variant="outline" size="sm" className="h-10 border-dashed border-primary/20 text-[10px] font-black" onClick={() => tRewardInputRef.current?.click()}>
                          {uploadingReward ? <Loader2 className="animate-spin mr-2" /> : <ImagePlus className="w-4 h-4 mr-2" />} UPLOAD REWARD PHOTO
                        </Button>
                        <input type="file" ref={tRewardInputRef} className="hidden" accept="image/*" onChange={handleRewardImageUpload} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase flex items-center gap-2"><Calendar className="w-3 h-3" /> Reg Start (IST)</Label>
                  <Input type="datetime-local" value={tForm.registrationStartTime} onChange={e => setTForm({...tForm, registrationStartTime: e.target.value})} required className="[color-scheme:dark] bg-black/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase flex items-center gap-2"><Clock className="w-3 h-3" /> Reg End (IST)</Label>
                  <Input type="datetime-local" value={tForm.registrationEndTime} onChange={e => setTForm({...tForm, registrationEndTime: e.target.value})} required className="[color-scheme:dark] bg-black/20" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase flex items-center gap-2"><Swords className="w-3 h-3" /> War Start (IST)</Label>
                  <Input type="datetime-local" value={tForm.startTime} onChange={e => setTForm({...tForm, startTime: e.target.value})} required className="[color-scheme:dark] bg-black/20" />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase">Battle Rules Protocol</Label>
                <div className="flex gap-2">
                  <Input value={newRule} onChange={e => setNewRule(e.target.value)} placeholder="Enter a rule and hit +" className="bg-white/5" onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newRule.trim()) { setTForm(p => ({ ...p, rules: [...p.rules, newRule.trim()] })); setNewRule(''); } } }} />
                  <Button type="button" onClick={() => { if (newRule.trim()) { setTForm(p => ({ ...p, rules: [...p.rules, newRule.trim()] })); setNewRule(''); } }} className="bg-primary"><Plus className="w-5 h-5" /></Button>
                </div>
                <div className="space-y-2">{tForm.rules.map((r, i) => (<div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 group"><p className="text-sm font-medium"><span className="text-primary mr-2"># {i+1}</span> {r}</p><Button type="button" variant="ghost" size="icon" onClick={() => setTForm(p => ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) }))} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></Button></div>))}</div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <Label className="text-[10px] font-black uppercase">Arena Banner</Label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-32 rounded-xl overflow-hidden border border-dashed border-white/10 bg-black/20 flex items-center justify-center shrink-0">
                    {tForm.imageUrl ? (<Image src={tForm.imageUrl} alt="Banner" fill className="object-cover" />) : (<Camera className="w-6 h-6 text-muted-foreground opacity-20" />)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Banner Preview</p>
                    <Button type="button" variant="outline" size="sm" className="w-full h-9 border-dashed border-white/20 text-[10px] font-black" onClick={() => tThumbInputRef.current?.click()}>
                      {uploadingThumbnail ? <Loader2 className="animate-spin mr-2" /> : <ImagePlus className="w-4 h-4 mr-2" />} {tForm.imageUrl ? 'CHANGE BANNER' : 'UPLOAD BANNER'}
                    </Button>
                  </div>
                  <input type="file" ref={tThumbInputRef} className="hidden" accept="image/*" onChange={handleTournamentImageUpload} />
                </div>
              </div>
            </form>
          </div>

          <div className="p-6 border-t border-white/10 bg-black/40 shrink-0">
            <Button type="submit" form="t-form" disabled={tLoading} className="w-full h-14 bg-primary font-black uppercase text-xl glow-primary rounded-2xl">
              {tLoading ? <Loader2 className="animate-spin" /> : editTId ? 'UPDATE BATTLEFIELD' : 'DEPLOY TOURNAMENT'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
