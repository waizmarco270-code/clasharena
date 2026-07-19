'use client';

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Trophy, Crown, Coins, Ticket, Loader2, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import '@/app/badge-anime.css';

export default function RichLeaderboardPage() {
  const db = useFirestore();
  const [loading, setLoading] = useState(true);
  const [currentPlayers, setCurrentPlayers] = useState<any[]>([]);
  const [allTimePlayers, setAllTimePlayers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('current');

  useEffect(() => {
    const fetchRichest = async () => {
      // If we already have the data for the active tab, don't fetch again! (HUGE Read Saver)
      if (activeTab === 'current' && currentPlayers.length > 0) return;
      if (activeTab === 'alltime' && allTimePlayers.length > 0) return;

      setLoading(true);
      setError(null);
      try {
        const sortField = activeTab === 'current' ? 'balance' : 'totalCoinsEarned';
        const q = query(collection(db, 'users'), orderBy(sortField, 'desc'), limit(10));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (activeTab === 'current') {
          setCurrentPlayers(data);
        } else {
          setAllTimePlayers(data);
        }
      } catch (err: any) {
        console.error("Leaderboard fetch error:", err);
        if (err.message?.includes('index')) {
           setError("Firestore Index missing for this tab. Please check your console to build the index.");
        } else {
           setError("Failed to fetch leaderboard data. Network error or missing fields.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRichest();
  }, [db, activeTab, currentPlayers.length, allTimePlayers.length]);

  const players = activeTab === 'current' ? currentPlayers : allTimePlayers;

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto space-y-12 pb-20">
        
        {/* Header Hero */}
        <div className="text-center space-y-6 relative py-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-full bg-amber-500/10 rounded-[100%] blur-[100px] pointer-events-none" />
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-[0_0_50px_rgba(251,191,36,0.4)] mb-4 relative">
             <Trophy className="w-12 h-12 text-black" />
             <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-black rounded-full flex items-center justify-center border-2 border-amber-500">
               <Crown className="w-5 h-5 text-amber-500" />
             </div>
          </div>
          
          <h1 className="font-headline text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-600 drop-shadow-sm filter">
            WEALTH LEADERBOARD
          </h1>
          <p className="text-muted-foreground font-medium text-lg max-w-2xl mx-auto uppercase tracking-widest font-black">
            The Top 10 Richest Warriors in the Clash Arena Ecosystem
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-black/40 border border-white/5 h-14 w-full md:w-[400px] mx-auto flex rounded-xl p-1 mb-8">
            <TabsTrigger value="current" className="flex-1 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400 rounded-lg h-full font-black uppercase text-xs tracking-widest transition-all">
              Current Wealth
            </TabsTrigger>
            <TabsTrigger value="alltime" className="flex-1 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500 rounded-lg h-full font-black uppercase text-xs tracking-widest transition-all">
              All-Time Wealth
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 relative min-h-[400px]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/50 backdrop-blur-sm rounded-xl">
                <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
              </div>
            )}
            
            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <ShieldAlert className="w-16 h-16 text-destructive" />
                <h2 className="text-2xl font-black uppercase text-destructive">System Error</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
            )}

            {!loading && !error && players.map((player, index) => {
              const isRank1 = index === 0;
              const isRank2 = index === 1;
              const isRank3 = index === 2;
              
              let rankColor = "text-muted-foreground";
              let borderColor = "border-white/5";
              let bgClass = "bg-white/5";
              
              if (isRank1) {
                rankColor = "text-yellow-400";
                borderColor = "border-yellow-500/50";
                bgClass = "bg-yellow-500/10 glow-yellow";
              } else if (isRank2) {
                rankColor = "text-slate-300";
                borderColor = "border-slate-400/50";
                bgClass = "bg-slate-400/10";
              } else if (isRank3) {
                rankColor = "text-orange-600";
                borderColor = "border-orange-600/50";
                bgClass = "bg-orange-600/10";
              }

              // Data context switch
              const displayCoins = activeTab === 'current' ? (player.balance || 0) : (player.totalCoinsEarned || 0);
              const displayBronze = activeTab === 'current' ? (player.inventory?.bronzeTickets || 0) : (player.inventory?.totalBronzeTicketsEarned || 0);
              const displaySilver = activeTab === 'current' ? (player.inventory?.silverTickets || 0) : (player.inventory?.totalSilverTicketsEarned || 0);
              const displayGolden = activeTab === 'current' ? (player.inventory?.goldenTickets || 0) : (player.inventory?.totalGoldenTicketsEarned || 0);

              return (
                <Card 
                  key={player.id} 
                  className={cn(
                    "glass overflow-hidden relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
                    borderColor, bgClass
                  )}
                >
                  {isRank1 && <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 translate-x-[-100%] animate-shimmer pointer-events-none" />}
                  
                  <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-center gap-6">
                    
                    {/* Rank */}
                    <div className="flex-shrink-0 w-12 md:w-16 flex justify-center items-center">
                      <span className={cn("font-headline font-black text-4xl md:text-5xl italic", rankColor)}>
                        #{index + 1}
                      </span>
                    </div>

                    {/* Avatar & Info */}
                    <div className="flex-1 flex items-center gap-4 w-full">
                      <Avatar className={cn("w-16 h-16 md:w-20 md:h-20 border-2 shadow-lg", borderColor)}>
                         <AvatarImage src={player.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.id}`} />
                         <AvatarFallback className="font-black text-xl bg-black">{player.username?.substring(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className={cn("text-xl md:text-2xl font-black uppercase tracking-wide", isRank1 ? "text-yellow-400" : "text-white")}>
                            {player.username || 'Unknown Warrior'}
                          </h2>
                          {isRank1 && <Crown className="w-5 h-5 text-yellow-500 animate-pulse" />}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="border-white/10 bg-black/40 font-black">TH {player.townHall || '?'}</Badge>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                            {player.tag || '#NO-TAG'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Wealth Stats */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-end flex-shrink-0 bg-black/40 p-4 rounded-2xl border border-white/5 w-full md:w-auto">
                      
                      {/* Coin Balance */}
                      <div className="text-center md:text-right md:border-r md:border-white/10 md:pr-4">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1 flex items-center gap-1 justify-center md:justify-end">
                          <Coins className="w-3 h-3 text-amber-500" /> {activeTab === 'current' ? 'Wallet Balance' : 'Lifetime Coins'}
                        </p>
                        <p className="text-3xl font-headline font-black text-white">🪙 {displayCoins}</p>
                      </div>

                      {/* Tickets */}
                      <div className="flex gap-2">
                        <div className="flex flex-col items-center bg-white/5 p-2 rounded-lg border border-white/5 min-w-[50px]" title="Bronze Tickets">
                          <Ticket className="w-4 h-4 text-amber-600 mb-1" />
                          <span className="font-black text-sm">{displayBronze}</span>
                        </div>
                        <div className="flex flex-col items-center bg-white/5 p-2 rounded-lg border border-white/5 min-w-[50px]" title="Silver Tickets">
                          <Ticket className="w-4 h-4 text-slate-400 mb-1" />
                          <span className="font-black text-sm">{displaySilver}</span>
                        </div>
                        <div className="flex flex-col items-center bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20 min-w-[50px]" title="Golden Tickets">
                          <Crown className="w-4 h-4 text-yellow-500 mb-1" />
                          <span className="font-black text-sm text-yellow-400">{displayGolden}</span>
                        </div>
                      </div>
                    </div>
                    
                  </CardContent>
                </Card>
              );
            })}
            
            {players.length === 0 && !error && !loading && (
              <div className="text-center py-20">
                <p className="text-muted-foreground font-bold uppercase tracking-widest">The Leaderboard is completely empty.</p>
              </div>
            )}
          </div>
        </Tabs>

      </div>
    </PageWrapper>
  );
}
