'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Swords, 
  ShieldAlert, 
  Trophy, 
  Users, 
  ChevronDown, 
  Scale,
  ListChecks,
  AlertTriangle
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function RulesPage() {
  const rules = [
    {
      id: 'item-1',
      title: 'ARENA ENTRY PROTOCOL',
      icon: Users,
      content: [
        'A valid Clash of Clans Tag (#...) is mandatory for all participants.',
        'Your Town Hall level must strictly match the arena requirement. Misrepresentation leads to DQ.',
        'One account per warrior. Multi-accounting is strictly monitored via IP-lock.',
        'Entry fees are non-refundable once the tournament bracket is generated.'
      ]
    },
    {
      id: 'item-2',
      title: 'BATTLE ENGAGEMENT RULES',
      icon: Swords,
      content: [
        'Matches must take place in the designated official War Clan.',
        'Warriors must attack their assigned target within the specified time window.',
        'No external mods, private servers, or third-party assistance allowed.',
        'Both players must upload a clear result screenshot if the match result is disputed.'
      ]
    },
    {
      id: 'item-3',
      title: 'REWARD FULFILLMENT',
      icon: Trophy,
      content: [
        'Tournament winners are determined by the final bracket outcome.',
        'Prize money is processed within 24 hours of victory confirmation.',
        'Arena Coins are credited instantly to the winner\'s vault.',
        'Admin decisions are final in case of technical disputes or server outages.'
      ]
    },
    {
      id: 'item-4',
      title: 'DISCIPLINARY ACTIONS',
      icon: AlertTriangle,
      content: [
        'Toxicity in Arena Chat will result in a 3-day mute.',
        'Faking result screenshots leads to an immediate permanent ban.',
        'Failure to show up for a match results in a technical loss and 0 reward.',
        'Exploiting platform bugs for unfair advantage is a ban-worthy offense.'
      ]
    }
  ];

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        <div className="text-center space-y-4">
           <div className="inline-flex p-4 bg-primary/10 rounded-[2rem] border border-primary/20 mb-4 animate-bounce">
              <Scale className="w-12 h-12 text-primary" />
           </div>
           <h1 className="font-headline text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">WAR <span className="text-primary">PROTOCOLS</span></h1>
           <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-xs">Standardized Rules for Competitive Excellence</p>
        </div>

        <div className="glass border-white/5 rounded-[3rem] p-4 md:p-8 bg-black/40">
           <Accordion type="single" collapsible className="space-y-4">
              {rules.map((rule) => (
                <AccordionItem key={rule.id} value={rule.id} className="border-none">
                  <AccordionTrigger className="glass bg-white/5 hover:bg-white/10 px-6 py-6 rounded-2xl transition-all data-[state=open]:rounded-b-none data-[state=open]:border-primary/20 border border-white/5">
                     <div className="flex items-center gap-4 text-left">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary"><rule.icon className="w-6 h-6" /></div>
                        <span className="font-headline text-xl font-black tracking-tight uppercase italic">{rule.title}</span>
                     </div>
                  </AccordionTrigger>
                  <AccordionContent className="glass bg-black/60 border-x border-b border-white/5 rounded-b-2xl p-8 animate-in slide-in-from-top-2 duration-300">
                     <ul className="space-y-4">
                        {rule.content.map((item, idx) => (
                          <li key={idx} className="flex gap-4 items-start group">
                             <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0 group-hover:scale-150 transition-transform shadow-[0_0_10px_rgba(255,69,0,0.8)]" />
                             <p className="text-sm font-medium text-white/80 leading-relaxed uppercase tracking-tight">{item}</p>
                          </li>
                        ))}
                     </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
           </Accordion>
        </div>

        <div className="bg-primary/5 border border-primary/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6">
           <ShieldAlert className="w-16 h-16 text-primary animate-pulse" />
           <div className="space-y-2 text-center md:text-left">
              <h4 className="font-headline text-2xl font-black uppercase italic">INTEGRITY FIRST</h4>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed uppercase tracking-tight">
                 By participating in any Clash Arena tournament, you agree to abide by these protocols. Our AI Vision system monitors all result submissions for 100% accuracy.
              </p>
           </div>
        </div>
      </div>
    </PageWrapper>
  );
}
