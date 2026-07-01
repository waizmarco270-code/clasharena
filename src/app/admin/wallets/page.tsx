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
import { Eye, TrendingUp, Search, X, Loader2, Calendar } from 'lucide-react';
import { default as NextLink } from 'next/link';
import { PlayerTHBadge } from '@/components/PlayerTHBadge';

export default function WalletLogsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [limitCount, setLimitCount] = useState(30);
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  const rechargeQuery = useMemo(() => {
    let q = query(collection(db, 'recharge-requests'), orderBy('createdAt', 'desc'));
    if (selectedDate) {
      const start = new Date(selectedDate);
      start.setHours(0,0,0,0);
      const end = new Date(selectedDate);
      end.setHours(23,59,59,999);
      q = query(collection(db, 'recharge-requests'), where('createdAt', '>=', start), where('createdAt', '<=', end), orderBy('createdAt', 'desc'));
    }
    return query(q, limit(limitCount));
  }, [db, limitCount, selectedDate]);
  
  const { data: rechargeRequests } = useCollection(rechargeQuery);

  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

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
  // Exclude GIFT_CLAIM completely from Wallet Logs
  const activeRecords = (searchResults || rechargeRequests || []).filter((r: any) => r.type !== 'GIFT_CLAIM');
  
  const allTransactions = useMemo(() => activeRecords, [activeRecords]);
  const manualTransactions = useMemo(() => activeRecords.filter((r: any) => r.method?.toLowerCase() === 'manual' || r.type === 'MANUAL'), [activeRecords]);
  const autoTransactions = useMemo(() => activeRecords.filter((r: any) => r.method?.toLowerCase() !== 'manual' && r.type !== 'MANUAL'), [activeRecords]);

  const renderTable = (records: any[]) => (
    <Card className="glass border-white/5 overflow-hidden">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-white/5">
            <TableHead className="text-[10px] font-black uppercase">Transaction ID</TableHead>
            <TableHead className="text-[10px] font-black uppercase">User</TableHead>
            <TableHead className="text-[10px] font-black uppercase">Amount</TableHead>
            <TableHead className="text-[10px] font-black uppercase">Method / Action</TableHead>
            <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
            <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs uppercase font-bold tracking-widest">
                No transactions found {searchResults ? 'in search results' : 'in recent logs'}
              </TableCell>
            </TableRow>
          ) : (
            records.map((req: any) => (
              <TableRow key={req.id} className="border-white/5 hover:bg-white/5 transition-colors">
                <TableCell className="font-mono font-bold text-xs text-primary max-w-[150px] truncate select-all" title={req.id}>
                  {req.id}
                </TableCell>
                <TableCell className="font-bold uppercase text-xs">
                  {req.username || req.userId || 'Unknown'}
                  <PlayerTHBadge userId={req.userId} />
                </TableCell>
                <TableCell className={`font-black ${req.amount < 0 ? 'text-red-500' : 'text-primary'}`}>
                  🪙 {req.amount > 0 ? '+' : ''}{req.amount}
                </TableCell>
                <TableCell className="text-xs font-semibold text-muted-foreground uppercase">
                  {req.description || req.method || (req.amount < 0 ? 'Arena Entry' : 'Manual')}
                </TableCell>
                <TableCell>
                  <Badge variant={req.status === 'pending' ? 'outline' : 'default'}>
                    {(req.status || 'Unknown').toUpperCase()}
                  </Badge>
                </TableCell>
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
        <div className="flex gap-4 w-full md:w-auto">
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

          <div className="relative flex items-center">
            <Calendar className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary/50 transition-colors min-w-[150px]"
            />
            {selectedDate && (
              <button type="button" onClick={() => setSelectedDate('')} className="absolute right-3 text-muted-foreground hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <NextLink href="/admin/wallets/analytics">
          <Button className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase rounded-xl flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> REVENUE
          </Button>
        </NextLink>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/5 mb-6">
          <TabsTrigger value="all" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black">
            All Transactions
          </TabsTrigger>
          <TabsTrigger value="manual" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Manual
          </TabsTrigger>
          <TabsTrigger value="auto" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-white/10 data-[state=active]:text-white">
            Auto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0 space-y-4">
          {renderTable(allTransactions)}
        </TabsContent>
        <TabsContent value="manual" className="mt-0 space-y-4">
          {renderTable(manualTransactions)}
        </TabsContent>
        <TabsContent value="auto" className="mt-0 space-y-4">
          {renderTable(autoTransactions)}
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
