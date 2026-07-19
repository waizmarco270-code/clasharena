'use client';

import { useState, useMemo, useEffect, Suspense, useRef } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Wallet, Zap, ShieldCheck, ArrowRight, Loader2, IndianRupee, Clock, CheckCircle2, AlertCircle, History, QrCode, Edit3, Trophy, ImageIcon, Timer } from 'lucide-react';
import { useProfile, useBackgrounds, useFirestore, useCollection } from '@/firebase';
import { useUser } from "@clerk/nextjs";
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import { cn } from '@/lib/utils';

function WithdrawPageContent() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const { profile } = useProfile();
  const { backgrounds: bgData } = useBackgrounds();
  const walletBg = bgData?.wallet;

  const [amount, setAmount] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [qrUploading, setQrUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastWithdrawalData, setLastWithdrawalData] = useState<any>(null);
  const qrRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setUpiId(profile.upiId || '');
      setUpiQrUrl(profile.upiQrUrl || '');
    }
  }, [profile]);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrUploading(true);
    try {
      const result = await uploadToCloudinary(file, { folder: 'qr' });
      setUpiQrUrl(result.url);
      toast({ title: "QR Attached!" });
    } catch (err) {
      toast({ variant: "destructive", title: "Upload Failed" });
    } finally {
      setQrUploading(false);
    }
  };

  // Fetch user's recent withdrawals without composite index
  const withdrawalsQuery = useMemo(() => {
    if (!user?.id) return null;
    return query(
      collection(db, 'withdrawals'),
      where('userId', '==', user.id)
    );
  }, [user?.id, db]);

  const { data: rawWithdrawals } = useCollection(withdrawalsQuery);
  
  // Sort in memory (descending by time)
  const withdrawals = useMemo(() => {
    if (!rawWithdrawals) return [];
    return [...rawWithdrawals].sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
  }, [rawWithdrawals]);

  const pendingWithdrawal = withdrawals?.find(w => w.status === 'pending');

  useEffect(() => {
    if (!withdrawals || withdrawals.length === 0) {
      setCooldownRemaining(null);
      return;
    }

    const lastValidWithdrawal = withdrawals.find(w => w.status !== 'rejected');
    if (!lastValidWithdrawal || lastValidWithdrawal.status === 'pending') {
      setCooldownRemaining(null);
      return;
    }

    const lastDate = lastValidWithdrawal.createdAt?.toDate 
      ? lastValidWithdrawal.createdAt.toDate() 
      : (lastValidWithdrawal.createdAt ? new Date(lastValidWithdrawal.createdAt) : null);
    
    if (!lastDate) {
      setCooldownRemaining(null);
      return;
    }

    const calculateTime = () => {
      const now = Date.now();
      const fortyEightHours = 48 * 60 * 60 * 1000;
      const timeSince = now - lastDate.getTime();
      
      if (timeSince < fortyEightHours) {
        setCooldownRemaining(fortyEightHours - timeSince);
      } else {
        setCooldownRemaining(null);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [withdrawals]);

  const formatCooldown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };
  
  const handleWithdraw = async () => {
    const numAmount = parseInt(amount);
    
    if (isNaN(numAmount) || numAmount < 100 || numAmount > 300) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'You can only withdraw between 100 and 300 V-Cash per transaction.' });
      return;
    }
    
    if (!upiId || upiId.trim().length < 5 || !upiId.includes('@')) {
      toast({ variant: 'destructive', title: 'Invalid UPI ID', description: 'Please enter a valid UPI ID (e.g. name@upi).' });
      return;
    }

    if (pendingWithdrawal) {
      toast({ variant: 'destructive', title: 'Pending Request Exists', description: 'You already have a pending withdrawal request. Please wait for it to be processed.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, upiId: upiId.trim(), upiQrUrl })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({
        title: "Payout Initiated! ⚡",
        description: "Your withdrawal has been successfully submitted."
      });
      setLastWithdrawalData({ amount: numAmount, upiId: upiId.trim() });
      setShowSuccessModal(true);
      
      setAmount('');
      setUpiId('');
      setUpiQrUrl('');
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: err.message || "Could not process withdrawal request.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {walletBg && (
        <div className="fixed-bg">
          <Image src={walletBg} alt="Background" fill className="object-cover opacity-60 saturate-150" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" />
          <div className="absolute inset-0 backdrop-blur-[1px]" />
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto space-y-8 pb-20 pt-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
          <div className="text-center md:text-left">
            <h1 className="font-headline text-4xl font-black mb-2 tracking-tight uppercase italic text-foreground">
              V-CASH <span className="text-green-500">PAYOUT</span>
            </h1>
            <p className="text-muted-foreground font-medium">Withdraw your Arena winnings directly to your bank account.</p>
          </div>
          
          <div className="glass p-1 rounded-3xl border border-green-500/20 bg-black/40 backdrop-blur-md shadow-2xl">
            <div className="bg-gradient-to-br from-green-900/40 to-black/60 rounded-[22px] p-5 min-w-[280px]">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">TOTAL V-CASH</span>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-white">{profile?.vCashBalance || 0}</span>
                  <Zap className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-green-500"/> Unplayed (0% Fee)</span>
                  <span className="text-green-400 font-black">⚡ {profile?.unplayedBalance || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-amber-500"/> Winnings (20% Fee)</span>
                  <span className="text-amber-400 font-black">⚡ {Math.max(0, (profile?.vCashBalance || 0) - (profile?.unplayedBalance || 0))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="request" className="w-full space-y-8 px-4">
          <TabsList className="w-full bg-black/40 border border-white/5 h-14 p-1 rounded-2xl flex max-w-xl mx-auto">
            <TabsTrigger value="request" className="flex-1 rounded-xl data-[state=active]:bg-green-600 data-[state=active]:text-white font-black uppercase tracking-widest text-xs transition-all">
              Payout Request
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 rounded-xl data-[state=active]:bg-amber-600 data-[state=active]:text-white font-black uppercase tracking-widest text-xs transition-all">
              Analytics & History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="glass border-green-500/30 overflow-hidden relative shadow-2xl shadow-green-900/20">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500/0 via-green-500 to-green-500/0" />
            <CardHeader>
              <CardTitle className="font-headline italic text-2xl uppercase tracking-wider flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-green-500" /> Withdraw Funds
              </CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest">
                Transfer to your UPI instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {pendingWithdrawal ? (
                <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center text-center gap-2 animate-pulse">
                  <Clock className="w-8 h-8 text-amber-500 mb-2" />
                  <h4 className="font-black text-lg text-white uppercase">Pending Payout</h4>
                  <p className="text-xs text-muted-foreground font-medium">
                    You have a pending withdrawal of <span className="text-amber-500 font-bold">{pendingWithdrawal.amount} V-Cash</span>.
                    Please wait for the admin to process it.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Withdrawal Amount (100 - 300 V-Cash)</label>
                    <div className="relative group">
                      <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500 group-focus-within:text-green-400 transition-colors" />
                      <Input 
                        type="number"
                        placeholder="Min 100, Max 300"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-12 h-14 bg-black/40 border-green-500/20 font-black text-lg focus:border-green-500 transition-colors text-white placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your UPI ID</label>
                    <div className="relative group">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-white transition-colors" />
                      <Input 
                        type="text"
                        placeholder="username@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="pl-12 h-14 bg-black/40 border-white/10 font-bold focus:border-green-500 transition-colors text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">UPI QR Code <Badge className="bg-primary/20 text-primary border-none text-[8px] h-4">RECOMMENDED</Badge></label>
                    <div className="flex items-center gap-4">
                      {upiQrUrl ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-green-500/50 group cursor-pointer" onClick={() => qrRef.current?.click()}>
                          <Image src={upiQrUrl} alt="QR Code" fill className="object-cover" />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Edit3 className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <Button type="button" variant="outline" className="h-16 w-16 rounded-xl border-dashed border-white/20 bg-black/50 hover:bg-white/10 flex-col gap-1" onClick={() => qrRef.current?.click()}>
                          {qrUploading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <><QrCode className="w-4 h-4 text-muted-foreground" /><span className="text-[8px] font-bold uppercase text-muted-foreground">Upload</span></>}
                        </Button>
                      )}
                      <div className="flex-1 text-[9px] text-muted-foreground font-medium uppercase tracking-widest">
                        Uploading your QR helps the admin process payouts faster.
                      </div>
                      <input type="file" ref={qrRef} onChange={handleQrUpload} accept="image/*" className="hidden" />
                    </div>
                  </div>

                  <div className="relative p-5 rounded-2xl bg-gradient-to-br from-green-950/40 to-black border border-green-500/30 space-y-4 mt-8 shadow-[0_0_30px_rgba(34,197,94,0.1)] overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500/0 via-green-500 to-green-500/0" />
                    <div className="flex items-center gap-2 mb-2 pb-3 border-b border-white/10">
                      <Zap className="w-5 h-5 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                      <h4 className="text-sm font-black uppercase tracking-widest text-white">Smart Fee Breakdown</h4>
                    </div>

                    {Number(amount) > 0 ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                          <span>Withdrawal Amount</span>
                          <span className="text-white text-sm">⚡ {amount}</span>
                        </div>
                        
                        {(() => {
                          const numAmt = Number(amount);
                          const unplayed = profile?.unplayedBalance || 0;
                          const unplayedWithdrawn = Math.min(numAmt, unplayed);
                          const winningsWithdrawn = numAmt - unplayedWithdrawn;
                          const fee = Math.floor(winningsWithdrawn * 0.20);
                          const payable = numAmt - fee;
                          
                          return (
                            <>
                              {unplayedWithdrawn > 0 && (
                                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                                  <span>Unplayed Deposit Refund</span>
                                  <span className="text-green-400">⚡ {unplayedWithdrawn} <span className="text-[9px] uppercase ml-1 bg-green-500/20 px-1 py-0.5 rounded text-green-500">0% Fee</span></span>
                                </div>
                              )}
                              {winningsWithdrawn > 0 && (
                                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                                  <span>Winnings Withdrawn</span>
                                  <span className="text-white">⚡ {winningsWithdrawn}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground pt-1">
                                <span>Platform Cashout Fee (20%)</span>
                                <span className="text-red-500">- ⚡ {fee}</span>
                              </div>
                              <div className="text-[9px] text-muted-foreground/60 italic leading-tight pb-3 border-b border-white/10">
                                *Fee only applies to winnings. Covers server costs. Future Arena Memberships will lower this fee!
                              </div>
                              <div className="flex justify-between items-center text-lg font-black pt-2">
                                <span className="text-white uppercase tracking-widest text-sm">You Receive:</span>
                                <span className="text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.3)]">₹ {payable} INR</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-6 flex flex-col items-center justify-center gap-2">
                        <IndianRupee className="w-8 h-8 text-white/10" />
                        <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                          Enter an amount to see your breakdown.
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

            </CardContent>
            <CardFooter>
              {cooldownRemaining !== null ? (
                <Button 
                  disabled
                  className="w-full h-14 bg-amber-500/10 border border-amber-500/50 text-amber-500 font-black text-lg rounded-xl flex items-center justify-center cursor-not-allowed opacity-100"
                >
                  <Timer className="w-5 h-5 mr-2 animate-pulse" />
                  COOLDOWN: {formatCooldown(cooldownRemaining)}
                </Button>
              ) : (
                <Button 
                  onClick={handleWithdraw}
                  disabled={loading || !!pendingWithdrawal || !amount || !upiId}
                  className="w-full h-14 bg-green-600 hover:bg-green-500 text-white font-black text-lg rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>CONFIRM WITHDRAWAL <ArrowRight className="ml-2 w-5 h-5" /></>
                  )}
                </Button>
              )}
            </CardFooter>
              </Card>

              <div className="glass p-6 rounded-2xl border border-border/30 space-y-4 h-fit">
                <h3 className="font-headline text-lg font-black uppercase italic tracking-wider text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" /> Rules & Policy
                </h3>
                <ul className="space-y-3 text-xs font-medium text-muted-foreground">
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" /> Minimum withdrawal limit is 100 V-Cash.</li>
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" /> Maximum withdrawal limit is 300 V-Cash per request.</li>
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" /> You can only have one active pending request at a time.</li>
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" /> 48 hour cooldown between successful withdrawals.</li>
                  <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" /> Make sure your UPI ID is correct, incorrect IDs may result in loss of funds.</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* ============================== */}
            {/* RECENT PAYOUTS & ANALYTICS */}
            {/* ============================== */}
            <Card className="glass border-white/5 overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-[60px]" />
              <CardHeader className="border-b border-white/5 bg-black/20 pb-4">
                <CardTitle className="font-headline text-lg italic uppercase tracking-widest flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-500" /> Payout Analytics & History
                </CardTitle>
                <CardDescription className="text-[10px] font-bold tracking-widest uppercase">
                  Track your lifetime withdrawals and pending requests.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {(!withdrawals || withdrawals.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 opacity-50">
                    <IndianRupee className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">NO RECENT WITHDRAWALS FOUND</p>
                    <p className="text-[9px] font-medium text-muted-foreground mt-2 text-center">Your payout history will appear here once you request a withdrawal.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {withdrawals.slice(0, 5).map((w: any) => {
                      const wAmount = w.amount || 0;
                      const wFee = w.cashoutFee || Math.floor(Math.max(0, wAmount - (w.unplayedWithdrawn || 0)) * 0.20);
                      const wPayable = w.payableAmount || (wAmount - wFee);
                      
                      return (
                        <div key={w.id} className="p-5 flex flex-col md:flex-row gap-4 items-center justify-between hover:bg-white/[0.02] transition-colors group">
                          
                          <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                              w.status === 'pending' ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : 
                              w.status === 'approved' ? "bg-green-500/20 text-green-500 border border-green-500/30" : 
                              "bg-red-500/20 text-red-500 border border-red-500/30"
                            )}>
                              {w.status === 'pending' && <Clock className="w-5 h-5 animate-pulse" />}
                              {w.status === 'approved' && <CheckCircle2 className="w-5 h-5" />}
                              {w.status === 'rejected' && <AlertCircle className="w-5 h-5" />}
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-black text-white text-lg uppercase tracking-wider">⚡ {wAmount}</h4>
                                <Badge variant="outline" className={cn(
                                  "text-[8px] font-black uppercase tracking-widest px-1.5 h-4 border-none",
                                  w.status === 'pending' ? "bg-amber-500/10 text-amber-500" : 
                                  w.status === 'approved' ? "bg-green-500/10 text-green-500" : 
                                  "bg-red-500/10 text-red-500"
                                )}>
                                  {w.status}
                                </Badge>
                              </div>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <History className="w-3 h-3" />
                                {w.createdAt ? formatDistanceToNow(w.createdAt.toDate ? w.createdAt.toDate() : new Date(w.createdAt), { addSuffix: true }) : 'Just now'}
                              </p>
                            </div>
                          </div>

                          <div className="w-full md:w-auto flex flex-col gap-2 items-end">
                            <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-end justify-center min-w-[160px]">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Final Payout</span>
                              <span className="text-xl font-black text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]">₹ {wPayable}</span>
                              <span className="text-[8px] font-bold uppercase text-muted-foreground mt-1">To: {w.upiId || 'Unknown'}</span>
                            </div>
                            {w.proofUrl && (
                              <a href={w.proofUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                                <Button variant="outline" size="sm" className="w-full h-8 text-[9px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border-white/10 text-white">
                                  <ImageIcon className="w-3 h-3 mr-1.5" /> View Proof
                                </Button>
                              </a>
                            )}
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

      {/* LEGENDARY SUCCESS MODAL */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="glass border-green-500/30 bg-black/90 sm:max-w-[450px] p-0 overflow-hidden outline-none">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-green-500/0 via-green-500 to-green-500/0 animate-pulse" />
          
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full" />
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center relative z-10 shadow-[0_0_30px_rgba(34,197,94,0.5)] border-4 border-black animate-bounce-slow">
                <CheckCircle2 className="w-12 h-12 text-black" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="font-headline text-3xl font-black italic uppercase tracking-wider text-white drop-shadow-md">
                PAYOUT <span className="text-green-500">INITIATED</span>
              </h2>
              <p className="text-muted-foreground text-sm font-medium">
                Congratulations, Commander! Your withdrawal request has been securely routed to our administration desk.
              </p>
            </div>

            <div className="w-full bg-black/50 border border-white/10 rounded-xl p-4 flex justify-between items-center">
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Amount</span>
                <span className="text-xl font-black text-white">⚡ {lastWithdrawalData?.amount}</span>
              </div>
              <ArrowRight className="w-5 h-5 text-white/20" />
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">Destination</span>
                <span className="text-sm font-bold text-white truncate max-w-[120px]">{lastWithdrawalData?.upiId}</span>
              </div>
            </div>

            <div className="p-3 w-full rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-left">
              <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-widest text-amber-500 block">Pending Processing</span>
                <span className="text-[10px] text-muted-foreground leading-tight block">
                  Please allow up to 24-48 hours for our team to verify and process your payout to your UPI ID. You can track this request in your Analytics history.
                </span>
              </div>
            </div>
            
            <Button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full h-14 rounded-xl bg-green-500 hover:bg-green-600 text-black font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02]"
            >
              Back to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WithdrawPage() {
  return (
    <PageWrapper>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-green-500" /></div>}>
        <WithdrawPageContent />
      </Suspense>
    </PageWrapper>
  );
}
