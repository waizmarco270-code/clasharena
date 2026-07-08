'use client';

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { useUser } from '@clerk/nextjs';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Users, Coins, CheckCircle, Clock, Link2, Target, Share2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function SquadBuilderPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (!data?.referralCode) {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            await updateDoc(userRef, { referralCode: newCode });
            setReferralCode(newCode);
          } else {
            setReferralCode(data.referralCode);
          }
        }

        const refsQuery = query(
          collection(db, 'users', user.id, 'referrals'),
          orderBy('joinedAt', 'desc')
        );
        const refsSnap = await getDocs(refsQuery);
        setReferrals(refsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Failed to load referrals", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user, db]);

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: title, description: "Copied to clipboard! Share it with your clan." });
  };

  const inviteLink = referralCode 
    ? (typeof window !== 'undefined' ? `${window.location.origin}/?ref=${referralCode}` : '')
    : '';

  const handleShare = async () => {
    if (!inviteLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Clash Arena',
          text: `Use my link to join Clash Arena and we both get rewarded! Code: ${referralCode}`,
          url: inviteLink,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      copyToClipboard(inviteLink, 'Link Copied');
    }
  };

  const totalEarnings = referrals.reduce((sum, r) => sum + (r.reward || 0), 0);
  const pendingCount = referrals.filter(r => r.status === 'Pending').length;
  const completedCount = referrals.filter(r => r.status === 'Completed').length;

  return (
    <PageWrapper title="Squad Builder">
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        
        {/* Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-600 to-red-600 p-8 border border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <Users className="w-48 h-48" />
          </div>
          <div className="relative z-10 space-y-4">
            <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-white/20">
              <Target className="w-3 h-3 mr-1" /> CLAN AFFILIATE PROGRAM
            </Badge>
            <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase drop-shadow-md">
              Build Your Squad
            </h1>
            <p className="text-white/90 max-w-lg font-medium text-lg leading-snug">
              Invite your clanmates to Clash Arena. When they make their first recharge of 30 coins or more, you both get rewarded! You earn <strong className="text-yellow-400">10 Coins</strong> instantly.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass border-white/5 bg-black/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-3xl" />
            <CardHeader className="pb-2">
              <CardDescription className="uppercase font-black text-[10px] tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Coins className="w-3 h-3 text-yellow-500" /> Total Earnings
              </CardDescription>
              <CardTitle className="text-4xl font-black italic">{totalEarnings} <span className="text-lg text-muted-foreground not-italic font-normal">Coins</span></CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="glass border-white/5 bg-black/40">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase font-black text-[10px] tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-green-500" /> Successful Invites
              </CardDescription>
              <CardTitle className="text-4xl font-black italic">{completedCount}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="glass border-white/5 bg-black/40">
            <CardHeader className="pb-2">
              <CardDescription className="uppercase font-black text-[10px] tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-orange-500" /> Pending (No Recharge Yet)
              </CardDescription>
              <CardTitle className="text-4xl font-black italic">{pendingCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Share Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="glass border-white/5 bg-black/40">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase italic flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" /> Your Invite Link
              </CardTitle>
              <CardDescription>Share this direct link in your Clan's WhatsApp group.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-10 bg-white/5 animate-pulse rounded-lg" />
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 flex items-center overflow-hidden">
                    <span className="text-sm font-mono text-white truncate w-full">{inviteLink || 'Setup profile first'}</span>
                  </div>
                  <Button 
                    onClick={() => copyToClipboard(inviteLink, 'Link Copied')}
                    disabled={!inviteLink}
                    variant="outline"
                    className="h-auto px-4 border-white/10 hover:bg-white/5"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    onClick={handleShare}
                    disabled={!inviteLink}
                    className="h-auto px-6 bg-white text-black hover:bg-gray-200"
                  >
                    <Share2 className="w-4 h-4 mr-2" /> SHARE
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass border-white/5 bg-black/40">
            <CardHeader>
              <CardTitle className="text-lg font-black uppercase italic flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" /> Referral Code
              </CardTitle>
              <CardDescription>If they are already downloading the app, give them this code.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-10 bg-white/5 animate-pulse rounded-lg" />
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-center">
                    <span className="text-xl font-black tracking-widest text-white">{referralCode || 'N/A'}</span>
                  </div>
                  <Button 
                    onClick={() => copyToClipboard(referralCode || '', 'Code Copied')}
                    disabled={!referralCode}
                    variant="outline"
                    className="h-auto px-6 border-white/10 hover:bg-white/5"
                  >
                    <Copy className="w-4 h-4 mr-2" /> COPY
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Referrals List */}
        <Card className="glass border-white/5 bg-black/40">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase italic">Your Squad ({referrals.length})</CardTitle>
            <CardDescription>Track the status of players who used your link.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 animate-pulse rounded-xl" />)}
              </div>
            ) : referrals.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                <Users className="w-12 h-12 mb-4 opacity-20" />
                <p>No squad members yet.</p>
                <p className="text-xs mt-1">Share your link to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map(ref => (
                  <div key={ref.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 font-bold">
                        {ref.username ? ref.username.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{ref.username || 'Unknown Warrior'}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          Joined {new Date(ref.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {ref.status === 'Completed' ? (
                        <>
                          <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
                            +10 COINS
                          </Badge>
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        </>
                      ) : (
                        <>
                          <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/10">
                            PENDING RECHARGE
                          </Badge>
                          <Clock className="w-5 h-5 text-orange-500" />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </PageWrapper>
  );
}
