"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Loader2, Trophy, Wallet, ShieldCheck, Crown, Eye, ChevronLeft } from "lucide-react";
import { AvatarFrame } from "@/components/cosmetics/AvatarFrame";
import { getRankByWins } from "@/lib/rank-utils";
import { Badge } from "@/components/ui/badge";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useCosmetics } from "@/hooks/use-cosmetics";
import { Button } from "@/components/ui/button";

interface ProfileInspectModalProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileInspectModal({ userId, open, onOpenChange }: ProfileInspectModalProps) {
  const db = useFirestore();
  const { cosmetics } = useCosmetics();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [viewingAvatars, setViewingAvatars] = useState(false);

  const totalAvatars = Object.keys(cosmetics).length;
  const unlockedAvatarsList = profileData?.unlockedAvatars || ['default'];

  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      const fetchProfile = async () => {
        try {
          const docRef = doc(db, 'users', userId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setProfileData({ id: snap.id, ...snap.data() });
          } else {
            setProfileData(null);
          }
        } catch (err) {
          console.error("Failed to fetch profile", err);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    } else {
      setProfileData(null);
      setViewingAvatars(false);
    }
  }, [open, userId, db]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-zinc-950/90 backdrop-blur-md border border-white/10 text-white p-0 overflow-hidden shadow-2xl">
        <VisuallyHidden><DialogTitle>Profile Inspect</DialogTitle></VisuallyHidden>
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="mt-4 text-xs font-black uppercase text-muted-foreground tracking-widest">Inspecting Profile...</p>
          </div>
        ) : profileData ? (
          <div className="relative">
            {/* Top Banner / Background */}
            <div className="h-32 w-full bg-gradient-to-br from-primary/20 via-black to-black border-b border-white/5 relative overflow-hidden">
               <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
               {profileData.isVip && (
                 <Badge className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-purple-500 text-white border-none font-black text-[10px] tracking-widest uppercase shadow-lg">
                   VIP MEMBER
                 </Badge>
               )}
            </div>
            
            {/* Avatar Centered */}
            <div className="flex justify-center -mt-16 relative z-10">
               <AvatarFrame 
                 avatarId={profileData.equippedAvatar}
                 imageUrl={profileData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.id}`}
                 username={profileData.username || 'Warrior'}
                 className="w-32 h-32 scale-110"
               />
            </div>

            {/* Profile Info */}
            <div className="p-6 text-center space-y-6">
               <div>
                 <h2 className="text-2xl font-black uppercase tracking-widest text-white flex items-center justify-center gap-2">
                   {profileData.username || 'Unknown Warrior'}
                   {profileData.isSuperAdmin && <Crown className="w-5 h-5 text-yellow-500" />}
                 </h2>
                 <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1">ID: {profileData.id.slice(0, 8)}...</p>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="glass border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center">
                     <Trophy className="w-5 h-5 text-yellow-500 mb-2" />
                     <span className="text-xl font-black text-white">{profileData.wins || 0}</span>
                     <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Total Wins</span>
                  </div>
                  <div className="glass border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                     <ShieldCheck className="w-5 h-5 text-primary mb-2 relative z-10" />
                     <span className="text-[11px] font-black text-white uppercase text-center relative z-10 leading-tight">
                       {getRankByWins(profileData.wins || 0).label}
                     </span>
                     <span className="text-[9px] uppercase tracking-widest text-primary/70 font-bold mt-1 relative z-10">Current Rank</span>
                  </div>
               </div>

               {/* Collection Info */}
               <div className="glass border-white/5 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-yellow-500" />
                     </div>
                     <div className="text-left">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Treasury</p>
                        <p className="text-sm font-black text-white">🪙 {profileData.balance || 0} Coins</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-xl font-black text-white">{unlockedAvatarsList.length}/{totalAvatars}</p>
                     <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Avatars Owned</p>
                  </div>
               </div>

               {/* View All Avatars Button */}
               <Button 
                 onClick={() => setViewingAvatars(true)}
                 variant="outline" 
                 className="w-full glass border-white/10 hover:bg-white/5 uppercase font-black tracking-widest text-[10px] h-12 rounded-xl"
               >
                 <Eye className="w-4 h-4 mr-2" /> View Unlocked Avatars
               </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground font-bold">
            Player not found.
          </div>
        )}
        
        {/* Avatars View Overlay */}
        {viewingAvatars && profileData && (
          <div className="absolute inset-0 bg-zinc-950 z-50 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-black/40">
              <Button variant="ghost" size="icon" onClick={() => setViewingAvatars(false)} className="rounded-full hover:bg-white/5 h-8 w-8">
                <ChevronLeft className="w-5 h-5 text-white" />
              </Button>
              <h3 className="font-black text-sm uppercase tracking-widest text-white">Unlocked Avatars</h3>
              <Badge className="ml-auto bg-primary/20 text-primary border-none">{unlockedAvatarsList.length}/{totalAvatars}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-3 gap-4">
                {unlockedAvatarsList.map((avatarId: string) => (
                  <div key={avatarId} className="flex flex-col items-center gap-2 glass p-3 rounded-2xl border border-white/5 hover:border-primary/30 transition-all group">
                    <AvatarFrame 
                      avatarId={avatarId}
                      imageUrl={profileData.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.id}`}
                      username={profileData.username}
                      className="w-16 h-16 group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
