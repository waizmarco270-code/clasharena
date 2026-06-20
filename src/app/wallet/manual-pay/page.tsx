
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
  ChevronLeft
} from 'lucide-react';
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';

// Owner Details (REPLACE WITH REAL UPI ID)
const ADMIN_UPI_ID = 'waiz@okaxis'; // Placeholder
const ADMIN_NAME = 'CLASH ARENA ADMIN';

function ManualPayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const amount = Number(searchParams.get('amount')) || 0;
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txId, setTxId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Generate a unique transaction ID
    const random = Math.floor(1000 + Math.random() * 9000);
    setTxId(`CA-${random}-${Date.now().toString().slice(-4)}`);
  }, []);

  // UPI Deep Link: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
  const upiUrl = `upi://pay?pa=${ADMIN_UPI_ID}&pn=${encodeURIComponent(ADMIN_NAME)}&am=${amount}&cu=INR&tn=${txId}`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      if (!cloudName) throw new Error("Cloudinary not configured.");

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.secure_url) {
        setScreenshotUrl(data.secure_url);
        toast({ title: "Proof Uploaded!", description: "AI Vision is scanning the image." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Upload Failed", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!screenshotUrl || !user || submitting) return;

    setSubmitting(true);
    const requestId = txId;
    const requestRef = doc(db, 'recharge-requests', requestId);
    
    const requestData = {
      userId: user.id,
      username: user.displayName || 'Warrior',
      amount: amount,
      transactionId: txId,
      screenshotUrl: screenshotUrl,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    setDoc(requestRef, requestData)
      .then(() => {
        setShowSuccess(true);
        toast({ title: "Request Logged!", description: "Admin audit initiated." });
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: requestRef.path,
          operation: 'create',
          requestResourceData: requestData
        });
        errorEmitter.emit('permission-error', permissionError);
        setSubmitting(false);
      });
  };

  if (showSuccess) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <CheckCircle2 className="w-24 h-24 text-primary relative z-10 mx-auto" />
        </div>
        <div className="space-y-4">
          <h2 className="font-headline text-4xl font-black italic uppercase leading-none">
            REQUEST <span className="text-primary">COMMANDED</span>
          </h2>
          <p className="text-muted-foreground font-medium px-8">
            Your payment for <span className="text-white font-bold">🪙 {amount} Coins</span> has been received. 
            Our admin team is verifying the screenshot manually.
          </p>
        </div>
        
        <Card className="glass border-white/5 bg-white/5 p-6 mx-8">
          <div className="flex items-center gap-4 text-left">
            <Clock className="w-8 h-8 text-yellow-500 shrink-0" />
            <div>
              <p className="font-bold text-sm">ETA: 5-10 MINUTES</p>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                Identity: {txId} • Be patient warrior, glory awaits.
              </p>
            </div>
          </div>
        </Card>

        <Link href="/dashboard" className="block px-8">
          <Button className="w-full h-14 bg-white text-black hover:bg-white/90 font-black rounded-2xl">
            RETURN TO COMMAND HUB
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto pb-20 space-y-8">
        <Link href="/wallet" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to Vault
        </Link>

        <div className="space-y-2">
          <h1 className="font-headline text-3xl font-black italic uppercase">MANUAL <span className="text-primary">GATEWAY</span></h1>
          <p className="text-muted-foreground text-sm font-medium">Follow the protocols below to secure your coins.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Instructions & Payment */}
          <div className="space-y-6">
            <Card className="glass border-white/5 p-6 bg-gradient-to-br from-primary/5 to-transparent">
              <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Payment Amount</p>
              <h2 className="text-4xl font-headline font-black mb-6">₹ {amount}.00</h2>
              
              <div className="space-y-4">
                <Button 
                  asChild
                  className="w-full h-12 bg-primary hover:bg-primary/90 font-black rounded-xl"
                >
                  <a href={upiUrl}>
                    <ExternalLink className="w-4 h-4 mr-2" /> OPEN PAYMENT APP
                  </a>
                </Button>
                
                <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-black">Admin UPI ID</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold">{ADMIN_UPI_ID}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                      navigator.clipboard.writeText(ADMIN_UPI_ID);
                      toast({ title: "Copied!" });
                    }}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex gap-3">
              <ShieldAlert className="w-6 h-6 text-yellow-500 shrink-0" />
              <div className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">
                <span className="text-white">PROTOCOL:</span> PAYMENT KARNE KE BAAD SCREENSHOT JARUR LEIN. SCREENSHOT KE BINA RECHARGE APPROVE NAHI HOGA.
              </div>
            </div>
          </div>

          {/* QR & Upload */}
          <div className="space-y-6">
            <Card className="glass border-white/5 p-4 flex flex-col items-center">
              <div className="relative p-2 bg-white rounded-2xl mb-4 group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition-opacity" />
                <div className="relative bg-white p-2 rounded-xl">
                  {/* In a real app, use a QR generation library or a static hosted QR */}
                  <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded">
                    <QrCode className="w-20 h-20 text-black" />
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-center">Scan to Pay QR</p>
            </Card>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Upload Payment Screenshot</Label>
              <div className="relative cursor-pointer group" onClick={() => document.getElementById('ss-upload')?.click()}>
                {screenshotUrl ? (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-primary/40">
                    <Image src={screenshotUrl} alt="Payment SS" fill className="object-cover opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImagePlus className="w-8 h-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all">
                    {uploading ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <ImagePlus className="w-8 h-8 text-muted-foreground" />}
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Upload SS Proof</p>
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
          className="w-full h-16 bg-primary hover:bg-primary/90 font-black text-xl rounded-2xl glow-primary shadow-2xl"
        >
          {submitting ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CheckCircle2 className="w-6 h-6 mr-2" />}
          CONFIRM PAYMENT REQUEST
        </Button>
      </div>
    </PageWrapper>
  );
}

export default function ManualPayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <ManualPayContent />
    </Suspense>
  );
}
