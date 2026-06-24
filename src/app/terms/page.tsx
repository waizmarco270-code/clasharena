'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { Scale, ShieldAlert, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function TermsPage() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: "By creating an account, accessing, or using the Clash Arena platform, you agree to be bound by these Terms and Conditions. If you do not agree, you must immediately cease using the platform."
    },
    {
      title: "2. Account Registration & Security",
      content: "You must register a valid account via Clerk Authentication. You agree to provide accurate information, including your official Clash of Clans player tag (#...). You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account."
    },
    {
      title: "3. Coin Recharge & Payments",
      content: "Clash Arena uses virtual Coins ('🪙') as platform currency for tournament entries. Coins can be obtained via authorized online payment methods (Razorpay). Coins hold no monetary value outside the platform, cannot be transferred to other users, and cannot be exchanged for cash currency under normal conditions, subject to our Refund Policy."
    },
    {
      title: "4. Tournament Guidelines & Bracket Integrity",
      content: "All matches must be played according to the designated War Protocols. Any attempts at match-fixing, colluding, cheating, using unauthorized third-party mods, or submitting fraudulent game screenshots will result in immediate disqualification, forfeiture of rewards, and a permanent platform ban."
    },
    {
      title: "5. Intellectual Property Rights",
      content: "Clash Arena and all original graphics, codes, UI, and content are the intellectual property of Clash Arena. Clash of Clans, its assets, and brand assets are the registered trademarks of Supercell Oy, and Clash Arena claims no ownership or affiliation with Supercell."
    },
    {
      title: "6. Limitation of Liability",
      content: "Clash Arena is provided on an 'as-is' basis. We are not liable for any network disconnections, game server downtime, automated API lag, transaction delays, or issues arising from third-party payment gateways."
    }
  ];

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-12 pb-20 px-4">
        <div className="text-center space-y-4">
           <div className="inline-flex p-4 bg-primary/10 rounded-[2rem] border border-primary/20 mb-4 animate-bounce">
              <Scale className="w-12 h-12 text-primary" />
           </div>
           <h1 className="font-headline text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">TERMS & <span className="text-primary">CONDITIONS</span></h1>
           <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-xs">Agreement of Play and Arena Conduct</p>
        </div>

        <div className="glass border-white/5 rounded-[3rem] p-6 md:p-10 bg-black/40 space-y-8">
          <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase tracking-tight text-center max-w-2xl mx-auto">
             Please read these terms carefully before entering the battle arena. They govern your registration, coin purchase, and tournament play behavior.
          </p>

          <div className="space-y-6">
            {sections.map((section, index) => (
              <div key={index} className="glass bg-white/5 border border-white/5 rounded-2xl p-6 md:p-8 space-y-3 hover:border-primary/20 transition-colors">
                <h3 className="font-headline text-xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                  {section.title}
                </h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6">
           <ShieldAlert className="w-16 h-16 text-primary animate-pulse shrink-0" />
           <div className="space-y-2 text-center md:text-left">
              <h4 className="font-headline text-2xl font-black uppercase italic text-white">ARENA GOVERNING LAW</h4>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed uppercase tracking-tight">
                 These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from these Terms will be subject to the exclusive jurisdiction of the competent courts in India.
              </p>
           </div>
        </div>
      </div>
    </PageWrapper>
  );
}
