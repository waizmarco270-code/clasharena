
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
  Zap
} from 'lucide-react';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, orderBy, where, doc } from 'firebase/firestore';
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

function TournamentCard({ t }: { t: any }) {
  const [countdown, setCountdown] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('');
  const [statusColor, setStatusColor] = useState<string>('text-black');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (t.status === 'completed') {
      setCountdown('COMPLETED');
      setStatusText('ARENA FINALIZED');
      setStatusColor('text-black');
      return;
    }
    const timer = setInterval(() => {
      const now = new Date();
      const regStart = new Date(t.registrationStartTime);
      const regEnd = new Date(t.registrationEndTime);
      const battleStart = new Date(t.startTime);

      if (isBefore(now, regStart)) {
        const diff = regStart.getTime() - now.getTime();
        setCountdown(formatDiff(diff));
        setStatusText('REGISTRATION OPENS IN');
        setStatusColor('text-black');
      } else if (isAfter(now, regStart) && isBefore(now, regEnd)) {
        if (t.currentPlayers >= t.maxPlayers) {
          setCountdown('SOLD OUT');
          setStatusText('ARENA FULL');
          setStatusColor('text-red-600');
        } else {
          const diff = regEnd.getTime() - now.getTime();
          setCountdown(formatDiff(diff));
          setStatusText('REGISTRATION ENDS IN');
          setStatusColor('text-black');
        }
      } else if (isAfter(now, regStart) && isBefore(now, battleStart)) {
        const diff = battleStart.getTime() - now.getTime();
        setCountdown(formatDiff(diff));
        setStatusText('BATTLE STARTS IN');
        setStatusColor('text-black');
      } else {
        setCountdown('BATTLE LIVE');
        setStatusText('ARENA ACTIVE');
        setStatusColor('text-red-600');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [t]);

  const formatDiff = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  };

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
    <Card className="overflow-hidden glass border-border/50 dark:border-white/5 flex flex-col hover:border-primary/30 transition-all group relative rounded-[2rem] z-10">
      <div className="relative h-64">
        <Image src={t.imageUrl || 'https://picsum.photos/seed/clash/800/600'} alt={t.name} fill className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/40" />
        
        {/* Reward Badge Overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
           <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
              {t.rewardType === 'money' ? (
                <IndianRupee className="w-3 h-3 text-primary" />
              ) : t.rewardType === 'coin' ? (
                <Coins className="w-3 h-3 text-primary" />
              ) : (
                <Gift className="w-3 h-3 text-primary" />
              )}
              <span className="text-[10px] font-black text-white uppercase italic">
                {t.rewardType === 'money' ? `₹ ${t.rewardValue}` : 
                 t.rewardType === 'coin' ? `${t.rewardValue} COINS` : 
                 t.rewardItemName}
              </span>
           </div>
           {t.rewardType === 'item' && t.rewardImageUrl && (
             <Button 
               size="sm" 
               variant="secondary" 
               className="h-7 px-3 rounded-full text-[8px] font-black uppercase italic bg-primary/80 hover:bg-primary text-white border-none glow-primary"
               onClick={(e) => { e.preventDefault(); setIsPreviewOpen(true); }}
             >
               <Eye className="w-3 h-3 mr-1" /> REWARD PREVIEW
             </Button>
           )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 py-2 flex items-center justify-center gap-3 overflow-hidden shadow-xl">
           <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-black" />
              <span className="text-[9px] font-black text-black uppercase tracking-tighter leading-none">{statusText}</span>
           </div>
           <div className="h-4 w-[1px] bg-black/20" />
           <span className={`text-sm font-black ${statusColor} font-mono leading-none`}>{countdown}</span>
        </div>
        <div className="absolute bottom-12 left-6 right-6">
          <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-[0.3em]">{t.type} • {t.subCategory?.replace('_', ' ')}</p>
          <h3 className="font-headline text-3xl font-black uppercase italic tracking-tighter text-foreground truncate">
            {t.name}
          </h3>
          {t.status === 'completed' && (
            <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-yellow-500 uppercase italic">
              <Trophy className="w-3 h-3" /> Winner: {t.winnerName}
            </div>
          )}
        </div>
      </div>
      <CardFooter className="p-6 bg-card/20 backdrop-blur-md">
        <Link href={`/arena/tournament/${t.id}`} className="w-full">
          <Button 
            className={cn(
              "w-full font-black uppercase tracking-widest h-14 rounded-2xl transition-all text-sm",
              regStatus === 'OPEN' || regStatus === 'ONGOING' || regStatus === 'COMPLETED'
                ? 'bg-primary glow-primary text-white' 
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

      {/* Reward Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="glass border-white/10 max-w-sm p-0 overflow-hidden outline-none">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
            <DialogTitle className="text-sm font-black uppercase italic tracking-widest">REWARD <span className="text-primary">PREVIEW</span></DialogTitle>
          </div>
          <div className="relative aspect-square w-full">
            {t.rewardImageUrl && <Image src={t.rewardImageUrl} alt="Reward Item" fill className="object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
               <Badge className="bg-primary mb-2">EPIC DROP</Badge>
               <h3 className="text-2xl font-black uppercase italic text-white drop-shadow-xl">{t.rewardItemName}</h3>
            </div>
          </div>
          <div className="p-6 bg-black/40 flex flex-col gap-4">
             <div className="flex items-center gap-3 text-muted-foreground">
                <ShieldAlert className="w-5 h-5 text-primary" />
                <p className="text-[10px] font-bold uppercase">This item will be granted to the Arena Champion within 24 hours of victory.</p>
             </div>
             <Button onClick={() => setIsPreviewOpen(false)} className="w-full bg-white text-black font-black uppercase">CLOSE PREVIEW</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function ArenaPage() {
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState('all');
  const [activeSub, setActiveSub] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [thFilter, setThFilter] = useState<number | null>(null);

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);

  // Simplified query to ensure public visibility and avoid index complexies for now
  const tournamentQuery = useMemo(() => {
    return query(collection(db, 'tournaments'), orderBy('startTime', 'desc'));
  }, [db]);

  const { data: allTournaments, loading } = useCollection(tournamentQuery);

  const filteredTournaments = useMemo(() => {
    if (!allTournaments) return [];
    return allTournaments.filter(t => {
      // Visibility Check: All and current active category
      const matchesMain = activeTab === 'all' || t.type === activeTab || (activeTab === 'history' && t.status === 'completed');
      if (!matchesMain) return false;

      // Sub-category check
      const matchesSub = activeSub === 'all' || t.subCategory === activeSub;
      if (!matchesSub) return false;

      // Search and TH filters
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTH = thFilter === null || t.townHall === thFilter;
      
      // If activeTab is not history, don't show completed ones unless strictly requested
      if (activeTab !== 'history' && t.status === 'completed') return false;

      return matchesSearch && matchesTH;
    });
  }, [allTournaments, activeTab, activeSub, searchTerm, thFilter]);

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
        {bgData?.arena && <div className="fixed inset-0 z-0 pointer-events-none"><Image src={bgData.arena} alt="Arena BG" fill className="object-cover opacity-60 saturate-150" priority /><div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" /></div>}

        <div className="relative z-10 flex flex-col gap-10">
          {/* Main Category Tabs */}
          <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
            {mainTabs.map(tab => (
              <Button 
                key={tab.id} 
                onClick={() => { setActiveTab(tab.id); setActiveSub('all'); }} 
                className={cn(
                  "rounded-2xl font-black uppercase text-[10px] px-8 h-12 shrink-0 transition-all border-t border-white/20", 
                  activeTab === tab.id ? `${tab.color} text-white glow-primary` : 'bg-muted/40 text-muted-foreground'
                )}
              >
                {tab.id === 'championship' && <Flame className="w-3 h-3 mr-2" />}
                {tab.label}
              </Button>
            ))}
          </div>

          {activeTab === 'championship' ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-6 glass border-white/10 rounded-[3rem]">
               <Zap className="w-20 h-20 text-orange-500 animate-pulse" />
               <div className="text-center space-y-2">
                  <h2 className="font-headline text-5xl font-black uppercase italic tracking-tighter">COMING <span className="text-orange-500">SOON</span></h2>
                  <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">High Stakes Championship Protocol is being initialized</p>
               </div>
               <Button variant="outline" onClick={() => setActiveTab('all')} className="rounded-full border-orange-500/20 text-orange-500 font-black px-10">GO BACK</Button>
            </div>
          ) : (
            <>
              {/* Sub Category Carousel */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 ml-2">Select Battle Mode</p>
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-4 pb-4">
                    {subCategories.map(sub => (
                      <Button 
                        key={sub.id} 
                        onClick={() => setActiveSub(sub.id)}
                        variant="outline"
                        className={cn(
                          "rounded-xl font-bold uppercase text-[9px] px-6 h-10 shrink-0 transition-all backdrop-blur-md",
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

              {/* History Button - Silver Style */}
              <div className="flex justify-start">
                <Button 
                  onClick={() => { setActiveTab('history'); setActiveSub('all'); }} 
                  className={cn(
                    "rounded-2xl font-black uppercase text-[10px] px-8 h-14 shrink-0 transition-all border-t border-white/20 bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-xl hover:scale-105", 
                    activeTab === 'history' ? 'ring-4 ring-gray-400/30' : ''
                  )}
                >
                  <History className="w-4 h-4 mr-2" /> ARENA HISTORY
                </Button>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input placeholder="Find your arena..." className="pl-12 h-14 bg-muted/20 border-border/50 rounded-2xl font-bold backdrop-blur-md" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" className="h-14 px-6 rounded-2xl border-border/50 glass gap-2"><Filter className="w-4 h-4" /> {thFilter === null ? 'TH LEVEL' : `TH ${thFilter}`}</Button></DropdownMenuTrigger>
                  <DropdownMenuContent className="glass border-border/50"><DropdownMenuItem onClick={() => setThFilter(null)}>ALL LEVELS</DropdownMenuItem>{[9,10,11,12,13,14,15,16,17,18].map(th => (<DropdownMenuItem key={th} onClick={() => setThFilter(th)}>TH {th}</DropdownMenuItem>))}</DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Tournament Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-24">
                {loading ? Array.from({ length: 6 }).map((_, i) => (<div key={i} className="h-96 w-full rounded-[2rem] bg-muted/20 animate-pulse" />)) : 
                 filteredTournaments.length === 0 ? (
                   <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6 glass border-white/5 rounded-[3rem]">
                     <ShieldAlert className="w-16 h-16 text-muted-foreground/30" />
                     <div className="space-y-2">
                        <h3 className="font-headline text-3xl font-black uppercase italic">No Arenas Detected</h3>
                        <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Adjust filters or check back for new battlegrounds</p>
                     </div>
                   </div>
                 ) : filteredTournaments.map((t: any) => (<TournamentCard key={t.id} t={t} />))}
              </div>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
