'use client';

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShieldAlert, 
  Gavel, 
  Skull, 
  Flame, 
  Sparkles, 
  Zap, 
  Snowflake, 
  Leaf, 
  Hexagon, 
  TreePine, 
  Shield, 
  Crown,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

// Town Hall Theming Engine
const TH_THEMES: Record<string, { bg: string, border: string, shadow: string, icon: any, label: string, color: string }> = {
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

export default function RulesPage() {
  const db = useFirestore();
  const [loading, setLoading] = useState(true);
  const [thRules, setThRules] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState('fairplay');

  useEffect(() => {
    if (!db) return;
    const fetchRules = async () => {
      try {
        const docRef = doc(db, 'app-settings', 'th-rules');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setThRules(snap.data() as Record<string, string[]>);
        }
      } catch (err) {
        console.error("Failed to load rules", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, [db]);

  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto space-y-8 pb-20 pt-6 px-4">
        
        {/* Header Section */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.3)] mb-2">
            <Gavel className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-black italic uppercase tracking-tight text-white drop-shadow-md">
            RULES & <span className="text-cyan-400">POLICIES</span>
          </h1>
          <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest max-w-2xl mx-auto">
            The ultimate guidelines for fair play, esports difficulty, and town hall specific restrictions in Clash Arena.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
          <TabsList className="bg-black/40 border border-white/10 rounded-2xl h-14 p-1 w-full max-w-md mx-auto flex">
            <TabsTrigger value="fairplay" className="flex-1 rounded-xl font-black uppercase tracking-widest text-xs data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all">
              <ShieldAlert className="w-4 h-4 mr-2" /> Fair Play
            </TabsTrigger>
            <TabsTrigger value="th-rules" className="flex-1 rounded-xl font-black uppercase tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(255,69,0,0.5)] transition-all">
              <Crown className="w-4 h-4 mr-2" /> TH Rules
            </TabsTrigger>
          </TabsList>

          {/* FAIR PLAY TAB */}
          <TabsContent value="fairplay" className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <Card className="glass border-red-500/30 bg-gradient-to-br from-red-950/40 to-black/80 hover:border-red-500/50 transition-all shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                <CardHeader className="border-b border-red-500/10">
                  <CardTitle className="text-sm font-black uppercase text-red-500 flex items-center gap-2">
                    <Skull className="w-5 h-5" /> Zero Tolerance Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-white/80 leading-relaxed font-medium">
                    Clash Arena maintains a strict <span className="font-bold text-red-400">Zero Tolerance Policy</span> towards cheating, exploits, and unfair advantages. 
                    Any player caught violating these terms will face an immediate, permanent, and irreversible IP & Hardware Ban from the ecosystem.
                  </p>
                  <ul className="space-y-3 text-xs text-white/70 font-medium">
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span><strong className="text-white">NO MODS OR HACKS:</strong> The use of third-party software to modify game behavior is strictly prohibited.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span><strong className="text-white">NO EMULATORS:</strong> Playing on PC emulators to gain macro or click advantages is forbidden in verified tournaments.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span><strong className="text-white">NO ACCOUNT SHARING:</strong> Ringing (playing on another player's account) to manipulate brackets will result in bans for both parties.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="glass border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-black/80 hover:border-blue-500/50 transition-all shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <CardHeader className="border-b border-blue-500/10">
                  <CardTitle className="text-sm font-black uppercase text-blue-500 flex items-center gap-2">
                    <Shield className="w-5 h-5" /> Esports Conduct
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-white/80 leading-relaxed font-medium">
                    As a competitive platform, we expect all commanders to uphold the spirit of sportsmanship.
                  </p>
                  <ul className="space-y-3 text-xs text-white/70 font-medium">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <span><strong className="text-white">TOXICITY:</strong> Severe harassment, hate speech, or abuse towards opponents or admins will lead to suspension.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <span><strong className="text-white">DISPUTE PROTOCOL:</strong> If you believe an opponent broke a TH-specific rule, submit a dispute in the Match Room immediately with video evidence.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                      <span><strong className="text-white">PRIZE CLAIMS:</strong> Ensure your UPI/Payment details are accurate in your profile. False dispute claims to steal prizes carry heavy penalties.</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* TOWN HALL RULES TAB */}
          <TabsContent value="th-rules" className="outline-none">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 animate-in fade-in duration-500">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Decoding Server Rules...</p>
              </div>
            ) : Object.keys(thRules).length === 0 ? (
              <div className="text-center p-12 text-white/50 font-black uppercase tracking-widest text-xs bg-black/40 rounded-3xl border border-white/5">
                No Town Hall Rules Configured Currently.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(thRules)
                  // Sort by TH level ascending
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([th, rulesList], index) => {
                    const theme = TH_THEMES[th] || TH_THEMES["17"]; // Fallback theme
                    const Icon = theme.icon;

                    return (
                      <div 
                        key={th} 
                        className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <Card className={cn("glass relative overflow-hidden h-full flex flex-col border transition-all duration-500 hover:scale-[1.02]", theme.border, theme.shadow)}>
                          
                          {/* Animated Gradient Background */}
                          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 z-0", theme.bg)} />
                          
                          <CardHeader className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-sm">
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className={cn("text-2xl font-headline font-black italic uppercase drop-shadow-md", theme.color)}>
                                  TOWN HALL {th}
                                </span>
                                <span className="text-[9px] font-black tracking-[0.2em] uppercase text-white/60">
                                  {theme.label}
                                </span>
                              </div>
                              <div className={cn("p-3 rounded-xl bg-black/40 border", theme.border, theme.color)}>
                                <Icon className="w-6 h-6" />
                              </div>
                            </CardTitle>
                          </CardHeader>
                          
                          <CardContent className="relative z-10 p-5 flex-1 bg-black/20 backdrop-blur-md">
                            {rulesList.length === 0 ? (
                              <p className="text-xs text-white/50 font-bold uppercase text-center italic mt-4">Standard Rules Apply</p>
                            ) : (
                              <ul className="space-y-4">
                                {rulesList.map((rule, idx) => (
                                  <li key={idx} className="flex gap-3 text-sm text-white/90">
                                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_currentColor]", theme.color)} style={{ backgroundColor: 'currentColor' }} />
                                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-snug prose-strong:text-white">
                                      <ReactMarkdown>{rule}</ReactMarkdown>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                })}
              </div>
            )}
          </TabsContent>
          
        </Tabs>
      </div>
    </PageWrapper>
  );
}
