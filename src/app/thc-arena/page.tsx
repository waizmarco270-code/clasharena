'use client';

import { useMemo, useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Loader2, Zap, Users, ArrowRight, Trophy } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { CoinIcon } from '@/components/ui/coin-icon';

export default function ThcArenaPage() {
  const db = useFirestore();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const thcQuery = useMemo(() => query(collection(db, 'thc_tournaments'), orderBy('startTime', 'desc')), [db]);
  const { data: tournaments, loading } = useCollection(thcQuery);

  const activeTournaments = useMemo(() => tournaments?.filter(t => t.status !== 'completed') || [], [tournaments]);
  const pastTournaments = useMemo(() => tournaments?.filter(t => t.status === 'completed') || [], [tournaments]);

  const displayList = activeTab === 'upcoming' ? activeTournaments : pastTournaments;

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Hero */}
        <div className="relative rounded-3xl overflow-hidden glass border-primary/20 bg-primary/5 p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 group">
           <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5" />
           <div className="relative z-10 space-y-4 max-w-2xl">
              <Badge className="bg-primary text-black font-black uppercase tracking-widest text-xs animate-pulse">Official Esports Mode</Badge>
              <h1 className="text-4xl md:text-6xl font-headline font-black italic uppercase text-white drop-shadow-2xl">
                 Town Hall <span className="text-primary">CUP</span>
              </h1>
              <p className="text-muted-foreground font-medium text-lg max-w-xl">
                 Form your ultimate squad and compete in bracket-style team battles. Prove your dominance, crush your opponents, and claim massive prize pools!
              </p>
           </div>
           <div className="relative z-10 hidden md:block">
              <Shield className="w-48 h-48 text-primary opacity-20 group-hover:opacity-40 transition-opacity duration-1000 group-hover:scale-110" />
           </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 w-fit mx-auto md:mx-0">
           <button onClick={() => setActiveTab('upcoming')} className={`px-8 py-3 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-primary text-black shadow-lg glow-primary' : 'text-muted-foreground hover:text-white'}`}>Active Cups</button>
           <button onClick={() => setActiveTab('past')} className={`px-8 py-3 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'past' ? 'bg-white text-black shadow-lg' : 'text-muted-foreground hover:text-white'}`}>Past Cups</button>
        </div>

        {/* Tournaments Grid */}
        {loading ? (
           <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayList.map(t => (
                 <Link href={`/arena/thc/${t.id}`} key={t.id} className="block group">
                    <Card className="glass border-white/5 overflow-hidden hover:border-primary/50 transition-all duration-300 relative h-full flex flex-col">
                       {/* Image Banner */}
                       <div className="relative h-48 w-full overflow-hidden">
                          <Image src={(typeof t.imageUrl === 'string' ? t.imageUrl : t.imageUrl?.url) || 'https://picsum.photos/seed/coc/600/300'} alt={t.name} fill className="object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                          
                          {/* Animated Prize Pool Badge */}
                          {t.rewards?.top1 && (
                             <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-amber-600 p-[2px] rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-pulse hover:animate-none transition-all">
                                <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-[10px] flex flex-col items-center border border-white/10">
                                   <span className="text-[9px] font-black uppercase text-yellow-500 tracking-widest leading-none mb-1">Top Prize</span>
                                   <span className="text-xl font-headline font-black text-white italic">₹ {t.rewards.top1}</span>
                                </div>
                             </div>
                          )}
                          
                          <div className="absolute bottom-4 left-4 flex gap-2">
                             <Badge className="bg-primary/90 text-black font-black uppercase text-[10px]">{t.status}</Badge>
                             <Badge variant="outline" className="bg-black/60 border-white/20 text-white font-black uppercase text-[10px] backdrop-blur-sm"><Zap className="w-3 h-3 mr-1 text-primary" /> TH {t.townHall}</Badge>
                          </div>
                       </div>
                       
                       {/* Content */}
                       <CardContent className="p-6 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                             <div>
                                <h2 className="text-2xl font-headline font-black italic uppercase text-white group-hover:text-primary transition-colors">{t.name}</h2>
                                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                                   <Users className="w-3 h-3" /> {t.mode} Battles • {t.format === 'double_elimination' ? 'Double Elim' : 'Single Elim'}
                                </p>
                             </div>
                          </div>
                          
                          {/* Prize Distribution (if exists) */}
                          {t.rewards && (
                             <div className="mt-auto pt-6 border-t border-white/5 space-y-2">
                                <div className="flex justify-between items-center bg-black/30 p-2 rounded-lg">
                                   <span className="text-[10px] font-black uppercase text-gray-400"><Trophy className="w-3 h-3 inline mr-1" /> Top 2</span>
                                   <span className="text-xs font-black text-white">₹ {t.rewards.top2 || 0}</span>
                                </div>
                                <div className="flex justify-between items-center bg-black/30 p-2 rounded-lg">
                                   <span className="text-[10px] font-black uppercase text-amber-700"><Trophy className="w-3 h-3 inline mr-1" /> Top 3</span>
                                   <span className="text-xs font-black text-white">₹ {t.rewards.top3 || 0}</span>
                                </div>
                             </div>
                          )}
                          
                          {/* Entry Fee */}
                          <div className="mt-4 flex items-center justify-between">
                             <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Team Entry</span>
                                <span className="text-sm font-black text-white flex items-center gap-1 mt-0.5">
                                   {t.entryFee === 0 ? 'FREE' : <><CoinIcon /> {t.entryFee}</>}
                                </span>
                             </div>
                             
                             <Button variant="ghost" className="group-hover:bg-primary group-hover:text-black font-black uppercase text-[10px]">
                                View Details <ArrowRight className="w-3 h-3 ml-2" />
                             </Button>
                          </div>
                       </CardContent>
                    </Card>
                 </Link>
              ))}
              
              {displayList.length === 0 && (
                 <div className="col-span-full py-20 text-center">
                    <Shield className="w-16 h-16 text-white/10 mx-auto mb-4" />
                    <h3 className="text-xl font-black uppercase text-white/50">No {activeTab} Cups</h3>
                    <p className="text-sm text-muted-foreground mt-2">Check back later for new events.</p>
                 </div>
              )}
           </div>
        )}
      </div>
    </PageWrapper>
  );
}
