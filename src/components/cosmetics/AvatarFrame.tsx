"use client";

import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CosmeticItem } from "@/config/cosmetics";
import { useCosmetics } from '@/hooks/use-cosmetics';
import Lottie from 'lottie-react';

interface AvatarFrameProps {
  avatarId?: string;
  imageUrl?: string | null;
  username?: string;
  className?: string; // Optional classes for sizing the outer container
  onClick?: () => void;
}

export function AvatarFrame({ avatarId = 'default', imageUrl, username, className = "w-20 h-20", onClick }: AvatarFrameProps) {
  const { cosmetics } = useCosmetics();
  const config = cosmetics[avatarId] || cosmetics['default'];
  
  // State to hold fetched lottie JSON data
  const [lottieData, setLottieData] = useState<any>(null);

  useEffect(() => {
    if (config.type === 'lottie' && config.lottieUrl) {
      fetch(config.lottieUrl)
        .then(res => res.json())
        .then(data => setLottieData(data))
        .catch(err => console.error("Error loading Lottie animation:", err));
    }
  }, [config]);

  // Base inner avatar that will be wrapped by either CSS or Lottie
  const InnerAvatar = ({ additionalClasses = "" }: { additionalClasses?: string }) => (
    <Avatar className={`relative w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full z-10 ${additionalClasses}`}>
      <AvatarImage src={imageUrl || undefined} className="object-cover" />
      <AvatarFallback className="bg-muted text-4xl font-black">{username?.[0] || '?'}</AvatarFallback>
    </Avatar>
  );

  // --- LOTTIE RENDERER ---
  if (config.type === 'lottie') {
    return (
      <div className={`relative flex items-center justify-center group ${className} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
        {/* The actual avatar image */}
        <Avatar className="relative w-[calc(100%-20px)] h-[calc(100%-20px)] rounded-full border-[3px] border-black z-0 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
          <AvatarImage src={imageUrl || undefined} className="object-cover" />
          <AvatarFallback className="bg-muted text-4xl font-black">{username?.[0] || '?'}</AvatarFallback>
        </Avatar>
        
        {/* The Lottie Overlay */}
        {lottieData && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none w-[200%] h-[200%] flex items-center justify-center">
             <Lottie 
                animationData={lottieData} 
                loop={true} 
                style={{ width: '100%', height: '100%', transform: `scale(${config.lottieScale || 1.2})` }} 
             />
          </div>
        )}
      </div>
    );
  }

  // --- CSS RENDERER ---
  switch (avatarId) {
    case 'rainbow_vip_glow':
      return (
        <div className={`relative rounded-full bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 p-1 animate-[spin_4s_linear_infinite] shadow-[0_0_20px_rgba(255,255,255,0.2)] ${className} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
          <InnerAvatar additionalClasses="border-[3px] border-black animate-[spin_4s_linear_infinite_reverse] w-full h-full" />
        </div>
      );
    case 'inferno_ring':
      return (
        <div className={`relative flex items-center justify-center group ${className} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
          <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#ff4500,#ff8c00,#ffd700,#ff4500)] animate-[spin_2s_linear_infinite] blur-md opacity-80" />
          <div className="absolute inset-[-4px] rounded-full bg-[conic-gradient(from_0deg,#ff4500,#ff8c00,#ffd700,#ff4500)] animate-[spin_2s_linear_infinite]" />
          <InnerAvatar additionalClasses="border-4 border-black/90 shadow-[0_0_20px_rgba(255,69,0,0.8)]" />
        </div>
      );
    case 'electric_surge':
      return (
        <div className={`relative flex items-center justify-center group ${className} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
          <div className="absolute inset-[-4px] rounded-full bg-[conic-gradient(from_0deg,transparent,#00ffff,transparent,transparent,#00ffff,transparent)] animate-[spin_1s_linear_infinite]" />
          <div className="absolute inset-[-8px] rounded-full bg-[conic-gradient(from_0deg,transparent,#00ffff,transparent,transparent,#00ffff,transparent)] animate-[spin_1.5s_linear_infinite_reverse] opacity-50 blur-sm" />
          <InnerAvatar additionalClasses="border-4 border-black shadow-[0_0_20px_rgba(0,255,255,0.8)]" />
        </div>
      );
    case 'cosmic_void':
      return (
        <div className={`relative flex items-center justify-center group ${className} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
          <div className="absolute inset-[-4px] rounded-full bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 animate-pulse border border-purple-500/50 shadow-[0_0_30px_rgba(147,51,234,0.6)]" />
          <div className="absolute inset-0 rounded-full bg-black/50 blur-xl animate-pulse-slow" />
          <InnerAvatar additionalClasses="border-4 border-black shadow-[0_0_40px_rgba(0,0,0,0.9)]" />
        </div>
      );
    case 'toxic_venom':
      return (
        <div className={`relative flex items-center justify-center group ${className} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
          <div className="absolute inset-[-4px] rounded-full bg-[conic-gradient(from_0deg,#16a34a,#22c55e,#4ade80,#16a34a)] animate-[spin_3s_linear_infinite] blur-md opacity-90" />
          <div className="absolute inset-[-6px] rounded-full bg-[conic-gradient(from_0deg,transparent,#15803d,transparent,#15803d,transparent)] animate-[spin_2s_linear_infinite_reverse] blur-sm" />
          <InnerAvatar additionalClasses="border-4 border-black/90 shadow-[0_0_30px_rgba(34,197,94,0.7)]" />
        </div>
      );
    case 'blood_moon':
      return (
        <div className={`relative flex items-center justify-center group ${className} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
          <div className="absolute inset-[-4px] rounded-full bg-[radial-gradient(circle,_#991b1b,_#450a0a)] border-2 border-red-600 animate-pulse shadow-[0_0_40px_rgba(220,38,38,0.8)]" />
          <div className="absolute inset-0 rounded-full bg-red-600/30 blur-xl animate-pulse-slow" />
          <InnerAvatar additionalClasses="border-4 border-black" />
        </div>
      );
    case 'golden_conqueror':
      return (
        <div className={`relative flex items-center justify-center group ${className} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
          <div className="absolute inset-[-6px] rounded-full bg-[conic-gradient(from_0deg,#fef08a,#eab308,#a16207,#eab308,#fef08a)] animate-[spin_4s_linear_infinite]" />
          <div className="absolute inset-[-10px] rounded-full bg-[conic-gradient(from_0deg,transparent,#facc15,transparent,#facc15,transparent)] animate-[spin_2s_linear_infinite_reverse] opacity-60 blur-sm" />
          <InnerAvatar additionalClasses="border-4 border-yellow-900/50 shadow-[0_0_30px_rgba(234,179,8,1)]" />
        </div>
      );
    default:
      return (
        <div className={`relative flex items-center justify-center group rounded-full overflow-hidden border-2 border-white/10 ${className} ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
           <Avatar className="w-full h-full rounded-none">
             <AvatarImage src={imageUrl || undefined} className="object-cover" />
             <AvatarFallback className="bg-muted text-4xl font-black">{username?.[0] || '?'}</AvatarFallback>
           </Avatar>
        </div>
      );
  }
}
