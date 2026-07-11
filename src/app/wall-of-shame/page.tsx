'use client';

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Skull, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function WallOfShamePage() {
  const db = useFirestore();
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchBannedUsers();
  }, [db]);

  const fetchBannedUsers = async () => {
    try {
      // Get recently banned users
      const q = query(collection(db, 'users'), where('banned', '==', true), limit(100));
      const snap = await getDocs(q);
      
      // Since we didn't have an index on bannedAt, we can sort them client side for now.
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      users.sort((a, b) => (b.bannedAt || 0) - (a.bannedAt || 0));
      
      setBannedUsers(users);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = bannedUsers.filter(u => 
    (u.username || '').toLowerCase().includes(search.toLowerCase()) || 
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Hero Section */}
        <div className="bg-red-600/10 border border-red-500/20 p-8 rounded-[3rem] text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent opacity-50"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-5">
            <Skull className="w-96 h-96 text-red-500" />
          </div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse">
              <Skull className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-headline font-black uppercase italic tracking-tighter text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
              WALL OF SHAME
            </h1>
            <p className="text-red-400 font-bold uppercase tracking-widest mt-4 text-sm md:text-base max-w-2xl mx-auto">
              A public record of those who violated the sacred rules of Clash Arena. 
              Cheating, toxicity, and fraud are not tolerated here.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500/50" />
          <Input 
            placeholder="Search disgraced players..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-12 h-14 bg-red-950/20 border-red-500/20 text-red-100 placeholder:text-red-900/50 rounded-2xl text-center uppercase font-black tracking-widest"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-red-500" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <AlertTriangle className="w-16 h-16 text-red-900/50 mx-auto" />
            <p className="text-red-900/50 font-black uppercase tracking-widest text-xl">NO BANNED PLAYERS FOUND</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="glass bg-black/60 border-red-500/20 hover:border-red-500/40 transition-colors">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center md:items-start text-center md:text-left">
                  
                  <div className="w-16 h-16 bg-red-950 rounded-2xl flex items-center justify-center border border-red-900/50 shrink-0">
                    <Skull className="w-8 h-8 text-red-500/50" />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 justify-between">
                      <div>
                        <h3 className="font-black uppercase text-lg text-white line-through decoration-red-500/50">{user.username}</h3>
                        <p className="text-[10px] text-muted-foreground font-bold">{user.id}</p>
                      </div>
                      <Badge className="bg-red-600 self-center md:self-start">
                        {user.banType === 'permanent' ? 'PERMANENT BAN' : 'TEMPORARY BAN'}
                      </Badge>
                    </div>
                    
                    <div className="bg-red-950/30 p-3 rounded-xl border border-red-900/20">
                      <p className="text-[10px] font-black uppercase text-red-500/70 mb-1 flex items-center gap-1 justify-center md:justify-start">
                        <AlertTriangle className="w-3 h-3" /> Offense
                      </p>
                      <p className="text-xs text-red-200 font-medium">"{user.banReason || 'Violation of Fair Play Guidelines.'}"</p>
                    </div>
                  </div>

                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>
    </PageWrapper>
  );
}
