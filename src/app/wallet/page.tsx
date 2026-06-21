'use client';

import { useState, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { useUser } from "@clerk/nextjs";
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

export default function WalletPage() {
  const { user, isLoaded: authLoaded } = useUser();
  const db = useFirestore();
  const router = useRouter();
  
  const userRef = useMemo(() => (authLoaded && user) ? doc(db, 'users', user.id) : null, [db, user?.id, authLoaded]);
  const { data: profile } = useDoc(userRef);

  // Background Image from App Settings
  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);
  const walletBg = bgData?.wallet;

  const [amount, setAmount] = useState<number>(50);
  const [methodDialogOpen, setMethodDialogOpen] = useState(false);

  const templates = [10, 20, 50, 100];

  const handleAdjust = (delta: number) => {
    setAmount(prev => Math.max(1, prev + delta));
  };

  const proceedToPay = (method: 'manual' | 'auto') => {
    if (method === 'manual') {
      router.push(`/wallet/manual-pay?amount=${amount}`);
    }
    setMethodDialogOpen(false);
  };

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        {/* Dynamic Wallet Background */}
        {walletBg && (
          <div className="fixed inset-0 z-0 pointer-events-none">
            <Image src={walletBg} alt="Wallet Background" fill className="object-cover opacity-40 saturate-150" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background" />
            <div className="absolute inset-0 backdrop-blur-[2px]" />
          </div>
        )}

        <div className="relative z-10 max-w-4xl mx-auto space-y-8 pb-20">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h1 className="font-headline text-4xl font-black mb-2 tracking-tight uppercase italic">
                COIN <span className="text-primary">VAULT</span>
              </h1>
              <p className="text-muted-foreground font-medium">Recharge your balance to enter high-stakes arenas.</p>
            </div>
            <Link href="/wallet/history">
              <Button variant="outline" className="border-white/10 glass font-bold gap-2 h-12 rounded-xl">
                <History className="w-4 h-4 text-primary" /> VIEW HISTORY
              </Button>
            </Link>
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
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-headline font-black text-white">🪙 {profile?.balance || 0}</span>
                </div>
                <p className="text-[10px] font-bold text-primary uppercase mt-4 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Secure Wallet Enabled
                </p>
              </CardContent>
            </Card>

            {/* Recharge UI Card */}
            <Card className="md:col-span-2 glass border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-primary" />
              <CardHeader>
                <CardTitle className="font-headline text-xl font-bold uppercase tracking-tighter">Quick Top-up</CardTitle>
                <CardDescription>Select a pack or enter a custom amount (1 Coin = 1 ₹)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Templates */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {templates.map((t) => (
                    <button
                      key={t}
                      onClick={() => setAmount(t)}
                      className={`relative p-4 rounded-2xl border-2 transition-all font-black text-lg ${
                        amount === t 
                          ? 'bg-primary/20 border-primary text-primary glow-primary' 
                          : 'bg-white/5 border-white/5 text-muted-foreground hover:border-white/20'
                      }`}
                    >
                      🪙 {t}
                      {t === 50 && (
                        <Badge className="absolute -top-2 -right-2 bg-purple-600 text-[8px] font-black uppercase">RECOMMENDED</Badge>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Input */}
                <div className="flex items-center justify-center gap-6">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleAdjust(-1)}
                    className="h-12 w-12 rounded-xl border-white/10 hover:bg-primary/20"
                  >
                    <Minus className="w-6 h-6" />
                  </Button>
                  
                  <div className="relative group">
                    <Input 
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="h-20 w-40 text-center text-3xl font-black bg-white/5 border-white/10 rounded-2xl focus:ring-primary focus:border-primary"
                    />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-background px-2 text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-focus-within:opacity-100 transition-opacity">
                      Enter Amount
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleAdjust(1)}
                    className="h-12 w-12 rounded-xl border-white/10 hover:bg-primary/20"
                  >
                    <Plus className="w-6 h-6" />
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => setMethodDialogOpen(true)}
                  className="w-full h-14 bg-primary hover:bg-primary/90 font-black text-xl rounded-2xl glow-primary shadow-xl group"
                >
                  PROCEED TO TOP-UP <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Security Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <ShieldCheck className="text-green-500" />, title: "Secure Payouts", desc: "Every transaction is audited via blockchain verified logs." },
              { icon: <AlertCircle className="text-yellow-500" />, title: "Instant Access", desc: "Coins reflect in your vault within 5-10 minutes of approval." },
              { icon: <History className="text-blue-500" />, title: "Transaction Ledger", desc: "Full history of your recharges and arena fees is maintained." }
            ].map((item, i) => (
              <div key={i} className="glass p-6 rounded-2xl border-white/5 flex gap-4">
                <div className="mt-1">{item.icon}</div>
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-tight">{item.title}</h4>
                  <p className="text-xs text-muted-foreground font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Method Dialog */}
      <Dialog open={methodDialogOpen} onOpenChange={setMethodDialogOpen}>
        <DialogContent className="glass border-white/10 max-w-md p-6 rounded-3xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-headline text-2xl font-black italic uppercase text-center">Select <span className="text-primary">Protocol</span></DialogTitle>
            <DialogDescription className="text-center">Choose your preferred gateway for coin acquisition.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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

            <div className="relative opacity-60 pointer-events-none">
              <button className="w-full p-6 rounded-2xl border-2 border-white/5 bg-white/5 text-left flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-muted rounded-xl text-muted-foreground">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg leading-none mb-1">AUTOMATIC GATEWAY</h4>
                    <p className="text-xs text-muted-foreground font-bold italic">COMING SOON (RAZORPAY)</p>
                  </div>
                </div>
              </button>
              <Badge variant="secondary" className="absolute -top-2 -right-2 font-black">LEGACY</Badge>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <p className="text-[10px] text-center w-full text-muted-foreground uppercase font-black tracking-widest">
              Secured by Clash Arena Anti-Fraud AI
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
