'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Info, ShieldAlert, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VsRulesProps {
  reqTh: string;
}

const DEFAULT_RULES: any = {
  "9": [
    "**1 Epic Equipment Cap 🧢**: You can only use a maximum of 1 epic equipment.",
    "**Troops Ineligible Rule**: You can ONLY use troops that unlock up to TH-9 in your CC (both offense & defense). E.g., Electro Dragons or Root Riders are strictly BANNED."
  ],
  "10": [
    "**2 Epic Equipment Cap 🧢**: Maximum 2 epic equipments allowed.",
    "**Troops Ineligible Rule**: CC troops restricted to TH-10 limits.",
    "**All Dragons Total Cap 7 🧢**: The entire Dragon family (Dragons, Baby Dragons, etc.) combined must not exceed 7 in your army. (Including CC)."
  ],
  "11": [
    "**3 Epic Equipment Cap 🧢**.",
    "**All TH Troops Allowed** in CC.",
    "**Dragon Family Total Cap 5 🧢**.",
    "**Lightning Spell Total Cap 8 🧢**.",
    "**Blimp Banned 🚫**."
  ],
  "12": [
    "**3 Epic Equipment Cap 🧢**.",
    "**Troops Ineligible Rule**: CC troops restricted to TH-12 limits.",
    "**All Dragon Family Total Cap 7 🧢**.",
    "**Blimp Banned 🚫**.",
    "**Super Witch Banned 🚫**."
  ],
  "13": [
    "**4 Epic Equipment Cap 🧢**.",
    "**Troops Ineligible Rule**: CC troops restricted to TH-13 limits.",
    "**Minion Prince Banned 🚫**.",
    "**Dragon Rider Banned 🚫**.",
    "**Invisibility Spell Cap 6 🧢**.",
    "**All Dragon Army Total Cap 7 🧢**."
  ],
  "14": [
    "**4 Epic Equipment Cap 🧢**.",
    "**Troops Ineligible Rule**: CC troops restricted to TH-14 limits.",
    "**Total Dragon Cap 7 🧢**.",
    "**Invisibility Spell Cap 4 🧢**."
  ],
  "15": [
    "**5 Epic Equipment Cap 🧢**.",
    "**Troops Ineligible Rule**: CC troops restricted to TH-15 limits.",
    "**Root Rider Cap 3 🧢**.",
    "**All Dragon Army Cap 7 🧢**.",
    "**Dragon Duke Fireheart Equipment Banned 🚫**.",
    "**Revival Spell Cap 1 🧢**."
  ],
  "16": [
    "**5 Epic Equipment Cap 🧢**.",
    "**Root Rider Cap 4 🧢**.",
    "**All Dragon Army Cap 7 🧢**.",
    "**Air Troops Launcher Siege Banned 🚫**.",
    "**Invisibility Spell Cap 5 🧢**."
  ],
  "17": [
    "**6 Epic Equipment Cap 🧢**.",
    "**Duke Backpack Banned 🚫**.",
    "**Dragon Rider Cap 5 🧢**.",
    "**Super Bowlers Cap 5 🧢**.",
    "**Throwers Cap 9 🧢**.",
    "**Invisibility Spell Cap 6 🧢**."
  ],
  "18": [
    "**6 Epic Equipment Cap 🧢**.",
    "**Duke Backpack Banned 🚫**.",
    "**Dragon Rider Cap 5 🧢**.",
    "**Super Bowlers Cap 5 🧢**.",
    "**Throwers Cap 9 🧢**.",
    "**Invisibility Spell Cap 6 🧢**."
  ]
};

export function VsRules({ reqTh }: VsRulesProps) {
  const db = useFirestore();
  const [selectedTh, setSelectedTh] = useState(String(reqTh));
  const [allRules, setAllRules] = useState<any>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reqTh) {
      setSelectedTh(String(reqTh));
    }
  }, [reqTh]);

  // Fetch from Firebase ONLY ONCE when component mounts
  useEffect(() => {
    if (!db) return;

    const fetchRules = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'app-settings', 'th-rules');
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          setAllRules(snap.data());
        } else {
          setAllRules(DEFAULT_RULES);
        }
      } catch (err) {
        console.error("Failed to fetch TH rules:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [db]);

  const rules = allRules ? (allRules[selectedTh] || []) : [];

  return (
    <div className="space-y-6">
      <Card className="glass border-red-500/30 bg-red-950/10">
        <CardHeader>
          <CardTitle className="text-lg font-black uppercase text-red-500 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5" /> Strict Global Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-black/40 border border-red-500/20 rounded-xl">
            <h4 className="font-black text-white uppercase text-sm mb-2">1. eSports Difficulty ONLY</h4>
            <p className="text-xs text-muted-foreground">All friendly challenges inside the VS Clan MUST be played on eSports Mode difficulty. Any standard friendly challenge will be disqualified.</p>
          </div>
          
          <div className="p-4 bg-black/40 border border-red-500/20 rounded-xl">
            <h4 className="font-black text-white uppercase text-sm mb-2">2. Best of 3 Resolution</h4>
            <p className="text-xs text-muted-foreground">The winner of each round is determined by: <strong>1st) Stars, 2nd) Destruction Percentage, 3rd) Fastest Time.</strong> Whoever wins 2 rounds claims the total escrow pool.</p>
          </div>

          <div className="p-4 bg-black/40 border border-red-500/20 rounded-xl">
            <h4 className="font-black text-red-400 uppercase text-sm mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Penalty For Rule Breaking</h4>
            <p className="text-xs text-muted-foreground">If a player breaks ANY of the TH-Specific rules (e.g. equipment cap, banned troops), they will receive a <strong className="text-red-500">Penalty of -1 Star and -15% Destruction</strong> for that round. If a player intentionally ignores rules over multiple rounds, <strong className="text-red-500">⚡ 50 will be deducted from their wager</strong> as a fine!</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-white/10 bg-black/40">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-black uppercase text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" /> TH-{selectedTh} Specific Rules
          </CardTitle>
          <Select value={selectedTh} onValueChange={setSelectedTh}>
             <SelectTrigger className="w-32 bg-black/50 border-white/10 h-8 text-xs font-black uppercase"><SelectValue placeholder="Select TH" /></SelectTrigger>
             <SelectContent>
                {['9','10','11','12','13','14','15','16','17','18'].map(th => (
                   <SelectItem key={th} value={th}>TH {th}</SelectItem>
                ))}
             </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : rules.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm italic">
              No specific rules defined for Town Hall {selectedTh}.
            </div>
          ) : (
            <ul className="list-disc pl-5 space-y-3 text-sm text-muted-foreground mt-2">
              {rules.map((rule, idx) => {
                // simple parser for **bold** text
                const formattedRule = rule.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                   if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i} className="text-white">{part.slice(2, -2)}</strong>;
                   }
                   return part;
                });
                return <li key={idx}>{formattedRule}</li>;
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
