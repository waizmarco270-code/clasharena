'use client';

import { useMemo, useState, use, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { collection, doc, updateDoc, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Swords, ArrowRight, Loader2, PlayCircle, Trophy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminChampionshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const tRef = useMemo(() => doc(db, 'tournaments', id), [db, id]);
  const { data: t, loading: tLoading } = useDoc(tRef);

  const allRegQuery = useMemo(() => query(collection(db, 'tournaments', id, 'registrations')), [db, id]);
  const { data: allRegs } = useCollection(allRegQuery);

  const teamsQuery = useMemo(() => query(collection(db, 'tournaments', id, 'teams')), [db, id]);
  const { data: teams } = useCollection(teamsQuery);
  const teamA = teams?.find(t => t.id === 'teamA');
  const teamB = teams?.find(t => t.id === 'teamB');

  const [processing, setProcessing] = useState(false);
  const [leaderA, setLeaderA] = useState(t?.teamALeader || '');
  const [leaderB, setLeaderB] = useState(t?.teamBLeader || '');
  
  const [teamAClanLink, setTeamAClanLink] = useState(t?.teamAClanLink || 'https://link.clashofclans.com/en?action=OpenClanProfile&tag=2CJCY80V9');
  const [teamBClanLink, setTeamBClanLink] = useState(t?.teamBClanLink || 'https://link.clashofclans.com/en?action=OpenClanProfile&tag=2C9R8PCRR');

  const applicants = useMemo(() => {
    if (!allRegs) return [];
    if (t?.leaderSelectionMode === 'application') {
      return allRegs.filter((r: any) => r.appliedForLeader);
    }
    return [...allRegs].sort((a: any, b: any) => (b.townHall || 0) - (a.townHall || 0));
  }, [allRegs, t?.leaderSelectionMode]);

  useEffect(() => {
    if (t?.teamALeader && !leaderA) setLeaderA(t.teamALeader);
    if (t?.teamBLeader && !leaderB) setLeaderB(t.teamBLeader);
  }, [t?.teamALeader, t?.teamBLeader, leaderA, leaderB]);

  const assignLeaders = async () => {
    if (!leaderA || !leaderB) return toast({ variant: 'destructive', title: 'Error', description: 'Select both leaders first.' });
    if (leaderA === leaderB) return toast({ variant: 'destructive', title: 'Error', description: 'Leaders must be different.' });
    setProcessing(true);
    try {
      await updateDoc(tRef, { teamALeader: leaderA, teamBLeader: leaderB });
      toast({ title: 'LEADERS ASSIGNED', description: 'Team leaders have been set successfully.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const advanceStatus = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to advance to ${newStatus}?`)) return;
    setProcessing(true);
    try {
      const updateData: any = { status: newStatus };
      await updateDoc(tRef, updateData);
      toast({ title: 'STATUS ADVANCED', description: `Tournament is now in ${newStatus} phase.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const startDraft = async () => {
    if (!confirm(`Are you sure you want to start the Draft? Leaders and their parties will be automatically assigned to teams.`)) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/championship/start-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ championshipId: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'DRAFT STARTED', description: `Draft phase initiated. First pick goes to ${data.firstTurn.toUpperCase()}.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const assignClans = async () => {
    if (!teamAClanLink || !teamBClanLink) return toast({ variant: 'destructive', title: 'Error', description: 'Please provide both clan links.' });
    if (!confirm(`Are you sure you want to assign these clans? Players will be notified to join.`)) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/championship/assign-clans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ championshipId: id, teamAClanLink, teamBClanLink })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'CLANS ASSIGNED', description: `Clan links have been set and phase advanced.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const revertStatus = async () => {
    const sequence = ['registration', 'party_phase', 'leader_selection', 'draft', 'teams_locked', 'clan_assigned', 'battle_started', 'verification', 'finished'];
    const currentIndex = sequence.indexOf(t?.status || 'registration');
    if (currentIndex <= 0) {
      toast({ variant: 'destructive', title: 'Cannot Revert', description: 'Already at the first phase.' });
      return;
    }
    const prevStatus = sequence[currentIndex - 1];
    if (!confirm(`Are you sure you want to REVERT to ${prevStatus}? This may cause inconsistencies if players have already taken actions in the current phase.`)) return;
    
    setProcessing(true);
    try {
      const res = await fetch('/api/championship/revert-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ championshipId: id, targetPhase: prevStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'STATUS REVERTED', description: `Tournament reverted to ${prevStatus}.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleRemovePaidLeader = async (teamId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this leader? Their pass will be refunded and they will be banned from buying it again.')) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/championship/remove-leader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ championshipId: id, userId, teamId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'LEADER REMOVED & REFUNDED' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectApplication = async (userId: string) => {
    setProcessing(true);
    try {
      const regRef = doc(db, 'tournaments', id as string, 'registrations', userId);
      await updateDoc(regRef, { appliedForLeader: false, rejectedForLeader: true });
      toast({ title: 'APPLICATION REJECTED' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const updateScore = async (teamId: string, memberIndex: number, newStars: number, newDest: number) => {
    try {
      const team = teamId === 'teamA' ? teamA : teamB;
      if (!team) return;
      const members = [...team.members];
      members[memberIndex] = { ...members[memberIndex], stars: newStars, destruction: newDest };
      await updateDoc(doc(db, 'tournaments', id, 'teams', teamId), { members });
      toast({ title: 'SCORE UPDATED' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
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
          <CardHeader className="border-b border-white/5 bg-black/40 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-black uppercase">Phase Controller</CardTitle>
            <Button disabled={processing || t.status === 'registration'} onClick={revertStatus} variant="destructive" size="sm" className="font-black uppercase text-xs">
               REVERT TO PREVIOUS PHASE
            </Button>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button disabled={processing || t.status !== 'registration'} onClick={() => advanceStatus('party_phase')} className="h-14 font-black uppercase">Start Party Phase</Button>
            <Button disabled={processing || t.status !== 'party_phase'} onClick={() => advanceStatus('leader_selection')} className="h-14 font-black uppercase">Start Leader Selection</Button>
            <Button disabled={processing || t.status !== 'leader_selection'} onClick={startDraft} className="h-14 font-black uppercase text-blue-300 border-blue-500 hover:bg-blue-900/50">Start Draft</Button>
            <Button disabled={processing || t.status !== 'draft'} onClick={() => advanceStatus('teams_locked')} className="h-14 font-black uppercase">Lock Teams</Button>
            <Button disabled={processing || t.status !== 'clan_assigned'} onClick={() => advanceStatus('battle_started')} className="h-14 font-black uppercase bg-green-600 hover:bg-green-700">Start Battle</Button>
            <Button disabled={processing || t.status !== 'battle_started'} onClick={() => advanceStatus('verification')} className="h-14 font-black uppercase">Start Verification</Button>
            <Button disabled={processing || t.status !== 'verification'} onClick={() => router.push(`/admin/championship/${id}/rewards`)} className="h-14 font-black uppercase bg-yellow-600 hover:bg-yellow-700 glow-primary"><Trophy className="w-5 h-5 mr-2"/> Finish & Rewards</Button>
          </CardContent>
        </Card>

        {t.status === 'teams_locked' && (
          <Card className="glass border-white/5 rounded-3xl animate-in fade-in zoom-in duration-500">
             <CardHeader className="border-b border-white/5 bg-orange-900/20">
               <CardTitle className="text-lg font-black uppercase text-orange-500">Assign Clans Configuration</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-blue-400">Team A Clan Link</label>
                   <Input value={teamAClanLink} onChange={e => setTeamAClanLink(e.target.value)} className="bg-white/5 h-12 font-mono text-xs" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-red-400">Team B Clan Link</label>
                   <Input value={teamBClanLink} onChange={e => setTeamBClanLink(e.target.value)} className="bg-white/5 h-12 font-mono text-xs" />
                 </div>
               </div>
               <Button onClick={assignClans} disabled={processing} className="w-full h-14 font-black uppercase bg-orange-600 hover:bg-orange-700 glow-primary text-lg">
                 Confirm & Assign Clans
               </Button>
             </CardContent>
          </Card>
        )}

        {t.status === 'leader_selection' && (
          <Card className="glass border-white/5 rounded-3xl">
             <CardHeader className="border-b border-white/5 bg-black/40"><CardTitle className="text-lg font-black uppercase">Leader Management</CardTitle></CardHeader>
             <CardContent className="p-6 space-y-6">
               <p className="text-muted-foreground text-sm font-bold uppercase">Select Team A and Team B leaders from applications or manually input IDs.</p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-blue-400">Team A Leader</label>
                    {(() => {
                      const leaderAReg = allRegs?.find((r: any) => r.id === t.teamALeader);
                      if (leaderAReg?.boughtLeaderPass) {
                        return (
                          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl space-y-3">
                            <Badge className="bg-blue-600">PAID LEADER PASS</Badge>
                            <p className="font-bold">{leaderAReg.username} (TH{leaderAReg.townHall})</p>
                            <Button onClick={() => handleRemovePaidLeader('teamA', leaderAReg.id)} variant="destructive" size="sm" className="w-full font-black uppercase text-[10px]">Remove & Refund</Button>
                          </div>
                        );
                      }
                      return (
                        <>
                          <Select value={leaderA} onValueChange={setLeaderA}>
                            <SelectTrigger className="bg-white/5 h-12 font-bold"><SelectValue placeholder="Select an applicant" /></SelectTrigger>
                            <SelectContent>
                              {applicants.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.username} (TH{a.townHall})</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input placeholder="Or paste User ID manually..." value={leaderA} onChange={e => setLeaderA(e.target.value)} className="bg-white/5 h-12 font-mono text-xs" />
                        </>
                      );
                    })()}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-red-400">Team B Leader</label>
                    {(() => {
                      const leaderBReg = allRegs?.find((r: any) => r.id === t.teamBLeader);
                      if (leaderBReg?.boughtLeaderPass) {
                        return (
                          <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl space-y-3">
                            <Badge className="bg-red-600">PAID LEADER PASS</Badge>
                            <p className="font-bold">{leaderBReg.username} (TH{leaderBReg.townHall})</p>
                            <Button onClick={() => handleRemovePaidLeader('teamB', leaderBReg.id)} variant="destructive" size="sm" className="w-full font-black uppercase text-[10px]">Remove & Refund</Button>
                          </div>
                        );
                      }
                      return (
                        <>
                          <Select value={leaderB} onValueChange={setLeaderB}>
                            <SelectTrigger className="bg-white/5 h-12 font-bold"><SelectValue placeholder="Select an applicant" /></SelectTrigger>
                            <SelectContent>
                              {applicants.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.username} (TH{a.townHall})</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input placeholder="Or paste User ID manually..." value={leaderB} onChange={e => setLeaderB(e.target.value)} className="bg-white/5 h-12 font-mono text-xs" />
                        </>
                      );
                    })()}
                  </div>
               </div>

                <Button disabled={processing} onClick={assignLeaders} className="w-full h-14 bg-blue-600 font-black uppercase">
                  Save Leaders
                </Button>
                
                {/* Pending Free Applications */}
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <h3 className="font-black uppercase tracking-widest text-sm text-yellow-500">PENDING FREE APPLICATIONS</h3>
                  {(() => {
                    const freeApps = applicants.filter((a: any) => a.appliedForLeader && !a.boughtLeaderPass && a.id !== t.teamALeader && a.id !== t.teamBLeader);
                    if (freeApps.length === 0) return <p className="text-muted-foreground text-xs uppercase font-bold">No pending applications.</p>;
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {freeApps.map((a: any) => (
                          <div key={a.id} className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3">
                            <p className="font-bold text-sm uppercase">{a.username} <span className="text-muted-foreground text-xs">(TH{a.townHall})</span></p>
                            <div className="flex gap-2">
                              <Button onClick={() => setLeaderA(a.id)} disabled={processing} size="sm" variant="outline" className="flex-1 text-[10px] uppercase font-black text-blue-400">Set Team A</Button>
                              <Button onClick={() => setLeaderB(a.id)} disabled={processing} size="sm" variant="outline" className="flex-1 text-[10px] uppercase font-black text-red-400">Set Team B</Button>
                              <Button onClick={() => handleRejectApplication(a.id)} disabled={processing} size="sm" variant="destructive" className="flex-1 text-[10px] uppercase font-black">Reject</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
        )}

        {t.status === 'battle_started' && (
          <Card className="glass border-white/5 rounded-3xl">
             <CardHeader className="border-b border-white/5 bg-black/40"><CardTitle className="text-lg font-black uppercase">Scoreboard Controller</CardTitle></CardHeader>
             <CardContent className="p-6">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="space-y-4">
                   <h3 className="font-black uppercase text-blue-400 border-b border-white/10 pb-2">TEAM A ROSTER</h3>
                   {teamA?.members?.map((m: any, idx: number) => (
                     <div key={m.userId} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                       <div className="flex justify-between font-bold uppercase text-sm"><span>{m.username}</span><span className="text-[10px] text-muted-foreground">TH{m.townHall}</span></div>
                       <div className="flex gap-2">
                         <div className="flex-1 space-y-1"><label className="text-[10px] text-muted-foreground uppercase font-black">Stars</label><Input type="number" min="0" max="3" value={m.stars || 0} onChange={(e) => updateScore('teamA', idx, parseInt(e.target.value)||0, m.destruction)} className="bg-black/50" /></div>
                         <div className="flex-1 space-y-1"><label className="text-[10px] text-muted-foreground uppercase font-black">Destruction %</label><Input type="number" min="0" max="100" value={m.destruction || 0} onChange={(e) => updateScore('teamA', idx, m.stars, parseFloat(e.target.value)||0)} className="bg-black/50" /></div>
                       </div>
                     </div>
                   ))}
                 </div>
                 
                 <div className="space-y-4">
                   <h3 className="font-black uppercase text-red-400 border-b border-white/10 pb-2">TEAM B ROSTER</h3>
                   {teamB?.members?.map((m: any, idx: number) => (
                     <div key={m.userId} className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                       <div className="flex justify-between font-bold uppercase text-sm"><span>{m.username}</span><span className="text-[10px] text-muted-foreground">TH{m.townHall}</span></div>
                       <div className="flex gap-2">
                         <div className="flex-1 space-y-1"><label className="text-[10px] text-muted-foreground uppercase font-black">Stars</label><Input type="number" min="0" max="3" value={m.stars || 0} onChange={(e) => updateScore('teamB', idx, parseInt(e.target.value)||0, m.destruction)} className="bg-black/50" /></div>
                         <div className="flex-1 space-y-1"><label className="text-[10px] text-muted-foreground uppercase font-black">Destruction %</label><Input type="number" min="0" max="100" value={m.destruction || 0} onChange={(e) => updateScore('teamB', idx, m.stars, parseFloat(e.target.value)||0)} className="bg-black/50" /></div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             </CardContent>
          </Card>
        )}

      </div>
    </PageWrapper>
  );
}
