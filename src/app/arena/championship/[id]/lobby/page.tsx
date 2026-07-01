'use client';

import { useMemo, useState, useEffect, use } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Swords, Users, Trophy, Loader2, Link as LinkIcon, ShieldAlert, CheckCircle2, Info } from 'lucide-react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { collection, doc, updateDoc, query } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PlayerTHBadge } from '@/components/PlayerTHBadge';

export default function ChampionshipLobbyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const tRef = useMemo(() => doc(db, 'tournaments', id), [db, id]);
  const { data: t, loading: tLoading } = useDoc(tRef);

  const regRef = useMemo(() => (user && id) ? doc(db, 'tournaments', id, 'registrations', user.id) : null, [db, id, user?.id]);
  const { data: registration } = useDoc(regRef);

  const allRegQuery = useMemo(() => query(collection(db, 'tournaments', id, 'registrations')), [db, id]);
  const { data: allRegistrations } = useCollection(allRegQuery);

  const [joinPartyId, setJoinPartyId] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleCreateParty = async () => {
    if (!user || processing) return;
    setProcessing(true);
    try {
      await updateDoc(regRef!, { partyId: user.id });
      toast({ title: 'PARTY CREATED', description: `Your Party ID is ${user.id}` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleJoinParty = async () => {
    if (!user || processing || !joinPartyId.trim()) return;
    setProcessing(true);
    try {
      const leaderExists = allRegistrations?.some(r => r.id === joinPartyId.trim());
      if (!leaderExists) throw new Error('Invalid Party ID or leader not registered.');
      
      const partyMembers = allRegistrations?.filter(r => r.partyId === joinPartyId.trim()) || [];
      if (partyMembers.length >= 4) throw new Error('Party is full (Max 4).');

      await updateDoc(regRef!, { partyId: joinPartyId.trim() });
      toast({ title: 'JOINED PARTY' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyLeader = async () => {
    if (!user || processing) return;
    setProcessing(true);
    try {
      await updateDoc(regRef!, { appliedForLeader: true });
      toast({ title: 'APPLICATION SUBMITTED' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  if (tLoading || !t) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!registration) return <div className="text-center mt-20 text-xl font-black uppercase text-red-500">You are not registered for this championship.</div>;

  const status = t.status;
  const myPartyMembers = allRegistrations?.filter(r => r.partyId && r.partyId === registration.partyId) || [];

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div>
            <h1 className="text-2xl font-headline font-black uppercase italic tracking-wider flex items-center justify-center md:justify-start gap-3">
              <Swords className="w-6 h-6 text-blue-500" /> {t.name} LOBBY
            </h1>
            <p className="text-xs text-blue-400 font-bold uppercase mt-1">CURRENT PHASE: {status.replace('_', ' ')}</p>
          </div>
          <Badge className="bg-blue-600 text-lg px-4 py-2 font-black uppercase shadow-[0_0_20px_rgba(37,99,235,0.5)]">
            {status.replace('_', ' ')}
          </Badge>
        </div>

        {/* PARTY PHASE */}
        {status === 'party_phase' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-white/5 rounded-3xl overflow-hidden">
              <CardHeader className="bg-black/40 border-b border-white/5"><CardTitle className="text-lg font-black uppercase">Party Management</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-6">
                {!registration.partyId ? (
                  <div className="space-y-6">
                    <Button onClick={handleCreateParty} disabled={processing} className="w-full h-14 bg-blue-600 font-black uppercase glow-primary rounded-xl">CREATE A PARTY</Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                      <div className="relative flex justify-center"><span className="bg-zinc-950 px-2 text-[10px] uppercase font-black text-muted-foreground">OR</span></div>
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Enter Leader's ID to Join" value={joinPartyId} onChange={e => setJoinPartyId(e.target.value)} className="bg-white/5 h-12" />
                      <Button onClick={handleJoinParty} disabled={processing} className="h-12 bg-white text-black font-black uppercase">JOIN</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs text-green-400 font-bold uppercase">Your Party ID (Share this)</p>
                        <p className="font-mono text-sm mt-1">{registration.partyId}</p>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Party Members ({myPartyMembers.length}/4)</p>
                      <div className="space-y-2">
                        {myPartyMembers.map(m => (
                          <div key={m.id} className="bg-white/5 p-3 rounded-lg flex items-center justify-between border border-white/5">
                            <span className="font-bold text-sm uppercase">{m.username}</span>
                            <PlayerTHBadge userId={m.userId} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={() => updateDoc(regRef!, { partyId: null })} variant="destructive" className="w-full font-black uppercase">Leave Party</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl">
                <h3 className="font-black uppercase text-blue-400 flex items-center gap-2 mb-2"><Info className="w-4 h-4" /> Party Rules</h3>
                <ul className="text-sm space-y-2 text-white/70 font-medium">
                  <li>• Parties guarantee you will be drafted on the <b>same team</b> as your friends.</li>
                  <li>• Maximum party size is 4 players.</li>
                  <li>• During the Draft phase, leaders will draft entire parties at once.</li>
                  <li>• If you don't join a party, you will be drafted as a Solo player.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* LEADER SELECTION PHASE */}
        {status === 'leader_selection' && (
          <div className="flex flex-col items-center justify-center p-12 bg-black/40 border border-white/5 rounded-3xl text-center space-y-6">
            <ShieldAlert className="w-16 h-16 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-black uppercase">Leader Selection Phase</h2>
              <p className="text-muted-foreground font-medium max-w-lg mt-2">The admin is currently selecting the two Team Leaders for the draft. If Leader Applications are open, you may apply below.</p>
            </div>
            {t.leaderSelectionMode === 'application' && !registration.appliedForLeader && (
              <Button onClick={handleApplyLeader} disabled={processing} className="bg-yellow-600 hover:bg-yellow-700 h-14 px-8 font-black uppercase rounded-xl">APPLY TO BE A LEADER</Button>
            )}
            {registration.appliedForLeader && (
              <Badge className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 text-sm py-2 px-4">APPLICATION SUBMITTED</Badge>
            )}
          </div>
        )}

        {/* DRAFT / TEAMS_LOCKED / BATTLE_STARTED PLACEHOLDERS */}
        {['draft', 'teams_locked', 'clan_assigned', 'battle_started'].includes(status) && (
          <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10">
            <h2 className="text-2xl font-black uppercase tracking-widest text-primary">PHASE: {status.replace('_', ' ')}</h2>
            <p className="text-muted-foreground mt-4">Draft and Battle UI is under construction in the next deployment phase.</p>
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
