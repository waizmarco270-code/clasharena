'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment, limit, writeBatch, getDoc, getDocs, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, TrendingUp, Search, X, Loader2 } from 'lucide-react';
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

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults(null);
      return;
    }
    
    setIsSearching(true);
    try {
      // Intelligent routing to avoid massive collection scans and composite index requirements
      if (term.startsWith('CA-') || term.startsWith('pay_')) {
        // Direct O(1) document lookup
        const docSnap = await getDoc(doc(db, 'recharge-requests', term));
        setSearchResults(docSnap.exists() ? [{ id: docSnap.id, ...docSnap.data() }] : []);
      } else if (term.startsWith('user_')) {
        // Query by User ID
        const q = query(collection(db, 'recharge-requests'), where('userId', '==', term), limit(50));
        const snaps = await getDocs(q);
        setSearchResults(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        // Prefix search by Username
        const q = query(collection(db, 'recharge-requests'), where('username', '>=', term), where('username', '<=', term + '\uf8ff'), limit(50));
        const snaps = await getDocs(q);
        setSearchResults(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({ variant: 'destructive', title: 'Search failed', description: 'Could not fetch records.' });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };

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
  const activeRecords = searchResults || rechargeRequests || [];
  const recharges = useMemo(() => activeRecords.filter((r: any) => r.amount > 0 && r.method?.toLowerCase() !== 'refund' && (!r.rejectionReason?.toLowerCase().includes('refund'))), [activeRecords]);
  const deductions = useMemo(() => activeRecords.filter((r: any) => r.amount < 0 || r.type === 'TOURNAMENT_ENTRY'), [activeRecords]);
  const refunds = useMemo(() => activeRecords.filter((r: any) => r.method?.toLowerCase() === 'refund' || r.rejectionReason?.toLowerCase().includes('refund')), [activeRecords]);

  const renderTable = (records: any[], type: 'recharge' | 'deduction' | 'refund') => (
    <Card className="glass border-white/5 overflow-hidden">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-white/5">
            <TableHead className="text-[10px] font-black uppercase">Transaction ID</TableHead>
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
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs uppercase font-bold tracking-widest">
                No {type}s found {searchResults ? 'in search results' : 'in recent logs'}
              </TableCell>
            </TableRow>
          ) : (
            records.map((req: any) => (
              <TableRow key={req.id} className="border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="font-mono font-bold text-xs text-primary max-w-[150px] truncate select-all" title={req.id}>
                  {req.id}
                </TableCell>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/20 p-6 rounded-3xl border border-white/5">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-white">TRANSACTION AUDITS</h2>
          <p className="text-[10px] text-muted-foreground uppercase font-black">Audit recharges, deductions, and refunds.</p>
        </div>
        
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md w-full flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Receipt ID, Razorpay ID, User ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-colors"
          />
          {searchTerm && (
            <button type="button" onClick={clearSearch} className="absolute right-3 text-muted-foreground hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
          <Button type="submit" disabled={isSearching} className="hidden">Search</Button>
        </form>

        <NextLink href="/admin/wallets/analytics">
          <Button className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase rounded-xl flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> REVENUE
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

      {!searchResults && rechargeRequests && rechargeRequests.length >= limitCount && (
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

      {isSearching && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
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
