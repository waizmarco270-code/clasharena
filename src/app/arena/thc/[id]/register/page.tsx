'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, Loader2, ImagePlus, ShieldAlert, CheckCircle2, Copy, Users } from 'lucide-react';
import { useDoc, useFirestore, useProfile } from '@/firebase';
import { doc, collection, setDoc, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import Link from 'next/link';
import { useUser } from "@clerk/nextjs";
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import { useRouter } from 'next/navigation';
import { CoinIcon } from '@/components/ui/coin-icon';

export default function ThcRegisterPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const { profile } = useProfile();

  const { data: t, loading: tLoading } = useDoc(doc(db, 'thc_tournaments', id));
  
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  // Create Form
  const [form, setForm] = useState({ name: '', clanTag: '', clanLink: '', logoUrl: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [creating, setCreating] = useState(false);

  // Join Form
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Check if already in a team
  const [myTeam, setMyTeam] = useState<any>(null);
  const [checkingTeam, setCheckingTeam] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    const checkTeam = async () => {
      const q = query(collection(db, 'thc_teams'), where('tournamentId', '==', id), where('players', 'array-contains', user.id));
      const snaps = await getDocs(q);
      if (!snaps.empty) {
        setMyTeam({ id: snaps.docs[0].id, ...snaps.docs[0].data() });
      }
      setCheckingTeam(false);
    };
    checkTeam();
  }, [user, db, id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const result = await uploadToCloudinary(file, { folder: 'teams' });
      if (result && result.url) {
         setForm(prev => ({ ...prev, logoUrl: result.url }));
         toast({ title: 'Logo Uploaded' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload Failed' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!form.name || !form.clanTag || !form.clanLink || !form.logoUrl) {
      toast({ variant: 'destructive', title: 'Fill all fields and upload a logo' });
      return;
    }
    if (!profile || profile.balance < t.entryFee) {
      toast({ variant: 'destructive', title: 'Insufficient Coins', description: `You need ${t.entryFee} coins to register a team.` });
      return;
    }

    setCreating(true);
    try {
      const teamRef = doc(collection(db, 'thc_teams'));
      const teamData = {
        id: teamRef.id,
        tournamentId: id,
        name: form.name,
        clanTag: form.clanTag,
        clanLink: form.clanLink,
        logoUrl: form.logoUrl,
        captainId: user?.id,
        players: [user?.id],
        paymentStatus: 'paid', // Captain pays full
        status: 'registered',
        createdAt: new Date().toISOString()
      };

      await setDoc(teamRef, teamData);
      
      // Deduct fee from captain
      if (t.entryFee > 0) {
        await updateDoc(doc(db, 'users', user!.id), {
          balance: profile.balance - t.entryFee
        });
      }

      toast({ title: 'Team Registered!', description: 'Share your Team Code with your squad.' });
      setMyTeam(teamData);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to create team' });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!joinCode) return;
    setJoining(true);
    try {
      const q = query(collection(db, 'thc_teams'), where('id', '==', joinCode), where('tournamentId', '==', id));
      const snaps = await getDocs(q);
      if (snaps.empty) {
         toast({ variant: 'destructive', title: 'Invalid Team Code' });
         setJoining(false);
         return;
      }

      const team = snaps.docs[0].data();
      if (team.players.length >= t.teamSize) {
         toast({ variant: 'destructive', title: 'Team is full!' });
         setJoining(false);
         return;
      }

      await updateDoc(doc(db, 'thc_teams', team.id), {
         players: arrayUnion(user?.id)
      });

      toast({ title: 'Joined Team successfully!' });
      setMyTeam({ ...team, players: [...team.players, user?.id] });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to join team' });
    } finally {
      setJoining(false);
    }
  };

  const copyCode = () => {
    if (myTeam) {
      navigator.clipboard.writeText(myTeam.id);
      toast({ title: 'Team Code Copied!' });
    }
  };

  if (tLoading || checkingTeam) return <PageWrapper><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></PageWrapper>;

  if (myTeam) {
    return (
      <PageWrapper>
        <div className="max-w-2xl mx-auto space-y-6">
          <Link href={`/arena/thc/${id}`} className="inline-flex items-center text-[10px] font-black uppercase text-muted-foreground hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> BACK TO LOBBY
          </Link>
          
          <Card className="glass border-primary/30 relative overflow-hidden">
             <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />
             <CardContent className="p-8 text-center space-y-6">
                <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border-2 border-primary/50 relative">
                   <img src={(typeof myTeam.logoUrl === 'string' ? myTeam.logoUrl : myTeam.logoUrl?.url) || ''} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                   <h2 className="text-3xl font-headline font-black italic uppercase text-white">{myTeam.name}</h2>
                   <p className="text-primary font-black uppercase tracking-widest text-xs mt-1">Successfully Registered</p>
                </div>

                <div className="bg-black/50 border border-white/10 rounded-2xl p-6 space-y-4">
                   <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Your Team Invite Code</p>
                   <div className="flex items-center justify-center gap-4">
                      <code className="text-2xl font-mono font-black text-white tracking-widest bg-white/5 px-4 py-2 rounded-lg border border-white/10">
                         {myTeam.id.slice(0, 8).toUpperCase()}
                      </code>
                      <Button onClick={copyCode} variant="outline" size="icon" className="h-12 w-12 border-primary/30 text-primary hover:bg-primary/10">
                         <Copy className="w-5 h-5" />
                      </Button>
                   </div>
                   <p className="text-xs text-white/50">Share this code with your teammates to let them join your roster. Max {t.teamSize} players.</p>
                </div>
                
                <Button onClick={() => router.push(`/arena/thc/${id}`)} className="w-full h-14 bg-white text-black font-black uppercase tracking-widest text-lg rounded-xl">
                   Enter Lobby
                </Button>
             </CardContent>
          </Card>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href={`/arena/thc/${id}`} className="inline-flex items-center text-[10px] font-black uppercase text-muted-foreground hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> BACK TO LOBBY
        </Link>

        <div>
           <h1 className="text-3xl font-headline font-black italic uppercase text-white">Squad Deployment</h1>
           <p className="text-sm text-muted-foreground mt-2">Create a new team as a captain and pay the entry fee, or join an existing team using an invite code.</p>
        </div>

        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 w-fit">
           <button onClick={() => setActiveTab('create')} className={`px-6 py-2 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'create' ? 'bg-primary text-black shadow-lg' : 'text-muted-foreground hover:text-white'}`}>Create Team</button>
           <button onClick={() => setActiveTab('join')} className={`px-6 py-2 text-xs font-black uppercase rounded-lg transition-all ${activeTab === 'join' ? 'bg-white text-black shadow-lg' : 'text-muted-foreground hover:text-white'}`}>Join via Code</button>
        </div>

        {activeTab === 'create' && (
           <Card className="glass border-primary/20 bg-primary/5">
              <CardContent className="p-6 space-y-6">
                 <div className="bg-black/50 border border-primary/20 p-4 rounded-xl flex items-center justify-between">
                    <div>
                       <p className="text-[10px] font-black uppercase text-primary tracking-widest">Entry Fee Required</p>
                       <p className="text-xs text-muted-foreground mt-1">Captain pays the full fee to secure the slot.</p>
                    </div>
                    <div className="text-2xl font-black text-white flex items-center gap-2">
                       {t.entryFee === 0 ? 'FREE' : <><CoinIcon /> {t.entryFee}</>}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-bold uppercase text-white">Team Name</Label>
                       <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} className="bg-black/50 border-white/10 h-12 font-bold" placeholder="e.g. Cloud9" />
                    </div>
                    
                    <div className="space-y-2">
                       <Label className="text-xs font-bold uppercase text-white">Clan Tag (In-Game)</Label>
                       <Input value={form.clanTag} onChange={e => setForm(p => ({...p, clanTag: e.target.value}))} className="bg-black/50 border-white/10 h-12 font-bold uppercase" placeholder="#XXXXXXX" />
                    </div>

                    <div className="space-y-2">
                       <Label className="text-xs font-bold uppercase text-white">Official Clan Link</Label>
                       <Input value={form.clanLink} onChange={e => setForm(p => ({...p, clanLink: e.target.value}))} className="bg-black/50 border-white/10 h-12 font-bold" placeholder="https://link.clashofclans.com/en?action=OpenClanProfile&tag=XXXXXXX" />
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black text-muted-foreground uppercase">Team Logo</Label>
                       <div className="flex gap-4 items-center">
                          <Input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />
                          <Button onClick={() => imageInputRef.current?.click()} disabled={uploadingImage} variant="outline" className="h-16 w-16 border-dashed border-white/20 bg-black/50 hover:bg-white/5">
                             {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5 text-white/50" />}
                          </Button>
                          {form.logoUrl && (
                             <img src={typeof form.logoUrl === 'string' ? form.logoUrl : (form.logoUrl as any)?.url || ''} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-white/20" />
                          )}
                       </div>
                    </div>
                 </div>

                 <Button onClick={handleCreateTeam} disabled={creating} className="w-full h-14 bg-primary text-black font-black uppercase tracking-widest text-lg rounded-xl glow-primary">
                    {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay & Register Team`}
                 </Button>
              </CardContent>
           </Card>
        )}

        {activeTab === 'join' && (
           <Card className="glass border-white/10">
              <CardContent className="p-8 space-y-6 text-center">
                 <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                    <Users className="w-8 h-8 text-blue-400" />
                 </div>
                 <h2 className="text-2xl font-headline font-black italic uppercase text-white">Join Your Squad</h2>
                 <p className="text-sm text-muted-foreground max-w-sm mx-auto">Enter the 8-character code provided by your Team Captain to join the active roster.</p>
                 
                 <Input 
                    value={joinCode} 
                    onChange={e => setJoinCode(e.target.value)} 
                    className="h-16 text-center text-2xl font-mono font-black tracking-[0.5em] uppercase bg-black/50 border-white/20 focus:border-blue-500" 
                    placeholder="ENTER CODE"
                    maxLength={10}
                 />

                 <Button onClick={handleJoinTeam} disabled={joining || !joinCode} className="w-full h-14 bg-blue-500 text-white hover:bg-blue-600 font-black uppercase tracking-widest text-lg rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Join Roster'}
                 </Button>
              </CardContent>
           </Card>
        )}
      </div>
    </PageWrapper>
  );
}
