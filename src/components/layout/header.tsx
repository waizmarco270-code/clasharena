import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Shield, Wallet, Menu } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function Header() {
  const avatar = PlaceHolderImages.find(img => img.id === 'avatar-user');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-dark h-16 border-b">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-lg text-white glow-primary rotate-3">
              C
            </div>
            <span className="font-headline font-bold text-xl tracking-tight hidden sm:inline-block">
              CLASH <span className="text-primary">ARENA</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full border border-white/5">
            <span className="text-sm font-medium">🪙 250</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/20">
              <Wallet className="h-3 w-3 text-primary" />
            </Button>
          </div>

          <Link href="/admin">
            <Button variant="outline" size="sm" className="hidden md:flex gap-2 border-primary/20 hover:bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">ADMIN</span>
            </Button>
          </Link>

          <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-3">
            <div className="flex flex-col items-end hidden xs:flex">
              <span className="text-xs font-bold leading-none">ELITE_CLASH</span>
              <span className="text-[10px] text-muted-foreground">TH16 • Champion</span>
            </div>
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarImage src={avatar?.imageUrl} alt="User" />
              <AvatarFallback>EC</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
