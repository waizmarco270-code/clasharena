'use client';

import { useState, useEffect } from 'react';
import { useProfile } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, ShieldCheck, Lock, CheckCircle2, AlertCircle, Save, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const getThTheme = (th: number) => {
  switch(th) {
    case 9: return { 
      bg: "from-zinc-900 to-black border-zinc-700 hover:border-zinc-500", 
      glow: "from-zinc-500 shadow-[0_0_20px_rgba(113,113,122,0.2)]", 
      badge: "bg-zinc-800 text-zinc-300 border-zinc-600",
      btn: "bg-zinc-700 hover:bg-zinc-600 text-white" 
    };
    case 10: return { 
      bg: "from-red-950 to-orange-950 border-orange-700/50 hover:border-orange-500", 
      glow: "from-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.2)]", 
      badge: "bg-orange-900 text-orange-200 border-orange-700",
      btn: "bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-500 hover:to-red-500" 
    };
    case 11: return { 
      bg: "from-slate-900 via-red-950 to-black border-slate-600 hover:border-slate-400", 
      glow: "from-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.2)]", 
      badge: "bg-slate-800 text-slate-200 border-slate-500",
      btn: "bg-gradient-to-r from-slate-600 to-slate-500 text-white hover:from-slate-500" 
    };
    case 12: return { 
      bg: "from-blue-950 to-indigo-950 border-blue-600/50 hover:border-blue-400", 
      glow: "from-cyan-400 shadow-[0_0_25px_rgba(56,189,248,0.2)]", 
      badge: "bg-blue-900 text-blue-200 border-blue-600",
      btn: "bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500" 
    };
    case 13: return { 
      bg: "from-cyan-950 to-slate-950 border-cyan-700/50 hover:border-cyan-400", 
      glow: "from-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.2)]", 
      badge: "bg-cyan-900 text-cyan-200 border-cyan-600",
      btn: "bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:from-cyan-500 hover:to-teal-500" 
    };
    case 14: return { 
      bg: "from-green-950 to-emerald-950 border-emerald-700/50 hover:border-emerald-500", 
      glow: "from-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.2)]", 
      badge: "bg-emerald-900 text-emerald-200 border-emerald-600",
      btn: "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-500 hover:to-green-500" 
    };
    case 15: return { 
      bg: "from-purple-950 to-fuchsia-950 border-purple-600/50 hover:border-fuchsia-400", 
      glow: "from-fuchsia-400 shadow-[0_0_25px_rgba(192,38,211,0.2)]", 
      badge: "bg-purple-900 text-purple-200 border-purple-600",
      btn: "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white hover:from-purple-500 hover:to-fuchsia-500" 
    };
    case 16: return { 
      bg: "from-rose-950 to-red-950 border-rose-700/50 hover:border-red-500", 
      glow: "from-red-400 shadow-[0_0_25px_rgba(225,29,72,0.2)]", 
      badge: "bg-rose-900 text-rose-200 border-rose-600",
      btn: "bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500" 
    };
    case 17: return { 
      bg: "from-slate-950 to-blue-950 border-yellow-700/50 hover:border-yellow-500", 
      glow: "from-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.2)]", 
      badge: "bg-yellow-900/50 text-yellow-200 border-yellow-600/50",
      btn: "bg-gradient-to-r from-slate-700 to-yellow-600 text-white hover:from-slate-600 hover:to-yellow-500" 
    };
    case 18: return { 
      bg: "from-sky-950 to-indigo-950 border-sky-500/50 hover:border-sky-300", 
      glow: "from-sky-300 shadow-[0_0_30px_rgba(56,189,248,0.3)]", 
      badge: "bg-sky-900/50 text-sky-200 border-sky-500/50",
      btn: "bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-500 hover:to-blue-500" 
    };
    default: return { 
      bg: "from-white/10 to-black/80 border-white/10 hover:border-white/30", 
      glow: "from-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]", 
      badge: "bg-white/5 border-white/20 text-white",
      btn: "bg-white/10 hover:bg-white/20 text-white border-white/20" 
    };
  }
};

