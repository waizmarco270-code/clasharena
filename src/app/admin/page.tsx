
'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Swords, 
  Wallet, 
  Eye, 
  Loader2, 
  Settings, 
  Save, 
  UserCog, 
  Plus, 
  Trash2, 
  QrCode, 
  Zap, 
  Edit3, 
  X,
  Search,
  CheckCircle2,
  ImagePlus,
  Monitor,
  Camera,
  Calendar,
  Clock,
  Trophy,
  Gift,
  IndianRupee,
  PackageCheck,
  ArrowUpRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment, setDoc, deleteDoc, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useUser } from "@clerk/nextjs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export default function AdminPanel() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;

  // Stats Queries
  const allUsersQuery = useMemo(() => query(collection(db, 'users')), [db]);
  const { data: allUsers } = useCollection(allUsersQuery);
  
  const rechargeQuery = useMemo(() => query(collection(db, 'recharge-requests'), orderBy('createdAt', 'desc')), [db]);
  const { data: rechargeRequests } = useCollection(rechargeQuery);

  const tournamentsQuery = useMemo(() => query(collection(db, 'tournaments'), orderBy('startTime', 'desc')), [db]);
  const { data: tournaments } = useCollection(tournamentsQuery);

  const claimsQuery = useMemo(() => query(collection(db, 'reward-claims'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')), [db]);
  const { data: pendingClaims } = useCollection(claimsQuery);

  const settingsRef = useMemo(() => doc(db, 'app-settings', 'payment'), [db]);
  const { data: paymentSettings } = useDoc(settingsRef);

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgSettings } = useDoc(backgroundsRef);

  // States
  const [userSearch, setUserSearch] = useState('');
  const [displayUsers, setDisplayUsers] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Fulfillment Hub States
  const [activeClaim, setActiveClaim] = useState<any | null>(null);
  const [fulfillmentProof, setFulfillmentProof] = useState('');
  const [uploadingFulfillment, setUploadingFulfillment] = useState(false);
  const fulfillInputRef = useRef<HTMLInputElement>(null);

  // Payment Gateway States
  const [upiId, setUpiId] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Background States
  const [bgs, setBgs] = useState({ arena: '', dashboard: '', wallet: '', hallOfChampions: '' });
  const [savingBgs, setSavingBgs] = useState(false);

  // Tournament Form States
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

  useEffect(() => {
    if (bgSettings) {
      setBgs({
        arena: bgSettings.arena || '',
        dashboard: bgSettings.dashboard || '',
        wallet: bgSettings.wallet || '',
        hallOfChampions: bgSettings.hallOfChampions || ''
      });
    }
  }, [bgSettings]);

  useEffect(() => {
    if (!userSearch && allUsers) {
      setDisplayUsers(allUsers);
    } else if (userSearch && allUsers) {
      const filtered = allUsers.filter(u => 
        u.username?.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.tag?.toLowerCase().includes(userSearch.toLowerCase())
      );
      setDisplayUsers(filtered);
    }
  }, [allUsers, userSearch]);

  useEffect(() => {
    if (paymentSettings) {
      setUpiId(paymentSettings.adminUpiId || '');
      setQrUrl(paymentSettings.adminQrUrl || '');
    }
  }, [paymentSettings]);

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

  const handleUpdateSettings = async () => {
    if (!isAdmin || savingSettings) return;
    setSavingSettings(true);
    setDoc(settingsRef, {
      adminUpiId: upiId,
      adminQrUrl: qrUrl,
      updatedAt: new Date().toISOString()
    }, { merge: true }).then(() => {
      toast({ title: "GATEWAY UPDATED" });
    }).finally(() => {
      setSavingSettings(false);
    });
  };

  const handleBgUpload = async (section: keyof typeof bgs, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingBgs(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        const updatedBgs = { ...bgs, [section]: data.secure_url };
        await setDoc(backgroundsRef, {
          ...updatedBgs,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setBgs(updatedBgs);
        toast({ title: "VISUAL DEPLOYED" });
      }
    } finally {
      setSavingBgs(false);
    }
  };

  const handleTournamentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
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
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setTForm(prev => ({ ...prev, rewardImageUrl: data.secure_url }));
        toast({ title: "REWARD PHOTO READY" });
      }
    } finally {
      setUploadingReward(false);
    }
  };

  const handleAdminQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setQrUrl(data.secure_url);
        toast({ title: "MASTER QR UPLOADED" });
      }
    } finally {
      setUploadingQr(false);
    }
  };

  const handleApproveRecharge = async (req: any) => {
    if (processingId) return;
    setProcessingId(req.id);
    try {
      const targetUserRef = doc(db, 'users', req.userId);
      await updateDoc(targetUserRef, { balance: increment(req.amount) });
      await updateDoc(doc(db, 'recharge-requests', req.id), { status: 'approved' });
      toast({ title: "FUNDS CREDITED" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleFulfillmentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFulfillment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setFulfillmentProof(data.secure_url);
        toast({ title: "PROOF PHOTO READY" });
      }
    } finally {
      setUploadingFulfillment(false);
    }
  };

  const completeFulfillment = async () => {
    if (!activeClaim || !fulfillmentProof || processingId) return;
    setProcessingId(activeClaim.id);
    try {
      const claimRef = doc(db, 'reward-claims', activeClaim.id);
      await updateDoc(claimRef, {
        status: 'completed',
        proofImageUrl: fulfillmentProof,
        completedAt: new Date().toISOString()
      });

      // Update user earnings if it was money
      if (activeClaim.rewardType === 'money') {
        const amount = parseInt(activeClaim.rewardValue) || 0;
        await updateDoc(doc(db, 'users', activeClaim.userId), {
          earnings: increment(amount)
        });
      }

      toast({ title: "REWARD DELIVERED" });
      setActiveClaim(null);
      setFulfillmentProof('');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
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

    if (editTId) {
      updateDoc(doc(db, 'tournaments', editTId), tournamentData)
        .then(() => { toast({ title: "ARENA UPDATED" }); setTOpen(false); resetTForm(); })
        .finally(() => setTLoading(false));
    } else {
      const tRef = doc(collection(db, 'tournaments'));
      setDoc(tRef, { 
        ...tournamentData, 
        currentPlayers: 0, 
        status: 'upcoming', 
        createdAt: new Date().toISOString() 
      })
        .then(() => { toast({ title: "ARENA DEPLOYED" }); setTOpen(false); resetTForm(); })
        .finally(() => setTLoading(false));
    }
  };

  if (profileLoading) return <PageWrapper><div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></PageWrapper>;

  if (!isAdmin) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
          <Shield className="w-24 h-24 text-destructive animate-pulse" />
          <h1 className="font-headline text-4xl font-black text-destructive uppercase italic tracking-tighter">UNAUTHORISED ACCESS</h1>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <h1 className="font-headline text-3xl font-black uppercase tracking-tighter">COMMAND <span className="text-primary italic">CENTER</span></h1>
          <Button onClick={() => { resetTForm(); setTOpen(true); }} className="bg-primary font-black gap-2 h-12 px-6 glow-primary">
            <Plus className="w-5 h-5" /> CREATE TOURNAMENT
          </Button>
        </div>

        <Tabs defaultValue="tournaments" className="w-full">
          <TabsList className="bg-muted/50 border border-white/10 w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="tournaments"><Swords className="w-4 h-4 mr-2" /> Arena Hub</TabsTrigger>
            <TabsTrigger value="claims" className="relative">
              <PackageCheck className="w-4 h-4 mr-2" /> Fulfillment Hub
              {pendingClaims && pendingClaims.length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 rounded-full text-[8px] flex items-center justify-center border border-black">{pendingClaims.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="wallets"><Wallet className="w-4 h-4 mr-2" /> Wallet Logs</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="users" className="text-yellow-500"><UserCog className="w-4 h-4 mr-2" /> User Management</TabsTrigger>}
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" /> Gateway</TabsTrigger>
            <TabsTrigger value="backgrounds"><Monitor className="w-4 h-4 mr-2" /> Backgrounds</TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments" className="mt-6">
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
          </TabsContent>

          <TabsContent value="claims" className="mt-6">
            <Card className="glass border-white/5 overflow-hidden">
               <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5">
                    <TableHead className="text-[10px] font-black uppercase">Winner</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Tournament</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Reward</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingClaims?.map((claim: any) => (
                    <TableRow key={claim.id} className="border-white/5">
                      <TableCell>
                        <div>
                          <p className="font-bold uppercase text-xs">{claim.username}</p>
                          <p className="text-[8px] text-muted-foreground uppercase font-black">{claim.userId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs uppercase font-medium">{claim.tournamentName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 text-[10px]">
                           {claim.rewardType === 'money' ? `₹ ${claim.rewardValue}` : claim.rewardItemName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => setActiveClaim(claim)} className="bg-green-600 font-black h-8 text-[10px]">PROCESS</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!pendingClaims || pendingClaims.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground uppercase font-black text-xs">All rewards fulfilled</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="wallets" className="mt-6">
            <Card className="glass border-white/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5">
                    <TableHead className="text-[10px] font-black uppercase">User</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Amount</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rechargeRequests?.map((req: any) => (
                    <TableRow key={req.id} className="border-white/5">
                      <TableCell className="font-bold uppercase text-xs">{req.username}</TableCell>
                      <TableCell className="font-black text-primary">🪙 {req.amount}</TableCell>
                      <TableCell><Badge variant={req.status === 'pending' ? 'outline' : 'default'}>{req.status.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="outline" onClick={() => setSelectedProof(req.screenshotUrl)}><Eye className="w-3 h-3" /></Button>
                          {req.status === 'pending' && (
                            <Button size="sm" className="bg-green-600" onClick={() => handleApproveRecharge(req)} disabled={processingId === req.id}>APPROVE</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card className="glass border-white/5 p-6 space-y-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
                <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search commanders..." className="pl-10 h-12 bg-white/5" />
              </div>
              <div className="space-y-3">
                {displayUsers.map(u => (
                  <div key={u.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted overflow-hidden relative border border-white/10">
                        {u.avatarUrl && <Image src={u.avatarUrl} alt="avatar" fill className="object-cover" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black uppercase text-sm">{u.username}</p>
                          {u.isSuperAdmin && <CheckCircle2 className="w-3 h-3 text-yellow-500" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-black">{u.tag} • 🪙 {u.balance}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline" className="h-8 w-8 text-green-500" onClick={() => updateDoc(doc(db, 'users', u.id), { balance: increment(50) })}><Plus className="w-4 h-4" /></Button>
                      {u.id !== MASTER_SUPER_ADMIN_ID && (
                         u.isAdmin ? (
                           <Button size="sm" variant="destructive" className="h-8 text-[10px] font-black" onClick={() => updateDoc(doc(db, 'users', u.id), { isAdmin: false })}>DISMISS</Button>
                         ) : (
                           <Button size="sm" variant="outline" className="h-8 text-[10px] font-black text-green-500" onClick={() => updateDoc(doc(db, 'users', u.id), { isAdmin: true })}>PROMOTE</Button>
                         )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card className="glass border-white/5">
              <CardHeader><CardTitle className="font-headline text-xl font-bold uppercase">PAYMENT GATEWAY</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Official UPI ID</Label><Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="e.g. boss@okaxis" className="h-12 bg-white/5" /></div>
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase">Master QR Code</Label>
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative h-48 w-48 rounded-2xl overflow-hidden border-2 border-dashed border-white/10 bg-black/20 flex items-center justify-center">
                      {qrUrl ? <Image src={qrUrl} alt="QR" fill className="object-contain" /> : <QrCode className="w-12 h-12 text-muted-foreground opacity-20" />}
                    </div>
                    <Button variant="outline" className="w-full h-12 border-dashed border-white/20" onClick={() => qrInputRef.current?.click()}>{qrUrl ? 'CHANGE QR' : 'UPLOAD QR'}</Button>
                    <input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={handleAdminQrUpload} />
                  </div>
                </div>
              </CardContent>
              <CardFooter><Button className="w-full h-12 bg-primary font-black uppercase" onClick={handleUpdateSettings} disabled={savingSettings}>{savingSettings ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />} SAVE CONFIG</Button></CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="backgrounds" className="mt-6">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Object.keys(bgs).map((section) => (
                  <Card key={section} className="glass border-white/5">
                    <CardHeader><CardTitle className="text-sm font-black uppercase">{section} VISUAL</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="h-32 relative rounded-xl overflow-hidden border border-white/10 bg-black/20">
                        {bgs[section as keyof typeof bgs] && <Image src={bgs[section as keyof typeof bgs]} alt={section} fill className="object-cover" />}
                      </div>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => document.getElementById(`bg-${section}`)?.click()}>CHANGE IMAGE</Button>
                      <input id={`bg-${section}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleBgUpload(section as any, e)} />
                    </CardContent>
                  </Card>
                ))}
             </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reward Fulfillment Dialog */}
      <Dialog open={!!activeClaim} onOpenChange={() => setActiveClaim(null)}>
        <DialogContent className="glass border-white/10 max-w-xl">
           <DialogHeader>
             <DialogTitle className="font-headline text-xl uppercase italic">Reward <span className="text-primary">Fulfillment</span></DialogTitle>
             <DialogDescription className="text-[10px] font-black uppercase text-muted-foreground">Deliver reward to {activeClaim?.username}</DialogDescription>
           </DialogHeader>
           <div className="space-y-6 py-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                 <div className="flex justify-between items-center"><span className="text-[9px] font-black uppercase text-muted-foreground">Reward Type</span><Badge className="bg-primary/20 text-primary uppercase text-[9px]">{activeClaim?.rewardType}</Badge></div>
                 <div className="flex justify-between items-center">
                   <span className="text-[9px] font-black uppercase text-muted-foreground">Reward Detail</span>
                   <span className="text-sm font-black uppercase">{activeClaim?.rewardType === 'money' ? `₹ ${claim.rewardValue}` : activeClaim?.rewardItemName}</span>
                 </div>
              </div>

              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload Delivery Proof</Label>
                 <div className="relative cursor-pointer group" onClick={() => fulfillInputRef.current?.click()}>
                    {fulfillmentProof ? (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-primary/40">
                         <Image src={fulfillmentProof} alt="Proof" fill className="object-cover opacity-60" />
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40"><ImagePlus className="w-8 h-8 text-white" /></div>
                      </div>
                    ) : (
                      <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all">
                        {uploadingFulfillment ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Camera className="w-8 h-8 text-muted-foreground" />}
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Select Screenshot</p>
                      </div>
                    )}
                    <input type="file" ref={fulfillInputRef} className="hidden" accept="image/*" onChange={handleFulfillmentProofUpload} />
                 </div>
              </div>
           </div>
           <DialogFooter>
              <Button onClick={completeFulfillment} disabled={!fulfillmentProof || processingId === activeClaim?.id} className="w-full h-12 bg-primary font-black uppercase rounded-xl shadow-xl glow-primary">
                 {processingId ? <Loader2 className="animate-spin" /> : <PackageCheck className="w-4 h-4 mr-2" />} CONFIRM DELIVERY
              </Button>
           </DialogFooter>
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

      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="glass border-white/10 max-w-2xl">
          <DialogHeader><DialogTitle className="font-headline text-xl uppercase">Payment Proof</DialogTitle></DialogHeader>
          {selectedProof && (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10">
              <Image src={selectedProof} alt="Proof" fill className="object-contain bg-black" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

