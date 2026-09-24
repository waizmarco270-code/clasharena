'use client';

import { useMemo, useEffect, useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Loader2, Calendar, Swords, ArrowRight } from 'lucide-react';
import { useDoc, useFirestore, useCollection } from '@/firebase';
import { doc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { useUser } from "@clerk/nextjs";
import { useRouter } from 'next/navigation';

export default function ThcSchedulePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const db = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const [myTeam, setMyTeam] = useState<any>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    const checkTeam = async () => {
      const q = query(collection(db, 'thc_teams'), where('tournamentId', '==', id), where('players', 'array-contains', user.id));
      const snaps = await getDocs(q);
      if (!snaps.empty) {
        setMyTeam({ id: snaps.docs[0].id, ...snaps.docs[0].data() });
      }
      setLoadingTeam(false);
    };
    checkTeam();
  }, [user, db, id]);

  const { data: t, loading: tLoading } = useDoc(doc(db, 'thc_tournaments', id));
  
  // We cannot use 'OR' in Firestore easily with useCollection hook for two different fields (team1Id or team2Id)
  // Instead, we will fetch all matches for the tournament and filter client-side. 
  // It's acceptable for this scope since brackets rarely exceed 100 matches.
  const matchesQuery = useMemo(() => query(collection(db, 'thc_matches'), where('tournamentId', '==', id), orderBy('matchNumber', 'asc')), [db, id]);
  const { data: allMatches, loading: mLoading } = useCollection(matchesQuery);

  const teamsQuery = useMemo(() => query(collection(db, 'thc_teams'), where('tournamentId', '==', id)), [db, id]);
  const { data: teams, loading: teamsLoading } = useCollection(teamsQuery);

  if (tLoading || loadingTeam || mLoading || teamsLoading) {
     return <PageWrapper><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></PageWrapper>;
  }

  if (!myTeam) {
     return <PageWrapper><div className="text-center py-20 text-white font-black uppercase text-xl">You are not registered in this tournament.</div></PageWrapper>;
  }

  const myMatches = allMatches?.filter(m => m.team1Id === myTeam.id || m.team2Id === myTeam.id) || [];
  const activeMatch = myMatches.find(m => m.status === 'pending' || m.status === 'live');
  const pastMatches = myMatches.filter(m => m.status === 'completed' || m.status === 'disputed').reverse();

  const getOpponent = (match: any) => {
     const oppId = match.team1Id === myTeam.id ? match.team2Id : match.team1Id;
     if (!oppId) return { name: 'TBD', logoUrl: '' };
     if (oppId === 'BYE') return { name: 'BYE', logoUrl: '' };
     return teams?.find(team => team.id === oppId) || { name: 'Unknown', logoUrl: '' };
  };

  const wins = pastMatches.filter(m => m.winnerId === myTeam.id).length;
  const losses = pastMatches.filter(m => m.winnerId && m.winnerId !== myTeam.id).length;
  const isEliminated = myTeam.status === 'eliminated';

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href={`/arena/thc/${id}`} className="inline-flex items-center text-[10px] font-black uppercase text-muted-foreground hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> BACK TO LOBBY
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div>
              <h1 className="text-3xl font-headline font-black italic uppercase text-white flex items-center gap-2">
                 <Calendar className="w-6 h-6 text-primary" /> Match Schedule
              </h1>
              <p className="text-sm text-muted-foreground mt-2">Team {myTeam.name} - View your upcoming battles.</p>
           </div>
           <div className="flex gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center min-w-[100px]">
                 <p className="text-[9px] font-black uppercase text-muted-foreground">Tournament Stats</p>
                 <p className="text-xl font-black text-white">{wins} W - {losses} L</p>
              </div>
              {!isEliminated && activeMatch && (
                 <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 text-center min-w-[100px]">
                    <p className="text-[9px] font-black uppercase text-primary">Current Bracket</p>
                    <p className="text-xl font-black text-primary">{activeMatch.bracket === 'upper' ? 'UPPER' : activeMatch.bracket === 'lower' ? 'LOWER' : 'FINALS'}</p>
                 </div>
              )}
           </div>
        </div>

        {isEliminated && (
           <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-in zoom-in duration-500">
              <h2 className="text-3xl font-headline font-black italic uppercase text-red-500 mb-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">TEAM ELIMINATED</h2>
              <p className="text-white font-bold max-w-md mx-auto">
                 You have fought bravely, but your journey in this tournament ends here. The Arena will remember your battles! ⚔️
              </p>
           </div>
        )}

        {/* Active Match */}
        {!isEliminated && (
           <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Current Mission</h3>
              {activeMatch ? (
                 <Card className="glass border-primary/40 bg-primary/10 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent" />
                    <CardContent className="p-6 relative flex flex-col md:flex-row items-center justify-between gap-6">
                       <div className="flex-1 text-center md:text-left">
                          <Badge className="bg-primary text-black font-black uppercase tracking-widest text-[9px] mb-2">{activeMatch.roundLabel}</Badge>
                          <h2 className="text-2xl font-black text-white uppercase flex items-center justify-center md:justify-start gap-3">
                             VS {getOpponent(activeMatch).name}
                          </h2>
                          <p className="text-xs text-muted-foreground mt-1 font-bold">Status: {activeMatch.status.toUpperCase()}</p>
                       </div>
                       
                       <Button onClick={() => router.push(`/arena/thc/${id}/match/${activeMatch.id}`)} className="h-14 px-8 bg-white text-black font-black uppercase text-sm rounded-xl shrink-0 group-hover:scale-105 transition-transform">
                          Enter Battle Lobby <Swords className="w-4 h-4 ml-2" />
                       </Button>
                    </CardContent>
                 </Card>
              ) : (
                 <Card className="glass border-white/5 bg-black/40">
                    <CardContent className="p-12 text-center text-muted-foreground font-black uppercase text-xs tracking-widest">
                       No active match right now. Check brackets for updates.
                    </CardContent>
                 </Card>
              )}
           </div>
        )}

        {/* Past Matches */}
        {pastMatches.length > 0 && (
           <div className="mt-12">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Past Missions</h3>
              <div className="space-y-3">
                 {pastMatches.map(match => {
                    const opp = getOpponent(match);
                    const isWin = match.winnerId === myTeam.id;
                    return (
                       <Card key={match.id} className="glass border-white/5 bg-black/40 overflow-hidden">
                          <CardContent className="p-4 flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isWin ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                   {isWin ? 'W' : 'L'}
                                </div>
                                <div>
                                   <p className="text-[10px] font-black uppercase text-muted-foreground">{match.roundLabel}</p>
                                   <p className="font-black text-white uppercase text-sm mt-0.5">VS {opp.name}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <Button variant="outline" onClick={() => router.push(`/arena/thc/${id}/match/${match.id}`)} className="bg-black/50 border-white/10 font-bold uppercase text-[10px] h-8">
                                   View Details
                                </Button>
                             </div>
                          </CardContent>
                       </Card>
                    )
                 })}
              </div>
           </div>
        )}
      </div>
    </PageWrapper>
  );
}
