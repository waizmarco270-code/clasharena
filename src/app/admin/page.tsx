
'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Swords, Wallet, AlertCircle, CheckCircle2, XCircle, Search, Eye, Loader2, Settings, QrCode, ImagePlus, Save, Ban, UserCog, UserMinus, UserPlus, Coins } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment, setDoc, where, getDocs, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from "@clerk/nextjs";

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export default function AdminPanel() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;

  // Recharge Requests
  const rechargeQuery = useMemo(() => query(collection(db, 'recharge-requests'), orderBy('createdAt', 'desc')), [db]);
  const { data: rechargeRequests, loading: rechargeLoading } = useCollection(rechargeQuery);

  // Payment Settings
  const settingsRef = useMemo(() => doc(db, 'app-settings', 'payment'), [db]);
  const { data: paymentSettings, loading: settingsLoading } = useDoc(settingsRef);

  // User Management (Super Admin)
  const [userSearch, setUserSearch] = useState('');
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [upiId, setUpiId] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paymentSettings) {
      setUpiId(paymentSettings.adminUpiId || '');
      setQrUrl(paymentSettings.adminQrUrl || '');
    }
  }, [paymentSettings]);

  const searchUsers = async () => {
    if (!userSearch.trim()) return;
    setSearching(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', userSearch),
        where('username', '<=', userSearch + '\uf8ff'),
        limit(5)
      );
      const snap = await getDocs(q);
      const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFoundUsers(results);
    } catch (e) {
      toast({ variant: "destructive", title: "Search Error" });
    } finally {
      setSearching(false);
    }
  };

  const handleUpdateUserCoins = async (targetUserId: string, amount: number) => {
    const targetRef = doc(db, 'users', targetUserId);
    updateDoc(targetRef, { balance: increment(amount) })
      .then(() => toast({ title: "Coins Updated" }))
      .catch(() => toast({ variant: "destructive", title: "Update Failed" }));
  };

  const handleToggleAdmin = async (targetUserId: string, currentStatus: boolean) => {
    const targetRef = doc(db, 'users', targetUserId);
    updateDoc(targetRef, { isAdmin: !currentStatus })
      .then(() => {
        toast({ title: !currentStatus ? "Admin Appointed" : "Admin Removed" });
        searchUsers();
      })
      .catch(() => toast({ variant: "destructive", title: "Privilege Update Failed" }));
  };

  const handleApproveRecharge = (request: any) => {
    if (processingId) return;
    setProcessingId(request.id);

    const userRef = doc(db, 'users', request.userId);
    const requestRef = doc(db, 'recharge-requests', request.id);

    updateDoc(userRef, { balance: increment(request.amount) })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: userRef.path, operation: 'update' }));
      });

    updateDoc(requestRef, { status: 'approved' })
      .then(() => toast({ title: "RECHARGE APPROVED", description: `🪙 ${request.amount} credited.` }))
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: requestRef.path, operation: 'update' }));
      })
      .finally(() => setProcessingId(null));
  };

  const handleRejectRecharge = () => {
    if (!rejectId || !rejectReason.trim()) return;
    setProcessingId(rejectId);
    const requestRef = doc(db, 'recharge-requests', rejectId);
    updateDoc(requestRef, { status: 'rejected', rejectionReason: rejectReason })
      .then(() => {
        toast({ title: "RECHARGE REJECTED" });
        setRejectId(null);
        setRejectReason('');
      })
      .finally(() => setProcessingId(null));
  };

  const handleSaveSettings = () => {
    setSavingSettings(true);
    setDoc(settingsRef, { adminUpiId: upiId, adminQrUrl: qrUrl, updatedAt: new Date().toISOString() }, { merge: true })
      .then(() => toast({ title: "GATEWAY SECURED" }))
      .finally(() => setSavingSettings(false));
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        toast({ title: "QR Updated" });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Upload Failed" });
    } finally {
      setUploadingQr(false);
    }
  };

  if (profileLoading) return <PageWrapper><div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-primary" /></div></PageWrapper>;

  if (!isAdmin) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
          <Shield className="w-24 h-24 text-destructive animate-pulse" />
          <div className="space-y-2">
            <h1 className="font-headline text-4xl font-black text-destructive uppercase italic">UNAUTHORISED ACCESS</h1>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Security protocol active. Your identity is being recorded.</p>
          </div>
          <Button variant="outline" className="border-white/10" onClick={() => window.location.href = '/'}>ABORT MISSION</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="font-headline text-3xl font-black mb-1 uppercase">COMMAND <span className="text-primary italic">CENTER</span></h1>
          <p className="text-muted-foreground font-medium">Tournament management & financial oversight.</p>
        </div>

        <Tabs defaultValue="wallets" className="w-full">
          <TabsList className="bg-muted/50 border border-white/10 w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="wallets"><Wallet className="w-4 h-4 mr-2" /> Wallet Logs</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" /> Gateway Settings</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="users" className="text-yellow-500"><UserCog className="w-4 h-4 mr-2" /> User Management</TabsTrigger>}
          </TabsList>

          <TabsContent value="wallets" className="mt-6">
            <Card className="glass border-white/5">
              <CardHeader><CardTitle className="font-headline">Recharge Verification</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow className="border-white/5"><TableHead>User / Tx ID</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rechargeLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>
                    ) : (
                      rechargeRequests?.map((req: any) => (
                        <TableRow key={req.id} className="border-white/5">
                          <TableCell><p className="font-bold text-sm uppercase">{req.username}</p><p className="text-[10px] text-muted-foreground font-mono">{req.transactionId}</p></TableCell>
                          <TableCell className="font-black text-primary">🪙 {req.amount}</TableCell>
                          <TableCell><Badge variant={req.status === 'pending' ? 'outline' : req.status === 'approved' ? 'default' : 'destructive'}>{req.status.toUpperCase()}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" className="h-8" onClick={() => setSelectedProof(req.screenshotUrl)}><Eye className="w-3 h-3 mr-1" /> PROOF</Button>
                              {req.status === 'pending' && (
                                <>
                                  <Button size="sm" className="h-8 bg-green-600 hover:bg-green-500" onClick={() => handleApproveRecharge(req)} disabled={!!processingId}>APPROVE</Button>
                                  <Button size="sm" variant="destructive" className="h-8" onClick={() => setRejectId(req.id)} disabled={!!processingId}>REJECT</Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="users" className="mt-6">
              <Card className="glass border-white/5">
                <CardHeader>
                  <CardTitle className="font-headline text-yellow-500">Global User Registry</CardTitle>
                  <CardDescription>Search and manage any user profile in the ecosystem.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search by username..." className="pl-10 h-12 bg-white/5" />
                    </div>
                    <Button onClick={searchUsers} disabled={searching} className="h-12 px-8 bg-yellow-500 hover:bg-yellow-600 text-black font-black">
                      {searching ? <Loader2 className="animate-spin" /> : 'SEARCH'}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {foundUsers.map(u => (
                      <div key={u.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full overflow-hidden border border-white/10 bg-muted">
                            {u.avatarUrl && <Image src={u.avatarUrl} alt="avatar" width={48} height={48} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black uppercase">{u.username}</p>
                              {u.isSuperAdmin && <CheckCircle2 className="w-4 h-4 text-yellow-500" />}
                              {u.isAdmin && !u.isSuperAdmin && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground">{u.tag} • Balance: 🪙{u.balance}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center">
                          <Button size="sm" variant="outline" className="h-9 border-green-500/20 text-green-500" onClick={() => handleUpdateUserCoins(u.id, 50)}><Coins className="w-3 h-3 mr-1" /> +50</Button>
                          <Button size="sm" variant="outline" className="h-9 border-red-500/20 text-red-500" onClick={() => handleUpdateUserCoins(u.id, -50)}><Coins className="w-3 h-3 mr-1" /> -50</Button>
                          {u.id !== MASTER_SUPER_ADMIN_ID && (
                            <Button 
                              size="sm" 
                              variant={u.isAdmin ? "destructive" : "secondary"} 
                              className="h-9 font-black" 
                              onClick={() => handleToggleAdmin(u.id, u.isAdmin)}
                            >
                              {u.isAdmin ? <UserMinus className="w-3 h-3 mr-1" /> : <UserPlus className="w-3 h-3 mr-1" />}
                              {u.isAdmin ? 'REVOKE ADMIN' : 'MAKE ADMIN'}
                            </Button>
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
            <Card className="glass border-white/5 max-w-2xl">
              <CardHeader><CardTitle className="font-headline text-xl">Payment Gateway Protocol</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Master UPI ID</Label>
                  <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} className="bg-white/5 border-white/10 h-12 font-mono" />
                </div>
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Official QR Code</Label>
                  <div className="relative group cursor-pointer" onClick={() => qrInputRef.current?.click()}>
                    {qrUrl ? (
                      <div className="relative h-48 w-48 rounded-2xl overflow-hidden border-2 border-primary/40 bg-white p-2">
                        <Image src={qrUrl} alt="Admin QR" fill className="object-contain p-2" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          {uploadingQr ? <Loader2 className="animate-spin text-white" /> : <ImagePlus className="text-white" />}
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 w-48 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5">
                        {uploadingQr ? <Loader2 className="animate-spin text-primary" /> : <ImagePlus className="text-muted-foreground" />}
                      </div>
                    )}
                    <input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={handleQrUpload} />
                  </div>
                </div>
                <Button onClick={handleSaveSettings} disabled={savingSettings || uploadingQr} className="w-full h-12 bg-primary font-black"><Save className="w-4 h-4 mr-2" /> SECURE SETTINGS</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="glass max-w-lg p-4">
          <DialogHeader><DialogTitle className="text-center font-black uppercase italic tracking-tighter">Payment Evidence</DialogTitle></DialogHeader>
          {selectedProof && <div className="relative aspect-video w-full rounded-xl overflow-hidden border-2 border-white/10 mt-4"><Image src={selectedProof} alt="Proof" fill className="object-contain" /></div>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent className="glass max-w-md border-destructive/20">
          <DialogHeader><DialogTitle className="font-headline uppercase italic text-destructive">Protocol Violation</DialogTitle></DialogHeader>
          <div className="py-4"><Label className="text-[10px] font-black uppercase mb-2 block">Rejection Reason</Label><Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Fake screenshot detected." className="bg-white/5 h-32" /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setRejectId(null)}>CANCEL</Button><Button variant="destructive" onClick={handleRejectRecharge} disabled={!rejectReason.trim() || !!processingId}>REJECT REQUEST</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
