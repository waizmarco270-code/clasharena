import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Swords, Users, Trophy, Calendar, Filter, Search } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';
import Link from 'next/link';

export default function ArenaPage() {
  const tournaments = [
    {
      id: '1',
      name: 'Titan Clash Championship',
      category: 'TH16 Arena',
      fee: 50,
      prize: 2000,
      players: 32,
      maxPlayers: 32,
      startTime: 'Tomorrow, 8 PM',
      status: 'Full',
      image: PlaceHolderImages.find(img => img.id === 'th16-arena')?.imageUrl
    },
    {
      id: '2',
      name: 'Rising Stars Cup',
      category: 'TH15 Arena',
      fee: 25,
      prize: 1000,
      players: 12,
      maxPlayers: 16,
      startTime: 'Sun, 4 PM',
      status: 'Open',
      image: PlaceHolderImages.find(img => img.id === 'th15-arena')?.imageUrl
    },
    {
      id: '3',
      name: 'Mystic Legends Open',
      category: 'TH17 Arena',
      fee: 100,
      prize: 5000,
      players: 28,
      maxPlayers: 32,
      startTime: 'Mon, 9 PM',
      status: 'Open',
      image: PlaceHolderImages.find(img => img.id === 'th17-arena')?.imageUrl
    }
  ];

  return (
    <PageWrapper>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-headline text-4xl font-black mb-2 tracking-tight">TOURNAMENT <span className="text-primary italic">HUB</span></h1>
            <p className="text-muted-foreground">Find your next battle and dominate the arena.</p>
          </div>
          <div className="flex gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search tournaments..." className="pl-10 glass border-white/10" />
            </div>
            <Button variant="outline" className="glass border-white/10 shrink-0">
              <Filter className="w-4 h-4 mr-2" /> Filter
            </Button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {['All', 'TH15', 'TH16', 'TH17', 'Elite'].map((cat) => (
            <Button key={cat} variant={cat === 'All' ? 'default' : 'outline'} size="sm" className="rounded-full px-6 font-bold">
              {cat}
            </Button>
          ))}
        </div>

        {/* Tournament Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tournaments.map((t) => (
            <Card key={t.id} className="overflow-hidden glass border-white/5 flex flex-col hover:border-primary/30 transition-all group">
              <div className="relative h-48">
                <Image 
                  src={t.image || ''} 
                  alt={t.name} 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-500" 
                  data-ai-hint="clash village"
                />
                <div className="absolute top-4 left-4">
                  <Badge className={t.status === 'Full' ? 'bg-secondary' : 'bg-primary'}>
                    {t.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background to-transparent">
                  <p className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">{t.category}</p>
                  <h3 className="font-headline text-xl font-bold">{t.name}</h3>
                </div>
              </div>

              <CardContent className="flex-1 p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Prize Pool</p>
                      <p className="text-sm font-bold">🪙 {t.prize}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Joined</p>
                      <p className="text-sm font-bold">{t.players} / {t.maxPlayers}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Calendar className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Starts In</p>
                      <p className="text-sm font-bold">{t.startTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Swords className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Entry Fee</p>
                      <p className="text-sm font-bold">🪙 {t.fee}</p>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 pt-0">
                <Link href={`/arena/tournament/${t.id}`} className="w-full">
                  <Button className="w-full bg-primary hover:bg-primary/90 font-bold group-hover:glow-primary" disabled={t.status === 'Full'}>
                    {t.status === 'Full' ? 'VIEW DETAILS' : 'REGISTER NOW'}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
