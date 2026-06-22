
'use client';

import { useMemo, useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Crown, Star, ArrowUpRight, Loader2, PackageCheck, Eye, Gift, IndianRupee, Zap, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { doc, query, collection, where, orderBy, limit } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getRankByType, RankType } from '@/lib/rank-utils';

export default function HallOfChampions() {
  const db = useFirestore();

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);

  const historyQuery = useMemo(() => query(collection(db, 'tournaments'), where('status', '==', 'completed'), orderBy('completedAt', 'desc'), limit(10)), [db]);
  const { data: completedTournaments, loading } = useCollection(historyQuery);

  const championsQuery = useMemo(() => query(collection(db, 'users'), orderBy('wins', 'desc'), limit(3)), [db]);
  const { data: topChampions } = useCollection(championsQuery);

  // Victory Proofs Query
  const claimsQuery = useMemo(() => query(collection(db, 'reward-claims'), where('status', '==', 'completed'), orderBy('completedAt', 'desc'), limit(15)), [db]);
  const { data: proofs } = useCollection(claimsQuery);

  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        {bgData?.hallOfChampions && <div className="fixed inset-0 z-0 pointer-events-none"><Image src={bgData.hallOfChampions} alt="Hall BG" fill className="object-cover opacity-60 saturate-150" priority /><div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" /></div>}

        <div className="relative z-10 flex flex-col gap-10">
          <div className="text-center max-w-2xl mx-auto py-12">
            <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-6 border border-primary/20"><Trophy className="w-10 h-10 text-primary" /></div>
            <h1 className="font-headline text-5xl font-black mb-4 tracking-tight uppercase leading-none">Hall of <span className="text-primary italic">Champions</span></h1>
            <p className="text-muted-foreground text-lg">The eternal record of the greatest warriors in the Clash Arena ecosystem.</p>
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Battle Ledger */}
            <div className="space-y-6">
              <h2 className="font-headline text-2xl font-bold flex items-center gap-3 uppercase italic tracking-tighter"><Star className="text-primary fill-primary" /> Battle Ledger</h2>
              <div className="glass rounded-2xl overflow-hidden border-border/50 dark:border-white/5">
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow className="border-border/10 hover:bg-transparent">
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Tournament</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Champion</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Prize</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-right">View</TableHead>
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
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Victory Proofs */}
            <div className="space-y-6">
              <h2 className="font-headline text-2xl font-bold flex items-center gap-3 uppercase italic tracking-tighter text-green-500"><ShieldCheck className="w-6 h-6" /> Proof of Victory</h2>
              <div className="glass rounded-2xl overflow-hidden border-border/50 dark:border-white/5">
                <Table>
                  <TableHeader className="bg-green-500/5">
                    <TableRow className="border-border/10 hover:bg-transparent">
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Warrior</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Reward Won</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-right">Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proofs?.map((proof: any) => (
                      <TableRow key={proof.id} className="border-border/10 hover:bg-muted/5 transition-colors">
                        <TableCell className="font-black uppercase text-[10px]">{proof.username}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                             {proof.rewardType === 'money' ? <IndianRupee className="w-2.5 h-2.5 text-primary" /> : proof.rewardType === 'coin' ? <Zap className="w-2.5 h-2.5 text-primary" /> : <Gift className="w-2.5 h-2.5 text-primary" />}
                             <span className="text-[9px] font-black uppercase">{proof.rewardType === 'money' ? proof.rewardValue : proof.rewardItemName}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge className="bg-green-600 text-[8px] h-4 font-black">PAID ✅</Badge></TableCell>
                        <TableCell className="text-right">
                          {proof.proofImageUrl ? (
                            <Button size="icon" variant="ghost" onClick={() => setSelectedProof(proof.proofImageUrl)} className="h-8 w-8 text-primary"><Eye className="w-4 h-4" /></Button>
                          ) : (
                            <span className="text-[8px] font-bold text-muted-foreground">AUTO-CREDIT</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!proofs || proofs.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-black text-[10px] uppercase">Waiting for new champions</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="glass border-white/10 max-w-2xl">
          <DialogHeader><DialogTitle className="font-headline text-xl uppercase italic">Delivery <span className="text-primary">Receipt</span></DialogTitle></DialogHeader>
          {selectedProof && (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black">
              <Image src={selectedProof} alt="Reward Receipt" fill className="object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
