'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { ShieldCheck, ShieldAlert, Eye } from 'lucide-react';

export default function PrivacyPage() {
  const sections = [
    {
      title: "1. Information We Collect",
      content: "We collect information you provide directly during registration and platform usage. This includes your authenticated profile details (retrieved securely via Clerk), your Clash of Clans Player Tag (#...), your selected username, and logs of your financial transactions (Coin recharges and reward redemptions)."
    },
    {
      title: "2. How We Use Your Data",
      content: "Your data is used to run the Clash Arena platform securely. We use it to resolve tournament matches, verify match screenshot results via our AI Vision agent, maintain current leaderboard stats (wins, played), display active ranking badges, process automated deposits, and send notifications regarding tournament check-ins and rewards."
    },
    {
      title: "3. Data Storage & Security Protocols",
      content: "We store data securely using industry-standard platforms (Google Cloud Firestore). Sensitive database operations, such as account balances, are locked behind admin-only write permissions. We do not store service account credentials on client browsers. Sensitive payment processes are hosted by Razorpay and Clerk, utilizing end-to-end tokenized configurations."
    },
    {
      title: "4. Cookies & Analytics",
      content: "We use essential cookies to maintain your login session. We also use Vercel Web Analytics to track page performance, load times, and aggregated client interactions to improve performance across mobile and desktop devices. No personally identifiable tracking data is shared with external marketers."
    },
    {
      title: "5. Third-Party Integrations",
      content: "Clash Arena integrates third-party services like Clerk for secure authentication, Razorpay for automated UPI/card payments, and Cloudinary for screenshot storage. Each of these providers has their own strict privacy policies, and we recommend reviewing their terms."
    },
    {
      title: "6. User Rights & Profile Control",
      content: "You retain full control over your platform profile. You may modify your Clash player tag, contact support for account correction, or request the deletion of your account record from our databases at any time."
    }
  ];

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-12 pb-20 px-4">
        <div className="text-center space-y-4">
           <div className="inline-flex p-4 bg-primary/10 rounded-[2rem] border border-primary/20 mb-4 animate-bounce">
              <ShieldCheck className="w-12 h-12 text-primary" />
           </div>
           <h1 className="font-headline text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">PRIVACY <span className="text-primary">POLICY</span></h1>
           <p className="text-muted-foreground font-black uppercase tracking-[0.4em] text-xs">How We Protect and Handle Your Data</p>
        </div>

        <div className="glass border-white/5 rounded-[3rem] p-6 md:p-10 bg-black/40 space-y-8">
          <p className="text-sm font-medium text-muted-foreground leading-relaxed uppercase tracking-tight text-center max-w-2xl mx-auto">
             Your privacy is paramount. This policy documents how we collect, store, and utilize details regarding your gaming tag, authentication profiles, and purchases.
          </p>

          <div className="space-y-6">
            {sections.map((section, index) => (
              <div key={index} className="glass bg-white/5 border border-white/5 rounded-2xl p-6 md:p-8 space-y-3 hover:border-primary/20 transition-colors">
                <h3 className="font-headline text-xl font-black tracking-tight text-white uppercase italic flex items-center gap-3">
                  <Eye className="w-5 h-5 text-primary shrink-0" />
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
              <h4 className="font-headline text-2xl font-black uppercase italic text-white">DATA COMPLIANCE OFFICER</h4>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed uppercase tracking-tight">
                 For any data correction queries, deletion requests, or GDPR compliance inquiries, contact us directly at <span className="text-white">support@clasharena.emitygate.com</span>. We will respond within 48 hours.
              </p>
           </div>
        </div>
      </div>
    </PageWrapper>
  );
}
