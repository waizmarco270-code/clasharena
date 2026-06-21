'use client';

import { useMemo } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Crown, Star, ArrowUpRight, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import Image from 'next/image';

export default function HallOfChampions() {
  const db = useFirestore();

  // Background Image from App Settings
  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData, loading: bgLoading } = useDoc(backgroundsRef);
  const hallBg = bgData?.hallOfChampions;

  const records = [
    {
      id: 'r1',
      champion: 'SlayerX',
      tournament: 'Winter Clash 2024',
      arena: 'TH16 Arena',
      prize: 2500,
      date: 'Feb 15, 2024',
      winRate: '92%'
    },
    {
      id: 'r2',
      champion: 'KingArthur',
      tournament: 'Dragon Legends Cup',
      arena: 'TH17 Arena',
      prize: 5000,
      date: 'Feb 12, 2024',
      winRate: '88%'
    },
    {
      id: 'r3',
      champion: 'ProClasher_99',
      tournament: 'Rookie Rumble',
      arena: 'TH15 Arena',
      prize: 1200,
      date: 'Feb 10, 2024',
      winRate: '95%'
    }
  ];

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        {/* Dynamic Background - Fixed on all devices */}
        {hallBg && (
          <div className="fixed inset-0 z-0 pointer-events-none">
            <Image 
              src={hallBg} 
              alt="Hall Background" 
              fill 
              className="object-cover opacity-60 saturate-150" 
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" />
            <div className="absolute inset-0 backdrop-blur-[1px]" />
          </div>
        )}

        <div className="relative z-10 flex flex-col gap-10">
          <div className="text-center max-w-2xl mx-auto py-12">
            <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-6 border border-primary/20">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-headline text-5xl font-black mb-4 tracking-tight uppercase leading-none text-foreground">
              Hall of <span className="text-primary italic">Champions</span>
            </h1>
            <p className="text-muted-foreground text-lg">The eternal record of the greatest warriors in the Clash Arena ecosystem.</p>
          </div>

          {/* Featured Champions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { pos: 2, name: 'SlayerX', icon: <Medal className="text-gray-400 w-8 h-8" />, color: 'border-gray-500/30' },
              { pos: 1, name: 'KingArthur', icon: <Crown className="text-yellow-500 w-12 h-12" />, color: 'border-yellow-500/30 glow-primary scale-110' },
              { pos: 3, name: 'ProClasher_99', icon: <Medal className="text-orange-600 w-8 h-8" />, color: 'border-orange-600/30' },
            ].sort((a,b) => (a.pos === 1 ? -1 : b.pos === 1 ? 1 : a.pos - b.pos)).map((champ) => (
              <Card key={champ.name} className={`glass bg-card/40 ${champ.color} border-border/50 dark:border-white/5 relative overflow-hidden group py-10`}>
                <CardContent className="flex flex-col items-center">
                  <div className="mb-6">{champ.icon}</div>
                  <Avatar className="h-24 w-24 border-4 border-border/10 mb-4 group-hover:border-primary/40 transition-all">
                    <AvatarFallback className="text-2xl font-black">{champ.name.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <h3 className="font-headline text-2xl font-bold mb-1 text-foreground">{champ.name}</h3>
                  <Badge variant="secondary" className="mb-4">Season 12 MVP</Badge>
                  <div className="grid grid-cols-2 gap-4 w-full px-6">
                    <div className="text-center p-3 bg-muted/30 rounded-xl">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Wins</p>
                      <p className="text-xl font-headline font-bold text-foreground">142</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-xl">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Earnings</p>
                      <p className="text-xl font-headline font-bold text-primary">12.4k</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Victory Records */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-2xl font-bold flex items-center gap-3 text-foreground">
                <Star className="text-primary fill-primary" /> TRANSPARENCY LEDGER
              </h2>
              <p className="text-sm text-muted-foreground hidden sm:block font-medium">All results are verified via AI Vision & Admin Audit</p>
            </div>
            
            <div className="glass rounded-2xl overflow-hidden border-border/50 dark:border-white/5">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow className="border-border/10 hover:bg-transparent">
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Tournament</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Champion</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Arena</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Prize Won</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-right">Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((row) => (
                    <TableRow key={row.id} className="border-border/10 hover:bg-muted/5 transition-colors">
                      <TableCell className="font-medium text-foreground">{row.tournament}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">{row.champion[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-foreground">{row.champion}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="border-border/20 text-foreground">{row.arena}</Badge></TableCell>
                      <TableCell className="font-bold text-primary">🪙 {row.prize}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{row.date}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="hover:text-primary">
                          <ArrowUpRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}