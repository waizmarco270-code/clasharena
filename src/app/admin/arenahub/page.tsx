'use client';

import { default as NextLink } from 'next/link';

import { useMemo, useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TournamentStatusBadge } from '@/components/TournamentStatusBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Wallet,
  EyeOff,
  Gavel
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, setDoc, deleteDoc, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';

export default function ArenaHubPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const [limitCount, setLimitCount] = useState(5);
  const [vsLimitCount, setVsLimitCount] = useState(10);
  const [activeTab, setActiveTab] = useState('latest');
  
  // Use limit() to keep reads optimized
  const tournamentsQuery = useMemo(() => query(collection(db, 'tournaments'), orderBy('startTime', 'desc'), limit(limitCount)), [db, limitCount]);
  const { data: tournaments } = useCollection(tournamentsQuery);

  const vsQuery = useMemo(() => query(collection(db, 'vs-challenges'), orderBy('createdAt', 'desc'), limit(vsLimitCount)), [db, vsLimitCount]);
  const { data: vsChallenges } = useCollection(vsQuery);

  const [tOpen, setTOpen] = useState(false);
  const [tLoading, setTLoading] = useState(false);
  const [editTId, setEditTId] = useState<string | null>(null);
  const [deleteTId, setDeleteTId] = useState<string | null>(null);
  const [deleteVsId, setDeleteVsId] = useState<string | null>(null);
  const [vsSettlementMode, setVsSettlementMode] = useState<'auto' | 'manual'>('auto');
  const [vsSettingsLoading, setVsSettingsLoading] = useState(false);
  
  const latestTournaments = useMemo(() => tournaments?.filter((t: any) => t.status !== 'completed') || [], [tournaments]);
  const pastTournaments = useMemo(() => tournaments?.filter((t: any) => t.status === 'completed') || [], [tournaments]);
  const [newRule, setNewRule] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingReward, setUploadingReward] = useState(false);
  const tThumbInputRef = useRef<HTMLInputElement>(null);
  const tRewardInputRef = useRef<HTMLInputElement>(null);
  
  const [tForm, setTForm] = useState({
    name: '', type: 'paid', subCategory: 'knockout', bracketType: 'single_elimination', maxPlayers: 8, entryFee: 0,
    rewardType: 'coin', rewardValue: '', rewardItemName: '', rewardImageUrl: '', rewardTicketType: 'bronze',
    prizePool: '', rules: [] as string[], imageUrl: '', townHall: 0,
    registrationStartTime: '', registrationEndTime: '', startTime: '',
    totalPlayers: 30, thDistribution: {} as Record<number, number>, reservePlayers: 2,
    clan1: '', clan2: '', chatEnabled: true, notificationsEnabled: true,
    leaderPassCost: 0, winnerRefundAmount: 0, isStealth: false
  });

  const [thInput, setThInput] = useState({ level: 16, count: 5 });

  const resetTForm = () => {
    setTForm({
      name: '', type: 'paid', subCategory: 'knockout', bracketType: 'single_elimination', maxPlayers: 8,
      entryFee: 0, rewardType: 'coin', rewardValue: '', rewardItemName: '', rewardTicketType: 'bronze',
      rewardImageUrl: '', prizePool: '', rules: [], imageUrl: '', townHall: 0,
      registrationStartTime: '', registrationEndTime: '', startTime: '',
      totalPlayers: 30, thDistribution: {}, reservePlayers: 2,
      clan1: '', clan2: '', chatEnabled: true, notificationsEnabled: true,
      leaderPassCost: 0, winnerRefundAmount: 0, isStealth: false
    });
    setEditTId(null);
    setNewRule('');
  };

  useEffect(() => {
     if (activeTab === 'vs-matches') {
        const fetchVsSettings = async () => {
           try {
              const res = await fetch('/api/admin/vs-settings');
              const data = await res.json();
              if (data.settlementMode) setVsSettlementMode(data.settlementMode);
           } catch (e) {}
        };
        fetchVsSettings();
     }
  }, [activeTab]);

  const toggleVsSettlementMode = async () => {
     const newMode = vsSettlementMode === 'auto' ? 'manual' : 'auto';
     setVsSettingsLoading(true);
     try {
        const res = await fetch('/api/admin/vs-settings', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ settlementMode: newMode })
        });
        if (res.ok) setVsSettlementMode(newMode);
        toast({ title: 'Setting Updated', description: `Settlement mode is now ${newMode.toUpperCase()}` });
     } catch (err: any) {
        toast({ variant: 'destructive', title: 'Update Failed' });
     } finally {
        setVsSettingsLoading(false);
     }
  };

  const handleTournamentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumbnail(true);
    try {
      const result = await uploadToCloudinary(file, { folder: 'tournaments' });
      if (result.url) {
        setTForm(prev => ({ ...prev, imageUrl: result.url }));
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
      const result = await uploadToCloudinary(file, { folder: 'rewards' });
      if (result.url) {
        setTForm(prev => ({ ...prev, rewardImageUrl: result.url }));
        toast({ title: "REWARD PHOTO READY" });
      }
    } finally {
      setUploadingReward(false);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setTLoading(true);

    if (tForm.type === 'championship') {
      const sum = Object.values(tForm.thDistribution).reduce((a, b) => a + b, 0);
      if (sum !== tForm.totalPlayers) {
        toast({ variant: 'destructive', title: 'INVALID TH DISTRIBUTION', description: `Sum of TH distribution (${sum}) must equal Total Players (${tForm.totalPlayers}).` });
        setTLoading(false);
        return;
      }
    }

    let poolSummary = '';
    if (tForm.rewardType === 'money') poolSummary = `₹ ${tForm.rewardValue}`;
    else if (tForm.rewardType === 'coin') poolSummary = `🪙 ${tForm.rewardValue}`;
    else if (tForm.rewardType === 'v-cash') poolSummary = `⚡ ${tForm.rewardValue} V-Cash`;
    else if (tForm.rewardType === 'ticket') poolSummary = `🎫 ${tForm.rewardValue} ${tForm.rewardTicketType} Ticket${parseInt(tForm.rewardValue) > 1 ? 's' : ''}`;
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
        .then(() => {
          if (!tournamentData.isStealth) {
            fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audience: 'broadcast',
                title: 'Tournament Updated! ⚔️',
                body: updateBody,
                imageUrl: tournamentData.imageUrl || undefined,
                redirectUrl: tournamentData.type === 'championship' ? `/arena/championship/${editTId}` : `/arena/tournament/${editTId}`,
                data: {
                  type: 'update_tournament',
                  name: tournamentData.name,
                  id: editTId
                }
              })
            }).catch((e) => {
              console.error("Failed to send tournament update push alert:", e);
            });
          }
          toast({ title: "ARENA UPDATED" });
          setTOpen(false);
          resetTForm();
        })
        .finally(() => setTLoading(false));
    } else {
      const tRef = doc(collection(db, 'tournaments'));
      const deployBody = `Arena "${tournamentData.name}" has been deployed for Town Hall ${tournamentData.townHall || 'any'}.${regTimeline ? ` Registration: ${regTimeline}.` : ''} Join now!`;
      
      const newTourneyData = { 
        ...tournamentData, 
        currentPlayers: 0, 
        status: tournamentData.type === 'championship' ? 'registration' : 'upcoming', 
        createdAt: new Date().toISOString() 
      };

      if (tournamentData.type === 'championship') {
        const initialCurrentRegistered: Record<number, number> = {};
        Object.keys(tournamentData.thDistribution).forEach(th => {
          initialCurrentRegistered[parseInt(th)] = 0;
        });
        (newTourneyData as any).currentRegistered = initialCurrentRegistered;
        (newTourneyData as any).totalRegistered = 0;
      }

      setDoc(tRef, newTourneyData)
        .then(() => {
          if (!tournamentData.isStealth) {
            fetch('/api/notifications/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audience: 'broadcast',
                title: 'New Tournament Active! ⚔️',
                body: deployBody,
                imageUrl: tournamentData.imageUrl || undefined,
                redirectUrl: tournamentData.type === 'championship' ? `/arena/championship/${tRef.id}` : `/arena/tournament/${tRef.id}`,
                data: {
                  type: 'new_tournament',
                  name: tournamentData.name,
                  id: tRef.id
                }
              })
            }).catch((e) => {
              console.error("Failed to send tournament push alert:", e);
            });
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
      <div className="flex justify-end gap-4">
        <NextLink href="/admin/arenahub/th-rules">
           <Button variant="outline" className="font-black gap-2 h-12 px-6 border-white/10 text-white bg-black/50 hover:bg-white/5 transition-all">
             <Gavel className="w-5 h-5" /> MANAGE TH RULES
           </Button>
        </NextLink>
        <Button onClick={() => { resetTForm(); setTOpen(true); }} className="bg-primary font-black gap-2 h-12 px-6 glow-primary">
          <Plus className="w-5 h-5" /> CREATE TOURNAMENT
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-black/40 border border-white/5 h-12 w-full justify-start rounded-xl p-1 mb-6">
          <TabsTrigger value="latest" className="data-[state=active]:bg-primary rounded-lg px-6 h-full font-black uppercase text-[10px]">LATEST ARENA</TabsTrigger>
          <TabsTrigger value="past" className="data-[state=active]:bg-primary rounded-lg px-6 h-full font-black uppercase text-[10px]">PAST ARENA</TabsTrigger>
          <TabsTrigger value="vs-matches" className="data-[state=active]:bg-primary rounded-lg px-6 h-full font-black uppercase text-[10px]">VS MATCHES</TabsTrigger>
        </TabsList>
        
        <TabsContent value="latest">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestTournaments.map((t: any) => (
              <Card key={t.id} className="glass border-white/5 overflow-hidden group relative">
                <NextLink href={t.type === 'championship' ? `/admin/championship/${t.id}` : `/admin/tournament/${t.id}`} className="block">
                  <div className="relative h-32">
                    <Image src={t.imageUrl || 'https://picsum.photos/seed/coc/400/200'} alt={t.name} fill className="object-cover opacity-50 hover:opacity-80 transition-opacity" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold uppercase italic text-sm truncate">{t.name}</h3>
                    <div className="flex justify-between items-center mt-2">
                       <TournamentStatusBadge t={t} />
                       <div className="flex items-center gap-1 text-primary"><Zap className="w-3 h-3" /><span className="text-[10px] font-black">TH {t.townHall || 'ANY'}</span></div>
                    </div>
                  </CardContent>
                </NextLink>
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/60" onClick={(e) => { e.preventDefault(); setEditTId(t.id); setTForm({ ...t }); setTOpen(true); }}><Edit3 className="w-4 h-4" /></Button>
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={(e) => { e.preventDefault(); setDeleteTId(t.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
          {latestTournaments.length === 0 && (
             <div className="text-center p-12 text-white/50 font-black uppercase tracking-widest text-[10px]">No Active Arenas</div>
          )}
          <div className="flex justify-center mt-8">
            <Button variant="outline" onClick={() => setLimitCount(prev => prev + 5)} className="bg-black/40 border-white/10 font-black uppercase text-[10px] h-10 px-8">LOAD MORE</Button>
          </div>
        </TabsContent>
        
        <TabsContent value="past">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastTournaments.map((t: any) => (
              <Card key={t.id} className="glass border-white/5 overflow-hidden group opacity-70 relative">
                <NextLink href={t.type === 'championship' ? `/admin/championship/${t.id}` : `/admin/tournament/${t.id}`} className="block">
                  <div className="relative h-32 grayscale">
                    <Image src={t.imageUrl || 'https://picsum.photos/seed/coc/400/200'} alt={t.name} fill className="object-cover opacity-30 hover:opacity-50 transition-opacity" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold uppercase italic text-sm truncate">{t.name}</h3>
                    <div className="flex justify-between items-center mt-2">
                       <TournamentStatusBadge t={t} />
                       <div className="flex items-center gap-1 text-primary"><Zap className="w-3 h-3" /><span className="text-[10px] font-black">TH {t.townHall || 'ANY'}</span></div>
                    </div>
                  </CardContent>
                </NextLink>
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={(e) => { e.preventDefault(); setDeleteTId(t.id); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
          {pastTournaments.length === 0 && (
             <div className="text-center p-12 text-white/50 font-black uppercase tracking-widest text-[10px]">No Past Arenas</div>
          )}
          <div className="flex justify-center mt-8">
            <Button variant="outline" onClick={() => setLimitCount(prev => prev + 5)} className="bg-black/40 border-white/10 font-black uppercase text-[10px] h-10 px-8">LOAD MORE</Button>
          </div>
        </TabsContent>

        <TabsContent value="vs-matches" className="space-y-6">
          <Card className="glass border-primary/20 bg-primary/5">
             <CardContent className="p-4 flex items-center justify-between">
                <div>
                   <h3 className="font-black uppercase text-white flex items-center gap-2"><Gavel className="w-4 h-4 text-primary" /> Global VS Settlement Mode</h3>
                   <p className="text-[10px] text-muted-foreground mt-1">If Manual is ON, admins must manually inspect and force-win matches after 2 wins.</p>
                </div>
                <div className="flex items-center gap-2">
                   <Label className="text-xs font-bold uppercase">{vsSettlementMode}</Label>
                   <Switch checked={vsSettlementMode === 'manual'} onCheckedChange={toggleVsSettlementMode} disabled={vsSettingsLoading} />
                </div>
             </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {vsChallenges?.map((c: any) => (
                <Card key={c.id} className="glass border-white/5 relative overflow-hidden">
                   <div className={`absolute top-0 inset-x-0 h-1 ${c.status === 'disputed' ? 'bg-red-500' : c.status === 'completed' ? 'bg-green-500' : c.status === 'active' ? 'bg-yellow-500' : 'bg-primary'}`} />
                   <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline" className={`font-black uppercase tracking-widest text-[9px] ${c.status === 'disputed' ? 'text-red-500 border-red-500/30' : c.status === 'completed' ? 'text-green-500 border-green-500/30' : 'text-primary border-primary/30'}`}>
                           {c.status}
                        </Badge>
                        <p className="text-xl font-black text-green-500">⚡ {c.pool}</p>
                      </div>
                      
                      <div className="flex justify-between items-center bg-black/40 rounded-xl p-3 border border-white/5">
                         <div className="text-center w-[40%]">
                           <p className="text-[10px] font-black uppercase text-white truncate">{c.creatorName}</p>
                           {c.creatorSubmission && <p className="text-[9px] text-green-400 mt-1 uppercase font-bold">{c.creatorSubmission.result}</p>}
                         </div>
                         <div className="text-[10px] font-black text-red-500 italic">VS</div>
                         <div className="text-center w-[40%]">
                           <p className="text-[10px] font-black uppercase text-white truncate">{c.acceptorName || 'WAITING'}</p>
                           {c.acceptorSubmission && <p className="text-[9px] text-green-400 mt-1 uppercase font-bold">{c.acceptorSubmission.result}</p>}
                         </div>
                      </div>
                      
                      <NextLink href={`/vs-arena/battle/${c.id}`} className="block mt-4">
                        <Button className="w-full h-10 font-black uppercase tracking-widest text-[10px]" variant="secondary">
                           Inspect Room
                        </Button>
                      </NextLink>
                   </CardContent>
                   <div className="absolute top-2 right-2 flex gap-1 z-10">
                     <Button size="icon" variant="destructive" className="h-8 w-8 bg-black/60" onClick={(e) => { e.preventDefault(); setDeleteVsId(c.id); }}>
                       <Trash2 className="w-4 h-4" />
                     </Button>
                   </div>
                </Card>
             ))}
          </div>
          {vsChallenges?.length === 0 && (
             <div className="text-center p-12 text-white/50 font-black uppercase tracking-widest text-[10px]">No VS Matches</div>
          )}
          {vsChallenges && vsChallenges.length >= vsLimitCount && (
            <div className="flex justify-center mt-8">
              <Button variant="outline" onClick={() => setVsLimitCount(prev => prev + 10)} className="bg-black/40 border-white/10 font-black uppercase text-[10px] h-10 px-8">LOAD MORE</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!deleteTId} onOpenChange={(open) => !open && setDeleteTId(null)}>
        <DialogContent className="glass border-red-500/20 max-w-sm p-6 rounded-3xl bg-black/90">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-headline text-xl font-black uppercase italic text-red-500">Delete Tournament?</h3>
              <p className="text-xs font-bold text-muted-foreground uppercase mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex gap-4 mt-6">
              <Button variant="outline" className="flex-1 rounded-xl h-10 font-bold" onClick={() => setDeleteTId(null)}>CANCEL</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 font-black uppercase" onClick={() => {
                if (deleteTId) {
                  deleteDoc(doc(db, 'tournaments', deleteTId));
                  toast({ title: "ARENA DELETED" });
                  setDeleteTId(null);
                }
              }}>DELETE</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteVsId} onOpenChange={(open) => !open && setDeleteVsId(null)}>
        <DialogContent className="glass border-red-500/20 max-w-sm p-6 rounded-3xl bg-black/90">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h3 className="font-headline text-xl font-black uppercase italic text-red-500">Delete Match?</h3>
              <p className="text-xs font-bold text-muted-foreground uppercase mt-2">This action cannot be undone. Make sure you have refunded players if necessary.</p>
            </div>
            <div className="flex gap-4 mt-6">
              <Button variant="outline" className="flex-1 rounded-xl h-10 font-bold" onClick={() => setDeleteVsId(null)}>CANCEL</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 font-black uppercase" onClick={() => {
                if (deleteVsId) {
                  deleteDoc(doc(db, 'vs-challenges', deleteVsId));
                  toast({ title: "MATCH DELETED" });
                  setDeleteVsId(null);
                }
              }}>DELETE</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                {tForm.type !== 'championship' && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Sub Category</Label>
                    <Select value={tForm.subCategory} onValueChange={val => setTForm({...tForm, subCategory: val as any})}>
                      <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="knockout">KNOCKOUT</SelectItem><SelectItem value="1vs1">1 VS 1</SelectItem><SelectItem value="tdm">TEAM DEATH MATCH</SelectItem></SelectContent>
                    </Select>
                  </div>
                )}
                {tForm.type !== 'championship' && tForm.subCategory === 'knockout' && (
                  <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                    <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-2"><Trophy className="w-3 h-3"/> Bracket Format</Label>
                    <Select value={tForm.bracketType} onValueChange={val => setTForm({...tForm, bracketType: val})}>
                      <SelectTrigger className="bg-primary/10 border-primary/30 text-primary font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="single_elimination" className="font-bold text-[10px]">SINGLE ELIMINATION (SUDDEN DEATH)</SelectItem>
                         <SelectItem value="double_elimination" className="font-bold text-[10px]">DOUBLE ELIMINATION (REDEMPTION)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {tForm.type !== 'championship' && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Required Town Hall</Label>
                    <Select value={tForm.townHall.toString()} onValueChange={val => setTForm({...tForm, townHall: parseInt(val)})}>
                      <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="0">NONE (ANY LEVEL)</SelectItem>{[9,10,11,12,13,14,15,16,17,18].map(th => (<SelectItem key={th} value={th.toString()}>TOWN HALL {th}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                )}
                {tForm.type !== 'championship' && (
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Max Players</Label><Input type="number" value={tForm.maxPlayers} onChange={e => setTForm({...tForm, maxPlayers: parseInt(e.target.value)})} className="bg-white/5" /></div>
                )}
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Entry Fee (Coins)</Label><Input type="number" value={tForm.entryFee} onChange={e => setTForm({...tForm, entryFee: parseInt(e.target.value)})} className="bg-white/5" /></div>
              </div>

              {tForm.type === 'championship' && (
                <div className="space-y-6 p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                  <Label className="text-[12px] font-black uppercase flex items-center gap-2 text-blue-500"><Swords className="w-4 h-4" /> CHAMPIONSHIP CONFIGURATION</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Total Players</Label><Input type="number" value={tForm.totalPlayers} onChange={e => setTForm({...tForm, totalPlayers: parseInt(e.target.value) || 0})} className="bg-white/5" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Reserve Players</Label><Input type="number" value={tForm.reservePlayers} onChange={e => setTForm({...tForm, reservePlayers: parseInt(e.target.value) || 0})} className="bg-white/5" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Clan 1 Name / Tag</Label><Input value={tForm.clan1} onChange={e => setTForm({...tForm, clan1: e.target.value})} className="bg-white/5" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Clan 2 Name / Tag</Label><Input value={tForm.clan2} onChange={e => setTForm({...tForm, clan2: e.target.value})} className="bg-white/5" /></div>
                    
                    <div className="space-y-2 md:col-span-2 border-t border-white/5 pt-4 mt-2">
                      <Label className="text-[10px] font-black uppercase">Town Hall Distribution (Must sum to {tForm.totalPlayers})</Label>
                      <div className="flex gap-2">
                        <Select value={thInput.level.toString()} onValueChange={v => setThInput({...thInput, level: parseInt(v)})}>
                          <SelectTrigger className="w-32 bg-white/5"><SelectValue /></SelectTrigger>
                          <SelectContent>{[9,10,11,12,13,14,15,16,17,18].map(th => (<SelectItem key={th} value={th.toString()}>TH {th}</SelectItem>))}</SelectContent>
                        </Select>
                        <Input type="number" value={thInput.count} onChange={e => setThInput({...thInput, count: parseInt(e.target.value) || 0})} className="w-24 bg-white/5" placeholder="Count" />
                        <Button type="button" onClick={() => setTForm(p => ({ ...p, thDistribution: { ...p.thDistribution, [thInput.level]: thInput.count } }))} className="bg-blue-600"><Plus className="w-4 h-4" /> ADD</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {Object.entries(tForm.thDistribution).map(([th, count]) => (
                          <div key={th} className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
                            <span className="text-xs font-bold">TH{th}: {count}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-4 w-4 rounded-full hover:bg-red-500/20" onClick={() => setTForm(p => { const newDist = {...p.thDistribution}; delete newDist[parseInt(th)]; return { ...p, thDistribution: newDist }; })}>
                              <X className="w-3 h-3 text-red-400" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground mt-2">Current Sum: {Object.values(tForm.thDistribution).reduce((a,b)=>a+b,0)} / {tForm.totalPlayers}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-primary">Leader Pass Cost (Coins)</label>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input type="number" min="0" placeholder="e.g. 50 (0 to disable)" value={tForm.leaderPassCost} onChange={e => setTForm({...tForm, leaderPassCost: Number(e.target.value)})} className="pl-10 h-10 bg-white/5 border border-white/10" />
                      </div>
                    </div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Winner Refund Amount</Label><Input type="number" value={tForm.winnerRefundAmount} onChange={e => setTForm({...tForm, winnerRefundAmount: parseInt(e.target.value) || 0})} className="bg-white/5" /></div>
                  </div>
                </div>
              )}

              <div className="space-y-6 p-6 rounded-2xl bg-primary/5 border border-primary/10">
                <Label className="text-[12px] font-black uppercase flex items-center gap-2 text-primary"><Trophy className="w-4 h-4" /> REWARD PROTOCOL</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Reward Type</Label>
                    <Select value={tForm.rewardType} onValueChange={val => setTForm({...tForm, rewardType: val as any})}>
                      <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="money">REAL MONEY (INR)</SelectItem>
                        <SelectItem value="coin">ARENA COINS</SelectItem>
                        <SelectItem value="v-cash">V-CASH (⚡)</SelectItem>
                        <SelectItem value="ticket">TICKETS</SelectItem>
                        <SelectItem value="item">SPECIAL ITEM / GIFT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {tForm.rewardType === 'item' ? (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Item Name</Label>
                      <Input value={tForm.rewardItemName} onChange={e => setTForm({...tForm, rewardItemName: e.target.value})} placeholder="e.g. Gold Pass / Discord Nitro" className="bg-white/5" />
                    </div>
                  ) : tForm.rewardType === 'ticket' ? (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Ticket Type</Label>
                      <Select value={tForm.rewardTicketType} onValueChange={val => setTForm({...tForm, rewardTicketType: val})}>
                        <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bronze">BRONZE TICKET</SelectItem>
                          <SelectItem value="silver">SILVER TICKET</SelectItem>
                          <SelectItem value="golden">GOLDEN TICKET</SelectItem>
                        </SelectContent>
                      </Select>
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

          <div className="p-6 border-t border-white/10 bg-black/40 shrink-0 flex flex-col gap-4">
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-lg">
                  <EyeOff className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase text-primary">STEALTH MODE (TESTING)</h4>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">Hides from users & mutes notifications</p>
                </div>
              </div>
              <Switch checked={tForm.isStealth} onCheckedChange={c => setTForm({...tForm, isStealth: c})} />
            </div>

            <Button type="submit" form="t-form" disabled={tLoading} className="w-full h-14 bg-primary font-black uppercase text-xl glow-primary rounded-2xl">
              {tLoading ? <Loader2 className="animate-spin" /> : editTId ? 'UPDATE BATTLEFIELD' : 'DEPLOY TOURNAMENT'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
