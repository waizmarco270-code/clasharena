'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useProfile, useMaintenance, useReleases, useAdminStatus } from '@/firebase';
import { useUser } from '@clerk/nextjs';
import { Loader2, Wrench, ShieldAlert, Sparkles, Check, ChevronRight, MessageSquareCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

const playAlertSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(600, ctx.currentTime);
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (e) {}
};

interface TimeRemaining {
  hours: string;
  minutes: string;
  seconds: string;
  total: number;
}

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, profileLoading } = useProfile();
  const { isAdmin } = useAdminStatus();
  const { maintenance, maintenanceLoading } = useMaintenance();
  const { releases } = useReleases();

  // States
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>({ hours: '00', minutes: '00', seconds: '00', total: 0 });
  const [isMaintenanceOver, setIsMaintenanceOver] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [hasTriggeredEndEffect, setHasTriggeredEndEffect] = useState(false);

  // Check if current route is landing page
  const isLandingPage = pathname === '/';

  // Calculate time remaining
  useEffect(() => {
    if (!maintenance?.isActive || !maintenance?.endAt) return;

    const timer = setInterval(() => {
      const difference = +new Date(maintenance.endAt) - +new Date();
      
      if (difference <= 0) {
        setTimeLeft({ hours: '00', minutes: '00', seconds: '00', total: 0 });
        clearInterval(timer);

        // If maintenance was active and just ended in real-time
        if (!hasTriggeredEndEffect) {
          setHasTriggeredEndEffect(true);
          setIsMaintenanceOver(true);
          setShowWhatsNew(true);
          playAlertSound();
          
          import('canvas-confetti').then((confetti) => {
            confetti.default({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#FF4500', '#FFA500', '#FFFFFF', '#00FF00']
            });
          });
        }
      } else {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({
          hours: String(hours).padStart(2, '0'),
          minutes: String(minutes).padStart(2, '0'),
          seconds: String(seconds).padStart(2, '0'),
          total: difference
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [maintenance?.isActive, maintenance?.endAt, hasTriggeredEndEffect]);

  // Reset completion trigger if settings update
  useEffect(() => {
    if (maintenance?.isActive) {
      const difference = maintenance.endAt ? (+new Date(maintenance.endAt) - +new Date()) : 1;
      if (difference > 0) {
        setHasTriggeredEndEffect(false);
        setIsMaintenanceOver(false);
      }
    }
  }, [maintenance?.isActive, maintenance?.endAt]);

  // Determine if block screen should display
  let isMaintenanceActiveNow = false;
  if (maintenance?.isActive) {
     if (!maintenance.endAt) {
        isMaintenanceActiveNow = true;
     } else {
        const difference = +new Date(maintenance.endAt) - +new Date();
        if (difference > 0) isMaintenanceActiveNow = true;
     }
  }

  const shouldBlock = isMaintenanceActiveNow && !isAdmin && !isMaintenanceOver && !isLandingPage;

  // Loading indicator for verification stage
  if (maintenanceLoading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
        <p className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
          Validating arena protocols...
        </p>
      </div>
    );
  }

  // If blocked, render the premium Maintenance break screen
  if (shouldBlock) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0F0E0D] flex flex-col items-center justify-center px-4 overflow-hidden select-none">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full text-center space-y-8 relative z-10">
          {/* Animated Glowing Icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative p-6 bg-gradient-to-br from-primary to-orange-600 rounded-3xl border border-primary/40 shadow-[0_0_50px_rgba(255,69,0,0.15)] animate-bounce duration-[3000ms]">
              <Wrench className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="font-headline text-3xl md:text-4xl font-black uppercase tracking-tight italic text-white leading-none">
              MAINTENANCE <span className="text-primary font-light">BREAK</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Clash Arena System Lockdown
            </p>
          </div>

          {/* Message Broadcast */}
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-primary shrink-0" />
              Broadcast Message
            </p>
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {maintenance?.message || "Our team is optimizing match scoring and arena deployment. We will return shortly."}
            </p>
          </div>

          {/* Countdown Clock */}
          {maintenance?.endAt && timeLeft.total > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estimated Return In</p>
              <div className="flex items-center justify-center gap-4">
                {/* Hours */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 min-w-[70px]">
                  <div className="text-2xl font-headline font-black text-white">{timeLeft.hours}</div>
                  <div className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Hours</div>
                </div>
                <span className="text-2xl font-black text-primary animate-pulse">:</span>
                {/* Minutes */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 min-w-[70px]">
                  <div className="text-2xl font-headline font-black text-white">{timeLeft.minutes}</div>
                  <div className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Mins</div>
                </div>
                <span className="text-2xl font-black text-primary animate-pulse">:</span>
                {/* Seconds */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 min-w-[70px]">
                  <div className="text-2xl font-headline font-black text-white text-primary">{timeLeft.seconds}</div>
                  <div className="text-[8px] font-bold text-muted-foreground uppercase mt-1">Secs</div>
                </div>
              </div>
            </div>
          )}

          {/* Locked Badge */}
          <div className="pt-4 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
            Arena Gateways Locked
          </div>
        </div>
      </div>
    );
  }

  // Render children and include the What's New releases modal
  return (
    <>
      {children}

      {/* "What's New" Release Notes Timeline Modal */}
      <Dialog open={showWhatsNew} onOpenChange={setShowWhatsNew}>
        <DialogContent className="glass border-primary/20 max-w-lg p-6 rounded-3xl overflow-hidden bg-black/90">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-headline text-2xl font-black italic uppercase text-center flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-primary animate-pulse shrink-0" />
              {isMaintenanceOver ? "ARENA LOCKDOWN OVER" : "RELEASE HISTORY"}
            </DialogTitle>
            <DialogDescription className="text-center text-xs uppercase font-bold text-muted-foreground tracking-wider">
              {isMaintenanceOver ? "See what's new in this campaign update!" : "Latest milestone logs and achievements"}
            </DialogDescription>
          </DialogHeader>

          {/* Timeline scrollable container */}
          <div className="max-h-[350px] overflow-y-auto pr-2 no-scrollbar py-4 relative">
            {!releases || releases.length === 0 ? (
              <p className="text-xs font-bold text-muted-foreground text-center py-8 uppercase tracking-widest">No release logs published yet</p>
            ) : (
              <div className="relative pl-6 border-l border-white/10 space-y-8 ml-2">
                {releases.map((release: any, idx: number) => (
                  <div key={release.id} className="relative group">
                    {/* Glowing circular node on axis */}
                    <div className="absolute left-[-31px] top-1 w-4 h-4 rounded-full border-2 border-primary bg-black flex items-center justify-center group-hover:scale-125 transition-transform duration-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="inline-flex self-start bg-primary/20 border border-primary/30 text-primary px-3 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase">
                          {release.version}
                        </span>
                        <h4 className="font-bold text-sm text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                          {release.heading}
                        </h4>
                      </div>
                      <ul className="space-y-1.5">
                        {release.bullets?.map((bullet: string, bIdx: number) => (
                          <li key={bIdx} className="text-xs font-medium text-muted-foreground flex items-start gap-1.5 leading-normal">
                            <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                setShowWhatsNew(false);
                setIsMaintenanceOver(false);
              }}
              className="px-8 py-3 bg-primary hover:bg-primary/95 text-white font-headline font-black italic uppercase tracking-wider rounded-2xl h-12 shadow-lg glow-primary flex items-center gap-2 transition-transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              ENTER THE ARENA
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
