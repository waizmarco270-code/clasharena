'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, setDoc, limit, writeBatch, getDoc, getDocs, where, deleteDoc, serverTimestamp, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, TrendingUp, Search, X, Loader2, Calendar, Settings as SettingsIcon } from 'lucide-react';
import { default as NextLink } from 'next/link';
import { PlayerTHBadge } from '@/components/PlayerTHBadge';
import { useUser } from '@clerk/nextjs';
import { Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function WalletLogsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [limitCount, setLimitCount] = useState(30);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const settingsRef = useMemo(() => doc(db, 'app-settings', 'payment'), [db]);
  const { data: paymentSettings } = useDoc(settingsRef);
  const hideManual = paymentSettings?.hideManual === true;
  const hideAuto = paymentSettings?.hideAuto === true;

  const toggleSetting = async (field: string, currentVal: boolean) => {
    try {
      await setDoc(doc(db, 'app-settings', 'payment'), { [field]: !currentVal }, { merge: true });
      toast({ title: "Settings Updated", description: `${field} is now ${!currentVal ? 'Hidden' : 'Visible'}` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Failed to update setting", description: e.message });
    }
  };
  
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

  const { user } = useUser();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  useEffect(() => {
    if (user?.id === 'user_3FPUpUpNM4gNnZFAu8ATO6bcQ16') {
      setIsSuperAdmin(true);
    } else if (user?.id) {
      getDoc(doc(db, 'users', user.id)).then(snap => {
        if (snap.exists() && snap.data().isSuperAdmin) setIsSuperAdmin(true);
      }).catch(console.error);
    }
  }, [user, db]);

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
      const targetUserRef = doc(db, 'users', req.userId);
      const userSnap = await getDoc(targetUserRef);
      
      const batch = writeBatch(db);
      const coinsToCredit = req.coins !== undefined ? req.coins : req.amount;
      const currency = req.currency || 'coins';
      
      if (currency === 'vcash') {
        batch.update(targetUserRef, { 
          vCashBalance: increment(coinsToCredit),
          unplayedBalance: increment(coinsToCredit)
        });
      } else {
        batch.update(targetUserRef, { balance: increment(coinsToCredit) });
      }
      batch.update(doc(db, 'recharge-requests', req.id), { status: 'approved' });

      // SQUAD BUILDER REFERRAL LOGIC
      if (userSnap.exists() && coinsToCredit >= 30) {
        const userData = userSnap.data();
        if (userData?.referredBy && userData?.hasClaimedReferral === false) {
          const referrerId = userData.referredBy;
          const referrerRef = doc(db, 'users', referrerId);
          
          batch.update(referrerRef, { balance: increment(10) });
          batch.update(targetUserRef, { hasClaimedReferral: true });
          
          const referralDocRef = doc(db, 'users', referrerId, 'referrals', req.userId);
          batch.update(referralDocRef, {
            status: 'Completed',
            reward: 10,
            completedAt: serverTimestamp()
          });

          const logRef = doc(collection(db, 'recharge-requests'));
          batch.set(logRef, {
            userId: referrerId,
            username: 'SYSTEM',
            amount: 0,
            coins: 10,
            status: 'approved',
            method: 'Referral Bonus',
            type: 'REFERRAL_BONUS',
            referredUser: req.userId,
            createdAt: serverTimestamp()
          });
        }
      }

      await batch.commit();
      toast({ title: "FUNDS CREDITED" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRecharge = async (req: any) => {
    const reason = prompt("Enter rejection reason (User will see this):");
    if (reason === null) return;
    if (!reason.trim()) {
      toast({ variant: 'destructive', title: "Reason Required", description: "You must provide a reason for rejection." });
      return;
    }
    
    if (processingId) return;
    setProcessingId(req.id);
    try {
      await updateDoc(doc(db, 'recharge-requests', req.id), { 
        status: 'rejected',
        rejectionReason: reason 
      });
      toast({ title: "RECHARGE REJECTED" });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Failed", description: e.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm("Are you absolutely sure you want to permanently delete this log?")) return;
    try {
      await deleteDoc(doc(db, 'recharge-requests', id));
      toast({ title: "LOG DELETED" });
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Failed", description: e.message });
    }
  };

  // Filter logs for tabs (Fully read-optimized on the client)
  // Exclude GIFT_CLAIM completely from Wallet Logs
  const activeRecords = (searchResults || rechargeRequests || []).filter((r: any) => r.type !== 'GIFT_CLAIM');
  
  const recharges = useMemo(() => activeRecords.filter((r: any) => r.amount > 0 && r.method?.toLowerCase() !== 'refund' && (!r.rejectionReason?.toLowerCase().includes('refund')) && !r.type?.includes('TOURNAMENT_WIN_REFUND') && !r.type?.includes('TOURNAMENT_WIN_REWARD') && !r.type?.includes('LEADER_PASS_REFUND')), [activeRecords]);
  const deductions = useMemo(() => activeRecords.filter((r: any) => r.amount < 0 || r.type === 'TOURNAMENT_ENTRY' || r.type === 'TOURNAMENT_LEADER_PASS'), [activeRecords]);
  const refunds = useMemo(() => activeRecords.filter((r: any) => r.method?.toLowerCase() === 'refund' || r.rejectionReason?.toLowerCase().includes('refund') || r.type === 'TOURNAMENT_WIN_REFUND' || r.type === 'TOURNAMENT_WIN_REWARD' || r.type === 'LEADER_PASS_REFUND'), [activeRecords]);

  const pendingTransactions = useMemo(() => recharges.filter((r: any) => r.status === 'pending'), [recharges]);
  
  const isManual = (r: any) => {
    if (r.method?.toLowerCase() === 'manual' || r.type === 'MANUAL') return true;
    if (!r.method && !r.type && !r.id?.startsWith('pay_')) return true; // Fallback for old manual records
    return false;
  };

  const manualTransactions = useMemo(() => recharges.filter((r: any) => r.status !== 'pending' && isManual(r)), [recharges]);
  const autoTransactions = useMemo(() => recharges.filter((r: any) => r.status !== 'pending' && !isManual(r)), [recharges]);

  const renderTable = (records: any[], type: 'recharge' | 'deduction' | 'refund') => (
    <Card className="glass border-white/5 overflow-hidden">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-white/5">
            <TableHead className="text-[10px] font-black uppercase">Transaction ID</TableHead>
            <TableHead className="text-[10px] font-black uppercase">User</TableHead>
            <TableHead className="text-[10px] font-black uppercase">Amount</TableHead>
            <TableHead className="text-[10px] font-black uppercase">{type === 'deduction' ? 'Action / Location' : 'Method / Action'}</TableHead>
            <TableHead className="text-[10px] font-black uppercase">Status</TableHead>
            <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
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
                <TableCell className="font-bold uppercase text-xs">
                  {req.username || req.userId || 'Unknown'}
                  <PlayerTHBadge userId={req.userId} />
                </TableCell>
                <TableCell className={`font-black ${req.amount < 0 ? 'text-red-500' : req.currency === 'vcash' ? 'text-green-500' : 'text-primary'}`}>
                  {req.currency === 'vcash' ? '⚡ ' : '🪙 '} 
                  {req.amount > 0 && type !== 'deduction' ? '+' : ''}{req.coins !== undefined ? req.coins : req.amount}
                  {req.coins !== undefined && req.coins !== req.amount && (
                    <span className="block text-[9px] text-muted-foreground mt-0.5 uppercase tracking-widest">PAID ₹{req.amount}</span>
                  )}
                </TableCell>
                <TableCell className="text-xs font-semibold text-muted-foreground uppercase">
                  {type === 'deduction' ? (req.description || 'Arena Entry') : (req.description || req.method || 'Manual')}
                </TableCell>
                <TableCell>
                  <Badge variant={req.status === 'pending' ? 'outline' : 'default'}>
                    {(req.status || (type === 'deduction' ? 'Deducted' : 'Unknown')).toUpperCase()}
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
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproveRecharge(req)} disabled={processingId === req.id}>
                            APPROVE
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectRecharge(req)} disabled={processingId === req.id}>
                            REJECT
                          </Button>
                        </>
                      )}
                      {isSuperAdmin && (
                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDeleteLog(req.id)}>
                          <Trash2 className="w-3 h-3" />
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

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-white/10 bg-black/40 hover:bg-white/5 text-xs font-black uppercase rounded-xl">
                <SettingsIcon className="w-4 h-4 mr-2" /> Gateway Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-black/90 border border-white/10 backdrop-blur-xl">
              <DropdownMenuLabel className="text-xs uppercase font-black text-muted-foreground tracking-widest">Payment Gateways</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <div className="p-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-white">Manual Payment</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Show / Hide Option</p>
                  </div>
                  <Switch checked={!hideManual} onCheckedChange={() => toggleSetting('hideManual', hideManual)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-white">Auto Payment</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Show / Hide Option</p>
                  </div>
                  <Switch checked={!hideAuto} onCheckedChange={() => toggleSetting('hideAuto', hideAuto)} />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <NextLink href="/admin/wallets/analytics">
            <Button className="bg-primary hover:bg-primary/95 text-white font-black text-xs uppercase rounded-xl flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> REVENUE
            </Button>
          </NextLink>
        </div>
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
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-black/20 border border-white/5 mb-4 rounded-xl p-1">
              <TabsTrigger value="transactions" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">
                Pending
              </TabsTrigger>
              <TabsTrigger value="manual" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">
                Manual
              </TabsTrigger>
              <TabsTrigger value="auto" className="text-xs font-black uppercase tracking-widest data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">
                Auto
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transactions" className="mt-0 space-y-4">
              {renderTable(pendingTransactions, 'recharge')}
            </TabsContent>
            <TabsContent value="manual" className="mt-0 space-y-4">
              {renderTable(manualTransactions, 'recharge')}
            </TabsContent>
            <TabsContent value="auto" className="mt-0 space-y-4">
              {renderTable(autoTransactions, 'recharge')}
            </TabsContent>
          </Tabs>
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
