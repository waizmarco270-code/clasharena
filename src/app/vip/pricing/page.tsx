'use client';

import { useState, useMemo } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUser } from '@clerk/nextjs';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Loader2, Crown, Star, Zap, Shield, Sparkles, CheckCircle2, Ticket, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function PricingPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [methodDialogOpen, setMethodDialogOpen] = useState(false);
  const [selectedPass, setSelectedPass] = useState<{ id: string, name: string, price: number } | null>(null);

  const stockRef = useMemo(() => doc(db, 'app-settings', 'avp-stock'), [db]);
  const { data: stockData } = useDoc(stockRef);

  const settingsRef = useMemo(() => doc(db, 'app-settings', 'payment'), [db]);
  const { data: paymentSettings } = useDoc(settingsRef);
  const hideManual = paymentSettings?.hideManual === true;
  const hideAuto = paymentSettings?.hideAuto === true;

  const monthlyStock = stockData?.monthlyOfferStock ?? 10;
  const permanentStock = stockData?.permanentStock ?? 5;

  const handleSelectPass = (passId: string, name: string, price: number, stockCheck?: number) => {
    if (stockCheck !== undefined && stockCheck <= 0) {
      toast({ title: "SOLD OUT", description: "This exclusive offer is no longer available.", variant: "destructive" });
      return;
    }
    setSelectedPass({ id: passId, name, price });
    setMethodDialogOpen(true);
  };

  const handlePaymentSubmit = async (method: 'manual' | 'auto') => {
    if (!selectedPass) return;
    
    if (method === 'manual') {
      router.push(`/vip/manual-pay?vipType=${selectedPass.id}&price=${selectedPass.price}`);
      setMethodDialogOpen(false);
      return;
    }

    setLoading(true);
    setMethodDialogOpen(false);

    try {
      const res = await fetch('/api/recharge/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: selectedPass.price, 
          userId: user?.id, 
          paymentType: 'vip_pass',
          ticketType: selectedPass.id, // we overload ticketType to carry vipType
          currency: 'inr' 
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const orderId = data.orderId;
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey) throw new Error("Razorpay Key missing");

      const options = {
        key: razorpayKey,
        amount: selectedPass.price * 100,
        currency: "INR",
        name: "Clash Arena",
        description: `Arena VIP Pass: ${selectedPass.name}`,
        order_id: orderId,
        callback_url: `${window.location.origin}/api/recharge/verify-payment-redirect`,
        redirect: true,
        prefill: {
          name: user?.firstName || 'Warrior',
          email: user?.emailAddresses?.[0]?.emailAddress || ''
        },
        theme: { color: "#f97316" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Payment Failed", description: err.message });
      setLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-12 pb-20">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full mb-4 border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
            <Crown className="w-12 h-12 text-yellow-500 animate-pulse" />
          </div>
          <h1 className="font-headline text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-red-500 drop-shadow-xl">
            ARENA <span className="text-white">VIP PASS</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-lg">
            Unlock legendary rewards, exclusive lounge access, rainbow avatars, and massive ticket value. The ultimate way to conquer the Arena.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
          
          {/* WEEKLY PASS */}
          <Card className="glass border-white/10 hover:border-blue-500/50 transition-all p-8 relative flex flex-col h-full rounded-[2rem]">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
               Quick Boost
             </div>
             <div className="text-center mb-8">
                <h3 className="text-2xl font-black uppercase tracking-widest text-blue-400 mb-2">Weekly Pass</h3>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xl text-muted-foreground font-bold">₹</span>
                  <span className="text-5xl font-black text-white tracking-tighter">69</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">For 7 Days</p>
             </div>
             <div className="space-y-4 flex-1">
                {[
                  '10 Coins Daily (70 Total)',
                  'Instant 1x Bronze Ticket',
                  'Day 7 Bonus: 1 Silver Ticket',
                  'Day 7 Bonus: 30 Coins',
                  'Total Value: 249+ Coins'
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-medium text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
             </div>
             <Button onClick={() => handleSelectPass('weekly', 'Weekly Pass', 69)} className="w-full mt-8 bg-blue-600 hover:bg-blue-700 h-14 rounded-xl font-black uppercase tracking-widest shadow-xl">
               Get Weekly
             </Button>
          </Card>

          {/* MONTHLY PASS (MAIN) */}
          <Card className="glass border-orange-500 hover:border-orange-400 transition-all p-8 relative flex flex-col h-[105%] rounded-[2rem] shadow-[0_0_50px_rgba(249,115,22,0.15)] z-10 transform md:-translate-y-4">
             <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 to-transparent rounded-[2rem] pointer-events-none" />
             <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-lg animate-pulse whitespace-nowrap">
               Most Legendary Value
             </div>
             <div className="text-center mb-8 relative z-10">
                <h3 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">Monthly Pass</h3>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl text-muted-foreground line-through decoration-red-500/50 decoration-4">₹499</span>
                  <div className="flex items-start">
                    <span className="text-2xl text-orange-400 font-bold mt-1">₹</span>
                    <span className="text-6xl font-black text-white tracking-tighter drop-shadow-xl">199</span>
                  </div>
                </div>
                <p className="text-xs text-orange-400 mt-2 font-black uppercase tracking-widest">
                  {monthlyStock > 0 ? `Launch Offer: Only ${monthlyStock} Left!` : 'Launch Offer Sold Out'}
                </p>
             </div>
             <div className="space-y-4 flex-1 relative z-10">
                {[
                  '10 Coins Daily (300 Total)',
                  'Week 1: 2x Bronze Tickets',
                  'Week 2: 2x Silver Tickets',
                  'Week 3: 1x Golden Ticket',
                  'Week 4 Bundle: Bronze+Silver+Gold',
                  'Bonus: +100 Coins at end',
                  'Total Value: ₹667 for just ₹199 💀'
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-bold text-white">
                    <Zap className="w-5 h-5 text-orange-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
             </div>
             <Button 
               onClick={() => handleSelectPass('monthly', 'Monthly Pass', monthlyStock > 0 ? 199 : 499)} 
               className="w-full mt-8 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 h-16 rounded-2xl font-black uppercase text-lg tracking-[0.2em] shadow-[0_0_20px_rgba(249,115,22,0.4)] relative z-10 border border-white/20 glow-primary"
             >
               {monthlyStock > 0 ? 'Claim Launch Offer' : 'Get Monthly (₹499)'}
             </Button>
          </Card>

          {/* PERMANENT ELITE PASS */}
          <Card className="glass border-white/10 hover:border-purple-500/50 transition-all p-8 relative flex flex-col h-full rounded-[2rem]">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg whitespace-nowrap">
               True Elite Only
             </div>
             <div className="text-center mb-8">
                <h3 className="text-2xl font-black uppercase tracking-widest text-purple-400 mb-2">Permanent</h3>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xl text-muted-foreground font-bold">₹</span>
                  <span className="text-5xl font-black text-white tracking-tighter">399</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 uppercase tracking-widest">
                  {permanentStock > 0 ? `Stock: ${permanentStock}/5 Remaining` : 'Coming Soon'}
                </p>
             </div>
             <div className="space-y-4 flex-1">
                {[
                  'Permanent VIP Lounge Access',
                  'Permanent Rainbow Glow Avatar',
                  'Permanent VIP Profile Badge',
                  'Elite Community Chat Access',
                  'Unlimited VIP Flex'
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-medium text-gray-300">
                    <Star className="w-5 h-5 text-purple-500 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
             </div>
             <Button 
               onClick={() => handleSelectPass('permanent', 'Permanent Elite', 399, permanentStock)}
               disabled={permanentStock <= 0} 
               className="w-full mt-8 bg-purple-600 hover:bg-purple-700 h-14 rounded-xl font-black uppercase tracking-widest shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {permanentStock > 0 ? 'Get Permanent' : 'Sold Out'}
             </Button>
          </Card>

        </div>

        {/* Universal Features */}
        <div className="mt-16 pt-16 border-t border-white/10">
          <h2 className="text-3xl font-headline font-black text-center uppercase tracking-widest mb-12">Universal VIP Perks</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <Crown className="w-8 h-8 text-yellow-500" />
                </div>
                <h4 className="font-bold uppercase text-lg text-white">Rainbow VIP Avatar</h4>
                <p className="text-sm text-muted-foreground">Stand out in the Hall of Champions, Leaderboards, and Chat with a legendary animated rainbow glow.</p>
             </div>
             <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <MessageSquare className="w-8 h-8 text-green-500" />
                </div>
                <h4 className="font-bold uppercase text-lg text-white">Elite Community</h4>
                <p className="text-sm text-muted-foreground">Access the WhatsApp-styled ultra-clean VIP Community chat room. Engage with top-tier players.</p>
             </div>
             <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <Shield className="w-8 h-8 text-blue-500" />
                </div>
                <h4 className="font-bold uppercase text-lg text-white">VIP Lounge Access</h4>
                <p className="text-sm text-muted-foreground">Enter the restricted VIP Lounge from your dashboard to claim your massive daily and weekly ROI.</p>
             </div>
          </div>
        </div>
      </div>

      <Dialog open={methodDialogOpen} onOpenChange={setMethodDialogOpen}>
        <DialogContent className="glass border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl font-black uppercase italic tracking-wider text-center">
              SELECT PAYMENT METHOD
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             {!hideAuto && (
               <Button onClick={() => handlePaymentSubmit('auto')} disabled={loading} className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xl rounded-2xl shadow-xl flex items-center justify-center gap-3 group relative overflow-hidden">
                 {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                   <>
                     <span className="relative z-10">PAY AUTOMATIC (RAZORPAY)</span>
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                   </>
                 )}
               </Button>
             )}
             
             {!hideManual && (
               <Button onClick={() => handlePaymentSubmit('manual')} disabled={loading} className="w-full h-16 bg-white hover:bg-gray-200 text-black font-black uppercase text-xl rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-colors">
                 MANUAL UPI TRANSFER
               </Button>
             )}

             {hideManual && hideAuto && (
               <p className="text-center text-red-500 font-bold uppercase p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                 ALL PAYMENT GATEWAYS ARE CURRENTLY DOWN FOR MAINTENANCE.
               </p>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
