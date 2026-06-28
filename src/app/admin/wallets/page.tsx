'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment, limit, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, TrendingUp } from 'lucide-react';
import { default as NextLink } from 'next/link';

export default function WalletLogsPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const [limitCount, setLimitCount] = useState(30);
  const rechargeQuery = useMemo(() => query(collection(db, 'recharge-requests'), orderBy('createdAt', 'desc'), limit(limitCount)), [db, limitCount]);
  const { data: rechargeRequests } = useCollection(rechargeQuery);

  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('recharges');

  const handleApproveRecharge = async (req: any) => {
    if (processingId) return;
    setProcessingId(req.id);
    try {
      const batch = writeBatch(db);
      const targetUserRef = doc(db, 'users', req.userId);
      batch.update(targetUserRef, { balance: increment(req.amount) });
      batch.update(doc(db, 'recharge-requests', req.id), { status: 'approved' });
      await batch.commit();
      toast({ title: "FUNDS CREDITED" });
    } finally {
      setProcessingId(null);
    }
  };

  // Filter logs for tabs (Fully read-optimized on the client)
  const recharges = useMemo(() => rechargeRequests?.filter((r: any) => r.amount > 0 && r.method?.toLowerCase() !== 'refund' && (!r.rejectionReason?.toLowerCase().includes('refund'))) || [], [rechargeRequests]);
  const deductions = useMemo(() => rechargeRequests?.filter((r: any) => r.amount < 0 || r.type === 'TOURNAMENT_ENTRY') || [], [rechargeRequests]);
  const refunds = useMemo(() => rechargeRequests?.filter((r: any) => r.method?.toLowerCase() === 'refund' || r.rejectionReason?.toLowerCase().includes('refund')) || [], [rechargeRequests]);

  const renderTable = (records: any[], type: 'recharge' | 'deduction' | 'refund') => (
    <Card className="glass border-white/5 overflow-hidden">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-white/5">
            <TableHead className="text-[10px] font-black uppercase">User</TableHead>
            <TableHead className="text-[10px] font-black uppercase">Amount</TableHead>
            <TableHead className="text-[10px] font-black uppercase">{type === 'deduction' ? 'Action / Location' : 'Method'}</TableHead>
            <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
            {type === 'recharge' && <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs uppercase font-bold tracking-widest">
                No {type}s found in recent logs
              </TableCell>
            </TableRow>
          ) : (
            records.map((req: any) => (
              <TableRow key={req.id} className="border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="font-bold uppercase text-xs">{req.username || req.userId || 'Unknown'}</TableCell>
                <TableCell className={`font-black ${req.amount < 0 ? 'text-red-500' : 'text-primary'}`}>
                  🪙 {req.amount > 0 && type !== 'deduction' ? '+' : ''}{req.amount}
                </TableCell>
                <TableCell className="text-xs font-semibold text-muted-foreground uppercase">
                  {type === 'deduction' ? (req.description || 'Arena Entry') : (req.method || 'Manual')}
                </TableCell>
                <TableCell>
                  <Badge variant={req.status === 'pending' ? 'outline' : 'default'}>
                    {(req.status || (type === 'deduction' ? 'Deducted' : 'Unknown')).toUpperCase()}
                  </Badge>
                </TableCell>
                {type === 'recharge' && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {req.screenshotUrl && (
                        <Button size="icon" variant="outline" onClick={() => setSelectedProof(req.screenshotUrl)}>
                          <Eye className="w-3 h-3" />
                        </Button>
                      )}
                      {req.status === 'pending' && (
                        <Button size="sm" className="bg-green-600" onClick={() => handleApproveRecharge(req)} disabled={processingId === req.id}>
                          APPROVE
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-black/20 p-6 rounded-3xl border border-white/5">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-white">TRANSACTION AUDITS</h2>
          <p className="text-[10px] text-muted-foreground uppercase font-black">Audit recharges, deductions, and refunds.</p>
        </div>
        <NextLink href="/admin/wallets/analytics">
          <Button className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase rounded-xl flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> VIEW REVENUE ANALYTICS
          </Button>
        </NextLink>
      </div>

      <Tabs defaultValue="recharges" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/5 mb-6">
          <TabsTrigger value="recharges" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black">
            Recharges
          </TabsTrigger>
          <TabsTrigger value="deductions" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Deductions
          </TabsTrigger>
          <TabsTrigger value="refunds" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Refunds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recharges" className="mt-0 space-y-4">
          {renderTable(recharges, 'recharge')}
        </TabsContent>
        <TabsContent value="deductions" className="mt-0 space-y-4">
          {renderTable(deductions, 'deduction')}
        </TabsContent>
        <TabsContent value="refunds" className="mt-0 space-y-4">
          {renderTable(refunds, 'refund')}
        </TabsContent>
      </Tabs>

      {rechargeRequests && rechargeRequests.length >= limitCount && (
        <div className="flex justify-center mt-6">
          <Button 
            variant="outline" 
            className="glass border-white/10 hover:bg-white/5 text-white font-bold"
            onClick={() => setLimitCount(prev => prev + 20)}
          >
            Load More Transactions
          </Button>
        </div>
      )}

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
    </div>
  );
}
