'use client';

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Ticket, Crown, Loader2, Zap, ShieldCheck } from 'lucide-react';
import { useFirestore, useProfile } from '@/firebase';
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/nextjs';

export default function TicketVaultPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();
  const { profile } = useProfile();
  
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  
  const [tickets, setTickets] = useState<{ [key: string]: any }>({
    bronze: null, silver: null, golden: null
  });

  useEffect(() => {
    // Realtime listener for stock
    const unsubBronze = onSnapshot(doc(db, 'tickets', 'bronze'), (doc) => {
      setTickets(prev => ({ ...prev, bronze: doc.exists() ? doc.data() : null }));
    });
    const unsubSilver = onSnapshot(doc(db, 'tickets', 'silver'), (doc) => {
      setTickets(prev => ({ ...prev, silver: doc.exists() ? doc.data() : null }));
    });
    const unsubGolden = onSnapshot(doc(db, 'tickets', 'golden'), (doc) => {
      setTickets(prev => ({ ...prev, golden: doc.exists() ? doc.data() : null }));
      setLoading(false);
    });

    return () => {
      unsubBronze();
      unsubSilver();
      unsubGolden();
    };
  }, [db]);

  useEffect(() => {
    // Load Razorpay script if not already loaded globally
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
    
    // Check URL params for payment success/fallback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      const type = urlParams.get('type');
      toast({
        title: "TICKET SECURED!",
        description: `Your ${type?.toUpperCase()} Ticket is now in your inventory.`,
      });
      window.history.replaceState({}, '', '/tickets');
    } else if (urlParams.get('payment') === 'fallback') {
       toast({
        variant: "destructive",
        title: "OUT OF STOCK",
        description: `The ticket sold out during purchase! We refunded you 🪙 ${urlParams.get('amount')} Coins to your wallet.`,
      });
      window.history.replaceState({}, '', '/tickets');
    }
  }, [toast]);

  const buyTicket = async (type: string, price: number) => {
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Auth Required', description: 'Please login first.' });
      return;
    }

    const t = tickets[type];
    if (!t || t.stock <= 0 || !t.isActive) {
      toast({ variant: 'destructive', title: 'Unavailable', description: 'This ticket is currently unavailable or out of stock.' });
      return;
    }

    setBuying(type);
    try {
      const res = await fetch('/api/recharge/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: price, 
          userId: user.id, 
          paymentType: 'ticket_purchase',
          ticketType: type
        })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey) throw new Error("Razorpay Key ID is not configured");

      const options = {
        key: razorpayKey,
        amount: price * 100,
        currency: "INR",
        name: "Clash Arena",
        description: `${type.toUpperCase()} Ticket`,
        order_id: data.orderId,
        callback_url: `${window.location.origin}/api/recharge/verify-payment-redirect`,
        redirect: true,
        prefill: {
          name: profile?.username || user?.firstName || 'Warrior',
          email: user?.emailAddresses?.[0]?.emailAddress || ''
        },
        theme: { color: "#FF4500" },
        modal: {
          ondismiss: function() {
            setBuying(null);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Payment Failed', description: e.message });
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  const renderTicket = (type: string, title: string, color: string, icon: any, desc: string, perks: string[]) => {
    const t = tickets[type];
    const Icon = icon;
    
    // Check stock status
    const isSoldOut = !t || t.stock <= 0;
    const isInactive = !t || !t.isActive;
    const canBuy = !isSoldOut && !isInactive;

    return (
      <Card className="glass relative overflow-hidden group border-white/5 hover:border-white/20 transition-colors">
        <div className={`absolute -top-20 -right-20 w-48 h-48 bg-${color}-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-${color}-500/20 transition-all`} />
        
        <CardContent className="p-6 md:p-8 flex flex-col h-full z-10 relative">
          <div className="flex justify-between items-start mb-6">
            <div className={`p-4 bg-${color}-500/10 rounded-2xl border border-${color}-500/20`}>
              <Icon className={`w-8 h-8 text-${color}-400`} />
            </div>
            
            {canBuy ? (
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Live Stock</p>
                <div className={`px-3 py-1 rounded-full bg-${color}-500/20 text-${color}-400 font-black text-sm animate-pulse inline-block border border-${color}-500/30`}>
                  {t.stock} LEFT
                </div>
              </div>
            ) : (
              <div className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 font-black text-[10px] uppercase tracking-widest border border-red-500/20">
                {isInactive ? 'Disabled' : 'Sold Out'}
              </div>
            )}
          </div>

          <div className="space-y-2 mb-8">
            <h2 className={`font-headline text-3xl font-black uppercase tracking-tighter text-${color}-400`}>{title} TICKET</h2>
            <p className="text-sm font-medium text-muted-foreground">{desc}</p>
          </div>

          <div className="space-y-3 flex-grow mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Exclusive Perks</p>
            {perks.map((perk, i) => (
              <div key={i} className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <ShieldCheck className={`w-4 h-4 text-${color}-400 shrink-0 mt-0.5`} />
                <span className="text-xs font-bold text-white/90">{perk}</span>
              </div>
            ))}
          </div>

          <Button 
            onClick={() => buyTicket(type, t?.price || 0)} 
            disabled={!canBuy || buying !== null}
            className={`w-full h-14 bg-${color}-600 hover:bg-${color}-700 text-white font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(0,0,0,0)] hover:shadow-[0_0_30px_var(--tw-shadow-color)] shadow-${color}-500/20 transition-all`}
          >
            {buying === type ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              canBuy ? (
                <>SECURE NOW FOR ₹{t?.price || 0} <Zap className="w-4 h-4 ml-2" /></>
              ) : 'UNAVAILABLE'
            )}
          </Button>

          {/* Owned Status */}
          {(profile?.inventory as any)?.[`${type}Tickets`] > 0 && (
            <p className="text-center text-[10px] font-black uppercase text-green-500 mt-4 tracking-widest">
              You own {(profile?.inventory as any)[`${type}Tickets`]} of these
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black uppercase text-[10px] tracking-widest mb-4">
            <Crown className="w-4 h-4" /> Limited Edition Stock
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-black uppercase italic tracking-tighter">
            THE TICKET <span className="text-amber-500">VAULT</span>
          </h1>
          <p className="text-muted-foreground font-medium max-w-2xl mx-auto">
            Acquire premium Arena Tickets to bypass coin fees, secure your spot in high-stakes tournaments, and dominate the leaderboards. Stock is highly limited.
          </p>
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {renderTicket('bronze', 'Bronze', 'amber', Ticket, 
            'The starter pass for rising warriors.', 
            ['Free Entry for tournaments up to 80 Coins', 'Bypass coin deduction', 'Stacks infinitely in your inventory']
          )}
          
          {renderTicket('silver', 'Silver', 'slate', Ticket, 
            'The veteran pass for serious competitors.', 
            ['Free Entry for tournaments up to 199 Coins', 'Instant priority registration', 'Displays a Silver badge in lobbies']
          )}
          
          {renderTicket('golden', 'Golden', 'yellow', Crown, 
            'The ultimate VIP pass. True Elite status.', 
            ['Free Entry to ANY tournament (No Limit)', '100% Refund if you reach the Semifinals', 'Glowing Golden Name in Lobbies']
          )}
        </div>

      </div>
    </PageWrapper>
  );
}
