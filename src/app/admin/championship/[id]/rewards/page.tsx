'use client';

import { useMemo, useState, use } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trophy, Medal, Loader2, Info } from 'lucide-react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ChampionshipRewardsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const tRef = useMemo(() => doc(db, 'tournaments', id), [db, id]);
  const { data: t, loading: tLoading } = useDoc(tRef);

  const teamsQuery = useMemo(() => query(collection(db, 'tournaments', id, 'teams')), [db, id]);
  const { data: teams } = useCollection(teamsQuery);
  const teamA = teams?.find(team => team.id === 'teamA');
  const teamB = teams?.find(team => team.id === 'teamB');

  const [winningTeamId, setWinningTeamId] = useState<'teamA' | 'teamB' | null>(null);
  const [top1UserId, setTop1UserId] = useState('');
  const [top2UserId, setTop2UserId] = useState('');
  const [top3UserId, setTop3UserId] = useState('');

  const [top1RewardItem, setTop1RewardItem] = useState('');
  const [top2RewardCoins, setTop2RewardCoins] = useState('');
  const [top3RewardCoins, setTop3RewardCoins] = useState('');
  const [winnerRefundAmount, setWinnerRefundAmount] = useState<string>('');

  const [processing, setProcessing] = useState(false);

  // Determine lists based on Winning Team selection
  const winningTeam = winningTeamId === 'teamA' ? teamA : (winningTeamId === 'teamB' ? teamB : null);
  const losingTeam = winningTeamId === 'teamA' ? teamB : (winningTeamId === 'teamB' ? teamA : null);

  const handleDistribute = async () => {
    if (!winningTeamId || !winningTeam) {
      toast({ variant: 'destructive', title: 'Select a Winning Team' });
      return;
    }
    if (!top1UserId || !top2UserId || !top3UserId) {
      toast({ variant: 'destructive', title: 'Select all Top 3 Players' });
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/championship/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          championshipId: id,
          winningTeamId,
          top1UserId,
          top2UserId,
          top3UserId,
          top1RewardItem,
          top2RewardCoins: Number(top2RewardCoins) || 0,
          top3RewardCoins: Number(top3RewardCoins) || 0,
          winnerRefundAmount: winnerRefundAmount !== '' ? Number(winnerRefundAmount) : (t?.entryFee || 0)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: 'CHAMPIONSHIP COMPLETED!', description: 'Rewards and refunds have been distributed.' });
      router.push(`/admin/championship/${id}`);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  if (tLoading || !t) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (t.status === 'completed') {
    return (
      <PageWrapper>
        <div className="max-w-4xl mx-auto text-center mt-20 space-y-6">
          <Trophy className="w-24 h-24 mx-auto text-yellow-500" />
          <h1 className="text-4xl font-black uppercase text-yellow-500">Championship Completed</h1>
          <p className="text-muted-foreground">The rewards and refunds have already been distributed.</p>
          <Button onClick={() => router.push(`/admin/championship/${id}`)} variant="outline">BACK TO DASHBOARD</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-headline font-black uppercase italic tracking-widest text-primary flex justify-center items-center gap-4">
            <Trophy className="w-10 h-10 text-yellow-500" /> FINISH & REWARDS
          </h1>
          <p className="text-muted-foreground">Select the winners, assign MVPs, and distribute the custom prize pools atomically.</p>
        </div>

        {/* 1. SELECT WINNING TEAM */}
        <div className="space-y-4">
          <h2 className="text-xl font-black uppercase tracking-widest border-b border-white/10 pb-2">1. SELECT WINNING TEAM</h2>
          <div className="grid grid-cols-2 gap-6">
            <button 
              onClick={() => { setWinningTeamId('teamA'); setTop1UserId(''); setTop2UserId(''); setTop3UserId(''); }}
              className={cn("p-6 rounded-2xl border-2 transition-all glass text-center space-y-2", winningTeamId === 'teamA' ? 'border-blue-500 bg-blue-600/20' : 'border-white/5 hover:border-white/20')}
            >
              <h3 className="text-2xl font-black uppercase text-blue-500">TEAM A WINS</h3>
              <p className="text-sm font-bold text-muted-foreground">{teamA?.members?.length || 0} Players</p>
            </button>
            <button 
              onClick={() => { setWinningTeamId('teamB'); setTop1UserId(''); setTop2UserId(''); setTop3UserId(''); }}
              className={cn("p-6 rounded-2xl border-2 transition-all glass text-center space-y-2", winningTeamId === 'teamB' ? 'border-red-500 bg-red-600/20' : 'border-white/5 hover:border-white/20')}
            >
              <h3 className="text-2xl font-black uppercase text-red-500">TEAM B WINS</h3>
              <p className="text-sm font-bold text-muted-foreground">{teamB?.members?.length || 0} Players</p>
            </button>
          </div>
        </div>

        {winningTeamId && winningTeam && losingTeam && (
          <>
            {/* 2. SELECT MVPS */}
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <h2 className="text-xl font-black uppercase tracking-widest border-b border-white/10 pb-2">2. ASSIGN MVPS & REWARDS</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* TOP 1 */}
                <Card className="glass border-yellow-500/30 bg-yellow-500/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                  <CardHeader className="text-center pb-2">
                    <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <CardTitle className="text-yellow-500 font-black uppercase text-lg">TOP 1 (MVP)</CardTitle>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">From Winning Team</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <select value={top1UserId} onChange={e => setTop1UserId(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl h-10 px-3 text-sm font-bold text-white">
                      <option value="">Select Player...</option>
                      {winningTeam.members?.map((m: any) => <option key={m.userId} value={m.userId}>{m.username} (Stars: {m.stars || 0})</option>)}
                    </select>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-muted-foreground">In-Game Reward Item (Text)</label>
                      <Input placeholder="e.g. 1000 Gems + Hero Book" value={top1RewardItem} onChange={e => setTop1RewardItem(e.target.value)} className="bg-black/50 font-bold" />
                    </div>
                  </CardContent>
                </Card>

                {/* TOP 2 */}
                <Card className="glass border-gray-400/30 bg-gray-400/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-gray-400 to-transparent" />
                  <CardHeader className="text-center pb-2">
                    <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <CardTitle className="text-gray-400 font-black uppercase text-lg">TOP 2</CardTitle>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">From Losing Team</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <select value={top2UserId} onChange={e => setTop2UserId(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl h-10 px-3 text-sm font-bold text-white">
                      <option value="">Select Player...</option>
                      {losingTeam.members?.map((m: any) => <option key={m.userId} value={m.userId}>{m.username} (Stars: {m.stars || 0})</option>)}
                    </select>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-muted-foreground">Coin Reward Amount</label>
                      <Input type="number" placeholder="0" value={top2RewardCoins} onChange={e => setTop2RewardCoins(e.target.value)} className="bg-black/50 font-bold" />
                    </div>
                  </CardContent>
                </Card>

                {/* TOP 3 */}
                <Card className="glass border-orange-500/30 bg-orange-500/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
                  <CardHeader className="text-center pb-2">
                    <Medal className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <CardTitle className="text-orange-500 font-black uppercase text-lg">TOP 3</CardTitle>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">From Winning Team</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <select value={top3UserId} onChange={e => setTop3UserId(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl h-10 px-3 text-sm font-bold text-white">
                      <option value="">Select Player...</option>
                      {winningTeam.members?.filter((m:any) => m.userId !== top1UserId).map((m: any) => <option key={m.userId} value={m.userId}>{m.username} (Stars: {m.stars || 0})</option>)}
                    </select>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-muted-foreground">Coin Reward Amount</label>
                      <Input type="number" placeholder="0" value={top3RewardCoins} onChange={e => setTop3RewardCoins(e.target.value)} className="bg-black/50 font-bold" />
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>

            {/* 3. REFUND SETTINGS */}
            <div className="space-y-4 animate-in slide-in-from-bottom-4">
              <h2 className="text-xl font-black uppercase tracking-widest border-b border-white/10 pb-2">3. WINNER TEAM REFUND</h2>
              <div className="flex gap-4 items-center bg-white/5 p-6 rounded-2xl border border-white/5">
                <Info className="w-8 h-8 text-blue-400" />
                <div className="flex-1">
                  <p className="font-bold text-white">Rest of the Winning Team Refund</p>
                  <p className="text-sm text-muted-foreground">Players on the winning team (excluding Top 1 and Top 3) will receive this coin amount directly to their wallets.</p>
                </div>
                <div className="w-48 space-y-1">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Refund Coins per player</label>
                  <Input type="number" placeholder={String(t.entryFee || 0)} value={winnerRefundAmount} onChange={e => setWinnerRefundAmount(e.target.value)} className="bg-black/50 text-xl font-black text-center text-white" />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleDistribute} 
              disabled={processing || !top1UserId || !top2UserId || !top3UserId} 
              className="w-full h-16 text-xl font-black uppercase tracking-widest bg-yellow-600 hover:bg-yellow-700 text-white rounded-2xl"
            >
              {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : "DISTRIBUTE REWARDS & FINISH"}
            </Button>
          </>
        )}

      </div>
    </PageWrapper>
  );
}
