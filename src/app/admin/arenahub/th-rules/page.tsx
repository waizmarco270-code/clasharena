'use client';

import { useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Loader2, Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type THRulesMap = { [th: string]: string[] };

export default function AdminTHRulesPage() {
  const db = useFirestore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [rules, setRules] = useState<THRulesMap>({});
  const [selectedTh, setSelectedTh] = useState<string>("9");

  // Load existing rules
  useEffect(() => {
    if (!db) return;
    
    const loadRules = async () => {
      try {
        const docRef = doc(db, 'app-settings', 'th-rules');
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          setRules(snap.data() as THRulesMap);
        } else {
          // Initialize empty if not exist with default pre-filled rules
          const initial: THRulesMap = {
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
          setRules(initial);
        }
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Failed to load rules', description: err.message });
      } finally {
        setLoading(false);
      }
    };
    
    loadRules();
  }, [db]);

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'app-settings', 'th-rules');
      await setDoc(docRef, rules);
      toast({ title: 'Rules Saved Successfully', description: 'Changes will immediately reflect in the VS Arena.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const currentRules = rules[selectedTh] || [];

  const updateRule = (index: number, value: string) => {
    const newRules = { ...rules };
    if (!newRules[selectedTh]) newRules[selectedTh] = [];
    newRules[selectedTh][index] = value;
    setRules(newRules);
  };

  const addRule = () => {
    const newRules = { ...rules };
    if (!newRules[selectedTh]) newRules[selectedTh] = [];
    newRules[selectedTh].push("");
    setRules(newRules);
  };

  const removeRule = (index: number) => {
    const newRules = { ...rules };
    newRules[selectedTh].splice(index, 1);
    setRules(newRules);
  };

  if (loading) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase text-white">Manage TH Rules</h1>
            <p className="text-muted-foreground text-sm mt-1">Dynamically edit the specific rules for each Town Hall in the VS Arena.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-widest px-8">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save All Changes
          </Button>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-start gap-3">
           <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
           <div>
              <p className="text-orange-500 font-black text-sm uppercase">Disconnects & Rematches Rule</p>
              <p className="text-orange-200/70 text-xs mt-1">Make sure you have added your global rule about game crashes: "If your game crashes or WiFi drops, you get exactly ONE rematch. If it happens a second time, it counts as a 0-star loss." You can add this manually to each TH, or keep it in the General Instructions.</p>
           </div>
        </div>

        <Card className="glass border-white/10">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-black uppercase text-white">Edit Town Hall Rules</CardTitle>
              <Select value={selectedTh} onValueChange={setSelectedTh}>
                <SelectTrigger className="w-48 bg-black border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/10 text-white">
                  {Array.from({ length: 10 }, (_, i) => 9 + i).map((th) => (
                    <SelectItem key={th} value={th.toString()}>Town Hall {th}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {currentRules.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>No rules defined for TH {selectedTh}.</p>
              </div>
            ) : (
              currentRules.map((rule, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="bg-black/50 border border-white/10 w-8 h-10 rounded flex items-center justify-center font-black text-xs text-muted-foreground shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <Input 
                    value={rule} 
                    onChange={(e) => updateRule(idx, e.target.value)} 
                    className="bg-black/50 border-white/10 h-11"
                    placeholder="E.g., **1 Epic Cap**: Max 1 epic allowed."
                  />
                  <Button variant="ghost" onClick={() => removeRule(idx)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 shrink-0 h-11">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
            
            <Button variant="outline" onClick={addRule} className="w-full mt-4 border-dashed border-white/20 hover:bg-white/5 text-muted-foreground hover:text-white uppercase font-black text-xs h-12">
              <Plus className="w-4 h-4 mr-2" /> Add Rule
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
