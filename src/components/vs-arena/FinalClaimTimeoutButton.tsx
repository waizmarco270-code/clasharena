'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Gavel } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  challengeId: string;
  pendingSince: string;
  myClaim: string | null;
  oppClaim: string | null;
}

export function FinalClaimTimeoutButton({ challengeId, pendingSince, myClaim, oppClaim }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!myClaim || oppClaim) {
       setTimeLeft(null);
       return;
    }
    const pendingTime = new Date(pendingSince).getTime();
    const claimTime = pendingTime + 12 * 60 * 60 * 1000; // +12 hours

    const updateTimer = () => {
      const now = Date.now();
      const diff = claimTime - now;
      if (diff <= 0) {
        setTimeLeft(0);
      } else {
        setTimeLeft(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // update every minute
    return () => clearInterval(interval);
  }, [pendingSince, myClaim, oppClaim]);

  const handleClaim = async () => {
    if (timeLeft === null || timeLeft > 0) return;
    
    setClaiming(true);
    try {
      const res = await fetch('/api/vs-arena/final-claim-timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim match');
      toast({ title: 'Match Claimed!', description: 'You won the match by timeout.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Claim Failed', description: err.message });
      setClaiming(false);
    }
  };

  if (timeLeft === null) return null;

  if (timeLeft > 0) {
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const mins = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    return (
      <div className="w-full mt-4 p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-center flex flex-col items-center justify-center">
        <p className="text-[10px] uppercase font-black text-red-500 mb-1">Opponent Timeout For Final Result</p>
        <p className="text-sm font-black text-red-400">{hours}h {mins}m</p>
      </div>
    );
  }

  return (
    <Button 
      onClick={handleClaim}
      disabled={claiming}
      className="w-full mt-4 bg-green-600 text-white hover:bg-green-700 font-black tracking-widest text-sm uppercase shadow-lg shadow-green-600/20 transition-all h-12"
    >
      {claiming ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Gavel className="w-5 h-5 mr-2" /> Force Match Win (Opponent Timeout)</>}
    </Button>
  );
}
