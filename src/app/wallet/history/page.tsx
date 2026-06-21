
'use client';

import { useMemo } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  History, 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Calendar
} from 'lucide-react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import Link from 'link'; // Note: corrected from 'next/link' in some frameworks, keeping standard next/link
import { default as NextLink } from 'next/link';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function WalletHistoryPage() {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();

  const historyQuery = useMemo(() => {
    if (authLoading || !user?.uid) return null;
    // Querying requests belonging to the current Firebase user
    return query(
      collection(db, 'recharge-requests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [db, user?.uid, authLoading]);

  const { data: logs, loading: logsLoading } = useCollection(historyQuery);
  const loading = authLoading || logsLoading;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600">APPROVED</Badge>;
      case 'rejected': return <Badge variant="destructive">REJECTED</Badge>;
      default: return <Badge variant="outline" className="border-yellow-500 text-yellow-500">PENDING</Badge>;
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <NextLink href="/wallet" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-2">
              <ChevronLeft className="w-4 h-4" /> Back to Vault
            </NextLink>
            <h1 className="font-headline text-3xl font-black italic uppercase">TRANSACTION <span className="text-primary">LOGS</span></h1>
            <p className="text-muted-foreground text-sm font-medium">Track your coin acquisition history and approvals.</p>
          </div>
        </div>

        <Card className="glass border-white/5 overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/5">
            <CardTitle className="font-headline text-lg flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> AUDIT LEDGER
            </CardTitle>
            <CardDescription>Real-time status of your recharge requests.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Syncing Ledger...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-center px-6">
                <AlertCircle className="w-12 h-12 text-muted-foreground/20" />
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-tight">NO RECORDS FOUND</p>
                  <p className="text-xs text-muted-foreground">You haven't made any recharge requests yet.</p>
                </div>
                <NextLink href="/wallet">
                  <Button className="mt-4 bg-primary font-black px-8">RECHARGE NOW</Button>
                </NextLink>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Transaction ID</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Amount</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                      <TableCell className="font-mono font-bold text-xs text-primary">{log.transactionId}</TableCell>
                      <TableCell className="font-headline font-black">🪙 {log.amount}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {log.createdAt ? format(new Date(log.createdAt), 'MMM dd, yyyy • HH:mm') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.status === 'rejected' ? (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 max-w-[200px]">
                            <p className="text-[9px] font-black text-destructive uppercase leading-none mb-1">REASON:</p>
                            <p className="text-[10px] text-muted-foreground italic leading-tight">{log.rejectionReason || 'No reason provided.'}</p>
                          </div>
                        ) : log.status === 'pending' ? (
                          <span className="text-[10px] text-muted-foreground italic font-medium">Verification in progress...</span>
                        ) : (
                          <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Coins Credited</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
