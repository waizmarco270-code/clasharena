import Link from 'next/link';
import { Home, Swords, Trophy, User } from 'lucide-react';

export function BottomNav() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md md:hidden">
      <nav className="glass rounded-2xl flex items-center justify-around py-3 px-2 shadow-2xl border border-white/10">
        <Link href="/" className="flex flex-col items-center gap-1 group">
          <Home className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-[10px] font-medium text-muted-foreground group-hover:text-primary">Home</span>
        </Link>
        
        <Link href="/arena" className="flex flex-col items-center gap-1 group">
          <Swords className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-[10px] font-medium text-muted-foreground group-hover:text-primary">Arena</span>
        </Link>

        <Link href="/hall-of-champions" className="flex flex-col items-center gap-1 group">
          <Trophy className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-[10px] font-medium text-muted-foreground group-hover:text-primary">Champions</span>
        </Link>

        <Link href="/profile" className="flex flex-col items-center gap-1 group">
          <User className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-[10px] font-medium text-muted-foreground group-hover:text-primary">Profile</span>
        </Link>
      </nav>
    </div>
  );
}
