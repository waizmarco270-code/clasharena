'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { TH_THEMES } from '@/lib/th-themes';

interface THRuleCardProps {
  th: string;
  rulesList: string[];
  index?: number;
}

export function THRuleCard({ th, rulesList, index = 0 }: THRuleCardProps) {
  const theme = TH_THEMES[th] || TH_THEMES["17"]; // Fallback theme
  const Icon = theme.icon;

  return (
    <div 
      className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both w-full"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <Card className={cn("glass relative overflow-hidden h-full flex flex-col border transition-all duration-500 hover:scale-[1.02]", theme.border, theme.shadow)}>
        
        {/* Animated Gradient Background */}
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 z-0", theme.bg)} />
        
        <CardHeader className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-sm">
          <CardTitle className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className={cn("text-2xl font-headline font-black italic uppercase drop-shadow-md", theme.color)}>
                TOWN HALL {th}
              </span>
              <span className="text-[9px] font-black tracking-[0.2em] uppercase text-white/60">
                {theme.label}
              </span>
            </div>
            <div className={cn("p-3 rounded-xl bg-black/40 border", theme.border, theme.color)}>
              <Icon className="w-6 h-6" />
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative z-10 p-5 flex-1 bg-black/20 backdrop-blur-md">
          {(!rulesList || rulesList.length === 0) ? (
            <p className="text-xs text-white/50 font-bold uppercase text-center italic mt-4">Standard Rules Apply</p>
          ) : (
            <ul className="space-y-4">
              {rulesList.map((rule, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-white/90">
                  <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_currentColor]", theme.color)} style={{ backgroundColor: 'currentColor' }} />
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-snug prose-strong:text-white">
                    <ReactMarkdown>{rule}</ReactMarkdown>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
