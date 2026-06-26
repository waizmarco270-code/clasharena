'use client';

import { useMemo, useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  ChevronLeft, 
  Coins, 
  IndianRupee, 
  Percent, 
  Layers, 
  Calendar, 
  User, 
  CheckCircle2, 
  Loader2, 
  CreditCard 
} from 'lucide-react';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { default as NextLink } from 'next/link';
import { format } from 'date-fns';
import { useUser, useAuth } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import Script from 'next/script';

export default function WalletAnalyticsPage() {
  const { user } = useUser();
  const { userId } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const [payingCost, setPayingCost] = useState(false);

  // Load all APPROVED recharge requests to calculate revenue
  const rechargeQuery = useMemo(() => query(
    collection(db, 'recharge-requests'),
    where('status', '==', 'approved')
  ), [db]);
  const { data: approvedRequests, loading: loadingRequests } = useCollection(rechargeQuery);

  // Load paid website cost from app settings
  const analyticsDocRef = useMemo(() => doc(db, 'app-settings', 'wallet-analytics'), [db]);
  const { data: analyticsSettings, loading: loadingSettings } = useDoc(analyticsDocRef);

  const loading = loadingRequests || loadingSettings;

  // Calculate calculations
  const totalRevenue = useMemo(() => {
    if (!approvedRequests) return 0;
    return approvedRequests.reduce((acc, curr) => acc + (Number(curr.cashAmount || curr.amount) || 0), 0);
  }, [approvedRequests]);

  const paidWebsiteCost = analyticsSettings?.paidWebsiteCost || 0;

  // Revenue Splits: 60% Winners, 15% Nadozaid, 15% clashers, 10% Website
  const splits = useMemo(() => {
    const winnersPool = totalRevenue * 0.60;
    const nadozaidProfit = totalRevenue * 0.15;
    const clashersProfit = totalRevenue * 0.15;
    const websiteCostAccumulated = totalRevenue * 0.10;
    const unpaidWebsiteCost = Math.max(0, websiteCostAccumulated - paidWebsiteCost);

    return {
      winnersPool,
      nadozaidProfit,
      clashersProfit,
      websiteCostAccumulated,
      unpaidWebsiteCost
    };
  }, [totalRevenue, paidWebsiteCost]);

  // Groupings: Daily, Weekly, Monthly
  const dailyEarnings = useMemo(() => {
    if (!approvedRequests) return [];
    const groups: { [key: string]: number } = {};
    approvedRequests.forEach(req => {
      if (!req.createdAt) return;
      const key = format(new Date(req.createdAt), 'EEEE, MMMM dd, yyyy');
      groups[key] = (groups[key] || 0) + (Number(req.cashAmount || req.amount) || 0);
    });
    return Object.keys(groups).map(day => ({
      date: day,
      revenue: groups[day],
      splits: {
        winners: groups[day] * 0.60,
        nadozaid: groups[day] * 0.15,
        clashers: groups[day] * 0.15,
        website: groups[day] * 0.10
      }
    }));
  }, [approvedRequests]);

  const weeklyEarnings = useMemo(() => {
    if (!approvedRequests) return [];
    
    const getWeekKey = (dateStr: string) => {
      const d = new Date(dateStr);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const groups: { [key: string]: number } = {};
    approvedRequests.forEach(req => {
      if (!req.createdAt) return;
      const key = getWeekKey(req.createdAt);
      groups[key] = (groups[key] || 0) + (Number(req.cashAmount || req.amount) || 0);
    });

    return Object.keys(groups).map(week => ({
      weekRange: week,
      revenue: groups[week],
      splits: {
        winners: groups[week] * 0.60,
        nadozaid: groups[week] * 0.15,
        clashers: groups[week] * 0.15,
        website: groups[week] * 0.10
      }
    }));
  }, [approvedRequests]);

  const monthlyEarnings = useMemo(() => {
    if (!approvedRequests) return [];
    const groups: { [key: string]: number } = {};
    approvedRequests.forEach(req => {
      if (!req.createdAt) return;
      const key = format(new Date(req.createdAt), 'MMMM yyyy');
      groups[key] = (groups[key] || 0) + (Number(req.cashAmount || req.amount) || 0);
    });
    return Object.keys(groups).map(month => ({
      month,
      revenue: groups[month],
      splits: {
        winners: groups[month] * 0.60,
        nadozaid: groups[month] * 0.15,
        clashers: groups[month] * 0.15,
        website: groups[month] * 0.10
      }
    }));
  }, [approvedRequests]);

  // Razorpay Pay Website cost handler
  const handlePayWebsiteCost = async () => {
    const amountToPay = Math.round(splits.unpaidWebsiteCost);
    if (amountToPay <= 0 || payingCost || !userId) return;
    setPayingCost(true);
    try {
      // 1. Create order on backend
      const res = await fetch('/api/recharge/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountToPay, userId })
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

      // 2. Load script & open Razorpay modal
      const options = {
        key: razorpayKey,
        amount: amountToPay * 100,
        currency: "INR",
        name: "Clash Arena",
        description: `Pay Website Infrastructure Cost`,
        order_id: orderId,
        handler: async function (response: any) {
          // Increment paidWebsiteCost settings in Firestore on successful callback
          await setDoc(analyticsDocRef, {
            paidWebsiteCost: increment(amountToPay)
          }, { merge: true });
          
          toast({ title: "WEBSITE INFRASTRUCTURE PAID", description: `Successfully paid ₹ ${amountToPay} via Razorpay.` });
          setPayingCost(false);
          // Small timeout to allow reload
          setTimeout(() => window.location.reload(), 1500);
        },
        prefill: {
          name: user?.username || 'Admin',
          email: user?.emailAddresses?.[0]?.emailAddress || ''
        },
        theme: {
          color: "#ea580c"
        },
        modal: {
          ondismiss: function() {
            setPayingCost(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: err.message || "Failed to initialize cost payment."
      });
      setPayingCost(false);
    }
  };

  return (
    <PageWrapper>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <NextLink href="/admin/wallets" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-2">
              <ChevronLeft className="w-4 h-4" /> Back to Wallet Logs
            </NextLink>
            <h1 className="font-headline text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
              <TrendingUp className="text-primary" /> REVENUE & SPLIT <span className="text-primary">ANALYTICS</span>
            </h1>
            <p className="text-muted-foreground text-sm font-medium">Verify split distribution and pay infrastructure costs.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Generating financial data...</p>
          </div>
        ) : (
          <>
            {/* 📈 REVENUE SPLIT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="glass border-white/5 bg-black/40 overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-40" />
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Total App Revenue</p>
                    <p className="text-2xl font-headline font-black text-white">₹ {totalRevenue}</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold mt-1">Based on approved recharges</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                    <IndianRupee className="w-6 h-6 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-white/5 bg-black/40 overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-40" />
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Winners Rewards Pool (60%)</p>
                    <p className="text-2xl font-headline font-black text-white">₹ {splits.winnersPool.toFixed(2)}</p>
                    <p className="text-[9px] text-amber-500 uppercase font-bold mt-1">Reserved for payouts</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                    <Coins className="w-6 h-6 text-amber-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass border-white/5 bg-black/40 overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-40" />
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Server Cost Accumulated (10%)</p>
                    <p className="text-2xl font-headline font-black text-white">₹ {splits.websiteCostAccumulated.toFixed(2)}</p>
                    <p className="text-[9px] text-red-400 uppercase font-bold mt-1">Paid: ₹{paidWebsiteCost} • Unpaid: ₹{splits.unpaidWebsiteCost.toFixed(0)}</p>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <Layers className="w-6 h-6 text-red-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 🛠️ WEBSITE COST DEBT PAYMENT CARD */}
            <Card className="glass border-white/5 bg-black/20 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-600 via-orange-500 to-transparent" />
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <CreditCard className="text-primary w-4 h-4" /> Unpaid Website Infrastructure Cost
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 uppercase font-bold">
                    This balance accumulates from the 10% platform share. Pay this down to clear the server cost debt back to zero.
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[8px] font-black uppercase text-muted-foreground block">Net Due</span>
                    <span className="text-xl font-headline font-black text-primary">₹ {Math.round(splits.unpaidWebsiteCost)}</span>
                  </div>
                  <Button 
                    onClick={handlePayWebsiteCost} 
                    disabled={splits.unpaidWebsiteCost < 1 || payingCost} 
                    className="h-12 bg-red-600 hover:bg-red-700 text-white font-black uppercase rounded-xl px-6 glow-primary shrink-0"
                  >
                    {payingCost ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <IndianRupee className="mr-2 w-4 h-4" />}
                    PAY WEBSITE COST
                  </Button>
                </div>
              </div>
            </Card>

            {/* ⚖️ ADMINS REVENUE SPLIT DETAILS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass border-white/5 bg-black/40">
                <CardHeader className="bg-white/5 border-b border-white/5">
                  <CardTitle className="font-headline text-base flex items-center gap-2 uppercase tracking-wide">
                    <User className="text-primary w-4 h-4" /> ADMIN SHARE (15% EACH)
                  </CardTitle>
                  <CardDescription>Profit distribution between administrators.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                    <div>
                      <p className="text-sm font-black uppercase text-white">Nadozaid</p>
                      <p className="text-[10px] text-emerald-400 uppercase font-black mt-0.5">15% Distribution Share</p>
                    </div>
                    <span className="text-lg font-headline font-black text-white">₹ {splits.nadozaidProfit.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                    <div>
                      <p className="text-sm font-black uppercase text-white">clashers</p>
                      <p className="text-[10px] text-emerald-400 uppercase font-black mt-0.5">15% Distribution Share</p>
                    </div>
                    <span className="text-lg font-headline font-black text-white">₹ {splits.clashersProfit.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* REVENUE DISTRIBUTION PERCENTAGES */}
              <Card className="glass border-white/5 bg-black/40">
                <CardHeader className="bg-white/5 border-b border-white/5">
                  <CardTitle className="font-headline text-base flex items-center gap-2 uppercase tracking-wide">
                    <Percent className="text-primary w-4 h-4" /> DISTRIBUTION RATIOS
                  </CardTitle>
                  <CardDescription>Fixed percentage revenue model splits.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase text-white">
                      <span>Winners pool share</span>
                      <span className="text-amber-500">60%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: '60%' }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase text-white">
                      <span>Admins Share (15% x 2)</span>
                      <span className="text-emerald-500">30%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '30%' }} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase text-white">
                      <span>Website infra share</span>
                      <span className="text-red-500">10%</span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600" style={{ width: '10%' }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 📅 PERIODIC REVENUE REPORT */}
            <Card className="glass border-white/5 bg-black/40">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="font-headline text-base flex items-center gap-2 uppercase tracking-wide">
                  <Calendar className="text-primary w-4 h-4" /> EARNINGS RECORDS BY PERIOD
                </CardTitle>
                <CardDescription>Periodic splits calculated daily, weekly, and monthly.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs defaultValue="daily" className="w-full">
                  <TabsList className="bg-white/5 border border-white/10 p-1 w-full max-w-sm flex rounded-xl">
                    <TabsTrigger value="daily" className="flex-1 text-xs font-black uppercase">Daily</TabsTrigger>
                    <TabsTrigger value="weekly" className="flex-1 text-xs font-black uppercase">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly" className="flex-1 text-xs font-black uppercase">Monthly</TabsTrigger>
                  </TabsList>

                  <TabsContent value="daily" className="mt-6">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Date & Day Detail</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Total Revenue</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Winners (60%)</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Admins (30%)</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Web Share (10%)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailyEarnings.map((day, i) => (
                            <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                              <TableCell className="font-bold text-xs text-white uppercase">{day.date}</TableCell>
                              <TableCell className="text-right font-headline font-black text-white">₹ {day.revenue.toFixed(0)}</TableCell>
                              <TableCell className="text-right text-amber-500 font-bold text-xs">₹ {day.splits.winners.toFixed(0)}</TableCell>
                              <TableCell className="text-right text-emerald-400 font-bold text-xs">₹ {(day.splits.nadozaid + day.splits.clashers).toFixed(0)}</TableCell>
                              <TableCell className="text-right text-red-400 font-bold text-xs">₹ {day.splits.website.toFixed(0)}</TableCell>
                            </TableRow>
                          ))}
                          {dailyEarnings.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground uppercase text-[10px] font-black">No approved payments found.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="weekly" className="mt-6">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Week Range</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Total Revenue</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Winners (60%)</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Admins (30%)</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Web Share (10%)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {weeklyEarnings.map((week, i) => (
                            <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                              <TableCell className="font-bold text-xs text-white uppercase">{week.weekRange}</TableCell>
                              <TableCell className="text-right font-headline font-black text-white">₹ {week.revenue.toFixed(0)}</TableCell>
                              <TableCell className="text-right text-amber-500 font-bold text-xs">₹ {week.splits.winners.toFixed(0)}</TableCell>
                              <TableCell className="text-right text-emerald-400 font-bold text-xs">₹ {(week.splits.nadozaid + week.splits.clashers).toFixed(0)}</TableCell>
                              <TableCell className="text-right text-red-400 font-bold text-xs">₹ {week.splits.website.toFixed(0)}</TableCell>
                            </TableRow>
                          ))}
                          {weeklyEarnings.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground uppercase text-[10px] font-black">No approved payments found.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="monthly" className="mt-6">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Month</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Total Revenue</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Winners (60%)</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Admins (30%)</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Web Share (10%)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {monthlyEarnings.map((month, i) => (
                            <TableRow key={i} className="border-white/5 hover:bg-white/5 transition-colors">
                              <TableCell className="font-bold text-xs text-white uppercase">{month.month}</TableCell>
                              <TableCell className="text-right font-headline font-black text-white">₹ {month.revenue.toFixed(0)}</TableCell>
                              <TableCell className="text-right text-amber-500 font-bold text-xs">₹ {month.splits.winners.toFixed(0)}</TableCell>
                              <TableCell className="text-right text-emerald-400 font-bold text-xs">₹ {(month.splits.nadozaid + month.splits.clashers).toFixed(0)}</TableCell>
                              <TableCell className="text-right text-red-400 font-bold text-xs">₹ {month.splits.website.toFixed(0)}</TableCell>
                            </TableRow>
                          ))}
                          {monthlyEarnings.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground uppercase text-[10px] font-black">No approved payments found.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageWrapper>
  );
}