export function AccountSlots() {
  const { profile } = useProfile();
  const { toast } = useToast();
  
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  
  // Dialog state
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ tag: '', username: '', townHall: '' });
  
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    desc: string;
    action: () => Promise<void>;
    costText?: string;
  }>({ open: false, title: '', desc: '', action: async () => {} });

  const accountSlots = profile?.accountSlots || {};
  const defaultSlotId = profile?.defaultSlotId || 1;
  const balance = profile?.balance || 0;

  const runAction = async (actionId: string, apiAction: string, slotId: number, extraData: any = {}) => {
    setLoadingAction(`${apiAction}-${slotId}`);
    try {
      const res = await fetch('/api/profile/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: apiAction, slotId, ...extraData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      
      toast({ title: "Success", description: "Slot updated successfully!" });
      setConfirmDialog({ ...confirmDialog, open: false });
      if (apiAction === 'save_slot') setEditingSlotId(null);
      
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUnlockEdit = (slotId: number) => {
    setConfirmDialog({
      open: true,
      title: 'Unlock Slot for Editing',
      desc: 'Are you sure you want to unlock this slot? You can edit it once before it locks again.',
      costText: '5 Arena Coins',
      action: async () => runAction(`unlock-${slotId}`, 'unlock_edit', slotId)
    });
  };

  const handleBuySlot = (slotId: number, cost: number) => {
    setConfirmDialog({
      open: true,
      title: 'Unlock Premium Slot',
      desc: 'Are you sure you want to unlock this premium slot permanently? You can edit it anytime for free.',
      costText: `${cost} Arena Coins`,
      action: async () => runAction(`buy-${slotId}`, 'buy_slot', slotId)
    });
  };

  const openEditModal = (slotId: number) => {
    const slot = accountSlots[slotId];
    if (slot && slot.isFilled) {
      setEditForm({ tag: slot.tag.replace('#', ''), username: slot.username, townHall: slot.townHall.toString() });
    } else {
      setEditForm({ tag: '', username: '', townHall: '' });
    }
    setEditingSlotId(slotId);
  };

  const handleSaveSlot = async () => {
    if (!editingSlotId) return;
    if (!editForm.tag || !editForm.username || !editForm.townHall) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill all fields.' });
      return;
    }
    await runAction(`save-${editingSlotId}`, 'save_slot', editingSlotId, editForm);
  };

  const handleSetDefault = (slotId: number) => {
    setConfirmDialog({
      open: true,
      title: 'Set as Default Profile',
      desc: 'This profile will be used universally for all Tournament and VS Arena entries.',
      action: async () => runAction(`default-${slotId}`, 'set_default', slotId)
    });
  };

  // Build slots array
  const slots = [1, 2, 3, 4, 5].map(id => {
    const data = accountSlots[id] || { isFilled: false };
    const isFree = id <= 3;
    const isPurchased = data.isPurchased || false;
    const cost = id === 4 ? 50 : (id === 5 ? 100 : 0);
    const isLocked = isFree && data.isFilled && !data.unlockedForEdit;
    
    // Slot 1 edge case (migrating existing root profile to slot 1 visually)
    if (id === 1 && !data.isFilled && profile?.tag) {
       data.isFilled = true;
       data.tag = profile.tag;
       data.username = profile.username;
       data.townHall = profile.townHall;
       // We consider it locked if it's filled and not explicitly unlocked
       if (data.unlockedForEdit === undefined) data.unlockedForEdit = false;
    }

    return { id, isFree, isPurchased, cost, data, isLocked: isFree && data.isFilled && !data.unlockedForEdit, isDefault: Number(defaultSlotId) === id };
  });

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
          <Users className="w-5 h-5 text-primary" /> Game Accounts
        </h3>
        <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
           {balance} Coins
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {slots.map(slot => {
          const isLoading = loadingAction?.endsWith(`-${slot.id}`);
          
          if (!slot.isFree && !slot.isPurchased) {
            const isSlot4 = slot.id === 4;
            return (
              <Card key={slot.id} className={cn(
                "relative overflow-hidden transition-all duration-500 flex flex-col items-center justify-center p-6 text-center gap-3 cursor-pointer group hover:-translate-y-1 hover:shadow-2xl",
                isSlot4 ? "bg-gradient-to-br from-amber-500/10 to-black/80 border border-amber-500/30 hover:border-amber-500/60 hover:shadow-amber-500/20" 
                        : "bg-gradient-to-br from-fuchsia-500/10 to-black/80 border border-fuchsia-500/30 hover:border-fuchsia-500/60 hover:shadow-fuchsia-500/20"
              )}>
                {/* Animated Background Glow */}
                <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]", isSlot4 ? "from-amber-500 via-transparent to-transparent" : "from-fuchsia-500 via-transparent to-transparent")} />
                
                <div className={cn("p-4 rounded-full mb-2 relative", isSlot4 ? "bg-amber-500/10 text-amber-400" : "bg-fuchsia-500/10 text-fuchsia-400")}>
                  <div className={cn("absolute inset-0 rounded-full animate-ping opacity-20", isSlot4 ? "bg-amber-500" : "bg-fuchsia-500")} />
                  <Lock className="w-8 h-8 relative z-10" />
                </div>
                <div className="space-y-1 relative z-10">
                  <p className={cn("font-black uppercase tracking-widest text-lg drop-shadow-md", isSlot4 ? "text-amber-400" : "text-fuchsia-400")}>Premium Slot {slot.id}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Unlimited Free Edits</p>
                </div>
                <Button 
                  onClick={() => handleBuySlot(slot.id, slot.cost)}
                  disabled={isLoading}
                  className={cn("w-full rounded-xl mt-4 font-black uppercase text-xs h-12 shadow-lg transition-transform hover:scale-[1.02] relative z-10", 
                    isSlot4 ? "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black border-none" 
                            : "bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white border-none")}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Unlock for ${slot.cost} Coins`}
                </Button>
              </Card>
            );
          }

          if (!slot.data.isFilled) {
            return (
              <Card key={slot.id} className="relative overflow-hidden bg-black/40 border border-dashed border-white/20 hover:border-white/40 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center gap-4 cursor-pointer group hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]" onClick={() => openEditModal(slot.id)}>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="p-4 bg-white/5 border border-white/10 rounded-full mb-2 group-hover:scale-110 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all duration-300 shadow-inner">
                  <Users className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div>
                  <p className="font-black uppercase tracking-widest text-lg text-muted-foreground group-hover:text-white transition-colors">Empty Slot {slot.id}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-1">Available to Configure</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-white/5 border-white/20 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors px-4 py-1.5 mt-2">Setup Identity</Badge>
              </Card>
            );
          }

          // Filled Slot
          const th = slot.data.townHall ? parseInt(slot.data.townHall) : 1;
          const theme = getThTheme(th);
          
          return (
            <Card key={slot.id} className={cn(
              "relative overflow-hidden transition-all duration-300 group hover:-translate-y-1 hover:shadow-2xl",
              slot.isDefault ? "bg-gradient-to-br from-primary/20 to-black/90 border border-primary/50 shadow-[0_0_30px_rgba(255,69,0,0.3)]" 
                             : `bg-gradient-to-br ${theme.bg}`
            )}>
              {/* Card Background Glow */}
              <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] pointer-events-none", slot.isDefault ? "from-primary/30 via-transparent to-transparent" : `${theme.glow} via-transparent to-transparent`)} />
              
              {slot.isDefault && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-primary to-primary/80 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-lg z-10 flex items-center gap-1.5 border-b border-l border-white/20">
                  <Star className="w-3.5 h-3.5 fill-white" /> Active Default
                </div>
              )}
              
              <CardContent className="p-6 flex flex-col h-full justify-between gap-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-headline italic font-black uppercase text-2xl leading-tight truncate max-w-[160px] text-white drop-shadow-md">
                      {slot.data.username}
                    </h4>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded border border-white/5 inline-block">
                      {slot.data.tag}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 mt-1">
                    <Badge variant="outline" className={cn("font-black text-sm px-3 py-1 shadow-inner", slot.isDefault ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(255,69,0,0.2)]" : theme.badge)}>
                      TH {slot.data.townHall}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  {!slot.isDefault && (
                    <Button 
                      onClick={() => handleSetDefault(slot.id)}
                      disabled={isLoading}
                      className="flex-1 rounded-xl bg-white/5 hover:bg-primary/20 text-white hover:text-primary hover:border-primary/50 border border-white/10 font-black uppercase text-[10px] tracking-widest h-10 transition-all shadow-md"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set Default"}
                    </Button>
                  )}
                  
                  {slot.isLocked ? (
                    <Button 
                      onClick={() => handleUnlockEdit(slot.id)}
                      disabled={isLoading}
                      className={cn("rounded-xl font-black uppercase text-[10px] tracking-widest h-10 flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-[1.03]", 
                        slot.isDefault ? "flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black border-none" 
                                       : "px-4 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30")}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-3.5 h-3.5" /> {slot.isDefault ? "Unlock Edit (5)" : "Unlock"}</>}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => openEditModal(slot.id)}
                      disabled={isLoading}
                      className={cn("rounded-xl font-black uppercase text-[10px] tracking-widest h-10 transition-all shadow-md hover:scale-[1.03] border-none", 
                        slot.isDefault ? "flex-1 bg-primary hover:bg-primary/90 text-white" 
                                       : `px-6 ${theme.btn}`)}
                    >
                       Edit Intel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editingSlotId !== null} onOpenChange={(open) => !open && setEditingSlotId(null)}>
        <DialogContent className="sm:max-w-md glass border-white/10">
          <DialogHeader>
            <DialogTitle className="font-headline italic text-2xl uppercase tracking-wider text-white">
              {accountSlots[editingSlotId!]?.isFilled ? 'Edit Profile' : 'Setup Profile'}
            </DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest font-bold">
               {editingSlotId && editingSlotId <= 3 ? "Free slots will lock after saving." : "Premium slot. Edit anytime."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Player Tag</label>
              <Input placeholder="e.g. #YV88CYV" value={editForm.tag} onChange={e => setEditForm({...editForm, tag: e.target.value.toUpperCase()})} className="font-bold uppercase tracking-widest bg-muted/20 border-white/10 h-12" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">In-Game Name</label>
              <Input placeholder="Clash Name" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="font-bold bg-muted/20 border-white/10 h-12" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Town Hall Level</label>
              <Select value={editForm.townHall} onValueChange={v => setEditForm({...editForm, townHall: v})}>
                <SelectTrigger className="bg-muted/20 border-white/10 h-12 font-bold">
                  <SelectValue placeholder="Select TH Level" />
                </SelectTrigger>
                <SelectContent>
                  {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(th => (
                    <SelectItem key={th} value={th.toString()} className="font-bold">Town Hall {th}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveSlot} disabled={loadingAction === `save_slot-${editingSlotId}`} className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-xl h-12">
              {loadingAction === `save_slot-${editingSlotId}` ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Profile</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({...confirmDialog, open: false})}>
        <DialogContent className="sm:max-w-md glass border-white/10">
          <DialogHeader>
            <DialogTitle className="font-headline italic text-xl uppercase tracking-wider text-white">
              {confirmDialog.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium text-muted-foreground">{confirmDialog.desc}</p>
            {confirmDialog.costText && (
               <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center gap-2">
                 <AlertCircle className="w-4 h-4 text-amber-500" />
                 <span className="text-xs font-black uppercase text-amber-500 tracking-widest">Cost: {confirmDialog.costText}</span>
               </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmDialog({...confirmDialog, open: false})} className="rounded-xl font-bold uppercase">Cancel</Button>
            <Button onClick={confirmDialog.action} className="rounded-xl bg-primary hover:bg-primary/90 font-bold uppercase">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
