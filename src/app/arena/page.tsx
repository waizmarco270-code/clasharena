'use client';

import { useMemo, useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Swords, 
  Trophy, 
  Search, 
  Timer, 
  Info, 
  Filter, 
  ShieldAlert,
  Loader2,
  X,
  History,
  Gift,
  Coins,
  IndianRupee,
  Eye,
  ChevronRight,
  ChevronLeft,
  Flame,
  Zap,
  Users,
  ShieldCheck
} from 'lucide-react';
import { useCollection, useFirestore, useBackgrounds, useProfile } from '@/firebase';
import { collection, query, orderBy, where, doc, limit } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { format, isBefore, isAfter } from 'date-fns';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { TournamentStatusBadge } from '@/components/TournamentStatusBadge';

function TournamentCard({ t, now }: { t: any, now: Date }) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const getRegistrationStatus = () => {
    if (t.status === 'completed') return 'COMPLETED';
    const now = new Date();
    const regStart = new Date(t.registrationStartTime);
    const regEnd = new Date(t.registrationEndTime);
    const battleStart = new Date(t.startTime);

    if (isBefore(now, regStart)) return 'WAITING';
    if (isAfter(now, regStart) && isBefore(now, regEnd)) {
        return t.currentPlayers >= t.maxPlayers ? 'FULL' : 'OPEN';
    }
    if (isAfter(now, regEnd) && isBefore(now, battleStart)) return 'CLOSED';
    return 'ONGOING';
  };

  const regStatus = getRegistrationStatus();

  return (
    <Card className="overflow-hidden glass border-border/50 dark:border-white/5 flex flex-col hover:border-primary/30 transition-all group relative rounded-[2.5rem] z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      <div className="relative h-72">
        <Image 
          src={t.imageUrl || 'https://picsum.photos/seed/clash/800/600'} 
          alt={t.name} 
          fill 
          className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/60" />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
           <div className="bg-black/70 backdrop-blur-xl px-4 py-2 rounded-full border border-white/20 flex items-center gap-2 shadow-lg">
              {t.rewardType === 'money' ? (
                <IndianRupee className="w-3.5 h-3.5 text-primary" />
              ) : t.rewardType === 'coin' ? (
                <Coins className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Gift className="w-3.5 h-3.5 text-primary" />
              )}
              <span className="text-[11px] font-black text-white uppercase italic tracking-wider">
                {t.rewardType === 'money' ? `₹ ${t.rewardValue}` : 
                 t.rewardType === 'coin' ? `${t.rewardValue} COINS` : 
                 t.rewardItemName}
              </span>
           </div>
           {t.rewardType === 'item' && t.rewardImageUrl && (
             <Button 
               size="sm" 
               className="h-8 px-4 rounded-full text-[10px] font-black uppercase italic bg-primary/90 hover:bg-primary text-white border-none glow-primary shadow-xl"
               onClick={(e) => { e.preventDefault(); setIsPreviewOpen(true); }}
             >
               <Eye className="w-3.5 h-3.5 mr-2" /> REWARD PREVIEW
             </Button>
           )}
        </div>

        <div className="absolute bottom-12 left-6 right-6 z-20">
          <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-[0.3em] drop-shadow-md">
            {t.type} • {t.subCategory?.replace('_', ' ')}
          </p>
          <h3 className="font-headline text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white truncate drop-shadow-2xl mb-2">
             {t.name}
          </h3>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-1.5 text-white/90 bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">TH {t.townHall || 'ANY'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/90 bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
              <Coins className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Fee: {t.entryFee === 0 ? 'FREE' : t.entryFee}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/90 bg-black/40 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
              <Users className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t.currentPlayers || 0} / {t.maxPlayers}</span>
            </div>
          </div>

          {t.status === 'completed' && (
            <div className="mt-3 flex items-center gap-2 text-[11px] font-black text-yellow-500 uppercase italic bg-black/60 w-fit px-3 py-1 rounded-lg border border-yellow-500/20">
              <Trophy className="w-3.5 h-3.5" /> Winner: {t.winnerName}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-primary/95 backdrop-blur-xl py-2.5 flex items-center justify-center gap-4 shadow-xl z-20 border-t border-white/10">
           <TournamentStatusBadge t={t} className="bg-transparent border-black/20 text-black text-[10px]" />
        </div>
      </div>

      <CardFooter className="p-6 bg-card/20 backdrop-blur-xl border-t border-white/5">
        <Link href={t.type === 'championship' ? `/arena/championship/${t.id}` : `/arena/tournament/${t.id}`} className="w-full">
          <Button 
            className={cn(
              "w-full font-black uppercase tracking-[0.2em] h-14 rounded-2xl transition-all text-sm shadow-xl",
              regStatus === 'OPEN' || regStatus === 'ONGOING' || regStatus === 'COMPLETED'
                ? 'bg-primary glow-primary text-white border-t border-white/20' 
                : 'bg-muted text-muted-foreground'
            )}
          >
            {regStatus === 'WAITING' ? 'REGISTRATION SOON' : 
             regStatus === 'OPEN' ? 'JOIN BATTLE' : 
             regStatus === 'FULL' ? 'ARENA FULL' : 
             regStatus === 'CLOSED' ? 'CLOSED' : 
             regStatus === 'ONGOING' ? 'VIEW BATTLE' : 'VIEW HISTORY'}
          </Button>
        </Link>
      </CardFooter>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="glass border-white/10 max-w-sm p-0 overflow-hidden outline-none rounded-[2rem]">
          <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/50">
            <DialogTitle className="text-sm font-black uppercase italic tracking-widest text-white">REWARD <span className="text-primary">PREVIEW</span></DialogTitle>
          </div>
          <div className="relative aspect-square w-full">
            {t.rewardImageUrl && <Image src={t.rewardImageUrl} alt="Reward Item" fill className="object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 right-8">
               <Badge className="bg-primary mb-2 shadow-lg">EPIC DROP</Badge>
               <h3 className="text-3xl font-black uppercase italic text-white drop-shadow-2xl">{t.rewardItemName}</h3>
            </div>
          </div>
          <div className="p-8 bg-black/60 flex flex-col gap-6">
             <div className="flex items-start gap-4 text-muted-foreground">
                <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
                <p className="text-[11px] font-black uppercase tracking-widest leading-relaxed">
                   This legendary reward will be granted to the Arena Champion within 24 hours of victory confirmation.
                </p>
             </div>
             <Button onClick={() => setIsPreviewOpen(false)} className="w-full h-12 bg-white text-black font-black uppercase rounded-xl hover:bg-gray-200 transition-colors">CLOSE PREVIEW</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TournamentSkeleton() {
  return (
    <Card className="overflow-hidden glass border-white/5 flex flex-col rounded-[2.5rem] shadow-2xl h-[450px]">
      <div className="relative h-72 bg-muted/20 animate-pulse">
        <div className="absolute bottom-12 left-6 right-6 space-y-3">
          <Skeleton className="h-3 w-24 bg-white/10" />
          <Skeleton className="h-8 w-48 bg-white/10" />
          <div className="flex gap-4">
             <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
             <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
      <CardFooter className="p-6 flex-1 bg-white/5">
        <Skeleton className="h-14 w-full rounded-2xl bg-white/10" />
      </CardFooter>
    </Card>
  );
}

function ChampionshipCard({ t, now }: { t: any, now: Date }) {
  const getRegistrationStatus = () => {
    if (t.status === 'completed') return 'COMPLETED';
    if (t.status !== 'registration' && t.status !== 'upcoming') return t.status.toUpperCase();
    
    const curr = now || new Date();
    const regStart = new Date(t.registrationStartTime);
    const regEnd = new Date(t.registrationEndTime);

    if (isBefore(curr, regStart)) return 'WAITING';
    if (isAfter(curr, regStart) && isBefore(curr, regEnd)) {
        return t.totalRegistered >= t.totalPlayers ? 'FULL' : 'OPEN';
    }
    return 'CLOSED';
  };

  const regStatus = getRegistrationStatus();

  return (
    <Card className="overflow-hidden glass border-orange-500/30 flex flex-col hover:border-orange-500/60 transition-all group relative rounded-[2.5rem] z-10 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
      <div className="absolute inset-0 bg-orange-500/5 mix-blend-overlay z-0 pointer-events-none" />
      <div className="relative h-80 z-10">
        <Image 
          src={t.imageUrl || 'https://picsum.photos/seed/cocchamp/800/600'} 
          alt={t.name} 
          fill 
          className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/40 to-transparent" />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
           <div className="bg-orange-600/90 backdrop-blur-xl px-4 py-2 rounded-full border border-orange-400/50 flex items-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.5)]">
              <Trophy className="w-4 h-4 text-white" />
              <span className="text-xs font-black text-white uppercase italic tracking-wider">
                CHAMPIONSHIP SERIES
              </span>
           </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 flex flex-col justify-end pointer-events-none">
          <h2 className="text-3xl font-headline font-black uppercase italic tracking-tight drop-shadow-2xl text-white mb-2 line-clamp-2">
            {t.name}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-orange-200 bg-orange-950/80 px-3 py-1.5 rounded-full border border-orange-500/30 backdrop-blur-md">
              <Users className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t.totalRegistered || 0} / {t.totalPlayers} REGISTERED</span>
            </div>
            <div className="flex items-center gap-1.5 text-orange-200 bg-orange-950/80 px-3 py-1.5 rounded-full border border-orange-500/30 backdrop-blur-md">
              <Coins className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">{t.entryFee === 0 ? 'FREE' : `${t.entryFee} COINS`}</span>
            </div>
          </div>
          {t.status === 'finished' && t.top1UserId && (
            <div className="mt-3 flex items-center gap-2 text-[11px] font-black text-yellow-500 uppercase italic bg-black/60 w-fit px-3 py-1 rounded-lg border border-yellow-500/20">
              <Trophy className="w-3.5 h-3.5" /> WINNER: {t.winnerName || 'MVP'}
            </div>
          )}
        </div>
      </div>

      <CardFooter className="p-6 bg-orange-950/20 backdrop-blur-xl border-t border-orange-500/20 z-10">
        <Link href={`/arena/championship/${t.id}`} className="w-full">
          <Button 
            className={cn(
              "w-full font-black uppercase tracking-[0.2em] h-14 rounded-2xl transition-all text-sm shadow-[0_0_20px_rgba(249,115,22,0.3)]",
              ['OPEN', 'PARTY_PHASE', 'DRAFT', 'LEADER_SELECTION', 'TEAMS_LOCKED', 'CLAN_ASSIGNED', 'BATTLE_STARTED', 'VERIFICATION'].includes(regStatus)
                ? 'bg-orange-600 hover:bg-orange-500 text-white border-t border-orange-400/50' 
                : 'bg-muted text-muted-foreground'
            )}
          >
            {regStatus.replace('_', ' ')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ArenaPage() {
  const db = useFirestore();
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState('all');
  const [activeSub, setActiveSub] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [thFilter, setThFilter] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    localStorage.setItem('last_arena_visit_time', new Date().toISOString());
    window.dispatchEvent(new Event('arena_visited'));
    
    // Single shared interval for all tournament cards
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { backgrounds: bgData } = useBackgrounds();

  const tournamentQuery = useMemo(() => {
    return query(
      collection(db, 'tournaments'), 
      orderBy('startTime', 'desc'),
      limit(20) // OPTIMIZATION: Unbounded query fixed
    );
  }, [db]);

  const { data: allTournaments, loading } = useCollection(tournamentQuery);

  const filteredTournaments = useMemo(() => {
    if (!allTournaments) return [];
    return allTournaments.filter(t => {
      // STEALTH MODE (Ghost Arena) Check
      if (t.isStealth && !profile?.isAdmin && !profile?.isSuperAdmin) {
        return false;
      }

      const matchesMain = activeTab === 'all' || t.type === activeTab || (activeTab === 'history' && t.status === 'completed');
      if (!matchesMain) return false;

      const matchesSub = activeSub === 'all' || t.subCategory === activeSub;
      if (!matchesSub) return false;

      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTH = thFilter === null || t.townHall === thFilter;
      
      if (activeTab !== 'history' && t.status === 'completed') return false;

      return matchesSearch && matchesTH;
    });
  }, [allTournaments, activeTab, activeSub, searchTerm, thFilter, profile?.isAdmin, profile?.isSuperAdmin]);

  const mainTabs = [
    { id: 'all', label: 'ALL ARENAS', color: 'bg-muted/40' },
    { id: 'paid', label: 'PAID ARENAS', color: 'bg-red-600' },
    { id: 'free', label: 'FREE ARENAS', color: 'bg-blue-600' },
    { id: 'championship', label: 'CHAMPIONSHIP', color: 'bg-orange-600 animate-float' },
  ];

  const subCategories = [
    { id: 'all', label: 'ALL MODES' },
    { id: 'knockout', label: 'KNOCKOUT' },
    { id: '1vs1', label: '1 VS 1' },
    { id: 'tdm', label: 'TEAM DEATHMATCH' },
  ];

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        {bgData?.arena && <div className="fixed-bg"><Image src={bgData.arena} alt="Arena BG" fill className="object-cover opacity-60 saturate-150" priority /><div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" /></div>}

        <div className="relative z-10 flex flex-col gap-6 md:gap-10">
          
          <div className="flex overflow-x-auto no-scrollbar gap-2 md:gap-4 pb-2">
            {mainTabs.map(tab => (
              <Button 
                key={tab.id} 
                onClick={() => { setActiveTab(tab.id); setActiveSub('all'); }} 
                className={cn(
                  "rounded-2xl font-black uppercase text-[10px] px-4 md:px-8 h-10 md:h-12 shrink-0 transition-all border-t border-white/20", 
                  activeTab === tab.id ? `${tab.color} text-white glow-primary` : 'bg-muted/40 text-muted-foreground'
                )}
              >
                {tab.id === 'championship' && <Flame className="w-3 h-3 mr-2" />}
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-3 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 ml-1">Select Battle Mode</p>
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-2 pb-2">
                      {subCategories.map(sub => (
                        <Button 
                          key={sub.id} 
                          onClick={() => setActiveSub(sub.id)}
                          variant="outline"
                          className={cn(
                            "rounded-xl font-bold uppercase text-[9px] px-4 h-9 shrink-0 transition-all backdrop-blur-md",
                            activeSub === sub.id ? 'bg-primary border-primary text-white glow-primary' : 'bg-white/5 border-white/5 text-muted-foreground'
                          )}
                        >
                          {sub.label}
                        </Button>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden" />
                  </ScrollArea>
                </div>
                
                <Button 
                  onClick={() => { setActiveTab('history'); setActiveSub('all'); }} 
                  className={cn(
                    "rounded-xl md:rounded-2xl font-black uppercase text-[10px] px-6 h-12 md:h-14 shrink-0 transition-all border-t border-white/20 bg-gradient-to-r from-gray-400 to-gray-600 text-white shadow-lg hover:scale-105 active:scale-95", 
                    activeTab === 'history' ? 'ring-2 ring-gray-400/50' : ''
                  )}
                >
                  <History className="w-4 h-4 mr-2" /> ARENA HISTORY
                </Button>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input placeholder="Find your arena..." className="pl-12 h-12 md:h-14 bg-muted/20 border-border/50 rounded-xl md:rounded-2xl font-bold backdrop-blur-md" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-12 md:h-14 px-6 rounded-xl md:rounded-2xl border-border/50 glass gap-2 font-black uppercase text-[10px]">
                      <Filter className="w-4 h-4" /> {thFilter === null ? 'TH LEVEL' : `TH ${thFilter}`}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="glass border-border/50">
                    <DropdownMenuItem className="font-bold uppercase text-[10px]" onClick={() => setThFilter(null)}>ALL LEVELS</DropdownMenuItem>
                    {[9,10,11,12,13,14,15,16,17,18].map(th => (
                      <DropdownMenuItem key={th} className="font-bold uppercase text-[10px]" onClick={() => setThFilter(th)}>TH {th}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-24">
                {loading ? Array.from({ length: 6 }).map((_, i) => (<TournamentSkeleton key={i} />)) : 
                 filteredTournaments.length === 0 ? (
                   <div className="col-span-full py-24 md:py-32 flex flex-col items-center justify-center text-center space-y-6 glass border-white/5 rounded-[2.5rem] md:rounded-[3rem] px-4">
                     <ShieldAlert className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground/30" />
                     <div className="space-y-2">
                        <h3 className="font-headline text-2xl md:text-3xl font-black uppercase italic">No Arenas Detected</h3>
                        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Adjust filters or check back for new battlegrounds</p>
                     </div>
                   </div>
                  ) : filteredTournaments.map((t: any) => (
                    t.type === 'championship' ? <ChampionshipCard key={t.id} t={t} now={now} /> : <TournamentCard key={t.id} t={t} now={now} />
                  ))}
              </div>
        </div>
      </div>
    </PageWrapper>
  );
}
