'use client';

import { useMemo, useState, use, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, ShieldAlert, Loader2, LogOut } from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';
import TournamentChat from '@/components/chat/TournamentChat';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ChampionLoungePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const tRef = useMemo(() => doc(db, 'tournaments', id), [db, id]);
  const { data: t, loading: tLoading } = useDoc(tRef);

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('lounge_top1');

  const isSuperAdmin = user?.id === "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16" || profile?.isSuperAdmin;
  const isAdmin = profile?.isAdmin || isSuperAdmin;

  const isTop1ItemWinner = user?.id === t?.top1UserId && !!t?.top1RewardItem;
  const isTop2ItemWinner = user?.id === t?.top2UserId && !!t?.top2RewardItem;
  const isTop3ItemWinner = user?.id === t?.top3UserId && !!t?.top3RewardItem;
  
  const isWinner = isTop1ItemWinner || isTop2ItemWinner || isTop3ItemWinner;

  useEffect(() => {
    if (tLoading || !t) return;
    if (!isAdmin) {
       if (isTop1ItemWinner) setActiveTab('lounge_top1');
       else if (isTop2ItemWinner) setActiveTab('lounge_top2');
       else if (isTop3ItemWinner) setActiveTab('lounge_top3');
    } else {
       if (t?.top1RewardItem) setActiveTab('lounge_top1');
       else if (t?.top2RewardItem) setActiveTab('lounge_top2');
       else if (t?.top3RewardItem) setActiveTab('lounge_top3');
    }
  }, [isAdmin, isTop1ItemWinner, isTop2ItemWinner, isTop3ItemWinner, t, tLoading]);

  const handleEndSession = async () => {
    if (!isAdmin) return;
    if (confirm('Are you sure you want to END this session? All winners will lose access to the lounge.')) {
      setProcessing(true);
      try {
        const res = await fetch('/api/championship/end-lounge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ championshipId: id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast({ title: 'Session Ended', description: 'The lounge has been securely closed.' });
        router.push(`/arena/championship/${id}/lobby`);
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
      } finally {
        setProcessing(false);
      }
    }
  };

  if (tLoading || profileLoading || !t || !user) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  // Access Control
  if (!isAdmin && !isWinner) {
    return (
      <PageWrapper>
        <div className="max-w-md mx-auto text-center mt-20 space-y-6">
          <ShieldAlert className="w-24 h-24 mx-auto text-red-500" />
          <h1 className="text-4xl font-black uppercase text-red-500">Access Denied</h1>
          <p className="text-muted-foreground">Only the Tournament Champions and Admins can enter the Lounge.</p>
          <Button onClick={() => router.push(`/arena/championship/${id}/lobby`)} variant="outline">BACK TO LOBBY</Button>
        </div>
      </PageWrapper>
    );
  }

  if (t.loungeClosed) {
    return (
      <PageWrapper>
        <div className="max-w-md mx-auto text-center mt-20 space-y-6">
          <ShieldAlert className="w-24 h-24 mx-auto text-yellow-500" />
          <h1 className="text-4xl font-black uppercase text-yellow-500">Session Ended</h1>
          <p className="text-muted-foreground">This Champion's Lounge has been permanently closed by the Admin.</p>
          <Button onClick={() => router.push(`/arena/championship/${id}/lobby`)} variant="outline">BACK TO LOBBY</Button>
        </div>
      </PageWrapper>
    );
  }

  const getLoungeTitle = () => {
    if (activeTab === 'lounge_top1') return "1ST PLACE MVP LOUNGE";
    if (activeTab === 'lounge_top2') return "2ND PLACE LOUNGE";
    if (activeTab === 'lounge_top3') return "3RD PLACE LOUNGE";
    return "CHAMPION'S LOUNGE";
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto h-[85vh] flex flex-col pt-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-black/40 p-6 rounded-t-3xl border border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.1)] backdrop-blur-md relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
           <div className="flex items-center gap-4">
             <div className="bg-yellow-500/20 p-3 rounded-2xl border border-yellow-500/30">
               <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
             </div>
             <div>
               <h1 className="text-2xl font-black uppercase text-yellow-500 tracking-widest drop-shadow-md">{getLoungeTitle()}</h1>
               <p className="text-xs font-bold text-yellow-500/60 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                 Secure 1-on-1 Session Active
               </p>
             </div>
           </div>

           <div className="flex gap-4">
             <Button variant="outline" onClick={() => router.push(`/arena/championship/${id}/lobby`)} className="border-white/10 text-white hover:bg-white/5 font-black uppercase">
               Back to Lobby
             </Button>
             {isAdmin && (
               <Button onClick={handleEndSession} disabled={processing} className="bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.5)] border border-red-400">
                 {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                 END THIS SESSION
               </Button>
             )}
           </div>
        </div>

        <div className="flex flex-1 overflow-hidden border-x border-b border-yellow-500/30 rounded-b-3xl shadow-[0_10px_50px_rgba(0,0,0,0.5)] bg-black/20">
          {/* Admin Sidebar */}
          {isAdmin && (
            <div className="w-64 border-r border-yellow-500/20 bg-black/40 p-4 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white/50 mb-4 px-2">CHANNELS</h3>
              {t?.top1RewardItem && (
                <button onClick={() => setActiveTab('lounge_top1')} className={cn("w-full text-left px-4 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all", activeTab === 'lounge_top1' ? "bg-yellow-500 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]" : "text-yellow-500/70 hover:bg-yellow-500/10")}>
                  1ST PLACE (MVP)
                </button>
              )}
              {t?.top2RewardItem && (
                <button onClick={() => setActiveTab('lounge_top2')} className={cn("w-full text-left px-4 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all", activeTab === 'lounge_top2' ? "bg-slate-300 text-black shadow-[0_0_20px_rgba(203,213,225,0.4)]" : "text-slate-400 hover:bg-slate-400/10")}>
                  2ND PLACE
                </button>
              )}
              {t?.top3RewardItem && (
                <button onClick={() => setActiveTab('lounge_top3')} className={cn("w-full text-left px-4 py-3 rounded-xl font-black uppercase tracking-widest text-sm transition-all", activeTab === 'lounge_top3' ? "bg-orange-700 text-white shadow-[0_0_20px_rgba(194,65,12,0.4)]" : "text-orange-500/70 hover:bg-orange-700/20")}>
                  3RD PLACE
                </button>
              )}
            </div>
          )}
          
          {/* Chat Area */}
          <div className="flex-1 bg-black/20 flex flex-col h-full overflow-hidden">
             {activeTab === 'lounge_top1' && <TournamentChat tournamentId={id} teamId="lounge_top1" isActive={true} onUnreadCountChange={() => {}} />}
             {activeTab === 'lounge_top2' && <TournamentChat tournamentId={id} teamId="lounge_top2" isActive={true} onUnreadCountChange={() => {}} />}
             {activeTab === 'lounge_top3' && <TournamentChat tournamentId={id} teamId="lounge_top3" isActive={true} onUnreadCountChange={() => {}} />}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
