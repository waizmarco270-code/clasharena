'use client';

import { useMemo } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Trophy, ShieldCheck, Star } from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export default function HallOfChampionsLayout({ children }: { children: React.ReactNode }) {
  const db = useFirestore();
  const { user } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const backgroundsRef = useMemo(() => doc(db, 'app-settings', 'backgrounds'), [db]);
  const { data: bgData } = useDoc(backgroundsRef);

  const tabs = [
    { id: 'main', label: 'Leaderboard', icon: Trophy, href: '/hall-of-champions/main' },
    { id: 'proof', label: "Legend's Proof", icon: ShieldCheck, href: '/hall-of-champions/proof' },
    { id: 'archives', label: 'Mission Archives', icon: Star, href: '/hall-of-champions/archives' }
  ];

  return (
    <PageWrapper>
      <div className="relative min-h-screen">
        {bgData?.hallOfChampions && (
          <div className="fixed-bg">
            <Image 
              src={bgData.hallOfChampions} 
              alt="Hall BG" 
              fill 
              className="object-cover opacity-60 saturate-150" 
              priority 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/20 to-background" />
          </div>
        )}

        <div className="relative z-10 flex flex-col gap-8">
          <div className="text-center max-w-2xl mx-auto py-8 relative">
            <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-4 border border-primary/20">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-headline text-5xl font-black mb-2 tracking-tight uppercase leading-none text-white">
              Hall of <span className="text-primary italic">Champions</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              The eternal record of the greatest warriors in the Clash Arena ecosystem.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="w-full max-w-md mx-auto mb-6">
            <div className="bg-muted/50 border border-white/10 w-full rounded-2xl p-1 flex gap-1 justify-between">
              {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <button
                    key={tab.id}
                    onClick={() => router.push(tab.href)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap",
                      isActive 
                        ? "bg-primary text-white shadow-lg glow-primary border border-primary/20" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            {children}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
