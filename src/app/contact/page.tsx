'use client';

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mail, Phone, MapPin, Send, HelpCircle } from 'lucide-react';

export default function ContactPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast({ variant: "destructive", title: "FIELDS EMPTY", description: "Please fill in all required fields." });
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast({ title: "INTEL SENT 🚀", description: "Our commanders have received your message and will respond shortly." });
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 1500);
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-12 pb-20 px-4">
        
        {/* Title */}
        <div className="text-center space-y-4">
           <div className="inline-flex p-4 bg-primary/10 rounded-[2rem] border border-primary/20 mb-4 animate-bounce">
              <Mail className="w-12 h-12 text-primary" />
           </div>
           <h1 className="font-headline text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">CONTACT <span className="text-primary">US</span></h1>
           <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-xs">Reach the Clash Arena Commanders</p>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          
          {/* Left panel: Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass border-white/5 rounded-[2.5rem] p-8 bg-black/40 space-y-8">
              <h3 className="font-headline text-2xl font-black uppercase italic text-white">COMMUNICATION HUB</h3>
              
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-headline font-black text-sm uppercase text-white">Official Support Email</h5>
                    <p className="text-xs text-muted-foreground mt-1">support@clasharena.emitygate.com</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-headline font-black text-sm uppercase text-white">Support Channels</h5>
                    <p className="text-xs text-muted-foreground mt-1">Active on Telegram and WhatsApp groups linked inside dashboard vault.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-headline font-black text-sm uppercase text-white">Registered Address</h5>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      EmityGate Tech Ecosystem<br />
                      Patna, Bihar, India<br />
                      PIN: 800001
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2rem] flex items-center gap-4">
              <HelpCircle className="w-10 h-10 text-primary shrink-0 animate-pulse" />
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wide leading-relaxed">
                Response ETA: Within 12-24 hours for tournament disputes, coins crediting checks, or portal support.
              </p>
            </div>
          </div>

          {/* Right panel: Contact Form */}
          <div className="lg:col-span-3">
            <div className="glass border-white/5 rounded-[2.5rem] p-8 bg-black/40">
              <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="font-headline text-2xl font-black uppercase italic text-white mb-6">TRANSMIT ENCRYPTED INTEL</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Your Name <span className="text-primary">*</span></label>
                    <Input 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Chief Marco" 
                      className="glass border-white/10 rounded-xl h-12 bg-white/5 focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Your Email <span className="text-primary">*</span></label>
                    <Input 
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. chief@gmail.com" 
                      className="glass border-white/10 rounded-xl h-12 bg-white/5 focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Subject</label>
                  <Input 
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Tournament Dispute TH16 Arena" 
                    className="glass border-white/10 rounded-xl h-12 bg-white/5 focus:border-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Message Intel <span className="text-primary">*</span></label>
                  <Textarea 
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Write details of your query..." 
                    className="glass border-white/10 rounded-xl bg-white/5 focus:border-primary/50 resize-none"
                  />
                </div>

                <Button 
                  disabled={submitting}
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/95 text-white font-black py-6 rounded-2xl glow-primary border-t border-white/20 uppercase tracking-widest text-xs shadow-2xl flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> {submitting ? "TRANSMITTING..." : "SEND MESSAGE"}
                </Button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
