'use client';

import { useState, useMemo, useRef } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Send, 
  ChevronLeft, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck,
  Zap,
  ArrowRight,
  Camera,
  ImagePlus,
  History,
  Clock,
  Check,
  X,
  AlertCircle,
  Ticket
} from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser, useFirestore, useCollection, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, query, where, orderBy, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function SupportPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [form, setForm] = useState({ category: '', subject: '', description: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's tickets
  const ticketsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, 'support-tickets'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc')
    );
  }, [db, user]);

  const { data: myTickets, loading: ticketsLoading } = useCollection(ticketsQuery);

  // Calculate remaining tickets for today (last 24h)
  const ticketsRemaining = useMemo(() => {
    if (!myTickets) return 2;
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    const recentCount = myTickets.filter(t => new Date(t.createdAt).getTime() > twentyFourHoursAgo).length;
    return Math.max(0, 2 - recentCount);
  }, [myTickets]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) {
        setScreenshotUrl(data.secure_url);
        toast({ title: "SCREENSHOT READY" });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "UPLOAD FAILED" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;

    if (ticketsRemaining <= 0) {
      toast({ 
        variant: "destructive", 
        title: "QUOTA EXHAUSTED", 
        description: "You have used your 2 daily support tickets. Reset in 24h." 
      });
      return;
    }

    if (!form.category || !form.subject || !form.description) {
      toast({ variant: "destructive", title: "COMPLETE FORM" });
      return;
    }

    setSubmitting(true);
    const ticketData = {
      userId: user.id,
      username: user.firstName || 'Warrior',
      category: form.category,
      subject: form.subject,
      description: form.description,
      screenshotUrl: screenshotUrl,
      status: 'pending',
      adminReply: '',
      repliedAt: null,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'support-tickets'), ticketData);
      toast({ title: "INTEL DISPATCHED", description: "Our officers will review your request." });
      setForm({ category: '', subject: '', description: '' });
      setScreenshotUrl('');
    } catch (err) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'support-tickets',
        operation: 'create',
        requestResourceData: ticketData
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-12 pb-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="space-y-2">
              <Link href="/settings" className="inline-flex items-center gap-2 text-[10px] font-black text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-2">
                <ChevronLeft className="w-3 h-3" /> System Preferences
              </Link>
              <h1 className="font-headline text-4xl font-black uppercase italic tracking-tighter text-white">CONTACT <span className="text-green-500">INTELLIGENCE</span></h1>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-tight">Direct encrypted link to the high command center.</p>
           </div>
           <div className="flex gap-4">
              <div className="bg-primary/10 border border-primary/20 px-6 py-4 rounded-2xl flex items-center gap-4">
                 <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white glow-primary"><Ticket className="w-6 h-6" /></div>
                 <div>
                    <p className="text-[10px] font-black text-primary uppercase leading-none mb-1">Quota Pool</p>
                    <p className="text-xs font-black text-white uppercase tracking-tighter">{ticketsRemaining} / 2 REMAINING</p>
                 </div>
              </div>
              <div className="hidden sm:flex bg-green-600/10 border border-green-500/20 px-6 py-4 rounded-2xl items-center gap-4">
                 <div className="h-10 w-10 bg-green-600 rounded-xl flex items-center justify-center text-white glow-primary"><ShieldCheck className="w-6 h-6" /></div>
                 <div>
                    <p className="text-[10px] font-black text-green-500 uppercase leading-none mb-1">Encrypted Link</p>
                    <p className="text-xs font-bold text-white uppercase tracking-tighter">Status: Active</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2">
              <Card className="glass border-white/5 bg-black/40 p-8 rounded-[2rem] shadow-2xl">
                 <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Intel Category</Label>
                       <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                          <SelectTrigger className="bg-white/5 h-14 rounded-xl border-white/10 font-bold uppercase text-xs">
                             <SelectValue placeholder="SELECT CATEGORY" />
                          </SelectTrigger>
                          <SelectContent className="glass">
                             <SelectItem value="payment" className="font-bold uppercase text-[10px]">Payment / Coin Vault Issue</SelectItem>
                             <SelectItem value="bracket" className="font-bold uppercase text-[10px]">Tournament Bracket Dispute</SelectItem>
                             <SelectItem value="account" className="font-bold uppercase text-[10px]">Account / Profile Lock</SelectItem>
                             <SelectItem value="bug" className="font-bold uppercase text-[10px]">System Bug Report</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject</Label>
                       <Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="BRIEF TITLE OF THE SITUATION" className="bg-white/5 h-14 rounded-xl border-white/10 font-black text-xs uppercase" />
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Detailed Situation</Label>
                       <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="EXPLAIN THE ISSUE WITH FULL CONTEXT..." className="bg-white/5 min-h-[150px] rounded-xl border-white/10 font-medium leading-relaxed text-sm" />
                    </div>

                    <div className="space-y-4">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Visual Evidence (Screenshot)</Label>
                       <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          {screenshotUrl ? (
                            <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-green-500/40">
                               <Image src={screenshotUrl} alt="Evidence" fill className="object-cover" />
                               <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Badge className="bg-white text-black font-black">CHANGE PHOTO</Badge>
                               </div>
                            </div>
                          ) : (
                            <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 hover:bg-white/5 transition-all bg-white/[0.02]">
                               {uploading ? <Loader2 className="w-10 h-10 animate-spin text-green-500" /> : <Camera className="w-10 h-10 text-muted-foreground opacity-40" />}
                               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Select Clear Evidence</p>
                            </div>
                          )}
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                       </div>
                       <p className="text-[9px] text-muted-foreground italic text-center uppercase tracking-widest">Instruction: Screenshot must be clear and under 5MB.</p>
                    </div>

                    <Button type="submit" disabled={submitting || uploading || ticketsRemaining <= 0} className="w-full h-16 bg-green-600 hover:bg-green-700 text-white font-black uppercase text-lg rounded-2xl shadow-xl glow-primary transition-all active:scale-95">
                       {submitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="w-6 h-6 mr-3" />}
                       {ticketsRemaining > 0 ? 'DISPATCH INTEL TO ADMIN' : 'QUOTA EXHAUSTED (24H)'}
                    </Button>
                 </form>
              </Card>
           </div>

           <div className="space-y-6">
              <h3 className="font-headline text-lg font-black uppercase italic flex items-center gap-2 text-muted-foreground ml-1">
                 <History className="w-4 h-4 text-green-500" /> ACTIVE DOSSIERS
              </h3>
              <ScrollArea className="h-[600px] pr-4">
                 <div className="space-y-4">
                    {ticketsLoading ? (
                      <div className="flex justify-center py-10"><Loader2 className="animate-spin text-muted-foreground" /></div>
                    ) : !myTickets || myTickets.length === 0 ? (
                      <div className="text-center py-20 border border-dashed border-white/5 rounded-3xl opacity-30">
                         <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                         <p className="text-[10px] font-black uppercase tracking-widest">No Active Reports</p>
                      </div>
                    ) : myTickets.map((t: any) => (
                      <Card key={t.id} className="glass border-white/5 bg-white/[0.02] overflow-hidden group hover:border-green-500/30 transition-all">
                         <div className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                               <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-white/10 bg-black/40">{t.category}</Badge>
                               <Badge className={cn("text-[8px] font-black", t.status === 'resolved' ? "bg-blue-600" : "bg-yellow-500")}>
                                  {t.status.toUpperCase()}
                               </Badge>
                            </div>
                            <div>
                               <p className="text-xs font-black uppercase text-white truncate group-hover:text-green-500 transition-colors">{t.subject}</p>
                               <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">{t.description}</p>
                            </div>
                            <div className="flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase opacity-60">
                               <Clock className="w-2.5 h-2.5" /> {new Date(t.createdAt).toLocaleDateString()}
                            </div>

                            {t.adminReply && (
                              <div className="bg-green-600/10 border border-green-500/20 p-4 rounded-xl mt-4 space-y-2 animate-in slide-in-from-bottom-2 duration-500">
                                 <p className="text-[9px] font-black text-green-500 uppercase flex items-center gap-1.5"><Zap className="w-3 h-3 fill-green-500" /> ADMIN RESPONSE RECEIVED</p>
                                 <p className="text-[11px] text-white font-medium italic leading-relaxed">"{t.adminReply}"</p>
                                 <div className="h-[1px] bg-green-500/10 w-full" />
                                 <p className="text-[8px] font-black text-green-500/60 uppercase">Verified Intel • Response Dispatch Complete</p>
                              </div>
                            )}
                         </div>
                      </Card>
                    ))}
                 </div>
              </ScrollArea>
           </div>
        </div>
      </div>
    </PageWrapper>
  );
}
