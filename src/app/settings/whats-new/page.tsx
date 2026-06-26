'use client';

import { useMemo } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Loader2 
} from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { default as NextLink } from 'next/link';
import { format } from 'date-fns';

export default function WhatsNewTimelinePage() {
  const db = useFirestore();

  const releasesQuery = useMemo(() => query(
    collection(db, 'releases'), 
    orderBy('createdAt', 'desc')
  ), [db]);
  const { data: releases, loading } = useCollection(releasesQuery);

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto space-y-8 pb-20">
        <div className="space-y-1">
          <NextLink 
            href="/settings" 
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-2"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Settings
          </NextLink>
          <h1 className="font-headline text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3 text-white">
            <Sparkles className="text-primary animate-pulse" /> WHAT'S <span className="text-primary">NEW</span>
          </h1>
          <p className="text-muted-foreground text-sm font-medium">Chronological campaign patch notes and feature deployments.</p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Gathering archive records...</p>
          </div>
        ) : !releases || releases.length === 0 ? (
          <Card className="glass border-white/5 bg-black/40 p-12 text-center">
            <CardContent className="space-y-4">
              <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto animate-pulse" />
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No Campaign Logs Recorded Yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass border-white/5 bg-black/20 p-6 sm:p-8 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-600 via-orange-500 to-transparent" />
            
            <div className="relative pl-6 border-l border-white/10 space-y-10 ml-2">
              {releases.map((release: any) => {
                const releaseDate = release.createdAt ? new Date(release.createdAt) : null;
                return (
                  <div key={release.id} className="relative group">
                    {/* Glowing circular node on axis */}
                    <div className="absolute left-[-39px] top-1.5 w-4 h-4 rounded-full border-2 border-primary bg-black flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <Badge className="bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary px-3 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase self-start sm:self-auto">
                          {release.version}
                        </Badge>
                        <h4 className="font-headline font-black text-base text-white uppercase tracking-tight group-hover:text-primary transition-colors leading-none">
                          {release.heading}
                        </h4>
                      </div>
                      
                      {releaseDate && (
                        <div className="flex items-center gap-1.5 text-[8px] font-black text-muted-foreground uppercase tracking-wider">
                          <Calendar className="w-3 h-3 text-primary" /> {format(releaseDate, 'EEEE, MMMM dd, yyyy')}
                        </div>
                      )}

                      <ul className="space-y-2 pl-1 pt-1">
                        {release.bullets?.map((bullet: string, bIdx: number) => (
                          <li key={bIdx} className="text-xs font-medium text-muted-foreground flex items-start gap-2 leading-relaxed">
                            <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
