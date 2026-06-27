'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import { 
  Loader2,
  ImagePlus,
  Layout,
  Monitor,
  Wallet,
  Trophy,
  Swords,
  Dna
} from 'lucide-react';
import { useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function BackgroundsPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgSettings } = useDoc(backgroundsRef);

  const [bgs, setBgs] = useState({ 
    arena: '', 
    dashboard: '', 
    wallet: '', 
    hallOfChampions: '',
    hero: '',
    logo: ''
  });
  const [savingBgs, setSavingBgs] = useState<string | null>(null);

  useEffect(() => {
    if (bgSettings) {
      setBgs({
        arena: bgSettings.arena || '',
        dashboard: bgSettings.dashboard || '',
        wallet: bgSettings.wallet || '',
        hallOfChampions: bgSettings.hallOfChampions || '',
        hero: bgSettings.hero || '',
        logo: bgSettings.logo || ''
      });
    }
  }, [bgSettings]);

  const handleBgUpload = async (section: keyof typeof bgs, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingBgs(section);
    try {
      const result = await uploadToCloudinary(file, { folder: 'backgrounds' });
      if (result.url) {
        const updatedBgs = { ...bgs, [section]: result.url };
        await setDoc(backgroundsRef, {
          ...updatedBgs,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setBgs(updatedBgs);
        toast({ title: `${section.toUpperCase()} UPDATED` });
      }
    } finally {
      setSavingBgs(null);
    }
  };

  const sections = [
    { id: 'logo', label: 'APP LOGO', icon: Dna },
    { id: 'hero', label: 'HERO SECTION', icon: Layout },
    { id: 'arena', label: 'ARENA BACKGROUND', icon: Swords },
    { id: 'dashboard', label: 'DASHBOARD BACKGROUND', icon: Monitor },
    { id: 'wallet', label: 'WALLET BACKGROUND', icon: Wallet },
    { id: 'hallOfChampions', label: 'HALL OF CHAMPIONS', icon: Trophy },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <Card key={section.id} className="glass border-white/5 overflow-hidden flex flex-col">
            <CardHeader className="p-4 border-b border-white/5 bg-white/5">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" /> {section.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col gap-6">
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 group">
                {bgs[section.id as keyof typeof bgs] ? (
                  <Image 
                    src={bgs[section.id as keyof typeof bgs]} 
                    alt={section.label} 
                    fill 
                    className="object-cover transition-transform group-hover:scale-105" 
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ImagePlus className="w-8 h-8 text-muted-foreground opacity-20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <p className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Change Visual</p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full h-11 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 font-black uppercase text-[10px]" 
                onClick={() => document.getElementById(`bg-${section.id}`)?.click()}
                disabled={savingBgs === section.id}
              >
                {savingBgs === section.id ? <Loader2 className="animate-spin" /> : 'UPLOAD PROTOCOL'}
              </Button>
              <input id={`bg-${section.id}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleBgUpload(section.id as any, e)} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
