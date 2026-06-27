'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, ArrowUpRight, Loader2 } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { query, collection, orderBy, limit } from 'firebase/firestore';
import Link from 'next/link';

export default function MissionArchivesPage() {
  const db = useFirestore();

  const [limitCount, setLimitCount] = useState(5);

  const historyQueryRaw = useMemo(() => query(
    collection(db, 'tournaments'), 
    orderBy('completedAt', 'desc'), 
    limit(limitCount)
  ), [db, limitCount]);
  const { data: allHistory, loading } = useCollection(historyQueryRaw);
  const completedTournaments = useMemo(() => allHistory?.filter(t => t.status === 'completed'), [allHistory]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-headline text-2xl font-bold flex items-center gap-3 uppercase italic tracking-tighter text-amber-500">
          <Star className="w-6 h-6 fill-amber-500/20" /> Mission Archives
        </h2>
        <p className="text-xs text-muted-foreground uppercase font-black tracking-wider">Registry of historical campaigns, bracket resolutions, and rewards.</p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Accessing deep archive archives...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass rounded-[2rem] overflow-hidden border-border/50 dark:border-white/5 bg-black/40">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Tournament</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Champion</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Reward Pool</TableHead>
                  <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground text-right">Phase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedTournaments?.map((t: any) => (
                  <TableRow key={t.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="font-bold uppercase text-xs max-w-[120px] truncate text-white">{t.name}</TableCell>
                    <TableCell><span className="font-black text-yellow-500 uppercase text-xs">{t.winnerName || 'Unknown'}</span></TableCell>
                    <TableCell className="font-bold text-primary text-xs">{t.prizePool}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/arena/tournament/${t.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 text-muted-foreground hover:text-white">
                          <ArrowUpRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {(!completedTournaments || completedTournaments.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 opacity-40">
                      <p className="text-xs font-black uppercase italic tracking-widest text-white">Archives Syncing...</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {allHistory && allHistory.length >= limitCount && (
            <div className="flex justify-center mt-6 mb-4">
              <Button 
                variant="outline" 
                className="glass border-white/10 hover:bg-white/5 text-white font-bold"
                onClick={() => setLimitCount(prev => prev + 5)}
              >
                Load More Archives
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
