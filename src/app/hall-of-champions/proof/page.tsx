'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ShieldCheck, 
  PackageCheck, 
  Eye, 
  Gift, 
  IndianRupee, 
  ExternalLink,
  Camera,
  Loader2,
  Link as LinkIcon
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useFirestore, useCollection } from '@/firebase';
import { query, collection, orderBy, limit } from 'firebase/firestore';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function LegendsProofPage() {
  const db = useFirestore();

  const claimsQuery = useMemo(() => query(
    collection(db, 'reward-claims'), 
    orderBy('createdAt', 'desc'), 
    limit(30)
  ), [db]);
  const { data: allClaims, loading } = useCollection(claimsQuery);
  const verifiedClaims = useMemo(() => allClaims?.filter(c => c.status === 'completed'), [allClaims]);

  const [selectedProof, setSelectedProof] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="font-headline text-2xl font-bold flex items-center gap-3 uppercase italic tracking-tighter text-green-500">
          <ShieldCheck className="w-6 h-6" /> Legend's Proof Ledger
        </h2>
        <p className="text-xs text-muted-foreground uppercase font-black tracking-wider">Public registry of rewarded tournaments and verifiable claims.</p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Loading reward ledger...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {verifiedClaims?.map((claim: any) => (
            <Card key={claim.id} className="glass border-white/5 bg-black/40 overflow-hidden group hover:border-primary/40 transition-all flex flex-col">
              <div className="relative h-40">
                <Image src={claim.rewardImageUrl || (claim.rewardType === 'money' ? 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=400' : 'https://picsum.photos/seed/gift/400/200')} alt="Reward" fill className="object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="p-2 bg-primary rounded-xl">
                    {claim.rewardType === 'money' ? <IndianRupee className="w-4 h-4 text-white" /> : <Gift className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-xs font-black uppercase text-white shadow-xl">
                    {claim.rewardType === 'money' ? `₹ ${claim.rewardValue}` : claim.rewardItemName}
                  </span>
                </div>
              </div>
              <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-white/10"><AvatarImage src={claim.avatarUrl} /><AvatarFallback className="text-[10px]">{claim.username ? claim.username[0] : 'W'}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-xs font-black uppercase text-white">{claim.username}</p>
                      <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Arena Champion</p>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1">
                    <p className="text-[8px] font-black text-muted-foreground uppercase">Arena Mission</p>
                    <p className="text-[10px] font-bold text-white uppercase truncate">{claim.tournamentName}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={() => setSelectedProof(claim)} className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 h-10 text-[9px] font-black uppercase"><Eye className="w-3 h-3 mr-2" /> VIEW PROOFS</Button>
                  {claim.itemLink && (
                    <Button asChild size="sm" variant="outline" className="h-10 w-10 p-0 border-white/10"><a href={claim.itemLink} target="_blank"><LinkIcon className="w-3 h-3" /></a></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {(!verifiedClaims || verifiedClaims.length === 0) && (
            <div className="col-span-full py-20 text-center glass border-dashed border-white/10 rounded-[2rem] opacity-30">
              <PackageCheck className="w-12 h-12 mx-auto mb-4" />
              <p className="font-black uppercase tracking-widest">Victory Proofs are being audited...</p>
            </div>
          )}
        </div>
      )}

      {/* Dialog for proofs */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="glass border-white/10 max-w-4xl p-0 overflow-hidden outline-none rounded-[2.5rem] flex flex-col h-[85vh]">
          <div className="bg-primary p-6 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <Camera className="w-8 h-8 text-white" />
              <DialogTitle className="font-headline text-xl uppercase italic text-white">Victory Evidence <span className="text-white/60"># {selectedProof?.tournamentName}</span></DialogTitle>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest">
                    {selectedProof?.rewardType === 'money' ? 'Screenshot 1: Admin Payment Proof' : 'Screenshot 1: Claim Screen'}
                  </Label>
                  <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border-2 border-white/5 bg-black shadow-2xl">
                    {selectedProof?.proofImageUrl && <Image src={selectedProof.proofImageUrl} alt="Proof 1" fill className="object-contain" />}
                    <a href={selectedProof?.proofImageUrl} target="_blank" className="absolute top-4 right-4 bg-black/60 p-2 rounded-xl border border-white/20"><ExternalLink className="w-4 h-4 text-white" /></a>
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest">
                    {selectedProof?.rewardType === 'money' ? 'Screenshot 2: Winner Receipt Proof' : 'Screenshot 2: Base Confirmation'}
                  </Label>
                  <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border-2 border-white/5 bg-black shadow-2xl">
                    {selectedProof?.proofImageUrl2 && <Image src={selectedProof.proofImageUrl2} alt="Proof 2" fill className="object-contain" />}
                    <a href={selectedProof?.proofImageUrl2} target="_blank" className="absolute top-4 right-4 bg-black/60 p-2 rounded-xl border border-white/20"><ExternalLink className="w-4 h-4 text-white" /></a>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Champion Status</p>
                    <p className="text-sm font-black text-yellow-500 uppercase">{selectedProof?.username}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">
                      {selectedProof?.rewardType === 'money' ? 'Reward Prize' : 'Reward Item'}
                    </p>
                    <p className="text-sm font-black text-white uppercase">
                      {selectedProof?.rewardType === 'money' ? `₹ ${selectedProof?.rewardValue}` : selectedProof?.rewardItemName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-muted-foreground mb-1">Victory Date</p>
                    <p className="text-sm font-black text-white uppercase">{selectedProof && new Date(selectedProof.completedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="p-6 border-t border-white/10 bg-black/40 text-center shrink-0">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">VERIFIED BY CLASH ARENA TRANSPARENCY PROTOCOL</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
