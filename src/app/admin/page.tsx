
'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Swords, Wallet, AlertCircle, CheckCircle2, Search, Eye, Loader2, Settings, ImagePlus, Save, UserCog, UserMinus, UserPlus, Coins, Activity, TrendingUp, Plus, Trash2, Calendar, Clock, Trophy, QrCode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment, setDoc, where, getDocs, limit, deleteDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from "@clerk/nextjs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  
  const allRequestsQuery = useMemo(() => query(collection(db, 'recharge-requests')), [db]);
  const { data: allRequests } = useCollection(allRequestsQuery);

  const rechargeQuery = useMemo(() => query(collection(db, 'recharge-requests'), orderBy('createdAt', 'desc')), [db]);
  const { data: rechargeRequests, loading: rechargeLoading } = useCollection(rechargeQuery);

  const tournamentsQuery = useMemo(() => query(collection(db, 'tournaments'), orderBy('startTime', 'desc')), [db]);
  const { data: tournaments, loading: tournamentsLoading } = useCollection(tournamentsQuery);

  const settingsRef = useMemo(() => doc(db, 'app-settings', 'payment'), [db]);
  const { data: paymentSettings } = useDoc(settingsRef);

  // States
  const [userSearch, setUserSearch] = useState('');
  const [displayUsers, setDisplayUsers] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Tournament Form States
  const [tOpen, setTOpen] = useState(false);
  const [tLoading, setTLoading] = useState(false);
  const [tForm, setTForm] = useState({
    name: '',
    type: 'paid',
    subCategory: 'knockout',
    maxPlayers: 8,
    entryFee: 0,
    prizePool: '',
    rules: '',
    imageUrl: '',
    townHall: 0,
    registrationStartTime: '',
    registrationEndTime: '',
    startTime: ''
  });

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

  const onlineCount = useMemo(() => {
    if (!allUsers) return 0;
    const fiveMinsAgo = Date.now() - 5 * 60 * 1000;
    return allUsers.filter(u => u.lastActive && new Date(u.lastActive).getTime() > fiveMinsAgo).length;
  }, [allUsers]);

  const handleUpdateSettings = async () => {
    if (!isAdmin || savingSettings) return;
    setSavingSettings(true);
    updateDoc(settingsRef, {
      adminUpiId: upiId,
      adminQrUrl: qrUrl,
      updatedAt: new Date().toISOString()
    }).then(() => {
      toast({ title: "GATEWAY UPDATED", description: "Payment settings are now live." });
    }).catch(() => {
      toast({ variant: "destructive", title: "UPDATE FAILED" });
    }).finally(() => {
      setSavingSettings(false);
    });
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
      toast({ title: "FUNDS CREDITED", description: `🪙 ${req.amount} added to ${req.username}'s vault.` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRecharge = async () => {
    if (!rejectId || !rejectReason) return;
    setProcessingId(rejectId);
    try {
      await updateDoc(doc(db, 'recharge-requests', rejectId), { 
        status: 'rejected', 
        rejectionReason: rejectReason 
      });
      toast({ title: "REQUEST REJECTED", description: "User has been notified of the rejection." });
      setRejectId(null);
      setRejectReason('');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setTLoading(true);

    const rulesArray = tForm.rules.split('\n').filter(r => r.trim() !== '');
    const tId = doc(collection(db, 'tournaments')).id;
    const tRef = doc(db, 'tournaments', tId);

    const payload = {
      ...tForm,
      currentPlayers: 0,
      rules: rulesArray,
      status: 'upcoming',
      createdAt: new Date().toISOString()
    };

    setDoc(tRef, payload)
      .then(() => {
        toast({ title: "ARENA DEPLOYED", description: `${tForm.name} is now live.` });
        setTOpen(false);
        setTForm({
          name: '', type: 'paid', subCategory: 'knockout', maxPlayers: 8,
          entryFee: 0, prizePool: '', rules: '', imageUrl: '', townHall: 0,
          registrationStartTime: '', registrationEndTime: '', startTime: ''
        });
      })
      .catch(() => toast({ variant: "destructive", title: "DEPLOYMENT FAILED" }))
      .finally(() => setTLoading(false));
  };

  const handleDeleteTournament = async (id: string) => {
    if (!confirm("Are you sure? This will delete the tournament forever.")) return;
    deleteDoc(doc(db, 'tournaments', id))
      .then(() => toast({ title: "ARENA DISMANTLED" }));
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setTForm(prev => ({ ...prev, imageUrl: data.secure_url }));
        toast({ title: "THUMBNAIL UPLOADED" });
      }
    } finally {
      setTLoading(false);
    }
  };

  if (profileLoading) return <PageWrapper><div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></PageWrapper>;

  if (!isAdmin) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
          <Shield className="w-24 h-24 text-destructive animate-pulse" />
          <h1 className="font-headline text-4xl font-black text-destructive uppercase italic">UNAUTHORISED ACCESS</h1>
          <p className="text-muted-foreground max-w-sm">This sector is restricted to authorized Command Center personnel only.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-headline text-3xl font-black mb-1 uppercase">COMMAND <span className="text-primary italic">CENTER</span></h1>
            <p className="text-muted-foreground font-medium">Tournament management & financial oversight.</p>
          </div>
          <Button onClick={() => setTOpen(true)} className="bg-primary font-black gap-2 h-12 px-6 glow-primary">
            <Plus className="w-5 h-5" /> CREATE TOURNAMENT
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass border-white/5 bg-primary/5 relative overflow-hidden">
            <CardContent className="p-6">
              <p className="text-[10px] font-black text-primary uppercase mb-1">Total Recruits</p>
              <h3 className="text-3xl font-headline font-black">{allUsers?.length || 0}</h3>
              <Users className="absolute top-4 right-4 w-12 h-12 opacity-5" />
            </CardContent>
          </Card>
          <Card className="glass border-white/5 bg-green-500/5 relative overflow-hidden">
            <CardContent className="p-6">
              <p className="text-[10px] font-black text-green-500 uppercase mb-1">Active Warriors</p>
              <h3 className="text-3xl font-headline font-black">{onlineCount}</h3>
              <Activity className="absolute top-4 right-4 w-12 h-12 opacity-5" />
            </CardContent>
          </Card>
          <Card className="glass border-white/5 bg-blue-500/5 relative overflow-hidden">
            <CardContent className="p-6">
              <p className="text-[10px] font-black text-blue-500 uppercase mb-1">Total Events</p>
              <h3 className="text-3xl font-headline font-black">{tournaments?.length || 0}</h3>
              <Trophy className="absolute top-4 right-4 w-12 h-12 opacity-5" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tournaments" className="w-full">
          <TabsList className="bg-muted/50 border border-white/10 w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="tournaments"><Swords className="w-4 h-4 mr-2" /> Arena Hub</TabsTrigger>
            <TabsTrigger value="wallets"><Wallet className="w-4 h-4 mr-2" /> Wallet Logs</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="users" className="text-yellow-500"><UserCog className="w-4 h-4 mr-2" /> User Management</TabsTrigger>}
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" /> Gateway</TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments?.map((t: any) => (
                <Card key={t.id} className="glass border-white/5 overflow-hidden group">
                  <div className="relative h-32">
                    <Image src={t.imageUrl || 'https://picsum.photos/seed/coc/400/200'} alt={t.name} fill className="object-cover opacity-50" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDeleteTournament(t.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <div className="absolute bottom-2 left-4">
                      <Badge className="bg-primary uppercase text-[10px] font-black">{t.type}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-bold uppercase italic text-sm truncate">{t.name}</h3>
                    <div className="grid grid-cols-2 text-[10px] gap-2 text-muted-foreground uppercase font-black">
                      <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {t.currentPlayers}/{t.maxPlayers}</div>
                      <div className="flex items-center gap-1 text-primary"><Zap className="w-3 h-3" /> TH {t.townHall || 'ANY'}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {tournaments?.length === 0 && <p className="col-span-full text-center py-20 text-muted-foreground italic">No arenas deployed yet.</p>}
            </div>
          </TabsContent>

          <TabsContent value="wallets" className="mt-6">
            <Card className="glass border-white/5">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rechargeRequests?.map((req: any) => (
                      <TableRow key={req.id} className="border-white/5">
                        <TableCell>
                          <div>
                            <p className="font-bold text-sm uppercase">{req.username}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{req.transactionId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-black text-primary">🪙 {req.amount}</TableCell>
                        <TableCell><Badge variant={req.status === 'pending' ? 'outline' : 'default'}>{req.status.toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSelectedProof(req.screenshotUrl)}><Eye className="w-3 h-3 mr-1" /> PROOF</Button>
                            {req.status === 'pending' && (
                              <>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveRecharge(req)} disabled={processingId === req.id}>
                                  {processingId === req.id ? <Loader2 className="animate-spin w-3 h-3" /> : 'APPROVE'}
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => setRejectId(req.id)}>REJECT</Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="users" className="mt-6">
              <Card className="glass border-white/5">
                <CardContent className="p-6">
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by username or clash tag..." className="pl-10 h-12 bg-white/5" />
                  </div>
                  <div className="space-y-4">
                    {displayUsers.map(u => (
                      <div key={u.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-muted overflow-hidden relative border border-white/10">
                            {u.avatarUrl && <Image src={u.avatarUrl} alt="avatar" fill className="object-cover" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black uppercase text-sm">{u.username}</p>
                              {u.isSuperAdmin ? <CheckCircle2 className="w-3 h-3 text-yellow-500" /> : u.isAdmin && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase font-black">{u.tag} • 🪙 {u.balance} • TH{u.townHall}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 border-r border-white/10 pr-2 mr-2">
                            <Button size="icon" variant="outline" className="h-8 w-8 text-green-500" onClick={() => updateDoc(doc(db, 'users', u.id), { balance: increment(50) })}><Plus className="w-4 h-4" /></Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-red-500" onClick={() => updateDoc(doc(db, 'users', u.id), { balance: increment(-50) })}><UserMinus className="w-4 h-4" /></Button>
                          </div>
                          {u.id !== MASTER_SUPER_ADMIN_ID && (
                            u.isAdmin ? (
                              <Button size="sm" variant="destructive" className="h-8 text-[10px] font-black" onClick={() => updateDoc(doc(db, 'users', u.id), { isAdmin: false })}>DISMISS ADMIN</Button>
                            ) : (
                              <Button size="sm" variant="outline" className="h-8 text-[10px] font-black text-green-500 border-green-500/20" onClick={() => updateDoc(doc(db, 'users', u.id), { isAdmin: true })}>PROMOTE ADMIN</Button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="settings" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="glass border-white/5">
                <CardHeader><CardTitle className="font-headline text-xl font-bold uppercase">PAYMENT GATEWAY</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Official UPI ID</Label><Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="e.g. boss@okaxis" className="h-12 bg-white/5" /></div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase">Master QR Code</Label>
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative h-48 w-48 rounded-2xl overflow-hidden border-2 border-dashed border-white/10 bg-black/20 flex items-center justify-center">
                        {qrUrl ? <Image src={qrUrl} alt="QR" fill className="object-contain" /> : <QrCode className="w-12 h-12 text-muted-foreground opacity-20" />}
                        {uploadingQr && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}
                      </div>
                      <Button variant="outline" className="w-full h-12 border-dashed border-white/20" onClick={() => qrInputRef.current?.click()}>{qrUrl ? 'CHANGE QR CODE' : 'UPLOAD QR CODE'}</Button>
                      <input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={handleAdminQrUpload} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter><Button className="w-full h-12 bg-primary font-black uppercase" onClick={handleUpdateSettings} disabled={savingSettings}>{savingSettings ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />} SAVE CONFIGURATION</Button></CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={tOpen} onOpenChange={setTOpen}>
        <DialogContent className="glass border-white/10 max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-0"><DialogTitle className="font-headline text-2xl font-black italic uppercase">DEPLOY NEW <span className="text-primary">ARENA</span></DialogTitle></DialogHeader>
          <form onSubmit={handleCreateTournament} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Arena Name</Label><Input value={tForm.name} onChange={e => setTForm({...tForm, name: e.target.value})} placeholder="e.g. Titan Clash" required /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Category</Label>
                <Select value={tForm.type} onValueChange={val => setTForm({...tForm, type: val as any})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="paid">PAID TOURNAMENT</SelectItem><SelectItem value="free">FREE TOURNAMENT</SelectItem><SelectItem value="championship">CHAMPIONSHIP</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Sub Category</Label>
                <Select value={tForm.subCategory} onValueChange={val => setTForm({...tForm, subCategory: val as any})}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="knockout">KNOCKOUT</SelectItem><SelectItem value="1vs1">1 VS 1</SelectItem><SelectItem value="tdm">TEAM DEATH MATCH</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Required Town Hall</Label>
                <Select value={tForm.townHall.toString()} onValueChange={val => setTForm({...tForm, townHall: parseInt(val)})}>
                  <SelectTrigger><SelectValue placeholder="NONE (ALL LEVELS)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">NONE (ANY LEVEL)</SelectItem>
                    {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(th => (
                      <SelectItem key={th} value={th.toString()}>TOWN HALL {th}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Max Players</Label><Input type="number" value={tForm.maxPlayers} onChange={e => setTForm({...tForm, maxPlayers: parseInt(e.target.value)})} /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Entry Fee (Coins)</Label><Input type="number" value={tForm.entryFee} onChange={e => setTForm({...tForm, entryFee: parseInt(e.target.value)})} /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Prize Pool / Rewards</Label><Input value={tForm.prizePool} onChange={e => setTForm({...tForm, prizePool: e.target.value})} placeholder="e.g. 1000 Coins + Gold Pass" /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Reg Start (IST)</Label><Input type="datetime-local" value={tForm.registrationStartTime} onChange={e => setTForm({...tForm, registrationStartTime: e.target.value})} required /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Reg End (IST)</Label><Input type="datetime-local" value={tForm.registrationEndTime} onChange={e => setTForm({...tForm, registrationEndTime: e.target.value})} required /></div>
              <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Battle Start (IST)</Label><Input type="datetime-local" value={tForm.startTime} onChange={e => setTForm({...tForm, startTime: e.target.value})} required /></div>
            </div>

            <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Rules (One per line)</Label><Textarea value={tForm.rules} onChange={e => setTForm({...tForm, rules: e.target.value})} placeholder="Rule 1&#10;Rule 2" className="h-24" /></div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">Arena Thumbnail</Label>
              <div className="flex items-center gap-4">
                <Button type="button" variant="outline" onClick={() => document.getElementById('t-thumb')?.click()} className="w-full h-12 border-dashed border-white/20">{tForm.imageUrl ? 'CHANGE IMAGE' : 'UPLOAD THUMBNAIL'}</Button>
                <input id="t-thumb" type="file" className="hidden" accept="image/*" onChange={handleThumbnailUpload} />
                {tForm.imageUrl && <div className="h-12 w-20 relative rounded overflow-hidden border border-white/10"><Image src={tForm.imageUrl} alt="preview" fill className="object-cover" /></div>}
              </div>
            </div>

            <Button type="submit" disabled={tLoading} className="w-full h-14 bg-primary font-black uppercase text-xl glow-primary">
              {tLoading ? <Loader2 className="animate-spin" /> : 'DEPLOY ARENA'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="glass border-white/10 max-w-lg p-0 overflow-hidden">
          <div className="relative aspect-auto min-h-[400px] w-full bg-black/40">{selectedProof && <Image src={selectedProof} alt="Proof" fill className="object-contain" />}</div>
          <DialogFooter className="p-4 bg-black/20"><Button onClick={() => setSelectedProof(null)} className="w-full font-black">CLOSE VIEWER</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent className="glass border-white/10">
          <DialogHeader><DialogTitle className="uppercase font-black">REJECT REQUEST</DialogTitle></DialogHeader>
          <div className="py-4"><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="h-32 bg-white/5" /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setRejectId(null)}>CANCEL</Button><Button variant="destructive" onClick={handleRejectRecharge}>CONFIRM REJECTION</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
