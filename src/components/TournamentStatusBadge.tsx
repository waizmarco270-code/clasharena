'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Tournament {
  status?: string;
  startTime?: string;
  currentPlayers?: number;
  maxPlayers?: number;
}

export function TournamentStatusBadge({ t, className }: { t: Tournament, className?: string }) {
  const [status, setStatus] = useState<{ label: string, color: string }>({ label: 'LOADING', color: 'bg-muted' });

  useEffect(() => {
    const updateStatus = () => {
      if (t.status === 'completed') {
        setStatus({ label: 'COMPLETED', color: 'bg-zinc-800 text-zinc-400 border-zinc-700' });
        return;
      }
      if (t.status === 'cancelled') {
        setStatus({ label: 'CANCELLED', color: 'bg-red-950 text-red-500 border-red-900' });
        return;
      }

      if (t.startTime) {
        const now = new Date().getTime();
        const start = new Date(t.startTime).getTime();
        const thirtyMins = 30 * 60 * 1000;

        if (now >= start) {
          setStatus({ label: 'LIVE NOW', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50 animate-pulse' });
          return;
        }

        if (start - now <= thirtyMins) {
          setStatus({ label: 'STARTING SOON', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' });
          return;
        }
      }

      const isFull = (t.currentPlayers || 0) >= (t.maxPlayers || 8);
      if (isFull) {
        setStatus({ label: 'REGISTRATION FULL', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' });
      } else {
        setStatus({ label: 'REGISTRATION OPEN', color: 'bg-green-500/20 text-green-400 border-green-500/50' });
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [t.status, t.startTime, t.currentPlayers, t.maxPlayers]);

  return (
    <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", status.color, className)}>
      {status.label}
    </Badge>
  );
}
