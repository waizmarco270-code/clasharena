
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2
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

  const [bgs, setBgs] = useState({ arena: '', dashboard: '', wallet: '', hallOfChampions: '' });
  const [savingBgs, setSavingBgs] = useState(false);

  useEffect(() => {
    if (bgSettings) {
      setBgs({
        arena: bgSettings.arena || '',
        dashboard: bgSettings.dashboard || '',
        wallet: bgSettings.wallet || '',
        hallOfChampions: bgSettings.hallOfChampions || ''
      });
    }
  }, [bgSettings]);

  const handleBgUpload = async (section: keyof typeof bgs, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSavingBgs(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        const updatedBgs = { ...bgs, [section]: data.secure_url };
        await setDoc(backgroundsRef, {
          ...updatedBgs,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setBgs(updatedBgs);
        toast({ title: "VISUAL DEPLOYED" });
      }
    } finally {
      setSavingBgs(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {Object.keys(bgs).map((section) => (
        <Card key={section} className="glass border-white/5">
          <CardHeader><CardTitle className="text-sm font-black uppercase">{section} VISUAL</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="h-32 relative rounded-xl overflow-hidden border border-white/10 bg-black/20">
              {bgs[section as keyof typeof bgs] && <Image src={bgs[section as keyof typeof bgs]} alt={section} fill className="object-cover" />}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => document.getElementById(`bg-${section}`)?.click()}>
              {savingBgs ? <Loader2 className="animate-spin" /> : 'CHANGE IMAGE'}
            </Button>
            <input id={`bg-${section}`} type="file" className="hidden" accept="image/*" onChange={(e) => handleBgUpload(section as any, e)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
