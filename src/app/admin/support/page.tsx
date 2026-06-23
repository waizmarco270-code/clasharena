'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Headset, 
  MessageSquare, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  Send,
  Zap,
  User,
  Clock,
  ExternalLink,
  ShieldCheck,
  Search,
  Filter,
  X
} from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function AdminSupportPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const supportQuery = useMemo(() => query(collection(db, 'support-tickets'), orderBy('createdAt', 'desc'), limit(50)), [db]);
  const { data: tickets, loading } = useCollection(supportQuery);

  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(t => 
      t.username.toLowerCase().includes(search.toLowerCase()) || 
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [tickets, search]);

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim() || isReplying) return;
    setIsReplying(true);
    try {
      const ticketRef = doc(db, 'support-tickets', selectedTicket.id);
      await updateDoc(ticketRef, {
        adminReply: replyText,
        repliedAt: new Date().toISOString(),
        status: 'resolved'
      });
      toast({ title: "REPLY DISPATCHED", description: "Warrior notified." });
      setSelectedTicket(null);
      setReplyText('');
    } catch (e) {
      toast({ variant: "destructive", title: "REPLY FAILED" });
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h2 className="font-headline text-2xl font-black uppercase italic tracking-tighter">SUPPORT <span className="text-green-500">DOSSIERS</span></h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reviewing {tickets?.length || 0} Incident Reports</p>
         </div>
         <div className="relative group max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-green-500 transition-colors" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="SEARCH COMMANDERS OR SUBJECTS..." 
              className="bg-white/5 border-white/10 pl-10 h-11 text-[10px] font-black uppercase tracking-widest"
            />
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-green-500" /></div>
        ) : filteredTickets.length === 0 ? (
          <div className="col-span-full py-20 text-center glass border-dashed border-white/10 rounded-3xl opacity-40">
             <ShieldCheck className="w-12 h-12 mx-auto mb-4" />
             <p className="font-black uppercase tracking-widest">All Intel Clear • No Pending Issues</p>
          </div>
        ) : filteredTickets.map((t: any) => (
          <Card key={t.id} className="glass border-white/5 bg-black/40 overflow-hidden group hover:border-green-500/40 transition-all flex flex-col h-full">
             <div className={cn("h-1 w-full", t.status === 'resolved' ? "bg-blue-600" : "bg-yellow-500 animate-pulse")} />
             <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                   <Badge variant="outline" className="text-[8px] font-black bg-white/5 border-white/10 uppercase">{t.category}</Badge>
                   <Badge className={cn("text-[8px] font-black uppercase", t.status === 'resolved' ? "bg-blue-600" : "bg-yellow-500")}>
                      {t.status}
                   </Badge>
                </div>
                <CardTitle className="text-sm font-black uppercase italic truncate text-white">{t.subject}</CardTitle>
                <div className="flex items-center gap-2 pt-1">
                   <User className="w-3 h-3 text-green-500" />
                   <span className="text-[9px] font-bold text-muted-foreground uppercase">{t.username}</span>
                </div>
             </CardHeader>
             <CardContent className="flex-1 space-y-4">
                <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-3 bg-white/5 p-3 rounded-xl italic">"{t.description}"</p>
                {t.screenshotUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
                     <Image src={t.screenshotUrl} alt="Evidence" fill className="object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                     <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-green-500 fill-green-500" />
                        <span className="text-[8px] font-black uppercase text-white shadow-xl">Visual Evidence</span>
                     </div>
                  </div>
                )}
             </CardContent>
             <div className="p-4 bg-white/5 border-t border-white/5 mt-auto">
                <Button onClick={() => setSelectedTicket(t)} className="w-full h-10 bg-green-600 font-black uppercase text-[10px] rounded-xl hover:bg-green-700 glow-primary transition-all">
                   REVIEW DOSSIER <Eye className="w-3.5 h-3.5 ml-2" />
                </Button>
             </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="glass border-white/10 max-w-4xl p-0 overflow-hidden outline-none h-[90vh] flex flex-col">
           <div className="p-6 border-b border-white/5 bg-black/60 shrink-0">
              <DialogHeader>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-green-600/10 rounded-xl"><Headset className="text-green-500" /></div>
                       <div>
                          <DialogTitle className="font-headline text-2xl font-black italic uppercase text-white">REVIWEING <span className="text-green-500">INCIDENT</span></DialogTitle>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Commander: {selectedTicket?.username} • Category: {selectedTicket?.category}</p>
                       </div>
                    </div>
                    <Badge className={cn("h-6 uppercase font-black px-4", selectedTicket?.status === 'resolved' ? "bg-blue-600" : "bg-yellow-500")}>{selectedTicket?.status}</Badge>
                 </div>
              </DialogHeader>
           </div>

           <ScrollArea className="flex-1">
              <div className="p-8 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-green-500">Subject Intel</Label>
                          <h3 className="text-xl font-black uppercase text-white leading-tight">{selectedTicket?.subject}</h3>
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-green-500">Detailed Dossier</Label>
                          <p className="text-sm font-medium text-muted-foreground leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/5 italic">
                             "{selectedTicket?.description}"
                          </p>
                       </div>
                       <div className="flex items-center gap-4 text-[10px] font-black text-muted-foreground/40 uppercase pt-4">
                          <Clock className="w-4 h-4" /> Reported on {selectedTicket && new Date(selectedTicket.createdAt).toLocaleString()}
                       </div>
                    </div>

                    <div className="space-y-4">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-green-500">Visual Evidence</Label>
                       {selectedTicket?.screenshotUrl ? (
                         <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-white/5 group shadow-2xl bg-black">
                            <Image src={selectedTicket.screenshotUrl} alt="Evidence" fill className="object-contain" />
                            <a href={selectedTicket.screenshotUrl} target="_blank" className="absolute top-4 right-4 bg-black/60 p-2 rounded-xl border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                               <ExternalLink className="w-4 h-4 text-white" />
                            </a>
                         </div>
                       ) : (
                         <div className="aspect-video rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-2 bg-white/[0.01] opacity-40">
                            <X className="w-8 h-8" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No Visual Assets</p>
                         </div>
                       )}
                    </div>
                 </div>

                 {selectedTicket?.status === 'resolved' ? (
                   <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-3xl space-y-4 animate-in fade-in zoom-in-95 duration-500">
                      <div className="flex items-center gap-3 text-blue-500">
                         <ShieldCheck className="w-6 h-6" />
                         <span className="text-xs font-black uppercase tracking-widest">Incident Resolved</span>
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase text-muted-foreground">Admin Response Sent</Label>
                         <p className="text-sm font-bold text-white italic">"{selectedTicket.adminReply}"</p>
                      </div>
                      <p className="text-[8px] font-black text-muted-foreground/60 uppercase pt-2">Resolved at: {new Date(selectedTicket.repliedAt).toLocaleString()}</p>
                   </div>
                 ) : (
                   <div className="space-y-6 pt-6 border-t border-white/5">
                      <div className="flex items-center gap-3 text-green-500 mb-2">
                         <MessageSquare className="w-6 h-6" />
                         <h4 className="text-xs font-black uppercase tracking-[0.2em]">Deploy Response</h4>
                      </div>
                      <Textarea 
                        value={replyText} 
                        onChange={e => setReplyText(e.target.value)} 
                        placeholder="TYPE OFFICIAL RESPONSE PROTOCOL..." 
                        className="bg-white/5 min-h-[120px] rounded-2xl border-white/10 font-bold text-sm leading-relaxed"
                      />
                      <div className="flex gap-4">
                         <Button onClick={handleReply} disabled={!replyText.trim() || isReplying} className="flex-1 h-14 bg-green-600 font-black uppercase text-lg rounded-2xl glow-primary shadow-xl">
                            {isReplying ? <Loader2 className="animate-spin mr-2" /> : <Send className="w-5 h-5 mr-3" />} DISPATCH RESPONSE
                         </Button>
                      </div>
                   </div>
                 )}
              </div>
           </ScrollArea>
           
           <div className="p-6 border-t border-white/5 bg-black/40 text-center shrink-0">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.4em]">ADMIN INCIDENT REVIEW PROTOCOL V4.1 • EMITYGATE SYSTEMS</p>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
