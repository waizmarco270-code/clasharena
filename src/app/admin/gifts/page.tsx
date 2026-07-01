'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, limit, getDocs, getDoc, doc, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Search, Gift, X, Loader2, Coins, Skull, Activity, Timer, CheckCircle2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function AdminGiftsPage() {
  const db = useFirestore();
  const { toast } = useToast();

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Active Player Cache
  const allUsersQuery = useMemo(() => query(collection(db, 'users'), limit(100)), [db]);
  const { data: allUsers } = useCollection(allUsersQuery);

  const top5Matches = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1 || !allUsers) return [];
    const searchLower = searchTerm.toLowerCase();
    return allUsers.filter((u: any) => 
      u.username?.toLowerCase().includes(searchLower) ||
      u.tag?.toLowerCase().includes(searchLower) ||
      u.id?.toLowerCase().includes(searchLower)
    ).slice(0, 5);
  }, [allUsers, searchTerm]);

  // Form State
  const [amount, setAmount] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Global Form State
  const [globalAmount, setGlobalAmount] = useState<string>('');
  const [globalMessage, setGlobalMessage] = useState<string>('');
  const [isProcessingGlobal, setIsProcessingGlobal] = useState(false);

  // Global Gifts Analytics
  const globalGiftsQuery = useMemo(() => query(collection(db, 'global-gifts'), orderBy('createdAt', 'desc'), limit(5)), [db]);
  const { data: globalGifts, loading: globalGiftsLoading } = useCollection(globalGiftsQuery);

  // Individual Gifts Analytics
  const [indLimit, setIndLimit] = useState(5);
  const indGiftsQuery = useMemo(() => query(collection(db, 'gift-logs'), orderBy('sentAt', 'desc'), limit(indLimit)), [db, indLimit]);
  const { data: indGifts, loading: indGiftsLoading } = useCollection(indGiftsQuery);
  const [analyticsTab, setAnalyticsTab] = useState('individual');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    
    setIsSearching(true);
    setSelectedUser(null);
    try {
      if (term.startsWith('CA-') || term.startsWith('pay_')) {
        // Search by receipt ID -> then fetch user
        const receiptSnap = await getDoc(doc(db, 'recharge-requests', term));
        if (receiptSnap.exists()) {
          const userId = receiptSnap.data().userId;
          if (userId) {
            const userSnap = await getDoc(doc(db, 'users', userId));
            setSearchResults(userSnap.exists() ? [{ id: userSnap.id, ...userSnap.data() }] : []);
            return;
          }
        }
        setSearchResults([]);
      } else if (term.startsWith('user_')) {
        const userSnap = await getDoc(doc(db, 'users', term));
        setSearchResults(userSnap.exists() ? [{ id: userSnap.id, ...userSnap.data() }] : []);
      } else {
        // Username search
        const q = query(collection(db, 'users'), where('username', '>=', term), where('username', '<=', term + '\uf8ff'), limit(10));
        const snaps = await getDocs(q);
        setSearchResults(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Search failed' });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
    setSelectedUser(null);
  };

  const handleAction = async (action: 'gift' | 'deduct') => {
    if (!selectedUser || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Enter a valid positive number.' });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'individual',
          targetUserId: selectedUser.id,
          amount: Number(amount),
          message,
          action
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: action === 'gift' ? 'Gift Sent!' : 'Coins Deducted', description: data.message });
      setAmount('');
      setMessage('');
      
      // Update local state temporarily for UX
      setSelectedUser((prev: any) => ({
        ...prev,
        balance: action === 'gift' ? prev.balance : prev.balance - Number(amount)
      }));

    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendGlobal = async () => {
    if (!globalAmount || isNaN(Number(globalAmount)) || Number(globalAmount) <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Enter a valid amount.' });
      return;
    }

    if (!confirm(`Are you absolutely sure you want to send ${globalAmount} coins to EVERY user in the database?`)) return;

    setIsProcessingGlobal(true);
    try {
      const res = await fetch('/api/gifts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'global',
          amount: Number(globalAmount),
          message: globalMessage,
          action: 'gift'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: 'Global Gift Deployed!', description: 'All users have been notified.' });
      setGlobalAmount('');
      setGlobalMessage('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Deployment Failed', description: err.message });
    } finally {
      setIsProcessingGlobal(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-headline font-black uppercase tracking-wider flex items-center gap-2">
          <Gift className="w-6 h-6 text-primary" /> Gift Distribution System
        </h2>
        <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">
          Securely distribute coins to specific users or broadcast globally.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* INDIVIDUAL TARGETING */}
        <div className="space-y-6">
          <Card className="glass border-white/5 relative overflow-hidden group">
            <CardHeader className="border-b border-white/5 bg-black/40">
              <CardTitle className="text-sm font-black uppercase">Target Individual</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Search by Username, User ID, or Receipt ID</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              <form onSubmit={handleSearch} className="relative w-full flex items-center z-50 group">
                <Search className="absolute left-3 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Smart search (Name, Tag, ID) or Receipt..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  className="w-full pl-10 pr-10 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary/50 transition-colors"
                />
                {searchTerm && (
                  <button type="button" onClick={clearSearch} className="absolute right-3 text-muted-foreground hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <Button type="submit" disabled={isSearching} className="hidden">Search</Button>

                {/* Search Dropdown */}
                {showSearchDropdown && searchTerm && top5Matches.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    {top5Matches.map(match => (
                      <div 
                        key={match.id}
                        onClick={() => {
                          setSearchTerm(match.username);
                          setSelectedUser(match);
                          setShowSearchDropdown(false);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                      >
                        <Avatar className="w-8 h-8 border border-white/10"><AvatarImage src={match.avatarUrl} /><AvatarFallback>{match.username?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-sm font-bold text-white uppercase">{match.username || 'Warrior'}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{match.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </form>

              {isSearching && (
                <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              )}

              {searchResults && !selectedUser && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {searchResults.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground font-bold uppercase py-4">No users found</p>
                  ) : (
                    searchResults.map(u => (
                      <div 
                        key={u.id} 
                        onClick={() => setSelectedUser(u)}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition-colors"
                      >
                        <Avatar className="w-10 h-10 border border-white/10"><AvatarImage src={u.avatarUrl} /><AvatarFallback>{u.username?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-black uppercase leading-none">{u.username || 'Warrior'}</p>
                          <p className="text-[9px] text-muted-foreground font-mono mt-1">{u.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-primary">🪙 {u.balance || 0}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedUser && (
                <div className="animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl mb-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 border-2 border-primary/50"><AvatarImage src={selectedUser.avatarUrl} /><AvatarFallback>{selectedUser.username?.charAt(0)}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-black text-white uppercase">{selectedUser.username}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{selectedUser.id}</p>
                      </div>
                    </div>
                    <div className="text-right bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      <p className="text-[9px] text-muted-foreground uppercase font-black mb-0.5">Current Balance</p>
                      <p className="font-headline font-black text-primary text-lg leading-none">🪙 {selectedUser.balance || 0}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Coin Amount</label>
                      <div className="relative mt-1">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                        <input
                          type="number"
                          placeholder="e.g. 50"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full pl-10 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Custom Message (Gift Only)</label>
                      <input
                        type="text"
                        placeholder="e.g. Happy Birthday!"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full mt-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                      <Button 
                        onClick={() => handleAction('deduct')} 
                        disabled={isProcessing}
                        variant="outline"
                        className="border-destructive/30 hover:bg-destructive/10 text-destructive font-black uppercase h-12"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Skull className="w-4 h-4 mr-2" /> Silent Deduct</>}
                      </Button>
                      <Button 
                        onClick={() => handleAction('gift')} 
                        disabled={isProcessing}
                        className="bg-primary hover:bg-primary/90 text-black font-black uppercase h-12"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Gift className="w-4 h-4 mr-2" /> Send Gift</>}
                      </Button>
                    </div>
                    
                    <Button variant="ghost" onClick={() => setSelectedUser(null)} className="w-full text-xs font-bold mt-2 text-muted-foreground">
                      Cancel & Select Another User
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* GLOBAL BROADCAST */}
        <div className="space-y-6">
          <Card className="glass border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50"></div>
            <CardHeader className="border-b border-white/5 bg-black/40 relative z-10">
              <CardTitle className="text-sm font-black uppercase text-primary">Global Broadcast</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Send a gift to every single user</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6 relative z-10">
              
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-xs font-medium text-primary/90">
                <p className="font-black uppercase mb-1 flex items-center gap-1"><Gift className="w-3 h-3" /> Mass Distribution</p>
                When you deploy a global gift, every user receives a push notification and a dashboard card. Coins are strictly credited only after the user logs in and clicks "Claim".
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Coin Amount Per User</label>
                  <div className="relative mt-1">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                    <input
                      type="number"
                      placeholder="e.g. 50"
                      value={globalAmount}
                      onChange={(e) => setGlobalAmount(e.target.value)}
                      className="w-full pl-10 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Custom Message</label>
                  <textarea
                    placeholder="e.g. Thanks for playing Clash Arena! Here is a free reward."
                    value={globalMessage}
                    onChange={(e) => setGlobalMessage(e.target.value)}
                    rows={3}
                    className="w-full mt-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>

                <Button 
                  onClick={handleSendGlobal} 
                  disabled={isProcessingGlobal}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-black uppercase h-14 text-sm mt-4 glow-primary"
                >
                  {isProcessingGlobal ? <Loader2 className="w-5 h-5 animate-spin" /> : '🚀 DEPLOY GLOBAL GIFT'}
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>

      {/* ANALYTICS SECTION */}
      <div className="space-y-6">
        <Tabs value={analyticsTab} onValueChange={setAnalyticsTab}>
          <TabsList className="bg-black/40 border border-white/5 h-14 w-full md:w-auto inline-flex justify-start rounded-xl p-1 mb-6">
            <TabsTrigger value="individual" className="data-[state=active]:bg-primary rounded-lg px-8 h-full font-black uppercase tracking-wider text-xs flex items-center gap-2"><User className="w-4 h-4" /> Individual Analytics</TabsTrigger>
            <TabsTrigger value="global" className="data-[state=active]:bg-primary rounded-lg px-8 h-full font-black uppercase tracking-wider text-xs flex items-center gap-2"><Activity className="w-4 h-4" /> Global Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="individual">
            <Card className="glass border-white/5 relative overflow-hidden group">
              <CardHeader className="border-b border-white/5 bg-black/40">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2">Targeted Gift Distribution Log</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Monitor individual sent gifts</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5">
                      <TableHead className="text-[10px] font-black uppercase py-4 pl-6">Player Info</TableHead>
                      <TableHead className="text-[10px] font-black uppercase py-4">Gift Sent</TableHead>
                      <TableHead className="text-[10px] font-black uppercase py-4">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase py-4">Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indGiftsLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></TableCell></TableRow>
                    ) : !indGifts || indGifts.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs font-bold text-muted-foreground uppercase tracking-widest">No individual gifts sent yet</TableCell></TableRow>
                    ) : (
                      indGifts.map(gift => (
                        <TableRow key={gift.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="pl-6">
                            <p className="font-black text-white text-sm uppercase">{gift.targetUsername}</p>
                            <p className="text-[9px] text-muted-foreground font-mono">{gift.targetUserId}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-black text-primary text-sm flex items-center gap-1"><Coins className="w-3 h-3" /> {gift.amount}</p>
                            <p className="text-[9px] text-muted-foreground font-medium truncate max-w-[150px]" title={gift.message}>{gift.message}</p>
                          </TableCell>
                          <TableCell>
                            {gift.status === 'claimed' ? (
                              <div>
                                <Badge variant="outline" className="border-green-500/30 text-green-500 mb-1 flex w-fit items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> CLAIMED
                                </Badge>
                                {gift.claimedAt && <p className="text-[8px] text-muted-foreground uppercase tracking-widest">{new Date(gift.claimedAt?.toDate ? gift.claimedAt.toDate() : gift.claimedAt).toLocaleDateString()}</p>}
                              </div>
                            ) : (
                              <Badge variant="outline" className="border-orange-500/30 text-orange-500">
                                PENDING
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-[10px] font-medium text-white/80">{new Date(gift.sentAt?.toDate ? gift.sentAt.toDate() : gift.sentAt).toLocaleDateString()}</p>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                
                {indGifts && indGifts.length > 0 && (
                  <div className="p-6 flex justify-center border-t border-white/5 bg-black/20">
                    <Button variant="outline" onClick={() => setIndLimit(prev => prev + 5)} className="bg-black/40 border-white/10 font-black uppercase text-[10px] h-10 px-8">
                      LOAD MORE
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="global">
            <Card className="glass border-white/5 relative overflow-hidden group">
              <CardHeader className="border-b border-white/5 bg-black/40">
                <CardTitle className="text-sm font-black uppercase flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Global Gift Analytics</CardTitle>
                <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">Monitor mass distributions</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5">
                      <TableHead className="text-[10px] font-black uppercase py-4 pl-6">Amount</TableHead>
                      <TableHead className="text-[10px] font-black uppercase py-4">Status</TableHead>
                      <TableHead className="text-[10px] font-black uppercase py-4">Total Claims</TableHead>
                      <TableHead className="text-[10px] font-black uppercase py-4">Created / Expiry</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalGiftsLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></TableCell></TableRow>
                    ) : !globalGifts || globalGifts.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs font-bold text-muted-foreground uppercase tracking-widest">No global gifts deployed yet</TableCell></TableRow>
                    ) : (
                      globalGifts.map(gift => {
                        const isExpired = gift.expiresAt && new Date(gift.expiresAt).getTime() < Date.now();
                        return (
                          <TableRow key={gift.id} className="border-white/5 hover:bg-white/5 transition-colors">
                            <TableCell className="pl-6">
                              <p className="font-black text-primary text-sm flex items-center gap-1"><Coins className="w-3 h-3" /> {gift.amount}</p>
                              <p className="text-[9px] text-muted-foreground font-medium truncate max-w-[200px]" title={gift.message}>{gift.message}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={isExpired ? 'border-destructive/30 text-destructive' : 'border-primary/30 text-primary'}>
                                {isExpired ? 'EXPIRED' : 'ACTIVE'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-xs bg-white/5 px-2 py-1 rounded-md">{gift.totalClaims || 0}</span>
                                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Claimed</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-[10px] font-medium text-white/80">{new Date(gift.createdAt?.toDate ? gift.createdAt.toDate() : gift.createdAt).toLocaleDateString()}</p>
                              {gift.expiresAt && (
                                <p className="text-[9px] font-bold text-muted-foreground flex items-center gap-1 mt-0.5"><Timer className="w-3 h-3" /> Exp: {new Date(gift.expiresAt).toLocaleDateString()}</p>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  );
}
