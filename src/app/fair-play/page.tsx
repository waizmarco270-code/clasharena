'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, 
  Eye, 
  Lock, 
  Ban, 
  Zap, 
  Scale, 
  AlertCircle,
  Activity
} from 'lucide-react';
import Image from 'next/image';

export default function FairPlayPage() {
  const sections = [
    {
      title: "AI VISION AUDITING",
      icon: Eye,
      desc: "Our proprietary AI Vision protocol scans every submitted screenshot. It detects Town Hall levels, troop compositions, and final destruction percentages to ensure the reported results match the actual battle.",
      color: "text-blue-500"
    },
    {
      title: "ANTI-CHEAT ENGINE",
      icon: ShieldCheck,
      desc: "We maintain a zero-tolerance policy for scripts, mods, or private server exploits. Our ecosystem is hardwired into the EmityGate security framework to detect anomalous battle behavior.",
      color: "text-green-500"
    },
    {
      title: "IDENTITY PROTOCOL",
      icon: Lock,
      desc: "Warriors are required to lock their Clash Tag to their account. Town Hall levels are verified periodically. Smurfing or playing on an account lower than your reported level is a ban-worthy offense.",
      color: "text-purple-500"
    },
    {
      title: "BANNING POLICY",
      icon: Ban,
      desc: "First-time minor offenses result in a 7-day arena suspension. Severe cheating or result-faking results in a permanent lifetime hardware and IP ban from the Clash Arena ecosystem.",
      color: "text-red-500"
    }
  ];

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-16 pb-20">
        <div className="text-center space-y-6">
           <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
              <div className="relative p-6 bg-primary/10 rounded-[2.5rem] border border-primary/20 mb-4">
                 <ShieldCheck className="w-16 h-16 text-primary" />
              </div>
           </div>
           <h1 className="font-headline text-5xl md:text-7xl font-black uppercase italic tracking-tighter">FAIR PLAY <span className="text-primary">PROTOCOL</span></h1>
           <p className="max-w-2xl mx-auto text-muted-foreground font-medium text-lg uppercase tracking-tight">
             Ensuring 100% competitive integrity through automated auditing and secure identity locking.
           </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {sections.map((section, i) => (
             <Card key={i} className="glass border-white/5 p-10 rounded-[3rem] bg-black/40 group hover:border-primary/30 transition-all duration-500">
                <div className="flex flex-col gap-6">
                   <div className={`p-4 bg-white/5 w-fit rounded-2xl border border-white/10 ${section.color} group-hover:scale-110 transition-transform`}>
                      <section.icon className="w-10 h-10" />
                   </div>
                   <h3 className="font-headline text-3xl font-black uppercase italic tracking-tight">{section.title}</h3>
                   <p className="text-muted-foreground leading-relaxed font-medium uppercase tracking-tight text-sm">
                      {section.desc}
                   </p>
                </div>
             </Card>
           ))}
        </div>

        <div className="relative p-1 bg-gradient-to-r from-primary/40 via-blue-500/40 to-primary/40 rounded-[3rem]">
           <div className="glass bg-black p-12 rounded-[2.9rem] flex flex-col md:flex-row items-center justify-between gap-12 overflow-hidden">
              <div className="space-y-6 relative z-10 flex-1">
                 <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-xs">
                    <Activity className="w-4 h-4 animate-pulse" /> Live System Monitor
                 </div>
                 <h2 className="font-headline text-4xl font-black uppercase italic tracking-tighter">INTEGRITY IS <span className="text-primary">AUTOMATED</span></h2>
                 <p className="text-muted-foreground leading-relaxed font-medium">
                    Our system is currently auditing <span className="text-white font-bold">140+ Daily Arena Battles</span>. Not a single reward is processed without the AI Vision Green Light.
                 </p>
                 <div className="flex flex-wrap gap-4 pt-4">
                    <Badge variant="outline" className="border-green-500/20 text-green-500 bg-green-500/5 px-4 py-2 font-black">AI VERIFIED: ONLINE</Badge>
                    <Badge variant="outline" className="border-blue-500/20 text-blue-500 bg-blue-500/5 px-4 py-2 font-black">ANTI-CHEAT: V3.4</Badge>
                 </div>
              </div>
              <div className="relative h-64 w-full md:w-80 group">
                 <Image src="https://picsum.photos/seed/fairplay-scan/400/400" alt="Scanning" fill className="object-cover rounded-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
                 <div className="absolute inset-0 border-2 border-primary/20 rounded-3xl animate-pulse" />
                 <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-[scan_3s_linear_infinite]" />
              </div>
           </div>
        </div>

        <style jsx global>{`
          @keyframes scan {
            0% { transform: translateY(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(256px); opacity: 0; }
          }
        `}</style>
      </div>
    </PageWrapper>
  );
}
