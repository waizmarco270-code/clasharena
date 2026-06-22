
import { Trophy, Medal, Crown, Shield, Star, Zap } from 'lucide-react';

export type RankType = 'ROOKIE' | 'AMATEUR' | 'PRO' | 'TITAN' | 'MASTER' | 'CHAMPION';

export interface RankInfo {
  type: RankType;
  label: string;
  minWins: number;
  className: string;
  icon: any;
  color: string;
}

export const RANKS: RankInfo[] = [
  { type: 'ROOKIE', label: 'Rookie', minWins: 0, className: 'badge-rookie', icon: Medal, color: '#cd7f32' },
  { type: 'AMATEUR', label: 'Amateur', minWins: 2, className: 'badge-amateur', icon: Shield, color: '#bdc3c7' },
  { type: 'PRO', label: 'Pro', minWins: 5, className: 'badge-pro', icon: Zap, color: '#ff4500' },
  { type: 'TITAN', label: 'Titan', minWins: 8, className: 'badge-titan', icon: Star, color: '#f1c40f' },
  { type: 'MASTER', label: 'Master', minWins: 12, className: 'badge-master', icon: Trophy, color: '#ff0000' },
  { type: 'CHAMPION', label: 'Champion', minWins: 15, className: 'badge-champion', icon: Crown, color: '#ff0000' },
];

export function getRankByWins(wins: number): RankInfo {
  const sortedRanks = [...RANKS].sort((a, b) => b.minWins - a.minWins);
  return sortedRanks.find(r => wins >= r.minWins) || RANKS[0];
}

export function getRankByType(type: RankType): RankInfo {
  return RANKS.find(r => r.type === type) || RANKS[0];
}
