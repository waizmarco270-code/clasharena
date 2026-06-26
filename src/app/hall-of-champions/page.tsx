'use client';

import { useMemo, useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star, 
  ArrowUpRight, 
  Loader2, 
  PackageCheck, 
  Eye, 
  Gift, 
  IndianRupee, 
  Zap, 
  ShieldCheck, 
  Settings, 
  EyeOff,
  Link as LinkIcon,
  ExternalLink,
  Camera
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, query, collection, where, orderBy, limit, updateDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getRankByType, RankType } from '@/lib/rank-utils';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';

export default function HallOfChampions() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: myProfile } = useDoc(userRef);

  const isSuperAdmin = user?.id === "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16" || myProfile?.isSuperAdmin;
  const isAdmin = myProfile?.isAdmin || isSuperAdmin;

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);

  const historyQueryRaw = useMemo(() => query(collection(db, 'tournaments'), orderBy('completedAt', 'desc'), limit(20)), [db]);
  const { data: allHistory } = useCollection(historyQueryRaw);
  const completedTournaments = useMemo(() => allHistory?.filter(t => t.status === 'completed').slice(0, 10), [allHistory]);

  const claimsQuery = useMemo(() => query(collection(db, 'reward-claims'), orderBy('createdAt', 'desc'), limit(20)), [db]);
  const { data: allClaims } = useCollection(claimsQuery);
  const verifiedClaims = useMemo(() => allClaims?.filter(c => c.status === 'completed'), [allClaims]);

  const championsQuery = useMemo(() => query(collection(db, 'users'), orderBy('wins', 'desc'), limit(20)), [db]);
  const { data: allUsers } = useCollection(championsQuery);

  const topChampions = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => !u.isHidden).slice(0, 3);
  }, [allUsers]);

  const [selectedProof, setSelectedProof] = useState<any>(null);

  const handleToggleVisibility = async () => {
    if (!userRef || !myProfile) return;
    const newHidden = !myProfile.isHidden;
    await updateDoc(userRef, { isHidden: newHidden });
    toast({ 
      title: newHidden ? "GHOST MODE ACTIVE" : "PRESENCE RESTORED",
      description: newHidden ? "You are now hidden from leadearboards." : "Your victories are visible to the world."
    });
  };

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        {bgData?.hallOfChampions && <div className="fixed-bg"><Image src={bgData.hallOfChampions} alt="Hall BG" fill className="object-cover opacity-60 saturate-150" priority /><div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" /></div>}

        <div className="relative z-10 flex flex-col gap-10">
          <div className="text-center max-w-2xl mx-auto py-12 relative">
            <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-6 border border-primary/20"><Trophy className="w-10 h-10 text-primary" /></div>
            <h1 className="font-headline text-5xl font-black mb-4 tracking-tight uppercase leading-none">Hall of <span className="text-primary italic">Champions</span></h1>
            <p className="text-muted-foreground text-lg">The eternal record of the greatest warriors in the Clash Arena ecosystem.</p>
            
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleToggleVisibility}
                className={cn(
                  "absolute top-0 right-0 h-10 w-10 rounded-xl border border-white/5 bg-white/5",
                  myProfile?.isHidden ? "text-primary animate-pulse" : "text-muted-foreground"
                )}
                title={myProfile?.isHidden ? "Unhide from Leaderboard" : "Hide from Leaderboard"}
              >
                {myProfile?.isHidden ? <EyeOff className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {topChampions?.map((champ: any, i: number) => {
              const rankInfo = getRankByType(champ.activeBadge as RankType || 'ROOKIE');
              return (
                <Card key={champ.id} className={cn("glass bg-card/40 border-border/50 dark:border-white/5 relative overflow-hidden group py-10", i === 0 ? "glow-primary scale-110 border-yellow-500/30" : "")}>
                  <CardContent className="flex flex-col items-center">
                    <div className="mb-6">{i === 0 ? <Crown className="text-yellow-500 w-12 h-12" /> : <Medal className="text-gray-400 w-8 h-8" />}</div>
                    <div className={cn("p-1.5 rounded-full mb-4 group-hover:scale-110 transition-all duration-500", rankInfo.className)}>
                      <Avatar className="h-24 w-24 border-4 border-background/10">
                        <AvatarImage src={champ.avatarUrl} />
                        <AvatarFallback className="text-2xl font-black">{champ.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                      </Avatar>
                    </div>
                    <h3 className="font-headline text-2xl font-bold mb-1">{champ.username}</h3>
                    <Badge variant="secondary" className={cn("mb-4 uppercase font-black", rankInfo.className)}>{rankInfo.label} Warrior</Badge>
                    <div className="grid grid-cols-2 gap-4 w-full px-6">
                      <div className="text-center p-3 bg-muted/30 rounded-xl"><p className="text-[10px] text-muted-foreground uppercase font-bold">Wins</p><p className="text-xl font-headline font-bold">{champ.wins || 0}</p></div>
                      <div className="text-center p-3 bg-muted/30 rounded-xl"><p className="text-[10px] text-muted-foreground uppercase font-bold">Played</p><p className="text-xl font-headline font-bold text-primary">{champ.tournamentsPlayed || 0}</p></div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(!topChampions || topChampions.length === 0) && (
              <div className="col-span-full py-20 text-center opacity-40"><p className="font-black uppercase tracking-widest italic">Awaiting New Champions</p></div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-10">
            <div className="space-y-6">
              <h2 className="font-headline text-2xl font-bold flex items-center gap-3 uppercase italic tracking-tighter text-green-500"><ShieldCheck className="w-6 h-6" /> Legend's Proof Ledger</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {verifiedClaims?.map((claim: any) => (
                     <Card key={claim.id} className="glass border-white/5 bg-black/40 overflow-hidden group hover:border-primary/40 transition-all flex flex-col">
                        <div className="relative h-40">
                           <Image src={claim.rewardImageUrl || (claim.rewardType === 'money' ? 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=400' : 'https://picsum.photos/seed/gift/400/200')} alt="Reward" fill className="object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" />
                           <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                           <div className="absolute bottom-4 left-4 flex items-center gap-2">
                              <div className="p-2 bg-primary rounded-xl">
                                {claim.rewardType === 'money' ? <IndianRupee className="w-4 h-4 text-white" /> : <Gift className="w-4 h-4 text-white" />}
                              </div>
                              <span className="text-xs font-black uppercase text-white shadow-xl">
                                {claim.rewardType === 'money' ? `₹ ${claim.rewardValue}` : claim.rewardItemName}
                              </span>
                           </div>
                        </div>
                        <CardContent className="p-6 space-y-4">
                           <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-white/10"><AvatarImage src={claim.avatarUrl} /><AvatarFallback className="text-[10px]">{claim.username ? claim.username[0] : 'W'}</AvatarFallback></Avatar>
                              <div>
                                 <p className="text-xs font-black uppercase text-white">{claim.username}</p>
                                 <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Arena Champion</p>
                              </div>
                           </div>
                           <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1">
                              <p className="text-[8px] font-black text-muted-foreground uppercase">Arena Mission</p>
                              <p className="text-[10px] font-bold text-white uppercase truncate">{claim.tournamentName}</p>
                           </div>
                           <div className="flex gap-2">
                              <Button size="sm" onClick={() => setSelectedProof(claim)} className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 h-10 text-[9px] font-black uppercase"><Eye className="w-3 h-3 mr-2" /> VIEW PROOFS</Button>
                              {claim.itemLink && (
                                <Button asChild size="sm" variant="outline" className="h-10 w-10 p-0 border-white/10"><a href={claim.itemLink} target="_blank"><LinkIcon className="w-3 h-3" /></a></Button>
                              )}
                           </div>
                        </CardContent>
                     </Card>
                  ))}
                 {(!verifiedClaims || verifiedClaims.length === 0) && (
                   <div className="col-span-full py-20 text-center glass border-dashed border-white/10 rounded-[2rem] opacity-30">
                      <PackageCheck className="w-12 h-12 mx-auto mb-4" />
                      <p className="font-black uppercase tracking-widest">Victory Proofs are being audited...</p>
                   </div>
                 )}
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="font-headline text-2xl font-bold flex items-center gap-3 uppercase italic tracking-tighter"><Star className="text-primary fill-primary" /> Mission Archives</h2>
              <div className="glass rounded-[2rem] overflow-hidden border-border/50 dark:border-white/5">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="border-border/10 hover:bg-transparent">
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Tournament</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Champion</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Reward Pool</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-right">Phase</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedTournaments?.map((t: any) => (
                      <TableRow key={t.id} className="border-border/10 hover:bg-muted/5 transition-colors">
                        <TableCell className="font-bold uppercase text-[10px] max-w-[120px] truncate">{t.name}</TableCell>
                        <TableCell><span className="font-black text-yellow-500 uppercase text-[10px]">{t.winnerName}</span></TableCell>
                        <TableCell className="font-bold text-primary text-[10px]">{t.prizePool}</TableCell>
                        <TableCell className="text-right"><Link href={`/arena/tournament/${t.id}`}><Button variant="ghost" size="sm" className="h-8 w-8"><ArrowUpRight className="w-4 h-4" /></Button></Link></TableCell>
                      </TableRow>
                    ))}
                    {(!completedTournaments || completedTournaments.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="text-center py-10 opacity-40"><p className="text-[10px] font-black uppercase italic">Archives syncing...</p></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="glass border-white/10 max-w-4xl p-0 overflow-hidden outline-none rounded-[2.5rem] flex flex-col h-[85vh]">
          <div className="bg-primary p-6 flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3">
                <Camera className="w-8 h-8 text-white" />
                <DialogTitle className="font-headline text-xl uppercase italic text-white">Victory Evidence <span className="text-white/60"># {selectedProof?.tournamentName}</span></DialogTitle>
             </div>
          </div>
          <ScrollArea className="flex-1">
             <div className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest">
                        {selectedProof?.rewardType === 'money' ? 'Screenshot 1: Admin Payment Proof' : 'Screenshot 1: Claim Screen'}
                      </Label>
                      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border-2 border-white/5 bg-black shadow-2xl">
                         {selectedProof?.proofImageUrl && <Image src={selectedProof.proofImageUrl} alt="Proof 1" fill className="object-contain" />}
                         <a href={selectedProof?.proofImageUrl} target="_blank" className="absolute top-4 right-4 bg-black/60 p-2 rounded-xl border border-white/20"><ExternalLink className="w-4 h-4 text-white" /></a>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest">
                        {selectedProof?.rewardType === 'money' ? 'Screenshot 2: Winner Receipt Proof' : 'Screenshot 2: Base Confirmation'}
                      </Label>
                      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border-2 border-white/5 bg-black shadow-2xl">
                         {selectedProof?.proofImageUrl2 && <Image src={selectedProof.proofImageUrl2} alt="Proof 2" fill className="object-contain" />}
                         <a href={selectedProof?.proofImageUrl2} target="_blank" className="absolute top-4 right-4 bg-black/60 p-2 rounded-xl border border-white/20"><ExternalLink className="w-4 h-4 text-white" /></a>
                      </div>
                   </div>
                </div>

                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-6">
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                      <div>
                         <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Champion Status</p>
                         <p className="text-sm font-black text-yellow-500 uppercase">{selectedProof?.username}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">
                           {selectedProof?.rewardType === 'money' ? 'Reward Prize' : 'Reward Item'}
                         </p>
                         <p className="text-sm font-black text-white uppercase">
                           {selectedProof?.rewardType === 'money' ? `₹ ${selectedProof?.rewardValue}` : selectedProof?.rewardItemName}
                         </p>
                      </div>
                      <div>
                         <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Victory Date</p>
                         <p className="text-sm font-black text-white uppercase">{selectedProof && new Date(selectedProof.completedAt).toLocaleDateString()}</p>
                      </div>
                   </div>
                   {selectedProof?.rewardType !== 'money' && selectedProof?.itemLink && (
                     <div className="pt-6 border-t border-white/5">
                        <p className="text-[9px] font-black uppercase text-muted-foreground mb-2">Original Giveaway Link (Audit Reference)</p>
                        <div className="bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-primary truncate">
                           {selectedProof.itemLink}
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </ScrollArea>
          <div className="p-6 border-t border-white/10 bg-black/40 text-center shrink-0">
             <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">VERIFIED BY CLASH ARENA TRANSPARENCY PROTOCOL</p>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
