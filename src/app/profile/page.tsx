'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Settings, Wallet, Trophy, Swords, Zap, ExternalLink, Timer, ShieldAlert } from 'lucide-react';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import Link from 'next/link';
import { useUser } from "@clerk/nextjs";

export default function ProfilePage() {
  const { user } = useUser();
  const db = useFirestore();
  const userRef = user ? doc(db, 'users', user.id) : null;
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
                <AvatarImage src={profile?.avatarUrl || user?.imageUrl || ''} className="rounded-full object-cover" />
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
      </div>
    </PageWrapper>
  );
}