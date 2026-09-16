import { Hexagon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoinIconProps {
  className?: string;
}

export function CoinIcon({ className }: CoinIconProps) {
  return (
    <div className={cn("relative inline-flex items-center justify-center align-middle shrink-0 w-[1.2em] h-[1.2em] mx-1 -translate-y-[0.1em]", className)}>
      <div className="absolute inset-0 bg-amber-500/20 blur-sm rounded-full" />
      <Hexagon className="absolute inset-0 w-full h-full text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] fill-amber-500/20" />
      <Hexagon className="absolute w-[40%] h-[40%] text-amber-200 fill-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,1)]" />
    </div>
  );
}
