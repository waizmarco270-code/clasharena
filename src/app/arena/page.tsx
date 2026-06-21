
'use client';

import { useMemo, useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Swords, 
  Users, 
  Trophy, 
  Search, 
  Timer, 
  Info, 
  Filter, 
  ChevronRight,
  ShieldAlert,
  Loader2,
  X
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

function TournamentCard({ t }: { t: any }) {
  const [countdown, setCountdown] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('');
  const [statusColor, setStatusColor] = useState<string>('text-black');

  useEffect(() => {
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
    <Card className="overflow-hidden glass border-white/5 flex flex-col hover:border-primary/30 transition-all group relative rounded-[2rem] z-10">
      <div className="relative h-64">
        <Image 
          src={t.imageUrl || 'https://picsum.photos/seed/clash/800/600'} 
          alt={t.name} 
          fill 
          className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
          data-ai-hint="clash game"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/40" />
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge className="bg-primary px-3 py-1 uppercase font-black text-[10px] tracking-widest rounded-full shadow-lg border-t border-white/20">
            {t.subCategory.replace('_', ' ')}
          </Badge>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 py-2 flex items-center justify-center gap-3 overflow-hidden shadow-[0_-4px_20px_rgba(234,179,8,0.3)]">
           <div className="flex items-center gap-2 animate-pulse">
              <Timer className="w-4 h-4 text-black" />
              <span className="text-[9px] font-black text-black uppercase tracking-tighter leading-none">{statusText}</span>
           </div>
           <div className="h-4 w-[1px] bg-black/20" />
           <span className={`text-sm font-black ${statusColor} font-mono leading-none drop-shadow-sm`}>{countdown}</span>
        </div>
        <div className="absolute bottom-12 left-6 right-6">
          <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-[0.3em] drop-shadow-md">{t.type}</p>
          <h3 className="font-headline text-3xl font-black uppercase italic tracking-tighter text-white drop-shadow-2xl truncate leading-none">
            {t.name}
          </h3>
        </div>
      </div>
      <CardContent className="flex-1 p-6 space-y-6 bg-card/20 backdrop-blur-md">
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em]">Prize Pool</p>
            <p className="text-sm font-black text-white flex items-center gap-2">🏆 {t.prizePool}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em]">Entry Fee</p>
            <p className="text-sm font-black text-primary flex items-center gap-2">🪙 {t.entryFee}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em]">Requirement</p>
            <p className="text-[10px] font-bold text-white uppercase">{t.townHall > 0 ? `TH ${t.townHall} ONLY` : 'ALL TH LEVELS'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em]">War Start</p>
            <p className="text-[10px] font-bold text-white uppercase">{format(new Date(t.startTime), 'MMM dd, HH:mm')}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-muted-foreground">Recruitment Progress</span>
            <span className={t.currentPlayers >= t.maxPlayers ? 'text-primary' : 'text-green-500'}>
              {t.currentPlayers} / {t.maxPlayers} Warriors
            </span>
          </div>
          <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
            <div 
              className="h-full bg-gradient-to-r from-primary to-orange-600 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${(t.currentPlayers / t.maxPlayers) * 100}%` }} 
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 pt-0 bg-card/20 backdrop-blur-md">
        <Link href={`/arena/tournament/${t.id}`} className="w-full flex gap-3">
          <Button 
            className={`flex-1 font-black uppercase tracking-widest h-14 rounded-2xl transition-all text-sm ${
              regStatus === 'OPEN' 
                ? 'bg-primary hover:bg-primary/90 glow-primary text-white' 
                : 'bg-white/5 text-muted-foreground cursor-not-allowed border border-white/10'
            }`}
            disabled={regStatus !== 'OPEN'}
          >
            {regStatus === 'WAITING' ? 'REGISTRATION SOON' : 
             regStatus === 'OPEN' ? 'JOIN BATTLE' : 
             regStatus === 'FULL' ? 'ARENA FULL' : 
             regStatus === 'CLOSED' ? 'REGISTRATION CLOSED' : 'BATTLE LIVE'}
          </Button>
          <Button size="icon" variant="outline" className="h-14 w-14 rounded-2xl border-white/10 glass hover:bg-primary/10 transition-colors group relative">
             <Info className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ArenaPage() {
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [thFilter, setThFilter] = useState<number | null>(null);
  const [subCatFilter, setSubCatFilter] = useState<string | null>(null);

  // Background Image from App Settings
  const backgroundsRef = doc(db, 'app-settings', 'backgrounds');
  const { data: bgData } = useDoc(backgroundsRef);
  const arenaBg = bgData?.arena;

  const tournamentQuery = useMemo(() => {
    let q = query(collection(db, 'tournaments'), orderBy('startTime', 'asc'));
    if (activeTab !== 'all') {
      q = query(collection(db, 'tournaments'), where('type', '==', activeTab), orderBy('startTime', 'asc'));
    }
    return q;
  }, [db, activeTab]);

  const { data: tournaments, loading } = useCollection(tournamentQuery);

  const filteredTournaments = useMemo(() => {
    if (!tournaments) return [];
    return tournaments.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTH = thFilter === null || t.townHall === thFilter;
      const matchesSubCat = subCatFilter === null || t.subCategory === subCatFilter;
      return matchesSearch && matchesTH && matchesSubCat;
    });
  }, [tournaments, searchTerm, thFilter, subCatFilter]);

  const subCategories = ['knockout', '1vs1', 'tdm'];

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        {/* Dynamic Arena Background */}
        {arenaBg && (
          <div className="fixed inset-0 z-0 pointer-events-none">
            <Image src={arenaBg} alt="Arena Background" fill className="object-cover opacity-40 saturate-150" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background" />
            <div className="absolute inset-0 backdrop-blur-[2px]" />
          </div>
        )}

        <div className="relative z-10 flex flex-col gap-8">
          {/* Swipable Category Tabs */}
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2 -mx-4 px-4">
            <Button 
              onClick={() => setActiveTab('all')}
              className={`rounded-2xl font-black uppercase text-[10px] px-8 h-12 shrink-0 border-white/5 transition-all ${
                activeTab === 'all' ? 'bg-primary glow-primary' : 'bg-white/5 text-muted-foreground'
              }`}
            >
              ALL ARENAS
            </Button>
            <Button 
              onClick={() => setActiveTab('paid')}
              className={`rounded-2xl font-black uppercase text-[10px] px-8 h-12 shrink-0 border-red-500/20 transition-all ${
                activeTab === 'paid' ? 'bg-red-600 glow-primary shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-red-600/10 text-red-500 border'
              }`}
            >
              PAID BATTLES
            </Button>
            <Button 
              onClick={() => setActiveTab('free')}
              className={`rounded-2xl font-black uppercase text-[10px] px-8 h-12 shrink-0 border-blue-500/20 transition-all ${
                activeTab === 'free' ? 'bg-blue-600 glow-primary shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'bg-blue-600/10 text-blue-500 border'
              }`}
            >
              FREE TOURNAMENTS
            </Button>
            <Button 
              onClick={() => setActiveTab('championship')}
              className={`rounded-2xl font-black uppercase text-[10px] px-8 h-12 shrink-0 transition-all ${
                activeTab === 'championship' ? 'legendary-text-bg glow-primary border-yellow-500/50 border' : 'bg-orange-600/10 text-orange-500 border border-orange-500/20'
              }`}
            >
              CHAMPIONSHIP
            </Button>
          </div>

          {activeTab !== 'championship' && (
            <>
              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Find your arena..." 
                    className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl font-bold focus:ring-primary backdrop-blur-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="h-14 px-6 rounded-2xl border-white/10 glass gap-2">
                        <Filter className="w-4 h-4" /> 
                        {thFilter === null ? 'TH LEVEL' : `TH ${thFilter}`}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="glass border-white/10">
                      <DropdownMenuItem onClick={() => setThFilter(null)}>ALL LEVELS</DropdownMenuItem>
                      {[9,10,11,12,13,14,15,16,17,18].map(th => (
                        <DropdownMenuItem key={th} onClick={() => setThFilter(th)}>TH {th}</DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {(thFilter !== null || subCatFilter !== null || searchTerm !== '') && (
                    <Button 
                      variant="ghost" 
                      onClick={() => { setThFilter(null); setSubCatFilter(null); setSearchTerm(''); }}
                      className="h-14 w-14 rounded-2xl text-destructive bg-white/5"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Sub-category Swipable Carousel */}
              <div className="flex overflow-x-auto no-scrollbar gap-2 py-2">
                <Button 
                  size="sm" 
                  onClick={() => setSubCatFilter(null)}
                  className={`rounded-xl px-4 h-10 shrink-0 text-[10px] font-black uppercase ${subCatFilter === null ? 'bg-primary' : 'bg-white/5 text-muted-foreground'}`}
                >
                  ALL MODES
                </Button>
                {subCategories.map(cat => (
                  <Button 
                    key={cat}
                    size="sm" 
                    onClick={() => setSubCatFilter(cat)}
                    className={`rounded-xl px-4 h-10 shrink-0 text-[10px] font-black uppercase transition-all ${subCatFilter === cat ? 'bg-primary' : 'bg-white/5 text-muted-foreground'}`}
                  >
                    {cat.replace('_', ' ')}
                  </Button>
                ))}
              </div>

              {/* Tournament Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-96 w-full rounded-[2rem] bg-white/5 animate-pulse" />
                  ))
                ) : filteredTournaments.length === 0 ? (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="p-6 bg-white/5 rounded-full border border-white/10 backdrop-blur-xl">
                      <ShieldAlert className="w-16 h-16 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-headline text-2xl font-black uppercase italic">No Active Arenas</h3>
                      <p className="text-muted-foreground font-medium max-w-xs mx-auto">Wait for command. New tournaments will be deployed soon.</p>
                    </div>
                  </div>
                ) : (
                  filteredTournaments.map((t: any) => (
                    <TournamentCard key={t.id} t={t} />
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'championship' && (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-700">
              <div className="relative">
                <Trophy className="w-32 h-32 text-primary animate-float" />
                <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
              </div>
              <div className="space-y-4">
                <h2 className="font-headline text-5xl md:text-7xl font-black uppercase italic legendary-text tracking-tighter text-white">Legendary World Championship</h2>
                <p className="text-muted-foreground font-bold tracking-[0.4em] text-sm uppercase animate-pulse">Wait for Ultimate Glory • Coming Soon</p>
              </div>
              <div className="flex gap-4">
                 <div className="px-6 py-2 glass rounded-full border-primary/20 text-[10px] font-black text-primary tracking-widest uppercase">Elite Level Protocol</div>
                 <div className="px-6 py-2 glass rounded-full border-primary/20 text-[10px] font-black text-primary tracking-widest uppercase">Verified Results</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style jsx global>{`
        .legendary-text-bg {
          background: linear-gradient(45deg, #ff4500, #fbbf24, #ff4500);
          background-size: 200% auto;
          animation: shine 3s linear infinite;
          color: white;
        }
        @keyframes shine {
          to { background-position: 200% center; }
        }
      `}</style>
    </PageWrapper>
  );
}
