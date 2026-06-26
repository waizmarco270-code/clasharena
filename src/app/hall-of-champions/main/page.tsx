'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Loader2, 
  EyeOff,
  Settings
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, query, collection, orderBy, limit, updateDoc, where, getCountFromServer } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { getRankByType, RankType } from '@/lib/rank-utils';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';

export default function LeaderboardMainPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: myProfile } = useDoc(userRef);

  const isSuperAdmin = user?.id === "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16" || myProfile?.isSuperAdmin;
  const isAdmin = myProfile?.isAdmin || isSuperAdmin;

  // Retrieve top 10 users
  const championsQuery = useMemo(() => query(
    collection(db, 'users'), 
    orderBy('wins', 'desc'), 
    limit(10)
  ), [db]);
  const { data: allUsers, loading } = useCollection(championsQuery);

  const top3 = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => !u.isHidden).slice(0, 3);
  }, [allUsers]);

  const remaining7 = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => !u.isHidden).slice(3, 10);
  }, [allUsers]);

  const [myRank, setMyRank] = useState<number | null>(null);
  const [loadingRank, setLoadingRank] = useState(false);
  const [hasCheckedRank, setHasCheckedRank] = useState(false);

  const handleCheckMyRank = async () => {
    if (!user || !myProfile) return;
    setLoadingRank(true);
    try {
      const myWins = myProfile.wins || 0;
      const usersCol = collection(db, 'users');
      // Count users with wins strictly greater than current user
      const q = query(usersCol, where('wins', '>', myWins));
      const snap = await getCountFromServer(q);
      setMyRank(snap.data().count + 1);
      setHasCheckedRank(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRank(false);
    }
  };

  const handleToggleVisibility = async () => {
    if (!userRef || !myProfile) return;
    const newHidden = !myProfile.isHidden;
    await updateDoc(userRef, { isHidden: newHidden });
    toast({ 
      title: newHidden ? "GHOST MODE ACTIVE" : "PRESENCE RESTORED",
      description: newHidden ? "You are now hidden from leaderboards." : "Your victories are visible to the world."
    });
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Ghost Mode settings for Admin/Moderator */}
      {isAdmin && (
        <div className="flex justify-end pr-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleToggleVisibility}
            className={cn(
              "h-9 rounded-xl border-white/5 bg-black/40 text-xs font-black uppercase tracking-wider flex items-center gap-2 px-4",
              myProfile?.isHidden ? "text-primary border-primary/30" : "text-muted-foreground"
            )}
          >
            {myProfile?.isHidden ? <EyeOff className="w-4 h-4 text-primary" /> : <Settings className="w-4 h-4" />}
            {myProfile?.isHidden ? "GHOST MODE ON" : "LEADERBOARD PROFILE SETTINGS"}
          </Button>
        </div>
      )}

      {/* Your Rank Card */}
      {user && (
        <Card className="glass border-white/5 bg-black/40 overflow-hidden relative p-5 max-w-sm mx-auto text-center shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
          <div className="space-y-3">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Your Arena Position</h4>
            {hasCheckedRank ? (
              <div className="space-y-1">
                <p className="text-3xl font-headline font-black text-primary italic"># {myRank}</p>
                <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Based on your {myProfile?.wins || 0} victories</p>
              </div>
            ) : (
              <Button 
                onClick={handleCheckMyRank} 
                disabled={loadingRank}
                className="h-10 bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30 text-[10px] font-black uppercase rounded-xl tracking-wider w-full glow-primary"
              >
                {loadingRank ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Trophy className="w-3.5 h-3.5 mr-2" />}
                FIND MY RANK
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Podium Grid (Top 3) */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Loading champions data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {top3?.map((champ: any, i: number) => {
              const rankInfo = getRankByType(champ.activeBadge as RankType || 'ROOKIE');
              return (
                <Card 
                  key={champ.id} 
                  className={cn(
                    "glass bg-card/40 border-border/50 dark:border-white/5 relative overflow-hidden group py-10 transition-all duration-300", 
                    i === 0 ? "glow-primary md:scale-105 border-yellow-500/30" : ""
                  )}
                >
                  <CardContent className="flex flex-col items-center">
                    <div className="mb-6">
                      {i === 0 ? <Crown className="text-yellow-500 w-12 h-12" /> : <Medal className="text-gray-400 w-8 h-8" />}
                    </div>
                    <div className={cn("p-1.5 rounded-full mb-4 group-hover:scale-105 transition-transform duration-500", rankInfo.className)}>
                      <Avatar className="h-24 w-24 border-4 border-background/10">
                        <AvatarImage src={champ.avatarUrl} />
                        <AvatarFallback className="text-2xl font-black">{champ.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                      </Avatar>
                    </div>
                    <h3 className="font-headline text-2xl font-bold mb-1 text-white">{champ.username}</h3>
                    <Badge variant="secondary" className={cn("mb-4 uppercase font-black", rankInfo.className)}>{rankInfo.label} Warrior</Badge>
                    <div className="grid grid-cols-2 gap-4 w-full px-6">
                      <div className="text-center p-3 bg-muted/30 rounded-xl">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Wins</p>
                        <p className="text-xl font-headline font-bold text-white">{champ.wins || 0}</p>
                      </div>
                      <div className="text-center p-3 bg-muted/30 rounded-xl">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Played</p>
                        <p className="text-xl font-headline font-bold text-primary">{champ.tournamentsPlayed || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(!top3 || top3.length === 0) && (
              <div className="col-span-full py-20 text-center opacity-40">
                <p className="font-black uppercase tracking-widest italic text-white">Awaiting New Champions</p>
              </div>
            )}
          </div>

          {/* Leaderboard Table (Remaining 7) */}
          {remaining7.length > 0 && (
            <div className="space-y-4 pt-6">
              <h3 className="font-headline text-xl font-black uppercase italic tracking-tighter text-white">
                Contenders
              </h3>
              <Card className="glass border-white/5 overflow-hidden bg-black/40">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black uppercase text-center w-16 text-muted-foreground">Rank</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Warrior</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground">Clan Tag</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-center text-muted-foreground">TH Level</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-right text-muted-foreground">Victories</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {remaining7.map((champ: any, idx: number) => {
                      const rankInfo = getRankByType(champ.activeBadge as RankType || 'ROOKIE');
                      return (
                        <TableRow key={champ.id} className="border-white/5 hover:bg-white/5 transition-colors">
                          <TableCell className="text-center font-headline font-black text-white italic text-sm"># {idx + 4}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-white/10">
                                <AvatarImage src={champ.avatarUrl} />
                                <AvatarFallback className="text-[10px] font-black">{champ.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-xs uppercase text-white">{champ.username}</p>
                                <Badge className={cn("text-[7px] font-black uppercase px-1.5 py-0", rankInfo.className)}>
                                  {rankInfo.label}
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground uppercase">{champ.tag}</TableCell>
                          <TableCell className="text-center">
                            <span className="inline-block px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-[9px] font-black text-orange-400">
                              TH {champ.townHall || '??'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-headline font-black text-white">
                            {champ.wins || 0} Wins
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
