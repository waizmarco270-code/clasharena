'use client';

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, Loader2, Coins, Crown, Edit2, CheckCircle2, History, Flame } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminTicketsPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [tickets, setTickets] = useState<{ [key: string]: any }>({
    bronze: { price: 0, stock: 0, isActive: false, totalSold: 0 },
    silver: { price: 0, stock: 0, isActive: false, totalSold: 0 },
    golden: { price: 0, stock: 0, isActive: false, totalSold: 0 }
  });

  const [buyers, setBuyers] = useState<{ [key: string]: any[] }>({
    bronze: [], silver: [], golden: []
  });

  useEffect(() => {
    fetchTicketsData();
  }, [db]);

  const fetchTicketsData = async () => {
    try {
      const types = ['bronze', 'silver', 'golden'];
      let fetchedTickets: any = {};
      let fetchedBuyers: any = { bronze: [], silver: [], golden: [] };

      for (const type of types) {
        const docRef = doc(db, 'tickets', type);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          fetchedTickets[type] = docSnap.data();
        } else {
          // Initialize default if not exists
          const defaultData = { price: 0, stock: 0, isActive: false, totalSold: 0 };
          await setDoc(docRef, defaultData);
          fetchedTickets[type] = defaultData;
        }

        // Fetch recent buyers
        const buyersQuery = query(collection(db, 'tickets', type, 'buyers'), orderBy('purchasedAt', 'desc'), limit(10));
        const buyersSnap = await getDocs(buyersQuery);
        fetchedBuyers[type] = buyersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      setTickets(fetchedTickets);
      setBuyers(fetchedBuyers);
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error loading tickets', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (type: string, field: string, value: any) => {
    setTickets(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const saveTicket = async (type: string) => {
    setSaving(true);
    try {
      const docRef = doc(db, 'tickets', type);
      await updateDoc(docRef, {
        price: Number(tickets[type].price),
        stock: Number(tickets[type].stock),
        isActive: tickets[type].isActive
      });
      toast({ title: `${type.toUpperCase()} Ticket Saved!`, description: 'Inventory and pricing updated.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </PageWrapper>
    );
  }

  const renderTicketCard = (type: string, title: string, colorClass: string, icon: any, powerDesc: string) => {
    const t = tickets[type];
    const bList = buyers[type];
    const Icon = icon;

    return (
      <Card className="glass border-white/10 relative overflow-hidden group">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${colorClass}-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none group-hover:bg-${colorClass}-500/20 transition-all`} />
        
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className={`font-black uppercase tracking-widest text-xl text-${colorClass}-500 flex items-center gap-2`}>
                <Icon className="w-5 h-5" /> {title} TICKET
              </CardTitle>
              <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">{powerDesc}</p>
            </div>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Active</span>
              <Switch checked={t.isActive} onCheckedChange={(v) => handleUpdate(type, 'isActive', v)} className={`data-[state=checked]:bg-${colorClass}-500 scale-75`} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                Real Money Price (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                <Input 
                  type="number" 
                  value={t.price} 
                  onChange={(e) => handleUpdate(type, 'price', e.target.value)}
                  className="pl-7 bg-white/5 border-white/10 font-black h-12"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" /> Live Stock Count
              </label>
              <Input 
                type="number" 
                value={t.stock} 
                onChange={(e) => handleUpdate(type, 'stock', e.target.value)}
                className="bg-white/5 border-white/10 font-black h-12"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-black/30 p-3 rounded-xl border border-white/5">
            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Total Sold Globally</p>
              <p className="text-xl font-black text-white">{t.totalSold}</p>
            </div>
            <Button onClick={() => saveTicket(type)} disabled={saving} className={`bg-${colorClass}-600 hover:bg-${colorClass}-700 font-black uppercase tracking-widest text-[10px] h-10`}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Save Config</>}
            </Button>
          </div>

          {/* Recent Buyers */}
          <div className="pt-4 border-t border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
              <History className="w-3 h-3" /> Recent Buyers (Top 10)
            </h4>
            {bList.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">No buyers yet.</p>
            ) : (
              <div className="space-y-2 max-h-[150px] overflow-y-auto no-scrollbar pr-1">
                {bList.map((buyer: any) => (
                  <div key={buyer.id} className="flex justify-between items-center bg-white/5 p-2 rounded-lg border border-white/5">
                    <span className="font-black text-xs uppercase">{buyer.username}</span>
                    <span className="text-[9px] text-muted-foreground font-bold tracking-widest">
                      {new Date(buyer.purchasedAt?.toMillis() || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    );
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="bg-amber-600/10 border border-amber-500/20 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10">
            <h1 className="text-3xl font-headline font-black uppercase italic tracking-wider flex items-center gap-3 text-amber-500">
              <Ticket className="w-8 h-8" /> ARENA TICKETS CONTROL
            </h1>
            <p className="text-xs font-bold uppercase text-amber-400/70 mt-2 tracking-widest">Manage premium currency stock and pricing.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {renderTicketCard('bronze', 'Bronze', 'amber', Ticket, 'Free Entry: 1-80 Coins')}
          {renderTicketCard('silver', 'Silver', 'slate', Ticket, 'Free Entry: 90-199 Coins')}
          {renderTicketCard('golden', 'Golden', 'yellow', Crown, '100% Refund upon reaching Semifinals')}
        </div>

      </div>
    </PageWrapper>
  );
}
