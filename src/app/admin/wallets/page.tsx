
'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Eye,
  TrendingUp
} from 'lucide-react';
import { default as NextLink } from 'next/link';

export default function WalletLogsPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const rechargeQuery = useMemo(() => query(collection(db, 'recharge-requests'), orderBy('createdAt', 'desc')), [db]);
  const { data: rechargeRequests } = useCollection(rechargeQuery);

  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-black/20 p-6 rounded-3xl border border-white/5">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-white">RECHARGE TRANSACTION AUDITS</h2>
          <p className="text-[10px] text-muted-foreground uppercase font-black">Audit manual deposits and approve coin requests.</p>
        </div>
        <NextLink href="/admin/wallets/analytics">
          <Button className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase rounded-xl flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> VIEW REVENUE ANALYTICS
          </Button>
        </NextLink>
      </div>

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
