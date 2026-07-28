'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@clerk/nextjs';
import { useFirestore, useDoc } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, CheckCircle2, ChevronLeft, ShieldCheck, Crown } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import Link from 'next/link';

function VIPManualPayForm() {
  const { user, isLoaded: authLoaded } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const vipType = searchParams.get('vipType') || 'weekly';
  const price = Number(searchParams.get('price')) || 69;

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [user, db]);
  const { data: profile, loading: profileLoading } = useDoc(userRef);

  const settingsRef = useMemo(() => doc(db, 'app-settings', 'payment'), [db]);
  const { data: settings, loading: settingsLoading } = useDoc(settingsRef);

  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txId, setTxId] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const random = Math.floor(1000 + Math.random() * 9000);
    setTxId(`AVP-${random}-${Date.now().toString().slice(-4)}`);
  }, []);

  const adminUpi = settings?.adminUpiId || 'waiz@okaxis';
  const upiUrl = `upi://pay?pa=${adminUpi}&pn=ClashArenaAVP&am=${price}&cu=INR&tn=${txId}`;

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
      userId: user.id,
      username: profile?.username || user.fullName || user.firstName || 'Warrior',
      amount: price,
      currency: 'inr',
      transactionId: txId,
      screenshotUrl: screenshotUrl,
      status: 'pending',
      paymentType: 'vip_pass',
      ticketType: vipType, // Using ticketType field to store vipType
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
              title: 'AVP Manual Purchase ⚡',
              body: `${requestData.username} requested ${vipType.toUpperCase()} VIP Pass. Review details now!`,
              data: {
                type: 'vip_pass',
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

  if (settingsLoading || !authLoaded || profileLoading) return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-primary" /></div>;

  if (showSuccess) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <Crown className="w-24 h-24 text-yellow-500 relative z-10 mx-auto animate-pulse" />
        </div>
        <div className="space-y-4">
          <h2 className="font-headline text-4xl font-black italic uppercase">VIP REQUEST <span className="text-primary">SENT</span></h2>
          <p className="text-muted-foreground font-medium px-8">
            Your manual payment for the <span className="text-white font-bold">{vipType.toUpperCase()} AVP</span> has been submitted to high command.
          </p>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left space-y-2">
          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
             <ShieldCheck className="w-4 h-4 text-green-500" /> UNDER REVIEW
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please allow up to 15-30 minutes for an admin to verify your transaction ID and receipt. Once approved, your VIP status and Rainbow Avatar will be instantly unlocked.
          </p>
        </div>
        <Link href="/dashboard" className="block">
          <Button className="w-full h-14 font-black uppercase text-lg bg-primary hover:bg-primary/90 rounded-xl glow-primary">
            RETURN TO COMMAND HUB
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto space-y-8 pb-20 pt-8">
        <Link href="/vip/pricing" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to Pricing
        </Link>
        
        <div className="text-center space-y-4 mb-8">
          <h1 className="font-headline text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white">
            MANUAL <span className="text-primary">CHECKOUT</span>
          </h1>
          <p className="text-muted-foreground uppercase text-sm font-bold tracking-[0.2em]">
            Purchasing {vipType} Arena VIP Pass
          </p>
        </div>

        <div className="bg-white/5 p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 bg-primary/20 rounded-bl-3xl border-l border-b border-primary/30">
            <span className="text-xs font-black uppercase tracking-widest text-primary">TxID: {txId}</span>
          </div>

          <div className="space-y-8 mt-4">
            
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Amount to transfer</p>
              <div className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">
                ₹{price}
              </div>
            </div>

            <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-xl">
                  {/* QR Code rendering using public API */}
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}`} alt="UPI QR Code" width={150} height={150} className="w-[150px] h-[150px]" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase font-black tracking-[0.2em] mb-1">SCAN WITH ANY UPI APP</p>
                  <p className="text-xs text-gray-500">(GPay, PhonePe, Paytm, CRED)</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">OR USE UPI ID</span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              <div className="flex items-center gap-2">
                <Input readOnly value={adminUpi} className="font-mono text-center bg-black border-white/10 text-white font-bold h-12" />
                <Button 
                  variant="outline" 
                  className="h-12 border-primary/50 text-primary hover:bg-primary/10 font-bold uppercase"
                  onClick={() => {
                    navigator.clipboard.writeText(adminUpi);
                    toast({ title: "UPI ID COPIED" });
                  }}
                >
                  COPY
                </Button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <Label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">UPLOAD PAYMENT SCREENSHOT (REQUIRED)</Label>
              <div className="relative h-40 border-2 border-dashed border-white/10 rounded-2xl bg-black/20 hover:bg-white/5 transition-colors group overflow-hidden">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  disabled={uploading}
                />
                
                {screenshotUrl ? (
                  <Image src={screenshotUrl} alt="Receipt" fill className="object-cover opacity-80" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                    {uploading ? (
                      <>
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <span className="text-xs font-black uppercase text-primary tracking-widest">UPLOADING...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground group-hover:text-white transition-colors" />
                        <span className="text-xs font-bold uppercase text-muted-foreground tracking-widest">TAP TO BROWSE IMAGE</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={!screenshotUrl || submitting}
              className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xl rounded-xl shadow-xl glow-primary"
            >
              {submitting ? <Loader2 className="animate-spin w-6 h-6" /> : "SUBMIT PROOF"}
            </Button>
            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">
              Submitting false proofs will result in a permanent hardware ban.
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function VIPManualPayPage() {
  return (
    <Suspense fallback={<PageWrapper><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></PageWrapper>}>
      <VIPManualPayForm />
    </Suspense>
  );
}
