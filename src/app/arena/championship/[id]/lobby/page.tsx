'use client';

import { useMemo, useState, useEffect, use } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Swords, Users, Trophy, Loader2, Link as LinkIcon, ShieldAlert, CheckCircle2, Info, MessageCircle, Share2, Crown, UserMinus, UserPlus, X } from 'lucide-react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { collection, doc, updateDoc, setDoc, query, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PlayerTHBadge } from '@/components/PlayerTHBadge';
import { useSearchParams } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import TournamentChat from '@/components/chat/TournamentChat';

export default function ChampionshipLobbyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const isGhost = searchParams.get('spectate') === 'true';

  const tRef = useMemo(() => doc(db, 'tournaments', id), [db, id]);
  const { data: t, loading: tLoading } = useDoc(tRef);

  const regRef = useMemo(() => (user && id) ? doc(db, 'tournaments', id, 'registrations', user.id) : null, [db, id, user?.id]);
  const { data: registration } = useDoc(regRef);

  const allRegQuery = useMemo(() => query(collection(db, 'tournaments', id, 'registrations')), [db, id]);
  const { data: allRegistrations } = useCollection(allRegQuery);

  const teamsQuery = useMemo(() => query(collection(db, 'tournaments', id, 'teams')), [db, id]);
  const { data: teams } = useCollection(teamsQuery);
  const teamA = teams?.find(t => t.id === 'teamA');
  const teamB = teams?.find(t => t.id === 'teamB');

  const partiesQuery = useMemo(() => query(collection(db, 'tournaments', id, 'parties')), [db, id]);
  const { data: allParties } = useCollection(partiesQuery);

  const groupedPool = useMemo(() => {
    if (!allRegistrations) return [];
    const draftedIds = new Set([
      ...(teamA?.members || []).map((m: any) => m.userId), 
      ...(teamB?.members || []).map((m: any) => m.userId)
    ]);
    const available = allRegistrations.filter((r: any) => !draftedIds.has(r.id));
    
    const groups: Record<string, any[]> = {};
    available.forEach((r: any) => {
      const pId = r.partyId || r.id;
      if (!groups[pId]) groups[pId] = [];
      groups[pId].push(r);
    });
    
    return Object.entries(groups).map(([partyId, members]) => ({ partyId, members }));
  }, [allRegistrations, teamA, teamB]);

  const mirrorMatchups = useMemo(() => {
    const aMembers = [...(teamA?.members || [])].sort((a: any, b: any) => b.townHall - a.townHall);
    const bMembers = [...(teamB?.members || [])].sort((a: any, b: any) => b.townHall - a.townHall);
    const maxLen = Math.max(aMembers.length, bMembers.length);
    const matchups = [];
    for(let i=0; i<maxLen; i++) {
      matchups.push({ a: aMembers[i], b: bMembers[i] });
    }
    return matchups;
  }, [teamA, teamB]);

  const [joinPartyId, setJoinPartyId] = useState('');
  const [createPartyName, setCreatePartyName] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleCreateParty = async () => {
    if (!user || processing || !createPartyName.trim()) return;
    setProcessing(true);
    try {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newPartyId = `CLASH-ARENA-${randomSuffix}`;
      
      const partyRef = doc(db, 'tournaments', id as string, 'parties', newPartyId);
      await setDoc(partyRef, {
        id: newPartyId,
        name: createPartyName.trim().toUpperCase(),
        leaderId: user.id,
        members: [user.id],
        pending: [],
        createdAt: Date.now()
      });

      await updateDoc(regRef!, { partyId: newPartyId });
      toast({ title: 'PARTY CREATED', description: `Your Party ID is ${newPartyId}` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const checkTHLimit = (partyMembersList: any[], newPlayerTh: number) => {
    if (!t?.thDistribution) return true; // No limits set
    const maxAllowed = Math.floor((t.thDistribution[newPlayerTh] || 0) / 2);
    const currentCount = partyMembersList.filter(m => m.townHall === newPlayerTh).length;
    return currentCount < maxAllowed;
  };

  const handleJoinParty = async (partyCodeToJoin: string = joinPartyId) => {
    const pCode = partyCodeToJoin.trim().toUpperCase();
    if (!user || processing || !pCode) return;
    setProcessing(true);
    try {
      const partyRef = doc(db, 'tournaments', id as string, 'parties', pCode);
      const partyDoc = await getDoc(partyRef);
      
      if (!partyDoc.exists()) {
         // Fallback to old party logic if party doc doesn't exist (legacy)
         const partyMembers = allRegistrations?.filter(r => r.partyId === pCode) || [];
         if (partyMembers.length === 0) throw new Error('Invalid Party ID.');
         if (partyMembers.length >= 8) throw new Error('Party is full (Max 8).');
         if (!checkTHLimit(partyMembers, safeReg.townHall)) throw new Error('Adding you would exceed this party\'s max allowed quota for TH' + safeReg.townHall);
         await updateDoc(regRef!, { partyId: pCode });
      } else {
         const pData = partyDoc.data();
         if (pData.members.length >= 8) throw new Error('Party is full (Max 8).');
         const partyMembers = allRegistrations?.filter(r => pData.members.includes(r.id)) || [];
         if (!checkTHLimit(partyMembers, safeReg.townHall)) throw new Error('Adding you would exceed this party\'s max allowed quota for TH' + safeReg.townHall);
         
         await updateDoc(partyRef, { members: arrayUnion(user.id) });
         await updateDoc(regRef!, { partyId: pCode });
      }
      toast({ title: 'JOINED PARTY' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleShareCode = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join my Clash Arena Party!',
        text: `Use this code to join my party: ${safeReg.partyId}`,
      });
    } else {
      navigator.clipboard.writeText(safeReg.partyId);
      toast({ title: 'COPIED TO CLIPBOARD' });
    }
  };

  const handleLeaveParty = async () => {
    setProcessing(true);
    try {
      if (isPartyLeader) {
        if (myPartyMembers.length > 1) {
           throw new Error("You are the leader. Kick everyone else first or disband by having them leave.");
        }
        await updateDoc(doc(db, 'tournaments', id as string, 'parties', safeReg.partyId), { pending: [], members: [] }); // Soft delete
      }
      await updateDoc(regRef!, { partyId: null });
      toast({ title: 'LEFT PARTY' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleKick = async (playerId: string) => {
    if (!confirm("Are you sure you want to kick this player?")) return;
    setProcessing(true);
    try {
      const pRef = doc(db, 'tournaments', id as string, 'registrations', playerId);
      await updateDoc(pRef, { partyId: null });
      if (myParty) {
        await updateDoc(doc(db, 'tournaments', id as string, 'parties', safeReg.partyId), { members: arrayRemove(playerId) });
      }
      toast({ title: 'PLAYER KICKED' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleAccept = async (playerId: string) => {
    setProcessing(true);
    try {
      if (myPartyMembers.length >= 8) throw new Error("Party is full.");
      const applicant = allRegistrations?.find(r => r.id === playerId);
      if (!applicant) throw new Error("Player not found");
      if (!checkTHLimit(myPartyMembers, applicant.townHall)) throw new Error('Adding this player would exceed TH limit.');
      
      const pRef = doc(db, 'tournaments', id as string, 'registrations', playerId);
      await updateDoc(pRef, { partyId: safeReg.partyId });
      await updateDoc(doc(db, 'tournaments', id as string, 'parties', safeReg.partyId), { 
        members: arrayUnion(playerId),
        pending: arrayRemove(playerId)
      });
      toast({ title: 'PLAYER ACCEPTED' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (playerId: string) => {
    setProcessing(true);
    try {
      await updateDoc(doc(db, 'tournaments', id as string, 'parties', safeReg.partyId), { 
        pending: arrayRemove(playerId)
      });
      toast({ title: 'PLAYER REJECTED' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyToParty = async (partyIdToJoin: string) => {
    setProcessing(true);
    try {
      const partyDoc = await getDoc(doc(db, 'tournaments', id as string, 'parties', partyIdToJoin));
      if (!partyDoc.exists()) throw new Error("Party not found.");
      if (partyDoc.data().members.length >= 8) throw new Error("Party is full.");
      
      await updateDoc(doc(db, 'tournaments', id as string, 'parties', partyIdToJoin), {
        pending: arrayUnion(user?.id)
      });
      toast({ title: 'APPLICATION SENT', description: 'Waiting for the Party Leader to accept.' });
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

  const handleBuyLeaderPass = async () => {
    if (!user || processing) return;
    if (!confirm(`Are you sure you want to buy the Leader Pass for ${t.leaderPassCost} coins?`)) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/championship/buy-leader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ championshipId: id, userId: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'LEADER PASS PURCHASED!', description: 'You have been automatically assigned as a team leader.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const executeDraftPick = async (targetPartyId: string) => {
    if (!user || processing) return;
    setProcessing(true);
    try {
      const res = await fetch('/api/championship/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ championshipId: id, targetPartyId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'DRAFT SUCCESSFUL', description: `Drafted ${data.draftedCount} player(s)` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Draft Failed', description: e.message });
    } finally {
      setProcessing(false);
    }
  };

  if (tLoading || !t) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!registration && !isGhost) return <div className="text-center mt-20 text-xl font-black uppercase text-red-500">You are not registered for this championship.</div>;

  const status = t.status;
  const safeReg = registration || {} as any;
  const myPartyMembers = allRegistrations?.filter(r => r.partyId && r.partyId === safeReg.partyId) || [];
  
  const myParty = allParties?.find(p => p.id === safeReg.partyId);
  const isPartyLeader = myParty?.leaderId === user?.id;
  const pendingApplicants = allRegistrations?.filter(r => myParty?.pending?.includes(r.id)) || [];

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        {isGhost && (
          <div className="bg-red-500/20 text-red-400 border border-red-500/50 p-4 rounded-xl text-center font-black uppercase tracking-widest text-sm animate-pulse">
            SPECTATING AS GHOST (NO ACTIONS ALLOWED)
          </div>
        )}
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
        {['registration', 'upcoming', 'party_phase'].includes(status) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-white/5 rounded-3xl overflow-hidden">
              <CardHeader className="bg-black/40 border-b border-white/5"><CardTitle className="text-lg font-black uppercase">Party Management</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-6">
                {!safeReg.partyId ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Input placeholder="Enter Party Name (e.g. TEAM ALPHA)" value={createPartyName} onChange={e => setCreatePartyName(e.target.value)} disabled={isGhost} className="bg-white/5 h-12 uppercase font-black" />
                      <Button onClick={handleCreateParty} disabled={processing || isGhost || !createPartyName.trim()} className="w-full h-14 bg-blue-600 font-black uppercase glow-primary rounded-xl">CREATE A PARTY</Button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                      <div className="relative flex justify-center"><span className="bg-zinc-950 px-2 text-[10px] uppercase font-black text-muted-foreground">OR</span></div>
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Enter Party Invite Code" value={joinPartyId} onChange={e => setJoinPartyId(e.target.value)} disabled={isGhost} className="bg-white/5 h-12 uppercase" />
                      <Button onClick={() => handleJoinParty(joinPartyId)} disabled={processing || isGhost} className="h-12 bg-white text-black font-black uppercase">JOIN</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs text-green-400 font-bold uppercase">Your Party Code (Share this)</p>
                        <p className="font-mono text-sm mt-1">{safeReg.partyId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={handleShareCode} className="text-green-400 hover:bg-green-500/20"><Share2 className="w-5 h-5"/></Button>
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Party Members ({myPartyMembers.length}/8)</p>
                      <div className="space-y-2">
                        {myPartyMembers.map(m => (
                          <div key={m.id} className="bg-white/5 p-3 rounded-lg flex items-center justify-between border border-white/5 group">
                            <div className="flex items-center gap-2">
                               {m.id === myParty?.leaderId && <Crown className="w-4 h-4 text-yellow-500" />}
                               <span className="font-bold text-sm uppercase">{m.username}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <PlayerTHBadge userId={m.userId} />
                              {isPartyLeader && m.id !== user?.id && !isGhost && (
                                <button onClick={() => handleKick(m.id)} disabled={processing} className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {isPartyLeader && pendingApplicants.length > 0 && (
                      <div className="mt-6 border-t border-white/10 pt-4">
                        <p className="text-[10px] font-black uppercase text-blue-400 mb-2 flex items-center gap-2"><UserPlus className="w-3 h-3"/> Pending Applications ({pendingApplicants.length})</p>
                        <div className="space-y-2">
                           {pendingApplicants.map(p => (
                              <div key={p.id} className="bg-blue-900/20 p-3 rounded-lg flex items-center justify-between border border-blue-500/30">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm uppercase">{p.username}</span>
                                  <PlayerTHBadge userId={p.userId} />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handleAccept(p.id)} disabled={processing || isGhost} className="text-green-500 hover:text-green-400 p-1 bg-green-500/10 rounded"><CheckCircle2 className="w-5 h-5"/></button>
                                  <button onClick={() => handleReject(p.id)} disabled={processing || isGhost} className="text-red-500 hover:text-red-400 p-1 bg-red-500/10 rounded"><X className="w-5 h-5"/></button>
                                </div>
                              </div>
                           ))}
                        </div>
                      </div>
                    )}
                    
                    <Button onClick={handleLeaveParty} disabled={processing || isGhost} variant="destructive" className="w-full font-black uppercase">Leave Party</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <div className="bg-blue-600/10 border border-blue-500/20 p-6 rounded-3xl">
                <h3 className="font-black uppercase text-blue-400 flex items-center gap-2 mb-2"><Info className="w-4 h-4" /> Party Rules</h3>
                <ul className="text-sm space-y-2 text-white/70 font-medium">
                  <li>• Parties guarantee you will be drafted on the <b>same team</b> as your friends.</li>
                  <li>• Maximum party size is 8 players.</li>
                  <li>• During the Draft phase, leaders will draft entire parties at once.</li>
                  <li>• If you don't join a party, you will be drafted as a Solo player.</li>
                </ul>
              </div>
              
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl space-y-4">
                <h3 className="font-black uppercase flex items-center gap-2"><Users className="w-5 h-5"/> Public Party List</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                   {groupedPool.map(group => {
                      const party = allParties?.find(p => p.id === group.partyId);
                      const isSolo = group.members.length === 1 && !party;
                      const name = isSolo ? 'SOLO PLAYER' : (party?.name || group.partyId);
                      const canApply = !safeReg.partyId && party && party.members.length < 8 && !party.pending?.includes(user?.id);
                      
                      return (
                        <div key={group.partyId} className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col gap-3">
                           <div className="flex justify-between items-center">
                              <span className={cn("font-black text-sm uppercase", isSolo ? "text-muted-foreground" : "text-blue-400")}>{name}</span>
                              <span className="text-[10px] font-bold text-muted-foreground">{group.members.length} {isSolo ? 'PLAYER' : '/ 8 PLAYERS'}</span>
                           </div>
                           <div className="flex flex-wrap gap-2">
                             {group.members.map((m: any) => (
                               <div key={m.id} className="bg-black/40 px-2 py-1 rounded text-xs flex items-center gap-2 border border-white/5">
                                 <span className="font-bold uppercase text-[10px]">{m.username}</span> <PlayerTHBadge userId={m.userId} />
                               </div>
                             ))}
                           </div>
                           {canApply && !isGhost && (
                             <Button onClick={() => handleApplyToParty(group.partyId)} disabled={processing} size="sm" variant="secondary" className="w-full text-[10px] h-8 font-black uppercase mt-1 bg-white text-black hover:bg-gray-200">Apply to Join</Button>
                           )}
                           {party?.pending?.includes(user?.id) && !isGhost && (
                             <Badge variant="outline" className="w-full justify-center text-[10px] py-1 mt-1 text-yellow-500 border-yellow-500/50">APPLICATION PENDING</Badge>
                           )}
                        </div>
                      )
                   })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LEADER SELECTION PHASE */}
        {status === 'leader_selection' && (
          <div className="flex flex-col items-center justify-center p-12 bg-black/40 border border-white/5 rounded-3xl text-center space-y-6">
            {t.teamALeader && t.teamBLeader ? (
               <div className="space-y-6 w-full">
                 <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
                 <h2 className="text-3xl font-black uppercase text-primary tracking-widest">WAITING FOR DRAFT TO START...</h2>
                 <div className="grid grid-cols-2 gap-4 mt-8">
                   <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
                     <p className="text-[10px] uppercase font-black tracking-widest text-blue-400 mb-1">TEAM A LEADER</p>
                     <p className="text-xl font-black text-white uppercase">{allRegistrations?.find(r => r.id === t.teamALeader)?.username || 'UNKNOWN'}</p>
                   </div>
                   <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl">
                     <p className="text-[10px] uppercase font-black tracking-widest text-red-400 mb-1">TEAM B LEADER</p>
                     <p className="text-xl font-black text-white uppercase">{allRegistrations?.find(r => r.id === t.teamBLeader)?.username || 'UNKNOWN'}</p>
                   </div>
                 </div>
               </div>
            ) : (
              <>
                <ShieldAlert className="w-16 h-16 text-yellow-500" />
                <div>
                  <h2 className="text-2xl font-black uppercase">Leader Selection Phase</h2>
                  <p className="text-muted-foreground font-medium max-w-lg mt-2">The admin is currently selecting the two Team Leaders for the draft. You may apply below.</p>
                </div>
                
                <div className="flex flex-col gap-4 w-full max-w-md">
                  {(() => {
                    const freeApps = allRegistrations?.filter(r => r.appliedForLeader && !r.boughtLeaderPass && r.id !== t.teamALeader && r.id !== t.teamBLeader) || [];
                    const canApply = freeApps.length < 2;

                    return (
                      <>
                        {(!safeReg.appliedForLeader && !safeReg.boughtLeaderPass) && (
                          canApply ? (
                            <Button onClick={handleApplyLeader} disabled={processing || isGhost} className="w-full bg-white text-black hover:bg-gray-200 h-14 font-black uppercase rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)]">APPLY TO BE A LEADER (FREE)</Button>
                          ) : (
                            <Badge className="bg-zinc-800 text-zinc-400 border border-zinc-700 h-14 justify-center text-sm font-black uppercase w-full rounded-xl">APPLICATIONS FULL (2/2)</Badge>
                          )
                        )}
                        
                        {safeReg.appliedForLeader && !safeReg.boughtLeaderPass && (
                          <Badge className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 text-sm py-2 px-4 justify-center rounded-xl">APPLICATION SUBMITTED</Badge>
                        )}
                        
                        {safeReg.rejectedForLeader && (
                          <Badge className="bg-red-500/20 text-red-500 border border-red-500/50 text-sm py-2 px-4 justify-center rounded-xl">YOUR APPLICATION WAS REJECTED</Badge>
                        )}
                        
                        {t.leaderPassCost > 0 && !safeReg.boughtLeaderPass && !safeReg.bannedFromLeaderPass && (
                           <Button onClick={handleBuyLeaderPass} disabled={processing || isGhost} className="w-full bg-yellow-600 hover:bg-yellow-700 h-14 font-black uppercase rounded-xl glow-primary mt-4">BUY LEADER PASS ({t.leaderPassCost} COINS)</Button>
                        )}

                        {safeReg.boughtLeaderPass && (
                          <Badge className="bg-blue-500/20 text-blue-500 border border-blue-500/50 text-sm py-2 px-4 justify-center rounded-xl">👑 PREMIUM LEADER ACTIVATED</Badge>
                        )}

                        {safeReg.bannedFromLeaderPass && (
                          <p className="text-xs text-red-500 font-bold uppercase mt-2">Your leader pass was refunded. You cannot buy it again.</p>
                        )}

                        {freeApps.length > 0 && (
                          <div className="mt-8 text-left bg-white/5 p-4 rounded-xl border border-white/10 w-full">
                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-3">CURRENT FREE APPLICANTS ({freeApps.length}/2)</p>
                            <div className="space-y-2">
                              {freeApps.map(a => (
                                <div key={a.id} className="flex justify-between items-center bg-black/40 p-2 rounded-lg border border-white/5">
                                  <span className="font-bold text-sm uppercase text-white">{a.username}</span>
                                  <PlayerTHBadge userId={a.id} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {/* DRAFT PHASE */}
        {status === 'draft' && (() => {
          const getRemainingQuota = (teamMembers: any[]) => {
            if (!t?.thDistribution) return {};
            const quota: Record<string, number> = {};
            for (const th of Object.keys(t.thDistribution)) {
              const maxAllowed = Math.floor(t.thDistribution[th] / 2);
              const current = teamMembers.filter(m => m.townHall == th).length;
              quota[th] = maxAllowed - current;
            }
            return quota;
          };
          const teamAQuota = getRemainingQuota(teamA?.members || []);
          const teamBQuota = getRemainingQuota(teamB?.members || []);
          const currentTeamQuota = t.draftTurn === 'teamA' ? teamAQuota : teamBQuota;
          
          const canDraftParty = (partyMembers: any[]) => {
             const partyTHCounts: Record<string, number> = {};
             for (const m of partyMembers) {
                partyTHCounts[m.townHall] = (partyTHCounts[m.townHall] || 0) + 1;
             }
             for (const th of Object.keys(partyTHCounts)) {
                if ((currentTeamQuota[th] || 0) < partyTHCounts[th]) return false;
             }
             return true;
          };

          const isMyTurn = user?.id === (t.draftTurn === 'teamA' ? t.teamALeader : t.teamBLeader);
          const canDraftAny = groupedPool.some(group => canDraftParty(group.members));
          
          const handleBreakDeadlock = async () => {
              if (!confirm("This will dissolve all remaining un-drafted parties into Solo players so you can draft individually. Are you sure?")) return;
              setProcessing(true);
              try {
                await fetch('/api/championship/break-deadlock', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ championshipId: id })
                });
                toast({ title: 'PARTIES DISSOLVED' });
              } catch (e: any) {
                toast({ variant: 'destructive', title: 'Error', description: e.message });
              } finally {
                setProcessing(false);
              }
          };

          return (
            <div className="space-y-6">
              <div className="bg-black/40 border border-white/5 rounded-3xl p-6 text-center space-y-4 relative overflow-hidden">
                 <div className={cn("absolute inset-0 opacity-20", t.draftTurn === 'teamA' ? "bg-blue-600" : "bg-red-600")} />
                 <h2 className="text-2xl font-black uppercase tracking-widest text-white relative z-10 flex items-center justify-center gap-2"><Loader2 className="w-6 h-6 animate-spin" /> LIVE DRAFT IN PROGRESS</h2>
                 <p className="text-white/80 font-bold uppercase relative z-10">It is <span className={cn("px-3 py-1.5 rounded-lg text-white mx-2", t.draftTurn === 'teamA' ? 'bg-blue-600' : 'bg-red-600')}>Team {t.draftTurn === 'teamA' ? 'A' : 'B'}'s</span> turn to pick.</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <Card className={cn("glass transition-all duration-500 shadow-[0_0_20px_rgba(37,99,235,0.1)]", t.draftTurn === 'teamA' ? "border-blue-500 border-2" : "border-blue-500/20")}>
                   <CardHeader className="bg-blue-600/20 border-b border-blue-500/20"><CardTitle className="text-center font-black uppercase text-blue-400">TEAM A ({teamA?.members?.length || 0} / {Math.floor(t.totalPlayers/2)})</CardTitle></CardHeader>
                   <CardContent className="p-4 space-y-4">
                      <div className="flex flex-wrap gap-2 justify-center mb-4">
                        {Object.entries(teamAQuota).map(([th, rem]) => (
                           <Badge key={th} variant="outline" className={cn("text-[10px]", rem === 0 ? "border-white/10 text-white/20" : "border-blue-500/30 text-blue-300")}>TH{th}: {rem} LEFT</Badge>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {teamA?.members?.map((m: any) => (
                          <div key={m.userId} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center"><span className="font-bold uppercase text-sm text-blue-100">{m.username}</span><PlayerTHBadge userId={m.userId} /></div>
                        ))}
                      </div>
                   </CardContent>
                 </Card>
                 
                 <Card className={cn("glass transition-all duration-500 shadow-[0_0_20px_rgba(220,38,38,0.1)] lg:order-last", t.draftTurn === 'teamB' ? "border-red-500 border-2" : "border-red-500/20")}>
                   <CardHeader className="bg-red-600/20 border-b border-red-500/20"><CardTitle className="text-center font-black uppercase text-red-400">TEAM B ({teamB?.members?.length || 0} / {Math.floor(t.totalPlayers/2)})</CardTitle></CardHeader>
                   <CardContent className="p-4 space-y-4">
                      <div className="flex flex-wrap gap-2 justify-center mb-4">
                        {Object.entries(teamBQuota).map(([th, rem]) => (
                           <Badge key={th} variant="outline" className={cn("text-[10px]", rem === 0 ? "border-white/10 text-white/20" : "border-red-500/30 text-red-300")}>TH{th}: {rem} LEFT</Badge>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {teamB?.members?.map((m: any) => (
                          <div key={m.userId} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-center"><span className="font-bold uppercase text-sm text-red-100">{m.username}</span><PlayerTHBadge userId={m.userId} /></div>
                        ))}
                      </div>
                   </CardContent>
                 </Card>
  
                 <div className="space-y-4">
                   <div className="flex justify-between items-center">
                     <h3 className="font-black uppercase text-muted-foreground tracking-widest text-sm">AVAILABLE POOL</h3>
                     {isMyTurn && !canDraftAny && groupedPool.length > 0 && (
                        <Button onClick={handleBreakDeadlock} disabled={processing} size="sm" variant="destructive" className="h-7 text-[10px] font-black uppercase shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse">UNLOCK SOLOS (DEADLOCK)</Button>
                     )}
                   </div>
                   <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                     {groupedPool.map((group: any) => {
                       const fits = canDraftParty(group.members);
                       return (
                         <div key={group.partyId} className={cn("bg-white/5 border rounded-xl p-4 space-y-3 transition-colors", fits ? "border-white/10 hover:bg-white/10" : "border-red-500/20 opacity-50")}>
                           <div className="flex justify-between items-center">
                             <div className="flex items-center gap-2">
                               <Badge variant="outline" className="border-white/20 text-[10px] uppercase">{group.partyId === group.members[0].id ? 'SOLO' : 'PARTY OF ' + group.members.length}</Badge>
                               {!fits && <Badge variant="destructive" className="text-[9px] h-5">EXCEEDS QUOTA</Badge>}
                             </div>
                             {isMyTurn && (
                               <Button disabled={processing || !fits} size="sm" onClick={() => executeDraftPick(group.partyId)} className={cn("h-7 px-4 text-[10px] font-black uppercase", t.draftTurn === 'teamA' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700')}>DRAFT</Button>
                             )}
                           </div>
                           <div className="space-y-1.5">
                             {group.members.map((m: any) => (
                               <div key={m.id} className="flex justify-between items-center"><span className="text-xs font-bold">{m.username}</span><span className="text-[10px] font-black text-muted-foreground">TH{m.townHall}</span></div>
                             ))}
                           </div>
                         </div>
                       )
                     })}
                     {groupedPool.length === 0 && <div className="text-center p-6 text-white/40 text-xs font-black uppercase">NO PLAYERS AVAILABLE</div>}
                   </div>
                 </div>
              </div>
            </div>
          );
        })()}

        {/* BATTLE PHASE */}
        {['battle_started', 'verification', 'rewards'].includes(status) && (
          <div className="space-y-8 mt-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-headline font-black uppercase italic tracking-widest text-primary flex items-center justify-center gap-4"><Swords className="w-10 h-10 text-orange-500" /> BATTLE PHASE</h2>
              <div className="flex justify-center items-center gap-12 font-black text-3xl">
                <div className="text-blue-500 flex flex-col items-center"><span className="text-[10px] uppercase tracking-widest mb-1 text-muted-foreground">TEAM A</span><span>{teamA?.members?.reduce((a:any,b:any)=>a+b.stars,0) || 0} ⭐</span><span className="text-sm">{((teamA?.members?.reduce((a:any,b:any)=>a+b.destruction,0) || 0) / (teamA?.members?.length || 1)).toFixed(1)}%</span></div>
                <div className="text-4xl text-white/20 font-headline italic">VS</div>
                <div className="text-red-500 flex flex-col items-center"><span className="text-[10px] uppercase tracking-widest mb-1 text-muted-foreground">TEAM B</span><span>{teamB?.members?.reduce((a:any,b:any)=>a+b.stars,0) || 0} ⭐</span><span className="text-sm">{((teamB?.members?.reduce((a:any,b:any)=>a+b.destruction,0) || 0) / (teamB?.members?.length || 1)).toFixed(1)}%</span></div>
              </div>
            </div>

            <div className="space-y-2 max-w-4xl mx-auto">
              {mirrorMatchups.map((match: any, i: number) => (
                <div key={i} className="flex items-stretch bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative">
                   <div className="flex-1 p-4 bg-blue-600/5 flex justify-between items-center border-r border-white/5">
                     <div className="space-y-1">
                       <p className="font-bold text-sm uppercase text-blue-400">{match.a?.username || 'No Player'}</p>
                       <p className="text-[10px] font-black text-muted-foreground">TH {match.a?.townHall || '-'}</p>
                     </div>
                     {match.a && (
                       <div className="text-right">
                         <div className="flex gap-1 text-yellow-500 justify-end">{Array.from({length: match.a.stars}).map((_, i)=><Trophy key={i} className="w-3 h-3 fill-current"/>)}</div>
                         <p className="text-xs font-black text-white/70 mt-1">{match.a.destruction}%</p>
                       </div>
                     )}
                   </div>
                   <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-black border border-white/10 rounded-full flex items-center justify-center font-black text-[10px] italic z-10 text-white/50">VS</div>
                   <div className="flex-1 p-4 bg-red-600/5 flex justify-between items-center border-l border-white/5">
                     {match.b && (
                       <div className="text-left">
                         <div className="flex gap-1 text-yellow-500 justify-start">{Array.from({length: match.b.stars}).map((_, i)=><Trophy key={i} className="w-3 h-3 fill-current"/>)}</div>
                         <p className="text-xs font-black text-white/70 mt-1 text-left">{match.b.destruction}%</p>
                       </div>
                     )}
                     <div className="space-y-1 text-right">
                       <p className="font-bold text-sm uppercase text-red-400">{match.b?.username || 'No Player'}</p>
                       <p className="text-[10px] font-black text-muted-foreground">TH {match.b?.townHall || '-'}</p>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GLOBAL CHAT FAB */}
        <Sheet>
          <SheetTrigger asChild>
            <Button className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] bg-blue-600 hover:bg-blue-700 glow-primary z-50">
              <MessageCircle className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md p-0 border-l border-white/10 bg-zinc-950 flex flex-col">
            <SheetHeader className="p-4 border-b border-white/10 bg-blue-900/10">
              <SheetTitle className="font-black uppercase flex items-center gap-2 text-blue-400 tracking-wider text-sm"><MessageCircle className="w-4 h-4"/> Global Chat</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-hidden relative">
               <TournamentChat tournamentId={id} isActive={true} onUnreadCountChange={() => {}} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </PageWrapper>
  );
}
