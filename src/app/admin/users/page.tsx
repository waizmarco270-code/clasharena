
'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  CheckCircle2, 
  Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, doc, updateDoc, increment } from 'firebase/firestore';
import Image from 'next/image';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export default function UserManagementPage() {
  const db = useFirestore();
  const allUsersQuery = useMemo(() => query(collection(db, 'users')), [db]);
  const { data: allUsers } = useCollection(allUsersQuery);

  const [userSearch, setUserSearch] = useState('');
  const [displayUsers, setDisplayUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!userSearch && allUsers) {
      setDisplayUsers(allUsers);
    } else if (userSearch && allUsers) {
      const filtered = allUsers.filter(u => 
        u.username?.toLowerCase().includes(userSearch.toLowerCase()) || 
        u.tag?.toLowerCase().includes(userSearch.toLowerCase())
      );
      setDisplayUsers(filtered);
    }
  }, [allUsers, userSearch]);

  return (
    <div className="space-y-6">
      <Card className="glass border-white/5 p-6 space-y-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary" />
          <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search commanders..." className="pl-10 h-12 bg-white/5" />
        </div>
        <div className="space-y-3">
          {displayUsers.map(u => (
            <div key={u.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-muted overflow-hidden relative border border-white/10">
                  {u.avatarUrl && <Image src={u.avatarUrl} alt="avatar" fill className="object-cover" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black uppercase text-sm">{u.username}</p>
                    {u.isSuperAdmin && <CheckCircle2 className="w-3 h-3 text-yellow-500" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase font-black">{u.tag} • 🪙 {u.balance}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" className="h-8 w-8 text-green-500" onClick={() => updateDoc(doc(db, 'users', u.id), { balance: increment(50) })}><Plus className="w-4 h-4" /></Button>
                {u.id !== MASTER_SUPER_ADMIN_ID && (
                   u.isAdmin ? (
                     <Button size="sm" variant="destructive" className="h-8 text-[10px] font-black" onClick={() => updateDoc(doc(db, 'users', u.id), { isAdmin: false })}>DISMISS</Button>
                   ) : (
                     <Button size="sm" variant="outline" className="h-8 text-[10px] font-black text-green-500" onClick={() => updateDoc(doc(db, 'users', u.id), { isAdmin: true })}>PROMOTE</Button>
                   )
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
