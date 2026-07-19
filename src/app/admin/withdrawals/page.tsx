'use client';

import { useState, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Check, X, IndianRupee, History, Copy, Clock, Loader2, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';
import { PlayerTHBadge } from '@/components/PlayerTHBadge';
import { formatDistanceToNow } from 'date-fns';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function AdminWithdrawalsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [qrViewerOpen, setQrViewerOpen] = useState(false);
  const [activeQrUrl, setActiveQrUrl] = useState<string | null>(null);

  // Approval Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const withdrawalsQuery = useMemo(() => query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc')), [db]);
  const { data: withdrawals, loading } = useCollection(withdrawalsQuery);

  const pendingWithdrawals = useMemo(() => withdrawals?.filter(w => w.status === 'pending') || [], [withdrawals]);
  const historyWithdrawals = useMemo(() => withdrawals?.filter(w => w.status !== 'pending') || [], [withdrawals]);

  const handleApproveClick = (req: any) => {
    setSelectedReq(req);
    setProofUrl('');
    setApproveModalOpen(true);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Invalid File", description: "Please upload an image file." });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File Too Large", description: "Image must be under 5MB." });
      return;
    }

    try {
      setUploadingProof(true);
      const url = await uploadToCloudinary(file);
      setProofUrl(url);
      toast({ title: "Screenshot Attached" });
    } catch (err) {
      toast({ variant: "destructive", title: "Upload Failed" });
    } finally {
      setUploadingProof(false);
    }
  };

  const submitApprove = async () => {
    if (!selectedReq) return;
    
    setProcessingId(selectedReq.id);
    try {
      const res = await fetch('/api/admin/withdraw/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          withdrawalId: selectedReq.id, 
          status: 'approved',
          proofUrl: proofUrl || undefined
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({ title: "Withdrawal Marked as Paid ✅" });
      setApproveModalOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Action Failed", description: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason (User will see this and V-Cash will be refunded):");
    if (reason === null) return;
    if (!reason.trim()) {
      toast({ variant: 'destructive', title: "Reason Required" });
      return;
    }

    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/withdraw/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id, status: 'rejected', rejectionReason: reason })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({ title: "Withdrawal Rejected & Refunded ❌" });
    } catch (err: any) {
      toast({ variant: 'destructive', title: "Action Failed", description: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard!", description: text });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-green-500/10 p-6 rounded-3xl border border-green-500/20">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-green-400">PAYOUT HUB</h2>
          <p className="text-[10px] text-muted-foreground uppercase font-black">Process player V-Cash withdrawals.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* PENDING ACTIONS */}
        <Card className="glass border-green-500/20 overflow-hidden">
          <CardHeader className="bg-green-500/5 pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-green-400">
              <Clock className="w-4 h-4" /> Pending Payouts ({pendingWithdrawals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5">
                    <TableHead className="text-[10px] font-black uppercase">User</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Amount</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">UPI ID</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-green-500" /></TableCell></TableRow>
                  ) : pendingWithdrawals.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs uppercase font-bold tracking-widest">No pending payouts</TableCell></TableRow>
                  ) : pendingWithdrawals.map(req => (
                    <TableRow key={req.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-bold uppercase text-xs">
                        {req.username || 'Unknown'} <PlayerTHBadge userId={req.userId} />
                      </TableCell>
                      <TableCell className="font-black text-green-500 text-lg">
                        <div className="flex flex-col">
                           <span className="text-sm text-white">Req: ⚡ {req.amount}</span>
                           <span className="text-[10px] text-muted-foreground uppercase">Fee: ⚡ {req.fee || 0}</span>
                           <span className="text-green-500">Pay: ₹ {req.payableAmount || req.amount} INR</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{req.upiId}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-white" onClick={() => copyToClipboard(req.upiId)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                          {req.upiQrUrl && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500 hover:text-green-400 bg-green-500/10 hover:bg-green-500/20 ml-2" onClick={() => { setActiveQrUrl(req.upiQrUrl); setQrViewerOpen(true); }}>
                              <QrCode className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-bold">
                        {req.createdAt ? formatDistanceToNow(req.createdAt.toDate ? req.createdAt.toDate() : new Date(req.createdAt), { addSuffix: true }) : 'Just now'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white font-black uppercase text-[10px]"
                            onClick={() => handleApproveClick(req)}
                            disabled={processingId === req.id}
                          >
                            <Check className="w-3 h-3 mr-1" /> Mark Paid
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="font-black uppercase text-[10px]"
                            onClick={() => handleReject(req.id)}
                            disabled={processingId === req.id}
                          >
                            <X className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* HISTORY */}
        <Card className="glass border-white/10 overflow-hidden">
          <CardHeader className="bg-white/5 pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
              <History className="w-4 h-4" /> Payout History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5">
                    <TableHead className="text-[10px] font-black uppercase">User</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Amount</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyWithdrawals.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs uppercase font-bold tracking-widest">No history found</TableCell></TableRow>
                  ) : historyWithdrawals.slice(0, 50).map(req => (
                    <TableRow key={req.id} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-bold uppercase text-xs">
                        {req.username || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-black text-white">
                        <div className="flex flex-col">
                           <span>⚡ {req.amount}</span>
                           <span className="text-[10px] text-green-500 uppercase">Paid: ₹ {req.payableAmount || req.amount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.status === 'approved' ? (
                           <span className="px-2 py-0.5 rounded-sm bg-green-500/20 text-green-500 text-[9px] font-black uppercase tracking-widest">Paid</span>
                        ) : (
                           <span className="px-2 py-0.5 rounded-sm bg-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-widest" title={req.rejectionReason}>Rejected</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground font-bold">
                        {req.processedAt ? formatDistanceToNow(req.processedAt.toDate ? req.processedAt.toDate() : new Date(req.processedAt), { addSuffix: true }) : 'Recently'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>

      <Dialog open={qrViewerOpen} onOpenChange={setQrViewerOpen}>
        <DialogContent className="sm:max-w-[400px] glass border-green-500/20">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl italic uppercase tracking-wider flex items-center gap-2 text-green-500">
              <QrCode className="w-5 h-5" /> SCAN TO PAY
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Scan this QR code with any UPI app to complete the payout.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-black/40 rounded-2xl border border-white/5">
            {activeQrUrl ? (
              <div className="relative w-64 h-64 rounded-xl overflow-hidden border-4 border-green-500/20 p-2 bg-white">
                 <Image src={activeQrUrl} alt="UPI QR Code" fill className="object-contain p-2" />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm font-bold uppercase">No QR Code available</p>
            )}
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
              <Check className="w-3 h-3" /> Player Verified QR
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="sm:max-w-[450px] glass border-green-500/20">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl italic uppercase tracking-wider text-green-500">
              MARK AS PAID
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Confirm payout to user.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedReq && (
              <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground uppercase font-bold">Payable Amount:</span>
                  <span className="text-sm font-black text-green-400">₹ {selectedReq.payableAmount || selectedReq.amount} INR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground uppercase font-bold">UPI ID:</span>
                  <span className="text-sm font-bold text-white">{selectedReq.upiId}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Payment Proof (Optional)</Label>
              <div className="flex gap-2">
                <Input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  ref={proofInputRef}
                  onChange={handleProofUpload}
                />
                <Button 
                  variant="outline" 
                  className="w-full bg-white/5 border-white/10 hover:bg-white/10"
                  onClick={() => proofInputRef.current?.click()}
                  disabled={uploadingProof}
                >
                  {uploadingProof ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {proofUrl ? 'Change Screenshot' : 'Upload Screenshot'}
                </Button>
              </div>
              {proofUrl && (
                <div className="mt-2 relative w-full h-32 rounded-xl overflow-hidden border border-white/10">
                  <Image src={proofUrl} alt="Proof" fill className="object-cover" />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setApproveModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest"
              onClick={submitApprove}
              disabled={processingId === selectedReq?.id || uploadingProof}
            >
              {processingId === selectedReq?.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Confirm Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
