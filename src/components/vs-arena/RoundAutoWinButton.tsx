'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  challengeId: string;
  roundId: string;
  mySubmittedAt: string;
}

export function RoundAutoWinButton({ challengeId, roundId, mySubmittedAt }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const submittedTime = new Date(mySubmittedAt).getTime();
    const claimTime = submittedTime + 3 * 60 * 60 * 1000; // +3 hours

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
  }, [mySubmittedAt]);

  const handleClaim = async () => {
    if (timeLeft === null || timeLeft > 0) return;
    
    setClaiming(true);
    try {
      const res = await fetch('/api/vs-arena/round/claim-timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, roundId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim auto-win');
      toast({ title: 'Round Claimed!', description: 'You won this round by timeout.' });
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
      <div className="w-full mt-2 p-2 bg-red-950/20 border border-red-500/20 rounded-lg text-center">
        <p className="text-[9px] uppercase font-black text-red-500 mb-1">Opponent Timeout In</p>
        <p className="text-xs font-black text-red-400">{hours}h {mins}m</p>
      </div>
    );
  }

  return (
    <Button 
      onClick={handleClaim}
      disabled={claiming}
      size="sm"
      className="w-full mt-2 bg-green-600 text-white hover:bg-green-700 font-black tracking-widest text-[10px] uppercase shadow-lg shadow-green-600/20 transition-all h-8"
    >
      {claiming ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Zap className="w-3 h-3 mr-1" /> Claim Auto-Win</>}
    </Button>
  );
}
