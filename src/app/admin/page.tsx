
'use client';

import { useMemo, useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Swords, Wallet, AlertCircle, CheckCircle2, XCircle, Search, Eye, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminPanel() {
  const db = useFirestore();
  const { toast } = useToast();
  
  // Fetch Recharge Requests
  const rechargeQuery = useMemo(() => query(collection(db, 'recharge-requests'), orderBy('createdAt', 'desc')), [db]);
  const { data: rechargeRequests, loading: rechargeLoading } = useCollection(rechargeQuery);

  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApproveRecharge = async (request: any) => {
    if (processingId) return;
    setProcessingId(request.id);

    try {
      const userRef = doc(db, 'users', request.userId);
      const requestRef = doc(db, 'recharge-requests', request.id);

      // 1. Credit the balance
      await updateDoc(userRef, {
        balance: increment(request.amount)
      });

      // 2. Mark request as approved
      await updateDoc(requestRef, {
        status: 'approved'
      });

      toast({ title: "RECHARGE APPROVED", description: `🪙 ${request.amount} credited to ${request.username}.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action Failed", description: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRecharge = async (requestId: string) => {
    try {
      await updateDoc(doc(db, 'recharge-requests', requestId), {
        status: 'rejected'
      });
      toast({ title: "RECHARGE REJECTED" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Action Failed", description: err.message });
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
          <div className="hidden sm:flex gap-2">
            <Button className="bg-primary hover:bg-primary/90 font-black">CREATE TOURNAMENT</Button>
          </div>
        </div>

        {/* Quick Stats Placeholder */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass border-white/5 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">Total Users</p>
              <p className="text-2xl font-black">1.2k</p>
            </CardContent>
          </Card>
          <Card className="glass border-white/5">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">Pending Requests</p>
              <p className="text-2xl font-black text-primary">
                {rechargeRequests?.filter((r: any) => r.status === 'pending').length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="wallets" className="w-full">
          <TabsList className="bg-muted/50 border border-white/10 w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="wallets" className="data-[state=active]:bg-primary">
              <Wallet className="w-4 h-4 mr-2" /> Wallet Logs
            </TabsTrigger>
            <TabsTrigger value="verifications">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Match Results
            </TabsTrigger>
            <TabsTrigger value="tournaments">
              <Swords className="w-4 h-4 mr-2" /> Tournaments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallets" className="mt-6">
            <Card className="glass border-white/5">
              <CardHeader>
                <CardTitle className="font-headline">Recharge Verification</CardTitle>
                <CardDescription>Manually approve coin top-up requests from warriors.</CardDescription>
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
                    ) : rechargeRequests?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No recharge requests found.</TableCell></TableRow>
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
                                    className="h-8"
                                    onClick={() => handleRejectRecharge(req.id)}
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

          <TabsContent value="verifications" className="mt-6 text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-bold">Match Verification System</h3>
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-black">AI Scanners Online</p>
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
    </PageWrapper>
  );
}
