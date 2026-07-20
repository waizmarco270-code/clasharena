'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Key, Gift, X, Loader2, Coins, Activity, Timer, Users, RefreshCw, PowerOff, Trash2, Ticket, Crown, Zap } from 'lucide-react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function GiftCodesPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('generate');

  // Generator State
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [rewardType, setRewardType] = useState('coins');
  const [amount, setAmount] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expireHours, setExpireHours] = useState('');
  const [expireDays, setExpireDays] = useState('');
  const [expireMins, setExpireMins] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Analytics State
  const codesQuery = useMemo(() => query(collection(db, 'gift-codes'), orderBy('createdAt', 'desc'), limit(50)), [db]);
  const { data: codes, loading: codesLoading } = useCollection(codesQuery);

  const [claimersDialog, setClaimersDialog] = useState<any | null>(null);
  const [claimers, setClaimers] = useState<any[]>([]);
  const [claimersLoading, setClaimersLoading] = useState(false);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CLASH-${result}-ARENA`;
  };

  const handleGenerate = async () => {
    if (!amount || Number(amount) <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount' });
      return;
    }

    let codeToCreate = '';
    if (isCustomMode) {
      if (!customCode.trim()) {
        toast({ variant: 'destructive', title: 'Custom code cannot be empty' });
        return;
      }
      codeToCreate = customCode.trim().toUpperCase().replace(/\s+/g, '').substring(0, 20);
    } else {
      codeToCreate = generateRandomCode();
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/codes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToCreate,
          rewardType,
          amount: Number(amount),
          maxUses: Number(maxUses) || 0,
          expireDays: Number(expireDays) || 0,
          expireHours: Number(expireHours) || 0,
          expireMins: Number(expireMins) || 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: 'Code Activated!', description: `Code ${codeToCreate} is now live.` });
      setGeneratedCode(codeToCreate);
      setCustomCode('');
      setActiveTab('analytics'); // switch to see it
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManageCode = async (codeId: string, action: string) => {
    let confirmMsg = 'Are you sure?';
    if (action === 'close') confirmMsg = 'Are you sure you want to permanently KILL this code?';
    if (action === 'reset_limit') confirmMsg = 'Are you sure you want to RESET the uses for this code to 0?';
    if (action === 'delete') confirmMsg = 'WARNING: Are you sure you want to PERMANENTLY DELETE this code from history?';
    
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/codes/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId, action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Success', description: data.message });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
    }
  };

  const viewClaimers = async (code: any) => {
    setClaimersDialog(code);
    setClaimers([]);
    setClaimersLoading(true);
    try {
      const q = query(collection(db, `gift-codes/${code.code}/claims`), orderBy('redeemedAt', 'desc'), limit(100));
      const snaps = await getDocs(q);
      setClaimers(snaps.docs.map(d => d.data()));
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Failed to load claimers' });
    } finally {
      setClaimersLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-headline font-black uppercase tracking-wider flex items-center gap-2">
          <Key className="w-6 h-6 text-primary" /> Flash Gift Codes
        </h2>
        <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">
          Generate highly scalable, zero-glitch secret codes for social media events.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-black/40 border border-white/5 h-14 inline-flex justify-start rounded-xl p-1 mb-6">
          <TabsTrigger value="generate" className="data-[state=active]:bg-primary rounded-lg px-8 h-full font-black uppercase tracking-wider text-xs flex items-center gap-2">Generate Code</TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-primary rounded-lg px-8 h-full font-black uppercase tracking-wider text-xs flex items-center gap-2">Code Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="glass border-white/5 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50"></div>
              <CardHeader className="border-b border-white/5 bg-black/40 relative z-10">
                <CardTitle className="text-sm font-black uppercase flex items-center justify-between">
                  <span>Code Generator</span>
                  <div className="flex items-center space-x-2">
                    <Switch id="custom-mode" checked={isCustomMode} onCheckedChange={setIsCustomMode} />
                    <Label htmlFor="custom-mode" className="text-xs uppercase font-black">Custom Mode</Label>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6 relative z-10">
                
                {isCustomMode ? (
                  <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Custom Code String</label>
                    <input
                      type="text"
                      placeholder="e.g. WAIZDEV or CLASH20"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      maxLength={20}
                      className="w-full mt-1 px-4 py-3 bg-black/40 border border-primary/50 rounded-xl text-lg font-black text-white focus:outline-none focus:border-primary uppercase tracking-widest"
                    />
                  </div>
                ) : (
                  <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Auto-Generated Format</p>
                    <p className="text-xl font-mono font-black text-white/50 tracking-[0.2em]">CLASH-<span className="text-primary animate-pulse">XXXXX</span>-ARENA</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Reward Type</label>
                    <Select value={rewardType} onValueChange={setRewardType}>
                      <SelectTrigger className="w-full mt-1 h-[46px] bg-black/40 border-white/10 rounded-xl text-xs font-bold text-white focus:ring-0 focus:border-primary/50">
                        <SelectValue placeholder="Select Reward" />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 glass text-xs font-bold text-white">
                        <SelectItem value="coins">🪙 Coins</SelectItem>
                        <SelectItem value="v-cash">⚡ V-Cash</SelectItem>
                        <SelectItem value="bronze">🎫 Bronze Ticket</SelectItem>
                        <SelectItem value="silver">🎫 Silver Ticket</SelectItem>
                        <SelectItem value="golden">👑 Golden Ticket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Amount Per User (Required)</label>
                    <div className="relative mt-1">
                      {rewardType === 'coins' ? <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" /> : rewardType === 'v-cash' ? <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" /> : rewardType === 'golden' ? <Crown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" /> : <Ticket className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${rewardType === 'bronze' ? 'text-amber-700' : 'text-slate-400'}`} />}
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-10 h-[46px] bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Max Users (Optional)</label>
                    <div className="relative mt-1">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="number"
                        placeholder="e.g. 100 (0 = ∞)"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Expiry (Optional)</label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          placeholder="Days"
                          value={expireDays}
                          onChange={(e) => setExpireDays(e.target.value)}
                          className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary/50 text-center"
                        />
                      </div>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          placeholder="Hrs"
                          value={expireHours}
                          onChange={(e) => setExpireHours(e.target.value)}
                          className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary/50 text-center"
                        />
                      </div>
                      <div className="relative flex-1">
                        <input
                          type="number"
                          placeholder="Mins"
                          value={expireMins}
                          onChange={(e) => setExpireMins(e.target.value)}
                          className="w-full px-3 py-3 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-primary/50 text-center"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-black uppercase h-14 text-sm mt-4 glow-primary"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : '🚀 GENERATE SECRET CODE'}
                </Button>

                {generatedCode && (
                   <div className="mt-4 p-4 rounded-xl border border-green-500/30 bg-green-500/10 text-center animate-in zoom-in duration-300">
                     <p className="text-[10px] font-black uppercase text-green-500 mb-1">Code Successfully Generated</p>
                     <p className="text-2xl font-mono font-black text-white tracking-widest">{generatedCode}</p>
                   </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 text-sm font-medium text-primary/90">
                <h3 className="font-headline font-black uppercase italic text-lg mb-2 flex items-center gap-2">
                  <Activity className="w-5 h-5" /> Highly Optimized
                </h3>
                <p className="mb-4 text-white/70 text-xs">
                  This system is built using a decentralized subcollection architecture.
                </p>
                <ul className="space-y-2 text-xs text-white/60 list-disc pl-4">
                  <li><strong>Infinite Scaling:</strong> No 1MB document limits. A code can be redeemed millions of times without crashing.</li>
                  <li><strong>Zero Double Claims:</strong> Strict transactional backend logic guarantees users can never redeem a code twice, even if they click at the exact same millisecond.</li>
                  <li><strong>Instant Kill Switch:</strong> Codes can be manually closed from the Analytics tab, rendering them instantly unusable.</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="glass border-white/5 relative overflow-hidden group">
            <CardHeader className="border-b border-white/5 bg-black/40">
              <CardTitle className="text-sm font-black uppercase flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Active & Archived Codes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5">
                    <TableHead className="text-[10px] font-black uppercase py-4 pl-6">Code & Reward</TableHead>
                    <TableHead className="text-[10px] font-black uppercase py-4">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase py-4">Utilization</TableHead>
                    <TableHead className="text-[10px] font-black uppercase py-4 text-right pr-6">Controls</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codesLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" /></TableCell></TableRow>
                  ) : !codes || codes.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-xs font-bold text-muted-foreground uppercase tracking-widest">No secret codes generated yet</TableCell></TableRow>
                  ) : (
                    codes.map(code => {
                      const isExpired = code.expiresAt && new Date(code.expiresAt).getTime() < Date.now();
                      const isMaxed = code.maxUses > 0 && code.currentUses >= code.maxUses;
                      
                      let statusBadge = <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">ACTIVE</Badge>;
                      if (code.status === 'closed') {
                        statusBadge = <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/10">KILLED</Badge>;
                      } else if (isExpired) {
                        statusBadge = <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/10">EXPIRED</Badge>;
                      } else if (isMaxed) {
                        statusBadge = <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 bg-yellow-500/10">LIMIT HIT</Badge>;
                      }

                      return (
                        <TableRow key={code.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="pl-6">
                            <p className="font-mono font-black text-white text-base tracking-wider">{code.code}</p>
                            <p className={`text-[10px] font-black uppercase mt-1 flex items-center gap-1 ${code.rewardType === 'v-cash' ? 'text-green-500/80' : code.rewardType === 'golden' ? 'text-yellow-500/80' : code.rewardType === 'bronze' ? 'text-amber-700/80' : code.rewardType === 'silver' ? 'text-slate-400/80' : 'text-primary/80'}`}>
                              {code.rewardType === 'v-cash' ? <Zap className="w-3 h-3" /> : code.rewardType === 'golden' ? <Crown className="w-3 h-3" /> : code.rewardType && code.rewardType !== 'coins' ? <Ticket className="w-3 h-3" /> : <Coins className="w-3 h-3" />}
                              {code.amount} {code.rewardType === 'v-cash' ? 'V-Cash' : code.rewardType && code.rewardType !== 'coins' ? `${code.rewardType} Ticket` : 'Coins'}
                            </p>
                          </TableCell>
                          <TableCell>
                            {statusBadge}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-sm text-white">{code.currentUses || 0}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="font-mono font-black text-sm text-muted-foreground">{code.maxUses > 0 ? code.maxUses : '∞'}</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden max-w-[100px]">
                               <div className="bg-primary h-full" style={{ width: code.maxUses > 0 ? `${Math.min(100, ((code.currentUses||0)/code.maxUses)*100)}%` : '100%' }}></div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => viewClaimers(code)} className="border-white/10 hover:bg-white/5 text-xs font-black uppercase h-8 px-3">
                                <Users className="w-3 h-3 mr-1" /> View
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleManageCode(code.id, 'reset_limit')} className="border-white/10 hover:bg-white/5 text-xs font-black uppercase h-8 px-3 text-blue-400">
                                <RefreshCw className="w-3 h-3 mr-1" /> Reset
                              </Button>
                              {code.status !== 'closed' && (
                                <Button size="sm" variant="destructive" onClick={() => handleManageCode(code.id, 'close')} className="h-8 px-3 font-black text-xs uppercase bg-destructive/80 hover:bg-destructive">
                                  <PowerOff className="w-3 h-3 mr-1" /> Kill
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" onClick={() => handleManageCode(code.id, 'delete')} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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

      {/* Claimers Dialog */}
      <Dialog open={!!claimersDialog} onOpenChange={(open) => !open && setClaimersDialog(null)}>
        <DialogContent className="bg-zinc-950 border-white/10 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-headline font-black uppercase text-primary italic">Code Redemptions</DialogTitle>
            <DialogDescription className="text-xs uppercase font-bold text-muted-foreground">
              {claimersDialog?.code} - {claimersDialog?.currentUses || 0} Uses
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] w-full rounded-md border border-white/5 p-4 bg-black/40">
            {claimersLoading ? (
               <div className="flex justify-center items-center h-32"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : claimers.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground font-bold uppercase py-8">No one has redeemed this code yet</p>
            ) : (
              <div className="space-y-4">
                {claimers.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-black text-primary text-xs">{i + 1}</div>
                       <div>
                         <p className="font-black text-white text-sm uppercase">{c.username}</p>
                         <p className="text-[9px] text-muted-foreground font-mono">{c.userId}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <Badge variant="outline" className="border-primary/20 text-primary text-[10px] font-black uppercase mb-1">
                         TH {c.townHall || '?'}
                       </Badge>
                       {c.redeemedAt && <p className="text-[8px] text-muted-foreground uppercase">{new Date(c.redeemedAt?.toDate ? c.redeemedAt.toDate() : c.redeemedAt).toLocaleDateString()}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
