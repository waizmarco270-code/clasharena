import { Skull, Flame, Sparkles, Zap, Snowflake, Leaf, Hexagon, TreePine, Shield, Crown } from 'lucide-react';

export const TH_THEMES: Record<string, { bg: string, border: string, shadow: string, icon: any, label: string, color: string }> = {
  "9": { bg: "from-zinc-950 to-black", border: "border-zinc-700/50", shadow: "shadow-[0_0_30px_rgba(63,63,70,0.3)]", icon: Skull, label: "Dark Mode", color: "text-zinc-400" },
  "10": { bg: "from-red-950/80 to-orange-950/80", border: "border-red-500/50", shadow: "shadow-[0_0_30px_rgba(239,68,68,0.3)]", icon: Flame, label: "Inferno Base", color: "text-red-500" },
  "11": { bg: "from-white/10 to-slate-400/10", border: "border-white/60", shadow: "shadow-[0_0_30px_rgba(255,255,255,0.4)]", icon: Sparkles, label: "Grand Warden", color: "text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" },
  "12": { bg: "from-blue-950/80 to-indigo-950/80", border: "border-blue-500/50", shadow: "shadow-[0_0_30px_rgba(59,130,246,0.3)]", icon: Zap, label: "Giga Tesla", color: "text-blue-400" },
  "13": { bg: "from-cyan-950/80 to-blue-950/80", border: "border-cyan-400/50", shadow: "shadow-[0_0_30px_rgba(34,211,238,0.3)]", icon: Snowflake, label: "Ice Empire", color: "text-cyan-400" },
  "14": { bg: "from-green-950/80 to-emerald-950/80", border: "border-green-500/50", shadow: "shadow-[0_0_30px_rgba(34,197,94,0.3)]", icon: Leaf, label: "Jungle Ruins", color: "text-green-500" },
  "15": { bg: "from-purple-950/80 to-fuchsia-950/80", border: "border-purple-500/50", shadow: "shadow-[0_0_30px_rgba(168,85,247,0.3)]", icon: Hexagon, label: "Magic Monolith", color: "text-purple-400" },
  "16": { bg: "from-rose-950/80 to-red-950/80", border: "border-rose-500/50", shadow: "shadow-[0_0_30px_rgba(244,63,94,0.3)]", icon: TreePine, label: "Nature's Fury", color: "text-rose-400" },
  "17": { bg: "from-zinc-900 to-neutral-950", border: "border-white/20", shadow: "shadow-[0_0_30px_rgba(255,255,255,0.1)]", icon: Shield, label: "Titan's Keep", color: "text-white/80" },
  "18": { bg: "from-orange-950/80 to-stone-950", border: "border-orange-500/40", shadow: "shadow-[0_0_40px_rgba(249,115,22,0.25)]", icon: Crown, label: "Meteor Fortress", color: "text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" },
};
