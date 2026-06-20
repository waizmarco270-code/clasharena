
'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Settings, Wallet, Trophy, Swords, Zap, ExternalLink, Timer, ShieldAlert } from 'lucide-react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useUser();
  const db = useFirestore();
  const userRef = user ? doc(db, 'users', user.uid) : null;
  const { data: profile } = useDoc(userRef);

  const isLocked = profile?.profileLockedUntil ? new Date(profile.profileLockedUntil) > new Date() : false;

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Profile Banner */}
        <div className="relative rounded-3xl overflow-hidden glass border-white/5 p-6 md:p-10">
          <div className="absolute top-0 right-0 p-4 flex gap-2">
            <Link href="/setup">
              <Button variant="ghost" size="sm" className="rounded-full hover:bg-white/5 gap-2 text-xs">
                <Settings className="w-4 h-4" /> 
                {isLocked ? 'VIEW LOCK' : 'EDIT'}
              </Button>
            </Link>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-primary/20 p-1 bg-background">
                <AvatarImage src={user?.photoURL || ''} className="rounded-full object-cover" />
                <AvatarFallback className="bg-muted text-2xl font-black">
                  {profile?.username?.substring(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 -right-2 bg-primary px-3 py-1 rounded-full text-[10px] font-black italic shadow-lg">
                LEVEL {profile?.townHall || '??'}
              </div>
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="font-headline text-4xl font-black mb-1">{profile?.username || 'WARRIOR'}</h1>
              <p className="text-primary font-bold text-sm mb-4 tracking-widest">{profile?.tag || '#0000000'} • TOWN HALL {profile?.townHall}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <Badge variant="outline" className="bg-white/5 border-white/10 py-1.5 px-4 font-bold uppercase">{profile?.rank || 'ROOKIE'}</Badge>
                {isLocked && (
                  <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500 py-1.5 px-4 font-bold flex gap-2">
                    <Timer className="w-3 h-3" /> IDENTITY LOCKED
                  </Badge>
                )}
              </div>
            </div>
            <Card className="w-full md:w-auto glass border-primary/20 bg-primary/5">
              <CardContent className="p-6 flex flex-col items-center">
                <p className="text-[10px] text-muted-foreground uppercase font-black mb-1">Wallet Balance</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-3xl font-headline font-black">🪙 {profile?.balance || 0}</span>
                </div>
                <Button className="w-full bg-primary hover:bg-primary/90 font-black h-10 shadow-lg glow-primary">
                  <Wallet className="w-4 h-4 mr-2" /> RECHARGE
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Security Notice */}
        {isLocked && (
          <div className="glass border-yellow-500/20 p-4 rounded-2xl flex items-start gap-4">
            <ShieldAlert className="w-6 h-6 text-yellow-500 shrink-0 mt-1" />
            <div>
              <p className="text-sm font-bold text-yellow-500 uppercase">Identity Cooldown Active</p>
              <p className="text-xs text-muted-foreground">For security and tournament integrity, your profile details are locked. You can modify them once every 3 days.</p>
            </div>
          </div>
        )}

        {/* Career Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Tournaments', value: '42', icon: <Swords className="text-blue-500 w-4 h-4" /> },
            { label: 'Victories', value: profile?.wins || '0', icon: <Trophy className="text-yellow-500 w-4 h-4" /> },
            { label: 'Win Rate', value: '42%', icon: <Zap className="text-orange-500 w-4 h-4" /> },
            { label: 'Rank', value: '#12', icon: <Trophy className="text-primary w-4 h-4" /> },
          ].map((stat) => (
            <Card key={stat.label} className="glass border-white/5 text-center p-6 hover:border-primary/20 transition-all">
              <div className="flex justify-center mb-3">
                <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                  {stat.icon}
                </div>
              </div>
              <p className="text-2xl font-headline font-black">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* History & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass border-white/5">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2 text-xl">
                <Swords className="w-5 h-5 text-primary" /> MATCH HISTORY
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { opponent: 'DragonKing', result: 'Win', score: '3-2', tournament: 'Titan Cup', date: '2h ago' },
                { opponent: 'SlayerX', result: 'Loss', score: '1-3', tournament: 'Winter Clash', date: '1d ago' },
                { opponent: 'NoobStomper', result: 'Win', score: '3-0', tournament: 'Rising Stars', date: '3d ago' },
              ].map((match, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={`w-1 h-10 rounded-full ${match.result === 'Win' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
                    <div>
                      <p className="text-sm font-bold">vs {match.opponent}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{match.tournament}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm font-black ${match.result === 'Win' ? 'text-green-500' : 'text-red-500'}`}>{match.score}</p>
                    <p className="text-[10px] text-muted-foreground">{match.date}</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-white mt-2">
                VIEW FULL HISTORY <ExternalLink className="w-3 h-3 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-white/5">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2 text-xl">
                <Trophy className="w-5 h-5 text-primary" /> ACHIEVEMENTS
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-white/5 hover:border-primary/40 transition-all p-4 text-center group">
                  <div className="w-10 h-10 mb-2 opacity-50 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0">
                    <Trophy className="w-full h-full text-yellow-500" />
                  </div>
                  <p className="text-[8px] font-bold uppercase leading-tight text-muted-foreground group-hover:text-white">Veteran Striker</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
