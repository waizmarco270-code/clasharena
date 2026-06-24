
'use client';

import { useMemo, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, increment, where, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  PackageCheck, 
  Loader2, 
  ImagePlus, 
  Camera
} from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function FulfillmentPage() {
  const db = useFirestore();
  const { toast } = useToast();

  // Simplified query for index-less operation
  const claimsQueryRaw = useMemo(() => query(collection(db, 'reward-claims'), orderBy('createdAt', 'desc'), limit(50)), [db]);
  const { data: allClaims } = useCollection(claimsQueryRaw);
  const pendingClaims = useMemo(() => allClaims?.filter(c => c.status === 'pending'), [allClaims]);

  const [activeClaim, setActiveClaim] = useState<any | null>(null);
  const [fulfillmentProof, setFulfillmentProof] = useState('');
  const [uploadingFulfillment, setUploadingFulfillment] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const fulfillInputRef = useRef<HTMLInputElement>(null);

  const handleFulfillmentProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFulfillment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.secure_url) {
        setFulfillmentProof(data.secure_url);
        toast({ title: "PROOF PHOTO READY" });
      }
    } finally {
      setUploadingFulfillment(false);
    }
  };

  const completeFulfillment = async () => {
    if (!activeClaim || !fulfillmentProof || processingId) return;
    setProcessingId(activeClaim.id);
    try {
      const claimRef = doc(db, 'reward-claims', activeClaim.id);
      await updateDoc(claimRef, {
        status: 'completed',
        proofImageUrl: fulfillmentProof,
        completedAt: new Date().toISOString()
      });

      if (activeClaim.rewardType === 'money') {
        const amount = parseInt(activeClaim.rewardValue) || 0;
        await updateDoc(doc(db, 'users', activeClaim.userId), {
          earnings: increment(amount)
        });
      }

      // Trigger user push alert
      try {
        const detail = activeClaim.rewardType === 'money' ? `₹ ${activeClaim.rewardValue}` : activeClaim.rewardItemName;
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audience: 'user',
            userId: activeClaim.userId,
            title: 'Reward Delivered! 🏆',
            body: `Your reward (${detail}) for tournament "${activeClaim.tournamentName}" has been delivered. Tap to review!`,
            data: {
              type: 'reward_fulfillment',
              claimId: activeClaim.id
            }
          })
        });
      } catch (e) {
        console.error("Failed to send player reward notification:", e);
      }

      toast({ title: "REWARD DELIVERED" });
      setActiveClaim(null);
      setFulfillmentProof('');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass border-white/5 overflow-hidden">
         <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5">
              <TableHead className="text-[10px] font-black uppercase">Winner</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Tournament</TableHead>
              <TableHead className="text-[10px] font-black uppercase">Reward</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingClaims?.map((claim: any) => (
              <TableRow key={claim.id} className="border-white/5">
                <TableCell>
                  <div>
                    <p className="font-bold uppercase text-xs">{claim.username}</p>
                    <p className="text-[8px] text-muted-foreground uppercase font-black">{claim.userId}</p>
                  </div>
                </TableCell>
                <TableCell className="text-xs uppercase font-medium">{claim.tournamentName}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 text-[10px]">
                     {claim.rewardType === 'money' ? `₹ ${claim.rewardValue}` : claim.rewardItemName}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => setActiveClaim(claim)} className="bg-green-600 font-black h-8 text-[10px]">PROCESS</Button>
                </TableCell>
              </TableRow>
            ))}
            {(!pendingClaims || pendingClaims.length === 0) && (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground uppercase font-black text-xs">All rewards fulfilled</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!activeClaim} onOpenChange={() => setActiveClaim(null)}>
        <DialogContent className="glass border-white/10 max-w-xl">
           <DialogHeader>
             <DialogTitle className="font-headline text-xl uppercase italic">Reward <span className="text-primary">Fulfillment</span></DialogTitle>
             <DialogDescription className="text-[10px] font-black uppercase text-muted-foreground">Deliver reward to {activeClaim?.username}</DialogDescription>
           </DialogHeader>
           <div className="space-y-6 py-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                 <div className="flex justify-between items-center"><span className="text-[9px] font-black uppercase text-muted-foreground">Reward Type</span><Badge className="bg-primary/20 text-primary uppercase text-[9px]">{activeClaim?.rewardType}</Badge></div>
                 <div className="flex justify-between items-center">
                   <span className="text-[9px] font-black uppercase text-muted-foreground">Reward Detail</span>
                   <span className="text-sm font-black uppercase">{activeClaim?.rewardType === 'money' ? `₹ ${activeClaim?.rewardValue}` : activeClaim?.rewardItemName}</span>
                 </div>
              </div>

              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Upload Delivery Proof</Label>
                 <div className="relative cursor-pointer group" onClick={() => fulfillInputRef.current?.click()}>
                    {fulfillmentProof ? (
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-primary/40">
                         <Image src={fulfillmentProof} alt="Proof" fill className="object-cover opacity-60" />
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40"><ImagePlus className="w-8 h-8 text-white" /></div>
                      </div>
                    ) : (
                      <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all">
                        {uploadingFulfillment ? <Loader2 className="w-8 h-8 animate-spin text-primary" /> : <Camera className="w-8 h-8 text-muted-foreground" />}
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Select Screenshot</p>
                      </div>
                    )}
                    <input type="file" ref={fulfillInputRef} className="hidden" accept="image/*" onChange={handleFulfillmentProofUpload} />
                 </div>
              </div>
           </div>
           <DialogFooter>
              <Button onClick={completeFulfillment} disabled={!fulfillmentProof || processingId === activeClaim?.id} className="w-full h-12 bg-primary font-black uppercase rounded-xl shadow-xl glow-primary">
                 {processingId ? <Loader2 className="animate-spin" /> : <PackageCheck className="w-4 h-4 mr-2" />} CONFIRM DELIVERY
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
