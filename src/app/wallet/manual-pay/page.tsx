
'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  QrCode, 
  ExternalLink, 
  ImagePlus, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Loader2,
  Copy,
  ChevronLeft,
  AlertTriangle,
  ShieldAlert as ShieldIcon
} from 'lucide-react';
import { useFirestore, useDoc, errorEmitter, FirestorePermissionError, useProfile } from '@/firebase';
import { useUser } from '@clerk/nextjs';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import Image from 'next/image';
import Link from 'next/link';

function ManualPayContent() {
  const searchParams = useSearchParams();
  const { user, isLoaded: authLoaded } = useUser();
  const authLoading = !authLoaded;
  const db = useFirestore();
  const { toast } = useToast();
  
  const { profile } = useProfile();

  // Fetch Admin Payment Settings
  const settingsRef = useMemo(() => doc(db, 'app-settings', 'payment'), [db]);
  const { data: settings, loading: settingsLoading } = useDoc(settingsRef);

  const amount = Number(searchParams.get('amount')) || 0;
  const coins = Number(searchParams.get('coins')) || amount;
  const currency = searchParams.get('currency') || 'coins';
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txId, setTxId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const random = Math.floor(1000 + Math.random() * 9000);
    setTxId(`CA-${random}-${Date.now().toString().slice(-4)}`);
  }, []);

  const adminUpi = settings?.adminUpiId || 'waiz@okaxis';
  const upiUrl = `upi://pay?pa=${adminUpi}&pn=ClashArena&am=${amount}&cu=INR&tn=${txId}`;
  
  // Dynamic QR API (QR Server)
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, { folder: 'receipts' });
      if (result.url) {
        setScreenshotUrl(result.url);
        toast({ title: "SCREENSHOT VERIFIED", description: "Proof uploaded successfully." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not upload proof to cloud." });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!screenshotUrl || !user || submitting) {
      if (!user) toast({ variant: "destructive", title: "Auth Error", description: "User identity not found." });
      if (!screenshotUrl) toast({ variant: "destructive", title: "Missing Proof", description: "Please upload payment screenshot." });
      return;
    }
    
    setSubmitting(true);
    const requestRef = doc(db, 'recharge-requests', txId);
    const requestData = {
      userId: user.id, // Using Clerk User ID
      username: profile?.username || user.fullName || user.firstName || 'Warrior',
      amount: amount,
      coins: coins,
      currency: currency,
      transactionId: txId,
      screenshotUrl: screenshotUrl,
      status: 'pending',
      createdAt: serverTimestamp()
    };

    setDoc(requestRef, requestData)
      .then(async () => {
        try {
          await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audience: 'admins',
              title: 'Manual Recharge Alert ⚡',
              body: `${requestData.username} requested 🪙 ${requestData.amount} Coins. Review details now!`,
              data: {
                type: 'manual_recharge',
                transactionId: requestData.transactionId
              }
            })
          });
        } catch (e) {
          console.error("Admin notification trigger failed:", e);
        }
        setShowSuccess(true);
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: requestRef.path,
          operation: 'create',
          requestResourceData: requestData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  if (settingsLoading || authLoading) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary" /></div>;

  if (showSuccess) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <CheckCircle2 className="w-24 h-24 text-primary relative z-10 mx-auto" />
        </div>
        <div className="space-y-4">
          <h2 className="font-headline text-4xl font-black italic uppercase">REQUEST <span className="text-primary">COMMANDED</span></h2>
          <p className="text-muted-foreground font-medium px-8">
            Your payment for <span className="text-white font-bold">{currency === 'vcash' ? `⚡ ${amount} V-Cash` : `🪙 ${amount} Coins`}</span> has been received.
          </p>
        </div>
        <Card className="glass border-white/5 bg-white/5 p-6 mx-8 flex items-center gap-4 text-left">
          <Clock className="w-8 h-8 text-yellow-500 shrink-0" />
          <div>
            <p className="font-bold text-sm">ETA: 5-10 MINUTES</p>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Identity: {txId}</p>
          </div>
        </Card>
        <Link href="/dashboard" className="block px-8"><Button className="w-full h-14 bg-white text-black font-black rounded-2xl">RETURN TO HUB</Button></Link>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto pb-20 space-y-8">
        <Link href="/wallet" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"><ChevronLeft className="w-4 h-4" /> Back to Vault</Link>
        <div className="space-y-2">
          <h1 className="font-headline text-3xl font-black italic uppercase">MANUAL <span className="text-primary">GATEWAY</span></h1>
          <p className="text-muted-foreground text-sm font-medium">Follow the protocols below to secure your coins.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card className="glass border-white/5 p-6 bg-gradient-to-br from-primary/5 to-transparent">
              <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Payment Amount</p>
              <h2 className="text-4xl font-headline font-black mb-6">₹ {amount}.00</h2>
              <div className="space-y-4">
                <Button asChild className="w-full h-12 bg-primary hover:bg-primary/90 font-black rounded-xl">
                  <a href={upiUrl}><ExternalLink className="w-4 h-4 mr-2" /> OPEN PAYMENT APP</a>
                </Button>
                <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Official UPI ID</p>
                  <div className="flex items-center justify-between font-mono text-xs font-bold text-primary">
                    <span>{adminUpi}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(adminUpi); toast({ title: "Copied!" }); }}><Copy className="w-3 h-3" /></Button>
                  </div>
                </div>
              </div>
            </Card>

            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex gap-3">
              <ShieldIcon className="w-6 h-6 text-primary shrink-0 animate-pulse" />
              <div className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">
                <span className="text-white">PROTOCOL:</span> PAYMENT SS ZARUR UPLOAD KAREIN VERIFICATION KE LIYE.
              </div>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex gap-3">
              <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
              <div className="text-[10px] font-black text-destructive uppercase leading-relaxed tracking-wider">
                <span className="underline">SECURITY WARNING:</span> FAKE SCREENSHOT UPLOAD KARNE PAR ACCOUNT 3-7 WORKING DAYS KE LIYE BANNED HO SAKTA HAI. FAIR PLAY ENSURE KAREIN.
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card className="glass border-white/5 p-4 flex flex-col items-center">
              <div className="relative p-2 bg-white rounded-2xl mb-4 group h-40 w-40">
                <Image src={dynamicQrUrl} alt="Dynamic QR" fill className="p-2" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-center text-primary">Dynamic Amount QR</p>
              <p className="text-[8px] text-muted-foreground uppercase text-center mt-1">Scan with GPay, PhonePe or Paytm</p>
            </Card>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Upload SS Proof</Label>
              <div className="relative cursor-pointer group" onClick={() => document.getElementById('ss-upload')?.click()}>
                {screenshotUrl ? (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-primary/40">
                    <Image src={screenshotUrl} alt="Proof" fill className="object-cover opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                       <ImagePlus className="w-8 h-8 text-white opacity-80" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all">
                    {uploading ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <ImagePlus className="w-8 h-8 text-muted-foreground" />}
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Upload Screenshot</p>
                  </div>
                )}
                <input id="ss-upload" type="file" className="hidden" accept="image/*" onChange={handleUpload} />
              </div>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={!screenshotUrl || uploading || submitting} 
          className="w-full h-16 bg-primary hover:bg-primary/90 font-black text-xl rounded-2xl glow-primary shadow-2xl transition-all active:scale-95"
        >
          {submitting ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CheckCircle2 className="w-6 h-6 mr-2" />}
          {submitting ? 'RESERVING COINS...' : 'CONFIRM RECHARGE REQUEST'}
        </Button>
      </div>
    </PageWrapper>
  );
}

export default function ManualPayPage() {
  return <Suspense fallback={<div>Loading Gateway...</div>}><ManualPayContent /></Suspense>;
}
