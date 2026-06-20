
'use client';

import { useMemo, useState, useRef } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Swords, Wallet, AlertCircle, CheckCircle2, XCircle, Search, Eye, Loader2, Settings, QrCode, ImagePlus, Save, Ban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, useDoc, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function AdminPanel() {
  const db = useFirestore();
  const { toast } = useToast();
  
  // Fetch Recharge Requests
  const rechargeQuery = useMemo(() => query(collection(db, 'recharge-requests'), orderBy('createdAt', 'desc')), [db]);
  const { data: rechargeRequests, loading: rechargeLoading } = useCollection(rechargeQuery);

  // Fetch Payment Settings
  const settingsRef = useMemo(() => doc(db, 'app-settings', 'payment'), [db]);
  const { data: paymentSettings, loading: settingsLoading } = useDoc(settingsRef);

  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Rejection State
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Settings State
  const [upiId, setUpiId] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Sync settings when loaded
  useMemo(() => {
    if (paymentSettings) {
      setUpiId(paymentSettings.adminUpiId || '');
      setQrUrl(paymentSettings.adminQrUrl || '');
    }
  }, [paymentSettings]);

  const handleApproveRecharge = (request: any) => {
    if (processingId) return;
    setProcessingId(request.id);

    const userRef = doc(db, 'users', request.userId);
    const requestRef = doc(db, 'recharge-requests', request.id);

    // Update user balance and request status
    updateDoc(userRef, { balance: increment(request.amount) })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
        });
        errorEmitter.emit('permission-error', permissionError);
      });

    updateDoc(requestRef, { status: 'approved' })
      .then(() => {
        toast({ title: "RECHARGE APPROVED", description: `🪙 ${request.amount} credited to ${request.username}.` });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: requestRef.path,
          operation: 'update',
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setProcessingId(null);
      });
  };

  const handleRejectRecharge = () => {
    if (!rejectId || !rejectReason.trim()) {
      toast({ variant: "destructive", title: "Reason Required", description: "Provide a reason for rejection." });
      return;
    }

    setProcessingId(rejectId);
    const requestRef = doc(db, 'recharge-requests', rejectId);

    updateDoc(requestRef, { 
      status: 'rejected',
      rejectionReason: rejectReason 
    })
      .then(() => {
        toast({ title: "RECHARGE REJECTED", description: "User has been notified." });
        setRejectId(null);
        setRejectReason('');
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: requestRef.path,
          operation: 'update',
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setProcessingId(null);
      });
  };

  const handleSaveSettings = () => {
    setSavingSettings(true);
    const data = {
      adminUpiId: upiId,
      adminQrUrl: qrUrl,
      updatedAt: new Date().toISOString()
    };

    setDoc(settingsRef, data, { merge: true })
      .then(() => {
        toast({ title: "GATEWAY SECURED", description: "Payment settings updated globally." });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: settingsRef.path,
          operation: 'write',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setSavingSettings(false);
      });
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
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) {
        setQrUrl(data.secure_url);
        toast({ title: "QR Updated" });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed" });
    } finally {
      setUploadingQr(false);
    }
  };

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-black mb-1 uppercase">COMMAND <span className="text-primary italic">CENTER</span></h1>
            <p className="text-muted-foreground font-medium">Tournament management & financial oversight.</p>
          </div>
        </div>

        <Tabs defaultValue="wallets" className="w-full">
          <TabsList className="bg-muted/50 border border-white/10 w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="wallets"><Wallet className="w-4 h-4 mr-2" /> Wallet Logs</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" /> Gateway Settings</TabsTrigger>
            <TabsTrigger value="tournaments"><Swords className="w-4 h-4 mr-2" /> Tournaments</TabsTrigger>
          </TabsList>

          <TabsContent value="wallets" className="mt-6">
            <Card className="glass border-white/5">
              <CardHeader>
                <CardTitle className="font-headline">Recharge Verification</CardTitle>
                <CardDescription>Manually approve or reject coin top-up requests.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead>User / Tx ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rechargeLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto text-primary" /></TableCell></TableRow>
                    ) : (
                      rechargeRequests?.map((req: any) => (
                        <TableRow key={req.id} className="border-white/5">
                          <TableCell>
                            <p className="font-bold text-sm uppercase">{req.username}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{req.transactionId}</p>
                          </TableCell>
                          <TableCell className="font-black text-primary">🪙 {req.amount}</TableCell>
                          <TableCell>
                            <Badge variant={req.status === 'pending' ? 'outline' : req.status === 'approved' ? 'default' : 'destructive'} 
                              className={req.status === 'pending' ? 'border-yellow-500 text-yellow-500' : ''}>
                              {req.status.toUpperCase()}
                            </Badge>
                            {req.rejectionReason && (
                              <p className="text-[9px] text-destructive mt-1 italic max-w-[150px] truncate">{req.rejectionReason}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" className="h-8" onClick={() => setSelectedProof(req.screenshotUrl)}>
                                <Eye className="w-3 h-3 mr-1" /> PROOF
                              </Button>
                              {req.status === 'pending' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    disabled={!!processingId}
                                    className="h-8 bg-green-600 hover:bg-green-500"
                                    onClick={() => handleApproveRecharge(req)}
                                  >
                                    {processingId === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'APPROVE'}
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    disabled={!!processingId}
                                    className="h-8"
                                    onClick={() => setRejectId(req.id)}
                                  >
                                    REJECT
                                  </Button>
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

          <TabsContent value="settings" className="mt-6">
            <Card className="glass border-white/5 max-w-2xl">
              <CardHeader>
                <CardTitle className="font-headline text-xl">Payment Gateway Protocol</CardTitle>
                <CardDescription>Configure the official receiver details for manual recharges.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Master UPI ID</Label>
                  <Input 
                    value={upiId} 
                    onChange={(e) => setUpiId(e.target.value)}
                    className="bg-white/5 border-white/10 h-12 font-mono" 
                    placeholder="e.g. owner@upi"
                  />
                  <p className="text-[9px] text-muted-foreground italic">This UPI ID will be used for all deep-link payment intents.</p>
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
                      <div className="h-48 w-48 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all">
                        {uploadingQr ? <Loader2 className="animate-spin text-primary" /> : <ImagePlus className="text-muted-foreground" />}
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Upload Master QR</p>
                      </div>
                    )}
                    <input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={handleQrUpload} />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveSettings}
                  disabled={savingSettings || uploadingQr}
                  className="w-full h-12 bg-primary hover:bg-primary/90 font-black gap-2"
                >
                  {savingSettings ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                  SECURE PAYMENT SETTINGS
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="glass max-w-lg p-4">
          <DialogHeader>
            <DialogTitle className="text-center font-black uppercase italic tracking-tighter">Payment Evidence</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border-2 border-white/10 mt-4">
              <Image src={selectedProof} alt="Proof" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent className="glass max-w-md border-destructive/20">
          <DialogHeader>
            <DialogTitle className="font-headline uppercase italic text-destructive">Protocol Violation</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this request. The user will see this message.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-[10px] font-black uppercase mb-2 block">Rejection Reason</Label>
            <Textarea 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Fake screenshot detected, Amount mismatch, Transaction not found."
              className="bg-white/5 border-white/10 h-32"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectId(null)}>CANCEL</Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectRecharge}
              disabled={!rejectReason.trim() || !!processingId}
            >
              {processingId ? <Loader2 className="animate-spin mr-2" /> : <Ban className="mr-2" />}
              REJECT REQUEST
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
