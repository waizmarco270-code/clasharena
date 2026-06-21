
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
  History
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
import { cn } from '@/lib/utils';

function TournamentCard({ t }: { t: any }) {
  const [countdown, setCountdown] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('');
  const [statusColor, setStatusColor] = useState<string>('text-black');

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
        <div className="absolute bottom-0 left-0 right-0 bg-yellow-500 py-2 flex items-center justify-center gap-3 overflow-hidden shadow-xl">
           <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-black" />
              <span className="text-[9px] font-black text-black uppercase tracking-tighter leading-none">{statusText}</span>
           </div>
           <div className="h-4 w-[1px] bg-black/20" />
           <span className={`text-sm font-black ${statusColor} font-mono leading-none`}>{countdown}</span>
        </div>
        <div className="absolute bottom-12 left-6 right-6">
          <p className="text-[10px] font-black text-primary mb-1 uppercase tracking-[0.3em]">{t.type}</p>
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
    </Card>
  );
}

export default function ArenaPage() {
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [thFilter, setThFilter] = useState<number | null>(null);

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);

  const tournamentQuery = useMemo(() => {
    let q = query(collection(db, 'tournaments'), orderBy('startTime', 'desc'));
    
    if (activeTab === 'history') {
      q = query(collection(db, 'tournaments'), where('status', '==', 'completed'), orderBy('startTime', 'desc'));
    } else if (activeTab !== 'all') {
      q = query(collection(db, 'tournaments'), 
        where('type', '==', activeTab), 
        where('status', '!=', 'completed'), 
        orderBy('status'), 
        orderBy('startTime', 'desc')
      );
    } else {
      q = query(collection(db, 'tournaments'), 
        where('status', '!=', 'completed'), 
        orderBy('status'), 
        orderBy('startTime', 'desc')
      );
    }
    return q;
  }, [db, activeTab]);

  const { data: tournaments, loading } = useCollection(tournamentQuery);

  const filteredTournaments = useMemo(() => {
    if (!tournaments) return [];
    return tournaments.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTH = thFilter === null || t.townHall === thFilter;
      return matchesSearch && matchesTH;
    });
  }, [tournaments, searchTerm, thFilter]);

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        {bgData?.arena && <div className="fixed inset-0 z-0 pointer-events-none"><Image src={bgData.arena} alt="Arena BG" fill className="object-cover opacity-60 saturate-150" priority /><div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" /></div>}

        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
            {['all', 'paid', 'free', 'championship', 'history'].map(tab => (
              <Button key={tab} onClick={() => setActiveTab(tab)} className={cn("rounded-2xl font-black uppercase text-[10px] px-8 h-12 shrink-0 transition-all", activeTab === tab ? 'bg-primary glow-primary text-white' : 'bg-muted/40 text-muted-foreground')}>
                {tab === 'history' ? 'ARENA HISTORY' : tab.toUpperCase() + ' ARENAS'}
              </Button>
            ))}
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {loading ? Array.from({ length: 6 }).map((_, i) => (<div key={i} className="h-96 w-full rounded-[2rem] bg-muted/20 animate-pulse" />)) : 
             filteredTournaments.length === 0 ? (
               <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6">
                 <ShieldAlert className="w-16 h-16 text-muted-foreground/30" />
                 <h3 className="font-headline text-2xl font-black uppercase italic">No Arenas Found</h3>
               </div>
             ) : filteredTournaments.map((t: any) => (<TournamentCard key={t.id} t={t} />))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
