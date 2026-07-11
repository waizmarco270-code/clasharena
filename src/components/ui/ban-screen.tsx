'use client';

import { useState, useEffect } from 'react';
import { Skull, AlertOctagon, Scale, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Textarea } from './textarea';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/nextjs';

export function BanScreen({ profile }: { profile: any }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [appealText, setAppealText] = useState('');
  const [appealing, setAppealing] = useState(false);
  const [isPermanent, setIsPermanent] = useState(profile.banType === 'permanent');

  // Shadow ban token injection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('CA_BLACKMARK_OWNER', profile.id);
      if (profile.banType === 'permanent') {
        localStorage.setItem('CA_BLACKMARK_EXPIRY', 'PERMANENT');
      } else if (profile.banExpiresAt) {
        localStorage.setItem('CA_BLACKMARK_EXPIRY', profile.banExpiresAt.toString());
      }
    }
  }, [profile.banType, profile.banExpiresAt, profile.id]);

  useEffect(() => {
    if (isPermanent || !profile.banExpiresAt) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const diff = profile.banExpiresAt - now;

      if (diff <= 0) {
        clearInterval(timer);
        window.location.reload(); // Reload when time is up
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [profile.banExpiresAt, isPermanent]);

  const handleSubmitAppeal = async () => {
    if (!user || appealText.trim().length < 20) {
      toast({ variant: 'destructive', title: 'Error', description: 'Appeal must be at least 20 characters.' });
      return;
    }
    setAppealing(true);
    try {
      const res = await fetch('/api/bans/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, text: appealText })
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: 'APPEAL SUBMITTED', description: 'Your appeal is under review by admins.' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
      setAppealing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-red-900/10 pointer-events-none" />
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <Skull className="w-96 h-96 text-red-500" />
      </div>

      <div className="relative z-10 w-full max-w-lg bg-black/80 backdrop-blur-2xl border border-red-500/50 p-8 rounded-3xl shadow-[0_0_100px_rgba(239,68,68,0.2)] text-center space-y-6">
        
        <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse shadow-[0_0_50px_rgba(239,68,68,0.5)]">
          <AlertOctagon className="w-12 h-12 text-red-500" />
        </div>

        <div>
          <h1 className="text-4xl font-black uppercase text-red-500 tracking-tighter italic">ACCOUNT SUSPENDED</h1>
          <p className="text-red-400 font-bold uppercase tracking-widest mt-2">
            {isPermanent ? 'PERMANENT LIFETIME BAN' : 'TEMPORARY BAN'}
          </p>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-left space-y-2">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-black uppercase text-red-400">Reason for Ban</p>
              <p className="text-sm font-medium text-red-200 mt-1">{profile.banReason || 'Violation of Fair Play Protocols.'}</p>
            </div>
          </div>
        </div>

        {!isPermanent && (
          <div className="bg-black border border-white/10 p-4 rounded-xl flex items-center justify-between">
             <div className="flex items-center gap-3">
               <Clock className="w-6 h-6 text-yellow-500" />
               <div className="text-left">
                 <p className="text-[10px] font-black uppercase text-muted-foreground">Time Remaining</p>
                 <p className="font-mono text-xl font-bold text-white">{timeLeft || 'Calculating...'}</p>
               </div>
             </div>
          </div>
        )}

        {profile.appealStatus === 'pending' ? (
           <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
             <p className="text-sm font-bold text-yellow-500 uppercase tracking-widest flex items-center justify-center gap-2">
               <Scale className="w-4 h-4" /> APPEAL UNDER REVIEW
             </p>
             <p className="text-xs text-yellow-500/70 mt-1">Please wait for admin decision.</p>
           </div>
        ) : profile.appealStatus === 'rejected' ? (
           <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
             <p className="text-sm font-bold text-red-500 uppercase tracking-widest">APPEAL REJECTED</p>
             <p className="text-xs text-red-400/70 mt-1">Admin has declined your appeal.</p>
           </div>
        ) : (
          <div className="space-y-3 pt-4 border-t border-white/5 text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
              <Scale className="w-3 h-3" /> Request Mercy
            </h3>
            <Textarea 
              placeholder="Explain your actions and apologize to the admins (Min 20 characters)..." 
              value={appealText}
              onChange={e => setAppealText(e.target.value)}
              className="bg-white/5 border-white/10 resize-none h-24 text-sm"
            />
            <Button onClick={handleSubmitAppeal} disabled={appealing || appealText.length < 20} className="w-full bg-white text-black font-black uppercase hover:bg-gray-200">
              {appealing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SUBMIT APPEAL'}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
