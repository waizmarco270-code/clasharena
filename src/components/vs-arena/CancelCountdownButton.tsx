'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Props {
  challengeId: string;
  createdAtStr: string;
}

export function CancelCountdownButton({ challengeId, createdAtStr }: Props) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const createdAt = new Date(createdAtStr).getTime();
    const cancelTime = createdAt + 12 * 60 * 60 * 1000; // +12 hours

    const updateTimer = () => {
      const now = Date.now();
      const diff = cancelTime - now;
      if (diff <= 0) {
        setTimeLeft(0);
      } else {
        setTimeLeft(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // update every minute
    return () => clearInterval(interval);
  }, [createdAtStr]);

  const handleCancel = async () => {
    if (timeLeft === null || timeLeft > 0) return;
    
    setCancelling(true);
    try {
      const res = await fetch('/api/vs-arena/cancel-open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel');
      toast({ title: 'Challenge Cancelled', description: 'Your V-Cash has been refunded.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Cancel Failed', description: err.message });
      setCancelling(false);
    }
  };

  if (timeLeft === null) {
    return <Button disabled className="w-full mt-4 h-12 bg-white/5 text-white/50 border border-white/10 font-black tracking-widest text-sm">Loading...</Button>;
  }

  if (timeLeft > 0) {
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const mins = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    return (
      <Button disabled className="w-full mt-4 h-12 bg-white/5 text-white/50 border border-white/10 font-black tracking-widest text-sm uppercase">
        Cancel in {hours}h {mins}m
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleCancel}
      disabled={cancelling}
      className="w-full mt-4 h-12 bg-red-500 text-white hover:bg-red-600 font-black tracking-widest text-sm uppercase shadow-lg shadow-red-500/20 transition-all"
    >
      {cancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" /> Cancel & Refund</>}
    </Button>
  );
}
