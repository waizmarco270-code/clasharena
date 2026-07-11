'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Search, Loader2, Skull, Gavel, Scale, CheckCircle2, XCircle, Filter, Activity, Clock } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc, updateDoc, orderBy, limit, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function AdminBansPage() {
  const db = useFirestore();
  const { toast } = useToast();
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [thFilter, setThFilter] = useState('any');
  const [coinsFilter, setCoinsFilter] = useState('any');
  
  const [users, setUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loadingAppeals, setLoadingAppeals] = useState(true);

  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [banReason, setBanReason] = useState('');
  const [banDurationDays, setBanDurationDays] = useState('1');
  const [banType, setBanType] = useState('temporary');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchAppeals();
    fetchAllUsers(); // For Legendary Smart Search (Client Side Filtering)
  }, [db]);

  const fetchAppeals = async () => {
    try {
      const q = query(collection(db, 'users'), where('appealStatus', '==', 'pending'), limit(50));
      const snap = await getDocs(q);
      setAppeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAppeals(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      // In a massive production app, we'd use Algolia. For now, fetching recent/all active users works perfectly.
      const q = query(collection(db, 'users'), limit(3000)); 
      const snap = await getDocs(q);
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Legendary Smart Search Engine
  useEffect(() => {
    let result = allUsers;

    if (debouncedSearch.trim()) {
      const s = debouncedSearch.toLowerCase().trim();
      result = result.filter(u => 
        (u.username || '').toLowerCase().startsWith(s) || 
        (u.username || '').toLowerCase().includes(s) || 
        (u.tag || '').toLowerCase().includes(s) || 
        (u.id || '').toLowerCase().includes(s)
      );
    }

    if (thFilter !== 'any') {
      const th = parseInt(thFilter);
      result = result.filter(u => (u.townHall || 0) >= th);
    }

    if (coinsFilter !== 'any') {
      result = result.filter(u => {
        const coins = u.walletBalance || 0;
        if (coinsFilter === '0-50') return coins >= 0 && coins <= 50;
        if (coinsFilter === '51-100') return coins >= 51 && coins <= 100;
        if (coinsFilter === '101-500') return coins >= 101 && coins <= 500;
        if (coinsFilter === '500+') return coins > 500;
        return true;
      });
    }

    setUsers(result.slice(0, 15)); 

  }, [debouncedSearch, thFilter, coinsFilter, allUsers]);

  const bannedUsers = useMemo(() => allUsers.filter(u => u.banned).sort((a, b) => (b.bannedAt || 0) - (a.bannedAt || 0)), [allUsers]);

  const executeBanAction = async (actionType: string, customPayload?: any, overrideTargetUser?: any) => {
    const target = overrideTargetUser || selectedUser;
    if (!target) return;
    
    setProcessing(true);
    try {
      const payload = {
        userId: target.id,
        actionType,
        ...customPayload
      };
      const res = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast({ title: 'ACTION SUCCESSFUL', description: 'User ban status updated.' });
      
      const updatedUser = { ...target, ...data.updates };
      setAllUsers(prev => prev.map(u => u.id === target.id ? updatedUser : u));
      if (selectedUser?.id === target.id) {
        setSelectedUser(null);
      }
      
      fetchAppeals();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const resolveAppeal = async (userId: string, decision: 'accepted' | 'rejected') => {
    try {
      const res = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, actionType: 'resolve_appeal', decision })
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: 'APPEAL RESOLVED', description: `Appeal ${decision}.` });
      fetchAppeals();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-red-600/10 border border-red-500/20 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-headline font-black uppercase italic tracking-wider flex items-center gap-3 text-red-500">
              <Gavel className="w-8 h-8" /> JUDGMENT DAY
            </h1>
            <p className="text-xs font-bold uppercase text-red-400 mt-2">Enforce strict rules and eliminate cheaters.</p>
          </div>
          <div className="flex gap-4 text-center">
            <div className="bg-black/40 border border-red-500/20 rounded-xl p-3 px-6">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Banned</p>
              <p className="text-2xl font-black text-red-500">{bannedUsers.length}</p>
            </div>
            <div className="bg-black/40 border border-yellow-500/20 rounded-xl p-3 px-6">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Appeals</p>
              <p className="text-2xl font-black text-yellow-500">{appeals.length}</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 mb-6 p-1">
            <TabsTrigger value="search" className="data-[state=active]:bg-red-600 data-[state=active]:text-white uppercase font-black tracking-widest text-[10px]">
              <Search className="w-3 h-3 mr-2" /> Target Search
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-red-600 data-[state=active]:text-white uppercase font-black tracking-widest text-[10px]">
              <Activity className="w-3 h-3 mr-2" /> Ban Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Card className="glass border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
                  <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                      <Search className="w-4 h-4 text-red-500" /> Legendary Target Search
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input 
                        placeholder="Search by Username, Clash Tag (#), or Clerk ID (user_...)" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white/5 h-12 uppercase font-black"
                      />
                      {loadingUsers && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-2 gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                          <Filter className="w-3 h-3" /> Town Hall Level
                        </label>
                        <Select value={thFilter} onValueChange={setThFilter}>
                          <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-white/10">
                            <SelectItem value="any">Any TH Level</SelectItem>
                            <SelectItem value="10">TH 10+</SelectItem>
                            <SelectItem value="12">TH 12+</SelectItem>
                            <SelectItem value="14">TH 14+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1">
                          <Filter className="w-3 h-3" /> Coin Balance
                        </label>
                        <Select value={coinsFilter} onValueChange={setCoinsFilter}>
                          <SelectTrigger className="h-8 bg-white/5 border-white/10 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950 border-white/10">
                            <SelectItem value="any">Any Balance</SelectItem>
                            <SelectItem value="0-50">0 - 50 Coins</SelectItem>
                            <SelectItem value="51-100">51 - 100 Coins</SelectItem>
                            <SelectItem value="101-500">101 - 500 Coins</SelectItem>
                            <SelectItem value="500+">500+ Coins</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Search Results */}
                    {users.length > 0 && !selectedUser && (
                      <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                        {users.map(u => (
                          <div key={u.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors group" onClick={() => setSelectedUser(u)}>
                            <div className="flex flex-col">
                              <span className="font-black uppercase text-sm group-hover:text-red-400 transition-colors">{u.username || 'UNKNOWN'}</span>
                              <span className="text-[10px] text-muted-foreground font-bold tracking-wider">{u.id}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right hidden sm:block">
                                <p className="text-[10px] font-black text-amber-500">{u.walletBalance || 0} COINS</p>
                                <p className="text-[9px] text-muted-foreground font-bold">TH {u.townHall || '?'}</p>
                              </div>
                              {u.banned && <Badge className="bg-red-600 animate-pulse text-[9px]">BANNED</Badge>}
                              {!u.banned && u.strikes > 0 && <Badge variant="outline" className="border-red-500/30 text-red-400 text-[9px]">STRIKES: {u.strikes}</Badge>}
                            </div>
                          </div>
                        ))}
                        {users.length === 15 && <p className="text-[10px] text-center text-muted-foreground mt-2 italic">Showing top 15 results. Refine search for more.</p>}
                      </div>
                    )}
                    
                    {users.length === 0 && (searchTerm || thFilter !== 'any' || coinsFilter !== 'any') && !loadingUsers && (
                      <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
                        <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">No Targets Found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedUser && (
                  <Card className="glass border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.1)] animate-in slide-in-from-bottom-4">
                    <CardHeader className="bg-black/50 border-b border-red-500/20 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="font-black uppercase text-xl text-white flex items-center gap-2">
                          {selectedUser.username}
                          <Badge variant="outline" className="text-[10px] bg-white/5">{selectedUser.tag || 'No Tag'}</Badge>
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground font-bold tracking-widest">{selectedUser.id}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>CANCEL</Button>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      
                      {/* Current Status */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 p-3 rounded-xl text-center border border-white/10">
                          <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Status</p>
                          {selectedUser.banned ? (
                            <p className="font-black text-red-500 uppercase text-sm">{selectedUser.banType} BAN</p>
                          ) : (
                            <p className="font-black text-green-500 uppercase text-sm">ACTIVE</p>
                          )}
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl text-center border border-white/10">
                          <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Strikes</p>
                          <p className="font-black text-white text-sm">{selectedUser.strikes || 0} / 3</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl text-center border border-white/10">
                          <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Wallet</p>
                          <p className="font-black text-amber-500 text-sm">{selectedUser.walletBalance || 0} 🪙</p>
                        </div>
                      </div>

                      {/* Strike Escalation System */}
                      <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase text-white/50 tracking-widest flex items-center gap-2"><ShieldAlert className="w-3 h-3 text-orange-500" /> Strike Escalation</h3>
                        <div className="grid grid-cols-3 gap-2">
                          <Button onClick={() => executeBanAction('strike', { strikeLevel: 1 })} disabled={processing} variant="outline" className="h-14 flex-col border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
                            <span className="font-black text-xs">STRIKE 1</span>
                            <span className="text-[8px]">24H BAN</span>
                          </Button>
                          <Button onClick={() => executeBanAction('strike', { strikeLevel: 2 })} disabled={processing} variant="outline" className="h-14 flex-col border-red-500/30 text-red-400 hover:bg-red-500/10">
                            <span className="font-black text-xs">STRIKE 2</span>
                            <span className="text-[8px]">7 DAY BAN</span>
                          </Button>
                          <Button onClick={() => executeBanAction('strike', { strikeLevel: 3 })} disabled={processing} variant="outline" className="h-14 flex-col border-red-900/50 text-red-500 hover:bg-red-900/20 bg-red-900/10">
                            <span className="font-black text-xs">STRIKE 3</span>
                            <span className="text-[8px]">PERMANENT BAN</span>
                          </Button>
                        </div>
                      </div>

                      {/* Custom Ban Form */}
                      <div className="space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-[10px] font-black uppercase text-white/50 tracking-widest flex items-center gap-2"><Skull className="w-3 h-3 text-red-500" /> Custom Judgment</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Ban Type</label>
                            <Select value={banType} onValueChange={setBanType}>
                              <SelectTrigger className="bg-white/5 border-white/10 h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-950 border-white/10">
                                <SelectItem value="temporary" className="text-[10px] font-bold uppercase tracking-widest">Temporary</SelectItem>
                                <SelectItem value="permanent" className="text-[10px] font-bold uppercase tracking-widest text-red-500">Permanent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {banType === 'temporary' && (
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Duration (Days)</label>
                              <Input type="number" min="1" value={banDurationDays} onChange={e => setBanDurationDays(e.target.value)} className="bg-white/5 border-white/10 h-10" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Reason for Ban</label>
                          <Textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="e.g. Using unauthorized mods during tournament." className="bg-white/5 border-white/10 resize-none h-16 text-sm" />
                        </div>

                        <div className="flex gap-3 pt-2">
                          <Button onClick={() => executeBanAction('custom_ban', { banType, banReason, days: parseInt(banDurationDays) })} disabled={processing || !banReason.trim()} className="flex-1 h-10 bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest text-[10px]">
                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ISSUE BAN'}
                          </Button>
                          
                          {selectedUser.banned && (
                            <Button onClick={() => executeBanAction('unban')} disabled={processing} variant="outline" className="h-10 border-green-500/30 text-green-400 hover:bg-green-500/10 font-black uppercase tracking-widest text-[10px]">
                              UNBAN
                            </Button>
                          )}
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Appeals Column */}
              <div className="space-y-4">
                <h3 className="font-black uppercase tracking-widest text-sm text-yellow-500 flex items-center gap-2 border-b border-white/10 pb-2">
                  <Scale className="w-4 h-4" /> Pending Appeals
                </h3>
                
                {loadingAppeals ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-yellow-500" /></div>
                ) : appeals.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-8 font-black uppercase tracking-widest">NO PENDING APPEALS</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto no-scrollbar pr-1">
                    {appeals.map(a => (
                      <Card key={a.id} className="glass border-yellow-500/20 bg-yellow-500/5">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-black uppercase text-sm text-yellow-500">{a.username}</p>
                              <p className="text-[9px] font-bold text-muted-foreground tracking-widest">{a.id}</p>
                            </div>
                            <Badge variant="outline" className="border-red-500/30 text-[8px]">{a.banType} BAN</Badge>
                          </div>
                          
                          <div className="bg-black/50 p-3 rounded-lg border border-white/5 relative">
                            <div className="absolute top-2 left-2 text-white/10 italic text-2xl font-serif">"</div>
                            <p className="text-xs text-white/80 italic pl-4">{a.appealText}</p>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button onClick={() => resolveAppeal(a.id, 'accepted')} className="flex-1 h-8 text-[9px] font-black uppercase tracking-widest bg-green-600 hover:bg-green-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Forgive
                            </Button>
                            <Button onClick={() => resolveAppeal(a.id, 'rejected')} className="flex-1 h-8 text-[9px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-700">
                              <XCircle className="w-3 h-3 mr-1" /> Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="mt-0">
            <Card className="glass border-red-500/20">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                  <Skull className="w-4 h-4 text-red-500" /> Currently Disgraced Players
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {bannedUsers.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground font-black uppercase tracking-widest text-xs">
                    No active bans. The arena is pure.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {bannedUsers.map(u => {
                      const isTemp = u.banType === 'temporary';
                      const expiresAt = u.banExpiresAt ? new Date(u.banExpiresAt).toLocaleDateString() : 'Unknown';
                      const isExpired = u.banExpiresAt && Date.now() > u.banExpiresAt;
                      
                      return (
                        <div key={u.id} className="p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-12 h-12 bg-red-950 rounded-xl flex items-center justify-center border border-red-900/50 shrink-0">
                              <Skull className="w-6 h-6 text-red-500/50" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-black uppercase text-lg text-white">{u.username}</h3>
                                <Badge variant="outline" className="text-[8px] bg-red-500/10 text-red-500 border-red-500/30">
                                  {isTemp ? 'TEMPORARY' : 'PERMANENT'}
                                </Badge>
                                {isExpired && isTemp && (
                                  <Badge variant="outline" className="text-[8px] bg-green-500/10 text-green-500 border-green-500/30">
                                    EXPIRED
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground font-bold tracking-widest">{u.id}</p>
                            </div>
                          </div>

                          <div className="bg-red-950/20 p-3 rounded-lg border border-red-900/20 flex-1 w-full md:max-w-md">
                            <p className="text-[9px] font-black uppercase text-red-500/70 mb-1 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> Reason
                            </p>
                            <p className="text-xs text-red-200">{u.banReason || 'Violation'}</p>
                          </div>

                          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                            {isTemp && (
                              <div className="text-right hidden md:block">
                                <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Expires On</p>
                                <p className="text-xs font-bold text-white flex items-center gap-1 justify-end">
                                  <Clock className="w-3 h-3 text-red-400" /> {expiresAt}
                                </p>
                              </div>
                            )}
                            
                            <Button 
                              onClick={() => executeBanAction('unban', {}, u)}
                              disabled={processing}
                              variant="outline"
                              className="h-10 border-green-500/30 text-green-400 hover:bg-green-500/10 font-black uppercase tracking-widest text-[10px]"
                            >
                              REVOKE BAN
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
      </div>
    </PageWrapper>
  );
}
