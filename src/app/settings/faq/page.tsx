'use client';

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  HelpCircle, 
  ChevronLeft,
  Wallet,
  Swords,
  ShieldCheck,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';

const FAQ_DATA = [
  {
    category: 'Wallet & Payments',
    icon: Wallet,
    items: [
      { q: 'How long does a coin recharge take?', a: 'Manual recharges typically take 5-15 minutes after you upload your payment screenshot. Our team verifies every proof manually to ensure accuracy.' },
      { q: 'Can I withdraw my earnings?', a: 'Yes! Earnings can be withdrawn to your verified UPI ID within 24 hours of a withdrawal request.' },
      { q: 'My payment failed but amount was deducted.', a: 'Please contact support immediately with your transaction ID and screenshot. Our engineers will audit the gateway logs and credit your vault.' }
    ]
  },
  {
    category: 'Arena Protocols',
    icon: Swords,
    items: [
      { q: 'What happens if my opponent doesn\'t show up?', a: 'If an opponent fails to attack within the specified war window, they receive a technical loss and you proceed to the next round.' },
      { q: 'How are bracket fixtures generated?', a: 'Brackets are generated using a cryptographically secure random shuffle of all registered warriors once the registration window closes.' },
      { q: 'Can I play with a different Town Hall?', a: 'No. You must play with the Town Hall level reported in your profile. Misrepresentation leads to immediate disqualification.' }
    ]
  },
  {
    category: 'Integrity & AI',
    icon: ShieldCheck,
    items: [
      { q: 'How does AI Result Verification work?', a: 'Our AI Vision protocol analyzes the uploaded match screenshots, detecting stars, destruction percentage, and player tags to prevent fraud.' },
      { q: 'What is the "Identity Lock"?', a: 'To prevent smurfing, your Clash Tag is locked to your account. You can only update it once every 72 hours with admin approval.' }
    ]
  }
];

export default function FaqPage() {
  const [search, setSearch] = useState('');

  const filteredFaqs = FAQ_DATA.map(cat => ({
    ...cat,
    items: cat.items.filter(i => 
      i.q.toLowerCase().includes(search.toLowerCase()) || 
      i.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <Link href="/settings" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to Settings
        </Link>

        <div className="space-y-6">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                 <HelpCircle className="w-8 h-8 text-blue-500" />
              </div>
              <h1 className="font-headline text-3xl font-black uppercase italic tracking-tighter text-white">INTELLIGENCE <span className="text-blue-500">FAQ</span></h1>
           </div>
           
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
              <Input 
                placeholder="Search arena knowledge..." 
                className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl font-bold text-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
        </div>

        <div className="space-y-12 pt-4">
           {filteredFaqs.length === 0 ? (
             <div className="py-20 text-center space-y-4 opacity-40">
                <Search className="w-12 h-12 mx-auto text-muted-foreground" />
                <p className="font-black uppercase tracking-widest">No matching intel found</p>
             </div>
           ) : filteredFaqs.map((cat, i) => (
             <section key={i} className="space-y-6">
                <div className="flex items-center gap-3 text-blue-500">
                   <cat.icon className="w-5 h-5" />
                   <h3 className="text-xs font-black uppercase tracking-[0.3em]">{cat.category}</h3>
                </div>
                <div className="glass border-white/5 rounded-[2rem] p-4 bg-black/40">
                   <Accordion type="single" collapsible className="w-full space-y-2">
                      {cat.items.map((item, idx) => (
                        <AccordionItem key={idx} value={`item-${i}-${idx}`} className="border-none">
                           <AccordionTrigger className="hover:no-underline px-4 py-4 rounded-xl hover:bg-white/5 transition-all text-left">
                              <span className="text-sm font-bold uppercase tracking-tight text-white/90">{item.q}</span>
                           </AccordionTrigger>
                           <AccordionContent className="px-4 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed font-medium">
                              {item.a}
                           </AccordionContent>
                        </AccordionItem>
                      ))}
                   </Accordion>
                </div>
             </section>
           ))}
        </div>
      </div>
    </PageWrapper>
  );
}
