'use client';

import { useMemo, useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  History, 
  ChevronLeft, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Calendar,
  Search,
  Coins,
  IndianRupee
} from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { default as NextLink } from 'next/link';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from "@clerk/nextjs";
import { cn } from '@/lib/utils';

export default function WalletHistoryPage() {
  const { userId, isLoaded } = useAuth();
  const db = useFirestore();

  // Search & Filter UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

  const [limitCount, setLimitCount] = useState(10);

  // Firestore Query - INDEX-LESS query (removed orderBy)
  const historyQuery = useMemo(() => {
    if (!isLoaded || !userId) return null;
    return query(
      collection(db, 'recharge-requests'),
      where('userId', '==', userId),
      limit(limitCount)
    );
  }, [db, userId, isLoaded, limitCount]);

  const { data: logs, loading: logsLoading } = useCollection(historyQuery);
  const loading = !isLoaded || logsLoading;

  // Process logs client-side (Sort, Search, Filter)
  const processedLogs = useMemo(() => {
    if (!logs) return [];

    // Sort by createdAt descending
    let result = [...logs].sort((a: any, b: any) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Apply Search Term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log => 
        (log.transactionId || '').toLowerCase().includes(term) ||
        (log.rejectionReason || '').toLowerCase().includes(term) ||
        (log.status || '').toLowerCase().includes(term)
      );
    }

    // Apply Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(log => log.status === statusFilter);
    }

    // Apply Method Filter
    if (methodFilter !== 'all') {
      result = result.filter(log => {
        const method = (log.method || '').toLowerCase();
        if (methodFilter === 'automatic') return method === 'automatic';
        if (methodFilter === 'manual') return method === 'manual';
        if (methodFilter === 'deduction') return Number(log.amount) < 0 || log.type === 'TOURNAMENT_ENTRY' || log.type === 'TOURNAMENT_LEADER_PASS';
        if (methodFilter === 'refund') return method === 'refund' || (log.rejectionReason || '').toLowerCase().includes('refund') || log.type === 'TOURNAMENT_WIN_REFUND' || log.type === 'TOURNAMENT_WIN_REWARD' || log.type === 'LEADER_PASS_REFUND';
        return true;
      });
    }

    // Apply Date Filter
    if (dateFilter !== 'all') {
      const now = new Date();
      result = result.filter(log => {
        if (!log.createdAt) return false;
        const logDate = new Date(log.createdAt);
        const diffTime = Math.abs(now.getTime() - logDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (dateFilter === 'today') return diffDays <= 1;
        if (dateFilter === 'week') return diffDays <= 7;
        if (dateFilter === 'month') return diffDays <= 30;
        return true;
      });
    }

    return result;
  }, [logs, searchTerm, statusFilter, methodFilter, dateFilter]);

  // Compute dashboard metrics
  const stats = useMemo(() => {
    if (!logs) return { totalCoins: 0, pendingRequests: 0, totalAmount: 0 };
    
    const approved = logs.filter((l: any) => l.status === 'approved');
    const pending = logs.filter((l: any) => l.status === 'pending');
    
    const totalCoins = approved.reduce((acc: number, curr: any) => acc + (parseInt(curr.amount) || 0), 0);
    const pendingRequests = pending.length;
    // Conversion rate helper (assuming amount represents coins, cashAmount is rupees paid)
    const totalAmount = approved.reduce((acc: number, curr: any) => acc + (parseInt(curr.cashAmount || curr.amount) || 0), 0);

    return { totalCoins, pendingRequests, totalAmount };
  }, [logs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600/90 text-white hover:bg-green-600">APPROVED</Badge>;
      case 'rejected': return <Badge variant="destructive">REJECTED</Badge>;
      default: return <Badge variant="outline" className="border-yellow-500 text-yellow-500 bg-yellow-500/5 animate-pulse">PENDING</Badge>;
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto space-y-8 pb-20 px-2 sm:px-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <NextLink href="/wallet" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-2">
              <ChevronLeft className="w-4 h-4" /> Back to Vault
            </NextLink>
            <h1 className="font-headline text-3xl font-black italic uppercase tracking-tighter">TRANSACTION <span className="text-primary">LOGS</span></h1>
            <p className="text-muted-foreground text-sm font-medium">Track your coin acquisition history and approvals.</p>
          </div>
        </div>

        {/* 📊 SUMMARY STATISTICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="glass border-white/5 bg-black/40 overflow-hidden relative group hover:border-primary/20 transition-all">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-45" />
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Total Coins Credited</p>
                <p className="text-2xl font-headline font-black text-white">🪙 {stats.totalCoins}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20 group-hover:scale-110 transition-transform">
                <Coins className="w-6 h-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/5 bg-black/40 overflow-hidden relative group hover:border-primary/20 transition-all">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-45" />
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Funds Deposited</p>
                <p className="text-2xl font-headline font-black text-white">₹ {stats.totalAmount}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 group-hover:scale-110 transition-transform">
                <IndianRupee className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/5 bg-black/40 overflow-hidden relative group hover:border-primary/20 transition-all">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-45" />
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Pending Audits</p>
                <p className="text-2xl font-headline font-black text-white">{stats.pendingRequests}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🔍 SEARCH AND FILTERS */}
        <Card className="glass border-white/5 bg-black/20 p-6 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search TxID or notes..."
                className="bg-white/5 border-white/10 pl-10 h-12 text-sm font-bold placeholder:text-muted-foreground/60 focus-visible:ring-primary/40 rounded-xl"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-xs text-white focus:outline-none focus:border-primary/45 w-full uppercase font-black cursor-pointer appearance-none"
              >
                <option value="all" className="bg-zinc-950 text-white">All Statuses</option>
                <option value="approved" className="bg-zinc-950 text-white">Approved</option>
                <option value="pending" className="bg-zinc-950 text-white">Pending</option>
                <option value="rejected" className="bg-zinc-950 text-white">Rejected</option>
              </select>
            </div>

            {/* Method Filter */}
            <div className="relative">
              <select
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-xs text-white focus:outline-none focus:border-primary/45 w-full uppercase font-black cursor-pointer appearance-none"
              >
                <option value="all" className="bg-zinc-950 text-white">All Methods</option>
                <option value="automatic" className="bg-zinc-950 text-white">⚡ Automatic</option>
                <option value="manual" className="bg-zinc-950 text-white">📝 Manual</option>
                <option value="deduction" className="bg-zinc-950 text-white">➖ Deduction</option>
                <option value="refund" className="bg-zinc-950 text-white">🔄 Refund</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-xs text-white focus:outline-none focus:border-primary/45 w-full uppercase font-black cursor-pointer appearance-none"
              >
                <option value="all" className="bg-zinc-950 text-white">All Time</option>
                <option value="today" className="bg-zinc-950 text-white">Today</option>
                <option value="week" className="bg-zinc-950 text-white">This Week</option>
                <option value="month" className="bg-zinc-950 text-white">This Month</option>
              </select>
            </div>
          </div>
        </Card>

        {/* 📝 AUDIT LEDGER TABLE */}
        <Card className="glass border-white/5 overflow-hidden">
          <CardHeader className="bg-white/5 border-b border-white/5 flex flex-row items-center justify-between p-6">
            <div>
              <CardTitle className="font-headline text-lg flex items-center gap-2 tracking-wide uppercase italic">
                <History className="w-5 h-5 text-primary animate-pulse" /> TRANSACTION AUDIT LEDGER
              </CardTitle>
              <CardDescription>Real-time status tracking of all wallet recharges.</CardDescription>
            </div>
            <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase">
              {processedLogs.length} Records
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Syncing Ledger...</p>
              </div>
            ) : processedLogs.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-center px-6">
                <AlertCircle className="w-12 h-12 text-muted-foreground/20" />
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-tight">NO RECORDS FOUND</p>
                  <p className="text-xs text-muted-foreground">No recharge requests match the selected filters.</p>
                </div>
                {searchTerm || statusFilter !== 'all' || methodFilter !== 'all' || dateFilter !== 'all' ? (
                  <Button 
                    onClick={() => { setSearchTerm(''); setStatusFilter('all'); setMethodFilter('all'); setDateFilter('all'); }} 
                    variant="outline" 
                    className="mt-2 text-xs font-bold border-white/10"
                  >
                    RESET FILTERS
                  </Button>
                ) : (
                  <NextLink href="/wallet">
                    <Button className="mt-4 bg-primary font-black px-8 glow-primary">RECHARGE NOW</Button>
                  </NextLink>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/[0.02]">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Transaction ID</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Method</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Amount</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Audit Notes / Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedLogs.map((log: any) => (
                      <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="font-mono font-bold text-xs text-primary truncate max-w-[150px] select-all" title={log.transactionId}>
                          {log.transactionId || 'UNKNOWN'}
                        </TableCell>
                        <TableCell className="text-xs font-bold uppercase tracking-wider">
                          {log.method === 'Automatic' ? (
                            <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/5">⚡ AUTOMATIC</Badge>
                          ) : (log.method || '').toLowerCase() === 'refund' || (log.rejectionReason || '').toLowerCase().includes('refund') ? (
                            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/5">🔄 REFUND</Badge>
                          ) : (
                            <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/5">📝 MANUAL</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-headline font-black text-white">🪙 {log.amount}</TableCell>
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
                        <TableCell className="max-w-[220px]">
                          {log.status === 'rejected' ? (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2">
                              <p className="text-[9px] font-black text-destructive uppercase leading-none mb-1">DECLINED REASON:</p>
                              <p className="text-[10px] text-muted-foreground italic leading-tight">{log.rejectionReason || 'No reason provided.'}</p>
                            </div>
                          ) : (log.rejectionReason || '').toLowerCase().includes('refund') ? (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                              <p className="text-[9px] font-black text-amber-500 uppercase leading-none mb-1">REFUND CREDIT:</p>
                              <p className="text-[10px] text-muted-foreground italic leading-tight">{log.rejectionReason}</p>
                            </div>
                          ) : log.status === 'pending' ? (
                            <span className="text-[10px] text-muted-foreground italic font-medium">Verification in progress...</span>
                          ) : (
                            <span className="text-[10px] text-green-500 font-black uppercase tracking-widest">Coins Credited Successfully</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {processedLogs && processedLogs.length >= limitCount && (
              <div className="flex justify-center mt-6 mb-2">
                <Button 
                  variant="outline" 
                  className="glass border-white/10 hover:bg-white/5 text-white font-bold"
                  onClick={() => setLimitCount(prev => prev + 10)}
                >
                  Load More Transactions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
