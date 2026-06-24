'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function PwaInstaller() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent default browser install banner from showing automatically
      e.preventDefault();
      setInstallPrompt(e);
      // Only show install prompt if they haven't dismissed it in this session
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
        title: "Installation Started 🚀",
        description: "Clash Arena is installing to your home screen.",
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
    <div className="fixed bottom-24 right-4 z-[99] max-w-sm glass border-primary/20 bg-primary/5 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-[0_8px_32px_rgba(255,69,0,0.2)] animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary rounded-xl text-white glow-primary shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-xs uppercase text-white leading-none mb-1">CLASH ARENA APP</h4>
          <p className="text-[10px] text-muted-foreground uppercase font-black">Install for zero-lag mobile play</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button onClick={handleInstall} size="sm" className="bg-white text-black hover:bg-white/90 text-[10px] font-black h-8 px-3 rounded-lg">
          INSTALL
        </Button>
        <Button onClick={handleDismiss} size="icon" variant="ghost" className="h-8 w-8 text-white/40 hover:text-white rounded-lg">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
