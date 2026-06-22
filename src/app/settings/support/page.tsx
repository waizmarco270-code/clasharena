'use client';

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
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
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SupportPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulation of ticket dispatch
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <PageWrapper>
        <div className="max-w-xl mx-auto py-20 text-center space-y-8 animate-in fade-in zoom-in duration-500">
           <div className="relative inline-block">
              <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full animate-pulse" />
              <CheckCircle2 className="w-24 h-24 text-green-500 relative z-10 mx-auto" />
           </div>
           <div className="space-y-4">
              <h2 className="font-headline text-4xl font-black italic uppercase text-white">TICKET <span className="text-green-500">DISPATCHED</span></h2>
              <p className="text-muted-foreground font-medium px-8 uppercase tracking-tight text-sm">
                 Our intelligence officers are reviewing your request. Expect a response in your Command Hub within <span className="text-white font-bold">12-24 hours</span>.
              </p>
           </div>
           <Link href="/settings" className="block px-8">
              <Button className="w-full h-14 bg-white text-black font-black rounded-2xl hover:scale-105 transition-transform">
                 RETURN TO SETTINGS
              </Button>
           </Link>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto space-y-8 pb-20">
        <Link href="/settings" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to Settings
        </Link>

        <div className="space-y-2">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
                 <MessageSquare className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="font-headline text-3xl font-black uppercase italic tracking-tighter text-white">CONTACT <span className="text-green-500">INTELLIGENCE</span></h1>
           </div>
           <p className="text-muted-foreground text-sm font-medium uppercase tracking-tight ml-1">Direct encrypted link to the admin command desk.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="md:col-span-2">
              <Card className="glass border-white/5 bg-black/40 p-8 rounded-[2rem]">
                 <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Issue Category</Label>
                       <Select required>
                          <SelectTrigger className="bg-white/5 h-12 rounded-xl border-white/10">
                             <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent className="glass">
                             <SelectItem value="payment" className="font-bold uppercase text-[10px]">Payment / Coins Vault</SelectItem>
                             <SelectItem value="bracket" className="font-bold uppercase text-[10px]">Tournament Bracket</SelectItem>
                             <SelectItem value="account" className="font-bold uppercase text-[10px]">Account / Identity Lock</SelectItem>
                             <SelectItem value="other" className="font-bold uppercase text-[10px]">Other Intelligence</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subject</Label>
                       <Input placeholder="Brief title of the issue" className="bg-white/5 h-12 rounded-xl border-white/10 font-bold" required />
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Detailed Intel</Label>
                       <Textarea placeholder="Explain your situation with as much detail as possible..." className="bg-white/5 min-h-[150px] rounded-xl border-white/10 font-medium leading-relaxed" required />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={submitting}
                      className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-black uppercase rounded-xl shadow-xl glow-primary transition-all group"
                    >
                       {submitting ? <Loader2 className="animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                       SUBMIT SUPPORT TICKET
                    </Button>
                 </form>
              </Card>
           </div>

           <div className="space-y-6">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-[2rem] p-6 space-y-4">
                 <div className="flex items-center gap-3 text-blue-500">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Protocol Check</span>
                 </div>
                 <p className="text-[11px] text-muted-foreground leading-relaxed font-medium uppercase tracking-tight">
                    Before submitting, please check the <Link href="/settings/faq" className="text-blue-500 underline underline-offset-2">Intelligence FAQ</Link>. 90% of technical queries are answered there.
                 </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-6 space-y-4">
                 <div className="flex items-center gap-3 text-primary">
                    <Zap className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Response ETA</span>
                 </div>
                 <p className="text-[11px] text-muted-foreground leading-relaxed font-medium uppercase tracking-tight">
                    Average response time is <span className="text-white font-bold">4 Hours</span>. During High-Stakes Championship events, it may extend up to 12 Hours.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </PageWrapper>
  );
}
