export type CosmeticType = 'css' | 'lottie';
export type CosmeticTier = 'DEFAULT' | 'VIP' | 'GOLD' | 'LEGENDARY' | 'MYTHIC';

export interface CosmeticItem {
  id: string;
  name: string;
  type: CosmeticType;
  price: number;
  tier: CosmeticTier;
  
  // For CSS Avatars
  cssClasses?: {
    container?: string;
    border?: string;
    innerGlow?: string;
    outerGlow?: string;
    textGradient?: string;
  };
  
  // For Lottie Avatars
  lottieUrl?: string;
  lottieScale?: number;
}

export const AVATAR_REGISTRY: Record<string, CosmeticItem> = {
  default: {
    id: 'default',
    name: 'Default (Hex)',
    type: 'css',
    price: 0,
    tier: 'DEFAULT',
  },
  rainbow_vip_glow: {
    id: 'rainbow_vip_glow',
    name: 'Rainbow VIP',
    type: 'css',
    price: 0, // Requires VIP Pass
    tier: 'VIP',
  },
  inferno_ring: {
    id: 'inferno_ring',
    name: 'Inferno Ring',
    type: 'css',
    price: 20,
    tier: 'GOLD',
  },
  electric_surge: {
    id: 'electric_surge',
    name: 'Electric Surge',
    type: 'css',
    price: 50,
    tier: 'GOLD',
  },
  cosmic_void: {
    id: 'cosmic_void',
    name: 'Cosmic Void',
    type: 'css',
    price: 30,
    tier: 'GOLD',
  },
  toxic_venom: {
    id: 'toxic_venom',
    name: 'Toxic Venom',
    type: 'css',
    price: 100,
    tier: 'LEGENDARY',
  },
  blood_moon: {
    id: 'blood_moon',
    name: 'Blood Moon',
    type: 'css',
    price: 100,
    tier: 'LEGENDARY',
  },
  golden_conqueror: {
    id: 'golden_conqueror',
    name: 'Golden Conqueror',
    type: 'css',
    price: 100,
    tier: 'LEGENDARY',
  }
};
