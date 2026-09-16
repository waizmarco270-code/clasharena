"use client";

import { useState, useRef, useMemo } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { useCosmetics } from "@/hooks/use-cosmetics";
import { useUser } from "@clerk/nextjs";
import { useProfile } from "@/firebase";
import { uploadToCloudinary } from "@/lib/cloudinary-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvatarFrame } from "@/components/cosmetics/AvatarFrame";
import { CosmeticItem, CosmeticTier, CosmeticType, AVATAR_REGISTRY } from "@/config/cosmetics";
import { Loader2, Plus, UploadCloud, Save, Trash2, ShieldAlert, Edit3, Hexagon, Gem, Crown, Sparkles, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

const TIER_FILTERS = ['ALL', 'DEFAULT', 'VIP', 'GOLD', 'LEGENDARY', 'MYTHIC'];

export default function AdminCosmeticsPage() {
  const { user } = useUser();
  const { profile, loading: profileLoading } = useProfile();
  const { cosmetics, addOrUpdateCosmetic, deleteCosmetic } = useCosmetics();
  const { toast } = useToast();

  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || profile?.isSuperAdmin;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  const defaultFormData: Partial<CosmeticItem> = {
    type: 'lottie',
    tier: 'MYTHIC',
    price: 100,
    lottieScale: 1.5,
  };

  const [formData, setFormData] = useState<Partial<CosmeticItem>>(defaultFormData);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCosmetics = useMemo(() => {
    const items = Object.values(cosmetics);
    if (activeTab === 'ALL') return items;
    return items.filter(item => item.tier === activeTab);
  }, [cosmetics, activeTab]);

  if (profileLoading) return <PageWrapper><div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin" /></div></PageWrapper>;
  
  if (!isSuperAdmin) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
          <ShieldAlert className="w-24 h-24 text-red-500" />
          <h1 className="text-4xl font-black text-white uppercase">Access Denied</h1>
          <p className="text-muted-foreground">Only Super Admins can access the Universal Cosmetic Engine.</p>
        </div>
      </PageWrapper>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload a Lottie .json file.' });
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadToCloudinary(file, { folder: 'cosmetics/lottie' });
      setFormData(prev => ({ ...prev, lottieUrl: result.url }));
      toast({ title: 'UPLOAD SUCCESS', description: 'Lottie JSON uploaded to CDN.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'UPLOAD FAILED', description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.id || !formData.name || !formData.price || !formData.tier) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please fill all required fields.' });
      return;
    }
    if (formData.type === 'lottie' && !formData.lottieUrl) {
      toast({ variant: 'destructive', title: 'Missing Lottie', description: 'Please upload a JSON file or provide a URL.' });
      return;
    }

    setIsSaving(true);
    try {
      await addOrUpdateCosmetic(formData as CosmeticItem);
      toast({ title: 'SAVED', description: `${formData.name} is now live!` });
      setIsModalOpen(false); // Close Modal on Success
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Are you sure you want to delete ${id}?`)) return;
    try {
      await deleteCosmetic(id);
      toast({ title: 'DELETED', description: `Avatar ${id} removed.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err.message });
    }
  };

  const handleMigrate = async () => {
    if (!confirm("This will overwrite database entries with the hardcoded config. Proceed?")) return;
    setIsSaving(true);
    try {
      for (const key of Object.keys(AVATAR_REGISTRY)) {
        await addOrUpdateCosmetic(AVATAR_REGISTRY[key]);
      }
      toast({ title: 'MIGRATION COMPLETE', description: 'All CSS avatars uploaded to database.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ERROR', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const openAddModal = () => {
    setFormData(defaultFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (item: CosmeticItem) => {
    setFormData(item);
    setIsModalOpen(true);
  };

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-4xl font-headline font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
              Cosmetic Engine
            </h1>
            <p className="text-muted-foreground font-bold">Super Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleMigrate} variant="outline" className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 hidden md:flex">
              Migrate Legacy
            </Button>
            <Button onClick={openAddModal} className="font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-5 h-5 mr-2" /> Add Frame
            </Button>
          </div>
        </div>

        {/* TABS & GRID */}
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-black/40 border border-white/5 w-full flex overflow-x-auto justify-start md:justify-center p-1 h-auto py-2">
              {TIER_FILTERS.map(tier => (
                <TabsTrigger 
                  key={tier} 
                  value={tier}
                  className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded-full px-6 py-2 uppercase font-black text-xs tracking-widest transition-all"
                >
                  {tier}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6 outline-none">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredCosmetics.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-muted-foreground uppercase font-black">
                    No frames found in this category.
                  </div>
                ) : (
                  filteredCosmetics.map(item => (
                    <div key={item.id} className="relative glass border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center h-48 group">
                      <div className="absolute top-2 right-2 flex gap-1 z-30">
                        <Button variant="ghost" size="icon" className="w-6 h-6 bg-black/50 hover:bg-primary/20 text-primary opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditModal(item)}>
                          <Edit3 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-6 h-6 bg-black/50 hover:bg-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="absolute top-2 left-2 z-30">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                          item.tier === 'MYTHIC' ? 'bg-purple-500 text-white' : 
                          item.tier === 'LEGENDARY' ? 'bg-red-500 text-white' : 
                          item.tier === 'GOLD' ? 'bg-yellow-500 text-black' : 
                          'bg-white/20 text-white'
                        }`}>
                          {item.tier}
                        </span>
                      </div>
                      
                      <AvatarFrame avatarId={item.id} className="w-20 h-20" />
                      
                      <p className="mt-4 text-[10px] font-black text-white uppercase tracking-wider text-center">{item.name}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">{item.price} Coins</p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

      </div>

        {/* CURRENCY ASSET PREVIEW */}
        <div className="pt-12 border-t border-white/5 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-headline font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600">
              Currency Asset Previews
            </h2>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
              Select the new premium identity for Clash Arena Coins
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
            {/* 1. Golden Hex-Core */}
            <Card className="glass border-amber-500/20 bg-black/60 relative overflow-hidden group hover:border-amber-500/50 transition-all hover:-translate-y-2">
              <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full" />
                  <Hexagon className="w-20 h-20 text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] fill-amber-500/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Hexagon className="w-8 h-8 text-amber-200 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,1)]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-black uppercase text-amber-400 tracking-wider">The Golden Hex-Core</h3>
                  <p className="text-[10px] text-muted-foreground uppercase mt-2">Modern / Esports Vibe</p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Royal Gem */}
            <Card className="glass border-yellow-500/20 bg-black/60 relative overflow-hidden group hover:border-yellow-500/50 transition-all hover:-translate-y-2">
              <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full" />
                  <Gem className="w-20 h-20 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] fill-yellow-500/20" />
                </div>
                <div>
                  <h3 className="font-black uppercase text-yellow-400 tracking-wider">The Royal Gem</h3>
                  <p className="text-[10px] text-muted-foreground uppercase mt-2">Premium Loot Vibe</p>
                </div>
              </CardContent>
            </Card>

            {/* 3. Clash Crown */}
            <Card className="glass border-orange-500/20 bg-black/60 relative overflow-hidden group hover:border-orange-500/50 transition-all hover:-translate-y-2">
              <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full" />
                  <Crown className="w-20 h-20 text-orange-400 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] fill-orange-500/20" />
                </div>
                <div>
                  <h3 className="font-black uppercase text-orange-400 tracking-wider">The Clash Crown</h3>
                  <p className="text-[10px] text-muted-foreground uppercase mt-2">Glory & Champion Vibe</p>
                </div>
              </CardContent>
            </Card>

            {/* 4. Radiant Token */}
            <Card className="glass border-yellow-300/20 bg-black/60 relative overflow-hidden group hover:border-yellow-300/50 transition-all hover:-translate-y-2">
              <div className="absolute inset-0 bg-yellow-300/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 bg-yellow-300/20 blur-2xl rounded-full" />
                  <Circle className="w-20 h-20 text-yellow-500 drop-shadow-[0_0_15px_rgba(253,224,71,0.5)] fill-yellow-600/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-yellow-200 fill-yellow-400 drop-shadow-[0_0_10px_rgba(253,224,71,1)]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-black uppercase text-yellow-300 tracking-wider">The Radiant Token</h3>
                  <p className="text-[10px] text-muted-foreground uppercase mt-2">Classic Legendary Vibe</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      {/* CREATE / EDIT MODAL */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border border-white/10 text-white p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b border-white/5 bg-black/40">
            <DialogTitle className="uppercase font-black flex items-center gap-2">
              {formData.id && cosmetics[formData.id] ? <Edit3 className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
              {formData.id && cosmetics[formData.id] ? 'Edit Cosmetic' : 'Add New Frame'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Unique ID (no spaces)</Label>
              <Input 
                value={formData.id || ''} 
                onChange={e => setFormData(p => ({...p, id: e.target.value.toLowerCase().replace(/\s+/g, '_')}))} 
                placeholder="e.g. fire_wings" 
                disabled={!!(formData.id && cosmetics[formData.id])} // Disable ID edit if it exists
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input value={formData.name || ''} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="e.g. Blazing Wings" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (Coins)</Label>
                <Input type="number" value={formData.price || 0} onChange={e => setFormData(p => ({...p, price: Number(e.target.value)}))} />
              </div>
              <div className="space-y-2">
                <Label>Scale (Lottie)</Label>
                <Input type="number" step="0.1" value={formData.lottieScale || 1.5} onChange={e => setFormData(p => ({...p, lottieScale: Number(e.target.value)}))} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={formData.tier} onValueChange={(val: CosmeticTier) => setFormData(p => ({...p, tier: val}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEFAULT">DEFAULT</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="GOLD">GOLD</SelectItem>
                    <SelectItem value="LEGENDARY">LEGENDARY</SelectItem>
                    <SelectItem value="MYTHIC">MYTHIC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(val: CosmeticType) => setFormData(p => ({...p, type: val}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lottie">Lottie (CDN)</SelectItem>
                    <SelectItem value="css">CSS (Hardcoded)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'lottie' && (
              <div className="space-y-2 pt-4 mt-2 border-t border-white/5">
                <Label>Lottie JSON Animation</Label>
                {formData.lottieUrl ? (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400 break-all relative">
                    Uploaded: {formData.lottieUrl}
                    <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 px-2 text-primary hover:text-white hover:bg-red-500/20" onClick={() => setFormData(p => ({...p, lottieUrl: ''}))}>
                      Clear
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => fileInputRef.current?.click()} className="w-full bg-black/50 hover:bg-white/10 border border-white/20" variant="outline">
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                      Upload .json
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".json,application/json" className="hidden" />
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground text-center">or paste raw URL below</p>
                <Input value={formData.lottieUrl || ''} onChange={e => setFormData(p => ({...p, lottieUrl: e.target.value}))} placeholder="https://lottie.host/...json" className="text-xs" />
              </div>
            )}
          </div>
          
          <div className="p-6 pt-0 mt-4">
            <Button onClick={handleSave} disabled={isSaving} className="w-full font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-white h-12">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Save to Database</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </PageWrapper>
  );
}
