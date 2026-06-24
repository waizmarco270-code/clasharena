'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export function PwaInstaller() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      const dismissed = sessionStorage.getItem('pwa_install_dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    setIsVisible(false);
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      toast({
        title: "Installing Clash Arena 🚀",
        description: "Adding to your home screen...",
      });
    } else {
      setIsVisible(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] border border-yellow-500/30 bg-zinc-950 p-8 shadow-[0_0_50px_rgba(255,69,0,0.25)] text-center animate-in zoom-in-95 duration-300">
        
        {/* Glowing background highlights */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl" />

        {/* Close Button */}
        <button 
          onClick={handleDismiss} 
          className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dynamic App Icon */}
        <div className="relative mx-auto mb-6 w-24 h-24 rounded-3xl border-2 border-yellow-500/40 bg-gradient-to-br from-primary to-yellow-600 p-1 glow-primary rotate-3 shadow-[0_12px_24px_rgba(255,69,0,0.3)]">
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black">
            <Image 
              src="/logo.png" 
              alt="Clash Arena Logo" 
              fill 
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute -top-2 -right-2 bg-yellow-500 text-black font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1 shadow-md">
            <Sparkles className="w-2.5 h-2.5 fill-black" /> PWA
          </div>
        </div>

        {/* Header content */}
        <h3 className="font-headline text-3xl font-black uppercase italic tracking-tight text-white mb-2 leading-none">
          INSTALL <span className="text-primary">CLASH</span> <span className="text-yellow-500">ARENA</span>
        </h3>
        <p className="text-[10px] font-black tracking-[0.2em] text-yellow-500 uppercase mb-4">
          ELITE ESPORTS COMPANION
        </p>

        {/* Feature summary */}
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6 space-y-3 text-left">
          <div className="flex gap-3 items-start">
            <div className="p-1 bg-primary/20 rounded-lg text-primary mt-0.5">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-black text-white uppercase tracking-tight">Zero-Lag Native Mobile Play</h5>
              <p className="text-[11px] text-muted-foreground leading-snug">Launch instantly from your home screen with zero address-bar clutter.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="p-1 bg-yellow-500/20 rounded-lg text-yellow-500 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-black text-white uppercase tracking-tight">Instant Tournament Notifications</h5>
              <p className="text-[11px] text-muted-foreground leading-snug">Never miss match check-ins, reward claims, or global bracket announcements.</p>
            </div>
          </div>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col gap-3">
          <Button 
            onClick={handleInstall} 
            className="w-full bg-gradient-to-r from-primary to-yellow-600 hover:from-primary/90 hover:to-yellow-600/90 text-white font-black py-6 rounded-2xl glow-primary border-t border-white/20 uppercase tracking-widest text-xs shadow-2xl"
          >
            INSTALL APP ON PHONE
          </Button>
          <button 
            onClick={handleDismiss} 
            className="text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:text-white transition-colors mt-2"
          >
            CONTINUE IN BROWSER
          </button>
        </div>
      </div>
    </div>
  );
}
