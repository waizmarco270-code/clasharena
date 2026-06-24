'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { AlertCircle, HelpCircle, Coins, Check } from 'lucide-react';

export default function RefundPolicyPage() {
  const conditions = [
    {
      title: "Condition A: Failed Coin Delivery",
      description: "If your payment was successfully deducted from your bank/UPI account but the platform failed to credit the corresponding Coins to your Clash Arena balance."
    },
    {
      title: "Condition B: Unused Balances",
      description: "If you purchased Coins but have not spent or used any portion of those purchased Coins in any tournament entries, matches, registration fees, or other platform activities."
    }
  ];

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-12 pb-20 px-4">
        <div className="text-center space-y-4">
           <div className="inline-flex p-4 bg-primary/10 rounded-[2rem] border border-primary/20 mb-4 animate-bounce">
              <Coins className="w-12 h-12 text-primary" />
           </div>
           <h1 className="font-headline text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">REFUND <span className="text-primary">POLICY</span></h1>
           <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-xs">Coin Purchase & Cancellation Guidelines</p>
        </div>

        <div className="glass border-white/5 rounded-[3rem] p-6 md:p-10 bg-black/40 space-y-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h3 className="font-headline text-2xl font-black uppercase italic text-white">General Policy Summary</h3>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase tracking-tight">
               Once virtual Coins are purchased and successfully credited to your Clash Arena wallet, they are strictly non-refundable under standard conditions.
            </p>
          </div>

          <hr className="border-white/5" />

          {/* Refund eligibility block */}
          <div className="space-y-6">
            <h4 className="font-headline text-xl font-black uppercase italic text-white tracking-tight flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Eligible Scenarios for Refund
            </h4>
            
            <p className="text-sm text-muted-foreground font-medium">
              A refund request will only be reviewed, approved, and processed if it meets one of the following two conditions:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {conditions.map((cond, idx) => (
                <div key={idx} className="glass bg-white/5 border border-primary/20 rounded-2xl p-6 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-16 w-16 bg-primary/10 rounded-bl-full flex items-center justify-center pl-4 pb-4">
                     <Check className="w-5 h-5 text-primary" />
                  </div>
                  <h5 className="font-headline text-lg font-black uppercase text-white leading-tight italic pr-8">{cond.title}</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">{cond.description}</p>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-white/5" />

          {/* Non-eligible scenarios */}
          <div className="space-y-4">
            <h4 className="font-headline text-xl font-black uppercase italic text-red-500 tracking-tight flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Non-Refundable Scenarios
            </h4>
            <ul className="space-y-3">
              {[
                "Any Coins that have already been spent to register for any tournament arena.",
                "Coins lost due to match check-in failure, technical disqualifications, or war losses.",
                "Claims made without a valid Razorpay transaction receipt or order identifier.",
                "Users found in violation of War Protocols, Fair Play guidelines, or active ban-list participants."
              ].map((text, idx) => (
                <li key={idx} className="flex gap-3 items-start text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="text-red-500">❌</span> {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6">
           <AlertCircle className="w-16 h-16 text-primary animate-pulse shrink-0" />
           <div className="space-y-2 text-center md:text-left">
              <h4 className="font-headline text-2xl font-black uppercase italic text-white">HOW TO REQUEST A REFUND</h4>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed uppercase tracking-tight">
                 To initiate a claim, submit a support ticket via the <strong className="text-white">Support Desk</strong> or email <span className="text-white">support@clasharena.emitygate.com</span> with your username, payment receipt, and transaction ID. Valid refunds take 5-7 working days to credit back to your payment source.
              </p>
           </div>
        </div>
      </div>
    </PageWrapper>
  );
}
