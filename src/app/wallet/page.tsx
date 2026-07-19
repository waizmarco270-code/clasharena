'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Wallet, 
  Plus, 
  Minus, 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  History,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { useProfile, useBackgrounds, useFirestore, useDoc } from '@/firebase';
import { useUser } from "@clerk/nextjs";
import { doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const playCoinSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.08);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.35);
  } catch (e) {
    console.error("Audio error", e);
  }
};

function WalletPageContent() {
  const { user, isLoaded: authLoaded } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const { profile } = useProfile();
  const { backgrounds: bgData } = useBackgrounds();
  const walletBg = bgData?.wallet;

  const settingsRef = useMemo(() => doc(db, 'app-settings', 'payment'), [db]);
  const { data: settings } = useDoc(settingsRef);
  const hideManual = settings?.hideManual === true;
  const hideAuto = settings?.hideAuto === true;

  const [amount, setAmount] = useState<number>(50);
  const [coins, setCoins] = useState<number>(50);
  const [currency, setCurrency] = useState<'coins' | 'vcash'>('coins');
  const [methodDialogOpen, setMethodDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const templates = [
    { id: 't1', payAmount: 20, coins: 20, label: '🪙 20' },
    { id: 't2', payAmount: 50, coins: 50, label: '🪙 50' },
    { id: 't3', payAmount: 100, coins: 120, label: '100 + 20 Bonus' },
    { id: 't4', payAmount: 129, coins: 169, label: '129 + 40 Bonus', badge: 'VALUE FOR MONEY' }
  ];

  useEffect(() => {
    if (currency === 'vcash') {
      setCoins(amount);
    }
  }, [currency, amount]);

  const handleAdjust = (delta: number) => {
    setAmount(prev => Math.max(1, prev + delta));
    setCoins(prev => Math.max(1, prev + delta));
  };

  useEffect(() => {
    const currencyParam = searchParams.get('currency');
    if (currencyParam === 'vcash' || currencyParam === 'coins') {
      setCurrency(currencyParam as 'coins' | 'vcash');
    }
  }, [searchParams]);

  // Detect payment status query parameters on page load/redirect
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const paymentAmount = searchParams.get('amount');

    if (paymentStatus === 'success') {
      const creditedAmount = paymentAmount ? Number(paymentAmount) : amount;
      
      // Trigger victory satisfaction effects
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FF4500', '#DC143C', '#FFA500', '#FFFFFF']
        });
      });
      playCoinSound();

      toast({
        title: "RECHARGE SUCCESSFUL",
        description: `🪙 ${creditedAmount} Coins have been added to your vault!`,
      });

      // Clear search query parameters cleanly without reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, toast]);

  const proceedToPay = async (method: 'manual' | 'auto') => {
    if (amount < 10) {
      toast({ variant: "destructive", title: "Minimum Purchase is 10 coins", description: "You must buy at least 10 coins." });
      setMethodDialogOpen(false);
      return;
    }

    if (method === 'manual') {
      router.push(`/wallet/manual-pay?amount=${amount}&coins=${coins}&currency=${currency}`);
      setMethodDialogOpen(false);
      return;
    }

    setLoading(true);
    setMethodDialogOpen(false);

    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to recharge your wallet.",
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/recharge/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, coins, userId: user.id, currency })
      });
      
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const orderId = data.orderId;
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        throw new Error("Razorpay Key ID is not configured");
      }

      // 2. Open Razorpay checkout modal
      // We pass callback_url and redirect: true so Razorpay POSTs details directly to
      // our redirect API route. This solves mobile browser reloads on app switching.
      const options = {
        key: razorpayKey,
        amount: amount * 100,
        currency: "INR",
        name: "Clash Arena",
        description: `Recharge ${amount} Coins`,
        order_id: orderId,
        callback_url: `${window.location.origin}/api/recharge/verify-payment-redirect`,
        redirect: true,
        prefill: {
          name: profile?.username || user?.firstName || 'Warrior',
          email: user?.emailAddresses?.[0]?.emailAddress || ''
        },
        theme: {
          color: "#FF4500" // Flame Orange
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Payment Initialization Failed",
        description: err.message || "Could not launch payment gateway.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Dynamic Wallet Background - Hardware Accelerated Fixed Class */}
      {walletBg && (
        <div className="fixed-bg">
          <Image 
            src={walletBg} 
            alt="Wallet Background" 
            fill 
            className="object-cover opacity-60 saturate-150" 
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" />
          <div className="absolute inset-0 backdrop-blur-[1px]" />
        </div>
      )}

      <div className="relative z-10 max-w-4xl mx-auto space-y-8 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="font-headline text-4xl font-black mb-2 tracking-tight uppercase italic text-foreground">
              {currency === 'coins' ? <>COIN <span className="text-primary">VAULT</span></> : <>V-CASH <span className="text-green-500">VAULT</span></>}
            </h1>
            <p className="text-muted-foreground font-medium">Recharge your balance to enter high-stakes arenas.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {currency === 'vcash' && (
              <Link href="/wallet/withdraw">
                <Button variant="outline" className="border-green-500/50 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-black gap-2 h-12 rounded-xl w-full sm:w-auto">
                  <Zap className="w-4 h-4 text-green-500" /> WITHDRAW V-CASH
                </Button>
              </Link>
            )}
            <Link href="/wallet/history">
              <Button variant="outline" className="border-border/50 glass font-bold gap-2 h-12 rounded-xl w-full sm:w-auto">
                <History className="w-4 h-4 text-primary" /> VIEW HISTORY
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Balance Card */}
          <Card className="md:col-span-1 glass border-primary/20 bg-primary/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Wallet className="w-24 h-24 rotate-12" />
            </div>
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Available Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-headline font-black text-foreground">🪙 {profile?.balance || 0}</span>
                </div>
                <div className="flex items-center gap-3 border-t border-white/10 pt-4">
                  <span className="text-xs font-black uppercase text-muted-foreground w-20">VS Balance</span>
                  <span className="text-2xl font-headline font-black text-green-500">⚡ {profile?.vCashBalance || 0}</span>
                </div>
              </div>
              <p className="text-[10px] font-bold text-primary uppercase mt-4 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Secure Wallet Enabled
              </p>
            </CardContent>
          </Card>

          {/* Recharge UI Card */}
          <Card className="md:col-span-2 glass border-border/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="font-headline text-xl font-bold uppercase tracking-tighter">Quick Top-up</CardTitle>
                <CardDescription>Select a pack or enter a custom amount (1 Unit = 1 ₹)</CardDescription>
              </div>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                <button 
                  onClick={() => setCurrency('coins')}
                  className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all ${currency === 'coins' ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                >
                  🪙 Coins
                </button>
                <button 
                  onClick={() => setCurrency('vcash')}
                  className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all ${currency === 'vcash' ? 'bg-green-600 text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                >
                  ⚡ V-Cash
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-4">
              {/* Templates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {templates.map((t) => {
                  const isSelected = amount === t.payAmount && coins === t.coins;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setAmount(t.payAmount); setCoins(currency === 'vcash' ? t.payAmount : t.coins); }}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all font-black ${
                        isSelected
                          ? 'bg-primary/20 border-primary text-primary glow-primary overflow-hidden'
                          : 'bg-muted/40 border-border/20 text-muted-foreground hover:border-border/50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
                      )}
                      <span className="text-[13px] md:text-[15px] z-10">{currency === 'vcash' ? `⚡ ${t.payAmount}` : t.label}</span>
                      {t.payAmount !== (currency === 'vcash' ? t.payAmount : t.coins) && (
                        <span className="text-[10px] text-white z-10">Pay ₹{t.payAmount}</span>
                      )}
                      {t.badge && (
                        <Badge className="absolute -top-2 -right-2 bg-purple-600 text-[8px] font-black uppercase text-white shadow-md z-20 px-1 py-0">{t.badge}</Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Input */}
              <div className="flex items-center justify-center gap-6">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => handleAdjust(-1)}
                  className="h-12 w-12 rounded-xl border-border/50 hover:bg-primary/20"
                >
                  <Minus className="w-6 h-6" />
                </Button>
                
                <div className="relative group">
                  <Input 
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setAmount(val);
                      setCoins(val);
                    }}
                    className="h-20 w-40 text-center text-3xl font-black bg-muted/10 border-border/50 rounded-2xl focus:ring-primary focus:border-primary"
                  />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">
                    Enter Amount
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => handleAdjust(1)}
                  className="h-12 w-12 rounded-xl border-border/50 hover:bg-primary/20"
                >
                  <Plus className="w-6 h-6" />
                </Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => setMethodDialogOpen(true)}
                className="w-full h-14 bg-primary text-white hover:bg-primary/90 font-black text-xl rounded-2xl glow-primary shadow-xl group"
              >
                PROCEED TO TOP-UP <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Comparison Table */}
        <Card className="glass border-border/50 relative overflow-hidden p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="font-headline text-2xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2">
              ⚡ RECHARGE <span className="text-primary">PROTOCOLS</span> COMPARISON
            </CardTitle>
            <CardDescription className="uppercase text-[9px] font-black tracking-widest text-muted-foreground">
              Choose the best method for your campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-white/5">
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground w-[40%]">FEATURE</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-green-500 text-center">⚡ AUTOMATIC</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-blue-400 text-center">📝 MANUAL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { feature: "CREDIT SPEED", auto: "Instant (1-2 Secs)", manual: "5-10 Mins (Up to 2 Hrs)", autoCheck: true, manualCheck: false },
                    { feature: "PROCESS FLOW", auto: "Fully Automated", manual: "Manual Screen Upload", autoCheck: true, manualCheck: false },
                    { feature: "EXTRA CHARGES", auto: "Zero Gateway Fees", manual: "Zero Gateway Fees", autoCheck: true, manualCheck: true },
                    { feature: "CONVENIENCE", auto: "No Screenshot Needed", manual: "Must Upload Proof", autoCheck: true, manualCheck: false },
                    { feature: "BAN RISK ON FAKES", auto: "Zero Risk (Secure)", manual: "High Risk if Fake SS", autoCheck: true, manualCheck: false },
                    { feature: "PAYMENT MODES", auto: "UPI, Cards, NetBanking", manual: "UPI Apps Only", autoCheck: true, manualCheck: false }
                  ].map((row, idx) => (
                    <TableRow key={idx} className="border-white/5 hover:bg-white/[0.01]">
                      <TableCell className="font-bold text-xs text-white uppercase">{row.feature}</TableCell>
                      <TableCell className="text-center font-medium text-xs">
                        <div className="flex items-center gap-1.5 justify-center">
                          {row.autoCheck ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-red-500 shrink-0" />}
                          <span className="text-green-500 font-bold">{row.auto}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-xs">
                        <div className="flex items-center gap-1.5 justify-center">
                          {row.manualCheck ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-red-500 shrink-0" />}
                          <span className="text-muted-foreground font-bold">{row.manual}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Security Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <ShieldCheck className="text-green-600" />, title: "Secure Payouts", desc: "Every transaction is audited via blockchain verified logs." },
            { icon: <AlertCircle className="text-yellow-600" />, title: "Instant Access", desc: "Coins reflect in your vault within 5-10 minutes of approval." },
            { icon: <History className="text-blue-600" />, title: "Transaction Ledger", desc: "Full history of your recharges and arena fees is maintained." }
          ].map((item, i) => (
            <div key={i} className="glass p-6 rounded-2xl border-border/40 flex gap-4">
              <div className="mt-1">{item.icon}</div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-tight">{item.title}</h4>
                <p className="text-xs text-muted-foreground font-medium">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method Dialog */}
      <Dialog open={methodDialogOpen} onOpenChange={setMethodDialogOpen}>
        <DialogContent className="glass border-border/50 max-w-md p-6 rounded-3xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-headline text-2xl font-black italic uppercase text-center">Select <span className="text-primary">Protocol</span></DialogTitle>
            <DialogDescription className="text-center">Choose your preferred gateway for coin acquisition.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!hideManual && (
              <button 
                onClick={() => proceedToPay('manual')}
                className="w-full p-6 rounded-2xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary rounded-xl text-white shadow-lg">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg leading-none mb-1">MANUAL RECHARGE</h4>
                    <p className="text-xs text-muted-foreground font-bold">UPI / QR CODE SCREENSHOT</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-2 transition-transform" />
              </button>
            )}

            {!hideAuto && (
              <button 
                onClick={() => proceedToPay('auto')}
                className="w-full p-6 rounded-2xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary rounded-xl text-white shadow-lg bg-gradient-to-r from-primary to-orange-600 animate-pulse">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg leading-none mb-1 text-white">AUTOMATIC GATEWAY</h4>
                    <p className="text-xs text-muted-foreground font-bold uppercase">INSTANT COIN RECHARGE (RAZORPAY)</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-primary group-hover:translate-x-2 transition-transform" />
              </button>
            )}

            {hideManual && hideAuto && (
              <div className="p-6 text-center bg-white/5 rounded-2xl border border-white/10">
                <p className="font-black text-white">RECHARGES ARE CURRENTLY PAUSED</p>
                <p className="text-xs text-muted-foreground mt-1">Please check back later.</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <p className="text-[10px] text-center w-full text-muted-foreground uppercase font-black tracking-widest">
              Secured by Clash Arena Anti-Fraud AI
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {loading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <Loader2 className="animate-spin text-primary w-16 h-16 mb-4" />
          <p className="font-headline font-black text-xl italic uppercase text-white tracking-widest animate-pulse">
            Processing Transaction...
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2">
            Do not close this window or refresh the page.
          </p>
        </div>
      )}
    </div>
  );
}

export default function WalletPage() {
  return (
    <PageWrapper>
      <Suspense fallback={
        <div className="min-h-screen flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-primary w-16 h-16 mb-4" />
          <p className="font-headline font-black text-xl italic uppercase text-white tracking-widest animate-pulse">
            Loading Vault...
          </p>
        </div>
      }>
        <WalletPageContent />
      </Suspense>
    </PageWrapper>
  );
}