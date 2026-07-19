'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PingOpponentButtonProps {
  challengeId: string;
  targetUserId: string;
}

const COOLDOWN_MINUTES = 10;
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;

export function PingOpponentButton({ challengeId, targetUserId }: PingOpponentButtonProps) {
  const { toast } = useToast();
  const [isPinging, setIsPinging] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  
  const storageKey = `ping_cooldown_${challengeId}`;

  useEffect(() => {
    const checkCooldown = () => {
      const lastPing = localStorage.getItem(storageKey);
      if (lastPing) {
        const timePassed = Date.now() - parseInt(lastPing);
        if (timePassed < COOLDOWN_MS) {
          setCooldownRemaining(Math.ceil((COOLDOWN_MS - timePassed) / 1000));
        } else {
          setCooldownRemaining(0);
          localStorage.removeItem(storageKey);
        }
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [storageKey]);

  const handlePing = async () => {
    if (cooldownRemaining > 0) return;
    
    setIsPinging(true);
    try {
      const res = await fetch('/api/vs-arena/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, targetUserId })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to ping opponent.');
      
      toast({ title: 'Opponent Pinged! 🔔', description: 'A push notification has been sent to their device.' });
      localStorage.setItem(storageKey, Date.now().toString());
      setCooldownRemaining(COOLDOWN_MINUTES * 60);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Ping Failed', description: err.message });
    } finally {
      setIsPinging(false);
    }
  };

  if (cooldownRemaining > 0) {
    const m = Math.floor(cooldownRemaining / 60);
    const s = cooldownRemaining % 60;
    return (
      <Button variant="outline" disabled className="w-full mt-4 bg-white/5 border-white/10 text-xs font-bold uppercase tracking-widest text-muted-foreground h-10">
        Wait {m}m {s}s to Ping
      </Button>
    );
  }

  return (
    <Button 
      onClick={handlePing} 
      disabled={isPinging}
      variant="outline"
      className="w-full mt-4 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-widest h-10 gap-2 transition-all"
    >
      {isPinging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4 animate-bounce" />}
      Ping Opponent
    </Button>
  );
}
