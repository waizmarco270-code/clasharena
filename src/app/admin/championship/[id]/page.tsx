'use client';

import { useMemo, useState, use } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { collection, doc, updateDoc, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Swords, ArrowRight, Loader2, PlayCircle, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminChampionshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const tRef = useMemo(() => doc(db, 'tournaments', id), [db, id]);
  const { data: t, loading: tLoading } = useDoc(tRef);

  const [processing, setProcessing] = useState(false);

  const advanceStatus = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to advance to ${newStatus}?`)) return;
    setProcessing(true);
    try {
      await updateDoc(tRef, { status: newStatus });
      toast({ title: 'STATUS ADVANCED', description: `Tournament is now in ${newStatus} phase.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  if (tLoading || !t) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between bg-black/40 border border-white/5 p-6 rounded-[2rem]">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-wider flex items-center gap-3">
              <Swords className="w-6 h-6 text-primary" /> {t.name} (ADMIN)
            </h1>
            <p className="text-sm font-bold text-muted-foreground mt-1">Total Registered: {t.totalRegistered} / {t.totalPlayers}</p>
          </div>
          <Badge className="bg-primary text-black font-black uppercase text-lg px-4 py-2">{t.status.replace('_', ' ')}</Badge>
        </div>

        <Card className="glass border-white/5 rounded-3xl">
          <CardHeader className="border-b border-white/5 bg-black/40"><CardTitle className="text-lg font-black uppercase">Phase Controller</CardTitle></CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button disabled={processing || t.status !== 'registration'} onClick={() => advanceStatus('party_phase')} className="h-14 font-black uppercase">Start Party Phase</Button>
            <Button disabled={processing || t.status !== 'party_phase'} onClick={() => advanceStatus('leader_selection')} className="h-14 font-black uppercase">Start Leader Selection</Button>
            <Button disabled={processing || t.status !== 'leader_selection'} onClick={() => advanceStatus('draft')} className="h-14 font-black uppercase">Start Draft</Button>
            <Button disabled={processing || t.status !== 'draft'} onClick={() => advanceStatus('teams_locked')} className="h-14 font-black uppercase">Lock Teams</Button>
            <Button disabled={processing || t.status !== 'teams_locked'} onClick={() => advanceStatus('clan_assigned')} className="h-14 font-black uppercase">Assign Clans</Button>
            <Button disabled={processing || t.status !== 'clan_assigned'} onClick={() => advanceStatus('battle_started')} className="h-14 font-black uppercase bg-green-600 hover:bg-green-700">Start Battle</Button>
            <Button disabled={processing || t.status !== 'battle_started'} onClick={() => advanceStatus('verification')} className="h-14 font-black uppercase">Start Verification</Button>
            <Button disabled={processing || t.status !== 'verification'} onClick={() => router.push(`/admin/championship/${id}/rewards`)} className="h-14 font-black uppercase bg-yellow-600 hover:bg-yellow-700 glow-primary"><Trophy className="w-5 h-5 mr-2"/> Finish & Rewards</Button>
          </CardContent>
        </Card>

        {t.status === 'leader_selection' && (
          <Card className="glass border-white/5 rounded-3xl">
             <CardHeader className="border-b border-white/5 bg-black/40"><CardTitle className="text-lg font-black uppercase">Leader Management</CardTitle></CardHeader>
             <CardContent className="p-6">
               <p className="text-muted-foreground text-sm font-bold uppercase mb-4">Select Team A and Team B leaders from applications or manually input IDs.</p>
               <div className="bg-white/5 border border-white/5 rounded-xl p-8 text-center text-white/50 font-black uppercase">
                 Leader Management UI coming in next iteration.
               </div>
             </CardContent>
          </Card>
        )}

        {t.status === 'battle_started' && (
          <Card className="glass border-white/5 rounded-3xl">
             <CardHeader className="border-b border-white/5 bg-black/40"><CardTitle className="text-lg font-black uppercase">Scoreboard Controller</CardTitle></CardHeader>
             <CardContent className="p-6">
               <div className="bg-white/5 border border-white/5 rounded-xl p-8 text-center text-white/50 font-black uppercase">
                 Battle UI coming in next iteration.
               </div>
             </CardContent>
          </Card>
        )}

      </div>
    </PageWrapper>
  );
}
