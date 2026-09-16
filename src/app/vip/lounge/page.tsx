'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { useFirestore, useDoc, useAdminStatus } from '@/firebase';
import { doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Loader2, Zap, Gift, Calendar, CheckCircle2, Crown, ShieldCheck } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const VIPChat = dynamic(() => import('@/components/chat/VIPChat'), { ssr: false });

export default function VIPLoungePage() {
  const { user, isLoaded } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { isAdmin } = useAdminStatus();

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [user, db]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const [claimingDaily, setClaimingDaily] = useState(false);
  const [claimingWeekly, setClaimingWeekly] = useState<string | null>(null);
  const [dailyCooldown, setDailyCooldown] = useState<string | null>(null);

  useEffect(() => {
    if (!profileLoading && profile) {
      if (!profile.isVip && !isAdmin) {
        toast({ variant: 'destructive', title: 'ACCESS DENIED', description: 'This section is restricted to VIP members.' });
        router.push('/vip/pricing');
      }
    }
  }, [profile, isAdmin, profileLoading, router]);

  useEffect(() => {
    if (!profile?.lastDailyClaim) {
      setDailyCooldown(null);
      return;
    }
    const updateCooldown = () => {
      const lastClaim = profile.lastDailyClaim.toDate();
      const now = new Date();
      const diff = now.getTime() - lastClaim.getTime();
      const remaining = (24 * 60 * 60 * 1000) - diff;

      if (remaining <= 0) {
        setDailyCooldown(null);
      } else {
        const h = Math.floor(remaining / (1000 * 60 * 60));
        const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        setDailyCooldown(`${h}h ${m}m`);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 60000);
    return () => clearInterval(interval);
  }, [profile?.lastDailyClaim]);

  const handleDailyClaim = async () => {
    if (claimingDaily) return;
    setClaimingDaily(true);
    try {
      const res = await fetch('/api/vip/claim-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: 'REWARD CLAIMED', description: '+10 Arena Coins added to your wallet!' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Claim Failed', description: e.message });
    } finally {
      setClaimingDaily(false);
    }
  };

  const handleWeeklyClaim = async (id: string) => {
    if (claimingWeekly) return;
    setClaimingWeekly(id);
    try {
      const res = await fetch('/api/vip/claim-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, weekOrDayId: id })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ title: 'REWARD CLAIMED', description: data.message });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Claim Failed', description: e.message });
    } finally {
      setClaimingWeekly(null);
    }
  };

  if (profileLoading || !isLoaded) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary" /></div>;

  if (!profile?.isVip && !isAdmin) return null; // Redirecting anyway

  const vipType = profile?.vipType || 'monthly';
  const claims = profile?.weeklyClaims || {};

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto space-y-12 pb-20 pt-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 p-8 rounded-3xl border border-yellow-500/30 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 bg-yellow-500/20 rounded-bl-3xl border-l border-b border-yellow-500/30 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-yellow-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Secure Environment</span>
           </div>
           
           <div className="flex items-center gap-6 relative z-10">
             <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)]">
               <Crown className="w-10 h-10 text-white" />
             </div>
             <div>
               <h1 className="font-headline text-4xl font-black italic uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                 ELITE VIP LOUNGE
               </h1>
               <p className="text-white/70 font-bold uppercase tracking-[0.2em] text-xs mt-1">
                 {vipType.toUpperCase()} PASS HOLDER
               </p>
             </div>
           </div>

           <div className="relative z-10 w-full md:w-auto">
             <Button 
               onClick={handleDailyClaim} 
               disabled={claimingDaily || !!dailyCooldown}
               className="w-full md:w-auto h-16 px-8 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-black uppercase text-xl rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed glow-primary"
             >
               {claimingDaily ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                 <>
                   <Zap className="w-6 h-6" />
                   {dailyCooldown ? `WAIT ${dailyCooldown}` : 'CLAIM DAILY 10 COINS'}
                 </>
               )}
             </Button>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          {/* REWARDS SECTION */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-headline font-black uppercase tracking-widest text-white flex items-center gap-2">
              <Gift className="w-6 h-6 text-purple-500" /> PASS REWARDS
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Conditional Rewards based on Pass Type */}
               {(vipType === 'monthly' || vipType === 'permanent') && (
                 <>
                   {[
                     { id: 'week1', title: 'Week 1', desc: '2x Bronze Tickets' },
                     { id: 'week2', title: 'Week 2', desc: '2x Silver Tickets' },
                     { id: 'week3', title: 'Week 3', desc: '1x Golden Ticket' },
                     { id: 'week4', title: 'Week 4', desc: 'Bundle + 100 Coins' },
                   ].map(week => (
                     <Card key={week.id} className={`glass border-white/10 p-6 flex items-center justify-between ${claims[week.id] ? 'opacity-50' : ''}`}>
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                           <Calendar className="w-6 h-6 text-purple-400" />
                         </div>
                         <div>
                           <h4 className="font-bold uppercase tracking-widest text-white">{week.title}</h4>
                           <p className="text-xs text-muted-foreground uppercase">{week.desc}</p>
                         </div>
                       </div>
                       {claims[week.id] ? (
                         <CheckCircle2 className="w-8 h-8 text-green-500" />
                       ) : (
                         <Button onClick={() => handleWeeklyClaim(week.id)} disabled={claimingWeekly === week.id} className="bg-purple-600 hover:bg-purple-700">
                           {claimingWeekly === week.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CLAIM'}
                         </Button>
                       )}
                     </Card>
                   ))}
                 </>
               )}

               {vipType === 'weekly' && (
                 <>
                   {[
                     { id: 'day1', title: 'Day 1', desc: '1x Bronze Ticket' },
                     { id: 'day7', title: 'Day 7', desc: '1x Silver Ticket + 30 Coins' },
                   ].map(day => (
                     <Card key={day.id} className={`glass border-white/10 p-6 flex items-center justify-between ${claims[day.id] ? 'opacity-50' : ''}`}>
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                           <Calendar className="w-6 h-6 text-blue-400" />
                         </div>
                         <div>
                           <h4 className="font-bold uppercase tracking-widest text-white">{day.title}</h4>
                           <p className="text-xs text-muted-foreground uppercase">{day.desc}</p>
                         </div>
                       </div>
                       {claims[day.id] ? (
                         <CheckCircle2 className="w-8 h-8 text-green-500" />
                       ) : (
                         <Button onClick={() => handleWeeklyClaim(day.id)} disabled={claimingWeekly === day.id} className="bg-blue-600 hover:bg-blue-700">
                           {claimingWeekly === day.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CLAIM'}
                         </Button>
                       )}
                     </Card>
                   ))}
                 </>
               )}
            </div>
          </div>

          {/* CHAT SECTION */}
          <div className="lg:col-span-1 h-[600px] flex flex-col space-y-4">
            <h2 className="text-xl font-headline font-black uppercase tracking-widest text-white">COMMUNITY</h2>
            <div className="flex-1 overflow-hidden relative">
              <VIPChat />
            </div>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
