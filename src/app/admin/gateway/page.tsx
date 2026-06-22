
'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  QrCode, 
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirestore, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function GatewayPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const settingsRef = useMemo(() => doc(db, 'app-settings', 'payment'), [db]);
  const { data: paymentSettings } = useDoc(settingsRef);

  const [upiId, setUpiId] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paymentSettings) {
      setUpiId(paymentSettings.adminUpiId || '');
      setQrUrl(paymentSettings.adminQrUrl || '');
    }
  }, [paymentSettings]);

  const handleUpdateSettings = async () => {
    setSavingSettings(true);
    setDoc(settingsRef, {
      adminUpiId: upiId,
      adminQrUrl: qrUrl,
      updatedAt: new Date().toISOString()
    }, { merge: true }).then(() => {
      toast({ title: "GATEWAY UPDATED" });
    }).finally(() => {
      setSavingSettings(false);
    });
  };

  const handleAdminQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setQrUrl(data.secure_url);
        toast({ title: "MASTER QR UPLOADED" });
      }
    } finally {
      setUploadingQr(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="glass border-white/5">
        <CardHeader><CardTitle className="font-headline text-xl font-bold uppercase">PAYMENT GATEWAY</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Official UPI ID</Label><Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="e.g. boss@okaxis" className="h-12 bg-white/5" /></div>
          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase">Master QR Code</Label>
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-48 w-48 rounded-2xl overflow-hidden border-2 border-dashed border-white/10 bg-black/20 flex items-center justify-center">
                {qrUrl ? <Image src={qrUrl} alt="QR" fill className="object-contain" /> : <QrCode className="w-12 h-12 text-muted-foreground opacity-20" />}
              </div>
              <Button variant="outline" className="w-full h-12 border-dashed border-white/20" onClick={() => qrInputRef.current?.click()}>{qrUrl ? 'CHANGE QR' : 'UPLOAD QR'}</Button>
              <input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={handleAdminQrUpload} />
            </div>
          </div>
        </CardContent>
        <CardFooter><Button className="w-full h-12 bg-primary font-black uppercase" onClick={handleUpdateSettings} disabled={savingSettings}>{savingSettings ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />} SAVE CONFIG</Button></CardFooter>
      </Card>
    </div>
  );
}
