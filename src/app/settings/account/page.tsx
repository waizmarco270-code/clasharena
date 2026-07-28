'use client';

import { PageWrapper } from '@/components/layout/page-wrapper';
import { UserProfile } from '@clerk/nextjs';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function AccountSettingsPage() {
  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        <Link href="/settings" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" /> Back to Settings
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
           <div>
              <h1 className="font-headline text-3xl font-black uppercase italic tracking-tighter text-white">ACCOUNT <span className="text-primary">& SECURITY</span></h1>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">Manage your connected identity</p>
           </div>
        </div>

        <div className="flex justify-center w-full [&_.cl-card]:w-full [&_.cl-card]:max-w-4xl [&_.cl-rootBox]:w-full">
          <UserProfile path="/settings/account" routing="path" />
        </div>
      </div>
    </PageWrapper>
  );
}
