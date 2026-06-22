
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
  Megaphone, 
  Vote, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  BarChart2, 
  Users, 
  Settings2,
  X
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function ControlsPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const announcementsQuery = useMemo(() => query(collection(db, 'announcements'), orderBy('createdAt', 'desc')), [db]);
  const { data: announcements } = useCollection(announcementsQuery);

  const pollsQuery = useMemo(() => query(collection(db, 'polls'), orderBy('createdAt', 'desc')), [db]);
  const { data: polls } = useCollection(pollsQuery);

  // Announcement State
  const [aForm, setAForm] = useState({ title: '', content: '', type: 'info' });
  
  // Poll State
  const [pForm, setPForm] = useState({ question: '', options: ['', ''], allowMultiple: false, displayMode: 'percentage' });

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'announcements'), { ...aForm, createdAt: new Date().toISOString() });
    setAForm({ title: '', content: '', type: 'info' });
    toast({ title: "ANNOUNCEMENT BROADCASTED" });
  };

  const handleAddPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const filteredOptions = pForm.options.filter(o => o.trim() !== '');
    if (filteredOptions.length < 2) {
      toast({ variant: "destructive", title: "MIN 2 OPTIONS REQUIRED" });
      return;
    }
    await addDoc(collection(db, 'polls'), { ...pForm, options: filteredOptions, isActive: true, createdAt: new Date().toISOString() });
    setPForm({ question: '', options: ['', ''], allowMultiple: false, displayMode: 'percentage' });
    toast({ title: "POLL PUBLISHED" });
  };

  const deleteItem = async (col: string, id: string) => {
    await deleteDoc(doc(db, col, id));
    toast({ title: "DELETED FROM SYSTEM" });
  };

  const togglePoll = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'polls', id), { isActive: !current });
  };

  return (
    <div className="space-y-8 pb-20">
      <Tabs defaultValue="announcements">
        <TabsList className="bg-white/5 border border-white/5 mb-6">
          <TabsTrigger value="announcements" className="data-[state=active]:bg-primary uppercase font-black text-[10px] h-10 px-6">Announcements</TabsTrigger>
          <TabsTrigger value="polls" className="data-[state=active]:bg-primary uppercase font-black text-[10px] h-10 px-6">Community Polls</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-8 outline-none">
          <Card className="glass border-primary/20 bg-primary/5">
            <CardHeader><CardTitle className="font-headline text-lg uppercase italic flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" /> NEW BROADCAST</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddAnnouncement} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Title</Label><Input value={aForm.title} onChange={e => setAForm({...aForm, title: e.target.value})} required className="bg-white/5" /></div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Type</Label>
                    <Select value={aForm.type} onValueChange={val => setAForm({...aForm, type: val})}>
                      <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="info">GENERAL INFO</SelectItem><SelectItem value="war">WAR ALERT</SelectItem><SelectItem value="payout">PAYOUT UPDATE</SelectItem><SelectItem value="system">SYSTEM MAINTENANCE</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Content</Label><Textarea value={aForm.content} onChange={e => setAForm({...aForm, content: e.target.value})} required className="bg-white/5 h-32" /></div>
                <Button className="w-full h-12 bg-primary font-black uppercase glow-primary">PUBLISH INTEL</Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
             {announcements?.map((a: any) => (
               <div key={a.id} className="glass p-4 border-white/5 rounded-2xl flex items-center justify-between group">
                  <div className="flex gap-4 items-center">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5"><Megaphone className="w-4 h-4 text-primary" /></div>
                    <div>
                      <p className="font-bold text-sm uppercase">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{a.type} • {new Date(a.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteItem('announcements', a.id)}><Trash2 className="w-4 h-4" /></Button>
               </div>
             ))}
          </div>
        </TabsContent>

        <TabsContent value="polls" className="space-y-8 outline-none">
          <Card className="glass border-primary/20 bg-primary/5">
             <CardHeader><CardTitle className="font-headline text-lg uppercase italic flex items-center gap-2"><Vote className="w-5 h-5 text-primary" /> CREATE COMMUNITY POLL</CardTitle></CardHeader>
             <CardContent>
                <form onSubmit={handleAddPoll} className="space-y-6">
                   <div className="space-y-2"><Label className="text-[10px] font-black uppercase">Poll Question</Label><Input value={pForm.question} onChange={e => setPForm({...pForm, question: e.target.value})} required className="bg-white/5" /></div>
                   
                   <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase">Options</Label>
                      {pForm.options.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                           <Input value={opt} onChange={e => {
                             const n = [...pForm.options];
                             n[i] = e.target.value;
                             setPForm({...pForm, options: n});
                           }} placeholder={`Option ${i+1}`} className="bg-white/5" />
                           {pForm.options.length > 2 && (
                             <Button type="button" variant="ghost" size="icon" onClick={() => setPForm({...pForm, options: pForm.options.filter((_, idx) => idx !== i)})}><X className="w-4 h-4" /></Button>
                           )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => setPForm({...pForm, options: [...pForm.options, '']})} className="text-[10px] font-black uppercase border-dashed"><Plus className="w-3 h-3 mr-2" /> ADD OPTION</Button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      <div className="flex items-center space-x-3">
                         <Checkbox id="multiple" checked={pForm.allowMultiple} onCheckedChange={(val) => setPForm({...pForm, allowMultiple: !!val})} />
                         <label htmlFor="multiple" className="text-xs font-black uppercase cursor-pointer">Allow Multiple Choices</label>
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[10px] font-black uppercase">Display Logic</Label>
                         <Select value={pForm.displayMode} onValueChange={val => setPForm({...pForm, displayMode: val})}>
                            <SelectTrigger className="bg-white/5"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="percentage">SHOW PERCENTAGE</SelectItem><SelectItem value="number">SHOW VOTE COUNT</SelectItem></SelectContent>
                         </Select>
                      </div>
                   </div>

                   <Button className="w-full h-12 bg-primary font-black uppercase glow-primary">LAUNCH POLL</Button>
                </form>
             </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {polls?.map((p: any) => (
               <Card key={p.id} className="glass border-white/5 relative overflow-hidden group">
                  <div className={cn("absolute top-0 left-0 w-full h-1", p.isActive ? "bg-green-500" : "bg-red-500")} />
                  <CardHeader className="pb-2">
                     <div className="flex justify-between items-start">
                        <Badge variant="outline" className="text-[8px] font-black mb-2 uppercase">{p.isActive ? 'Active' : 'Archived'}</Badge>
                        <div className="flex gap-1">
                           <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => togglePoll(p.id, p.isActive)}>{p.isActive ? <Settings2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}</Button>
                           <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteItem('polls', p.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                     </div>
                     <CardTitle className="text-sm font-bold uppercase">{p.question}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     <div className="bg-black/40 rounded-xl p-3 border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase">
                           <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Integrity Check</span>
                           <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" /> {p.displayMode}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-tight italic">Poll published on {new Date(p.createdAt).toLocaleDateString()}</p>
                     </div>
                  </CardContent>
               </Card>
             ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
