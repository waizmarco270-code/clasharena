'use client';

import { useMemo, useState, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  BookOpen, 
  Youtube, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Loader2, 
  Coins, 
  Trophy, 
  Swords, 
  Play, 
  Link2, 
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  Video
} from 'lucide-react';
import { useDoc, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

// Extract 11-char video ID from any YouTube URL (shorts, watch, live, embed, share, raw ID)
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const cleaned = url.trim();
  if (cleaned.length === 11) return cleaned;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
  const match = cleaned.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

const DEFAULT_GUIDE = {
  mainVideoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  sections: [
    {
      id: "participate",
      title: "How to Participate in Tournaments",
      content: "Navigate to the Tournament Arena, select an open tournament matching your Town Hall level, pay the entry fee in Arena Coins, and confirm your registration. Once registered, join the designated clan link to play.",
      videoUrl: ""
    },
    {
      id: "recharge",
      title: "How to Recharge Arena Coins",
      content: "Go to the Coin Vault, enter the amount you wish to recharge, select between Automatic UPI checkout or submit a manual recharge request by scanning the QR code and attaching your payment confirmation screenshot.",
      videoUrl: ""
    },
    {
      id: "champions",
      title: "Hall of Champions & Badges Guide",
      content: "Earn tournament victories to increase your win count. The top 10 warriors are listed in the Hall of Champions. You can unlock elite ranks (Rookie, Gladiator, Legend, etc.) and toggle Ghost Mode if you wish to remain anonymous.",
      videoUrl: ""
    }
  ]
};

export default function BattleGuidePage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: myProfile } = useDoc(userRef);

  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || myProfile?.isSuperAdmin;
  const isAdmin = myProfile?.isAdmin || isSuperAdmin;

  // Query guide configuration
  const guideDocRef = useMemo(() => doc(db, 'app-settings', 'guide'), [db]);
  const { data: guideData, loading } = useDoc(guideDocRef);

  // Fallback to defaults if doc doesn't exist
  const currentGuide = guideData || DEFAULT_GUIDE;

  // Local state for editing
  const [isEditing, setIsEditing] = useState(false);
  const [mainVideoUrl, setMainVideoUrl] = useState('');
  const [sections, setSections] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guideData) {
      setMainVideoUrl(guideData.mainVideoUrl || '');
      setSections(guideData.sections || []);
    } else {
      setMainVideoUrl(DEFAULT_GUIDE.mainVideoUrl);
      setSections(DEFAULT_GUIDE.sections);
    }
  }, [guideData]);

  const handleAddSection = () => {
    setSections(prev => [
      ...prev,
      {
        id: `sec_${Date.now()}`,
        title: "New Guide Section",
        content: "Enter description details here...",
        videoUrl: ""
      }
    ]);
  };

  const handleUpdateSection = (id: string, field: string, value: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleDeleteSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const handleSaveGuide = async () => {
    setSaving(true);
    try {
      await setDoc(guideDocRef, {
        mainVideoUrl: mainVideoUrl.trim(),
        sections: sections.map(s => ({
          ...s,
          title: s.title.trim(),
          content: s.content.trim(),
          videoUrl: s.videoUrl.trim()
        })),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.id || 'admin'
      }, { merge: true });

      toast({
        title: "GUIDE CONFIG SECURED 📜",
        description: "Successfully updated all embedded videos and textual guides."
      });
      setIsEditing(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err.message || "Failed to commit guide updates."
      });
    } finally {
      setSaving(false);
    }
  };

  const mainVideoId = getYouTubeId(currentGuide.mainVideoUrl);

  return (
    <PageWrapper>
      <div className="space-y-8 max-w-5xl mx-auto pb-20">
        
        {/* Header Title Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/20 p-6 rounded-3xl border border-white/5 gap-4">
          <div>
            <h2 className="font-headline text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
              <BookOpen className="text-primary" /> BATTLE <span className="text-primary">GUIDE</span>
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">
              Master participation mechanics, coin recharge procedures, and rankings.
            </p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => setIsEditing(!isEditing)}
              className={cn(
                "font-black uppercase text-xs h-10 px-5 rounded-xl transition-all border flex items-center gap-2",
                isEditing 
                  ? "bg-red-600/10 border-red-500/20 text-red-500 hover:bg-red-600 hover:text-white"
                  : "bg-primary border-primary/20 hover:scale-105 text-white glow-primary"
              )}
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" /> Cancel Edit
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" /> Edit Guide
                </>
              )}
            </Button>
          )}
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Retrieving guide protocols...</p>
          </div>
        )}

        {/* Interactive Editing Console */}
        {!loading && isEditing && (
          <Card className="glass border-primary/20 bg-black/50 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-orange-500" />
            <CardHeader>
              <CardTitle className="font-headline text-lg uppercase text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" /> ADMIN COMPILING HUB
              </CardTitle>
              <CardDescription className="text-xs uppercase font-bold text-muted-foreground/60 tracking-wider">
                Configure primary embed links and instructional modules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main YouTube video input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-primary" /> Primary Guide Video URL
                </label>
                <Input 
                  value={mainVideoUrl} 
                  onChange={e => setMainVideoUrl(e.target.value)} 
                  placeholder="Paste YouTube Link (shorts, live, or standard)" 
                  className="bg-black/40 border-white/10 text-white rounded-xl text-xs h-11"
                />
              </div>

              {/* Guide Sections list */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Guide Section Modules</h4>
                  <Button 
                    onClick={handleAddSection} 
                    size="sm" 
                    variant="outline" 
                    className="h-8 border-primary/30 text-primary hover:bg-primary hover:text-white rounded-lg text-[9px] font-black uppercase flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Module
                  </Button>
                </div>

                <div className="space-y-4">
                  {sections.map((sec, idx) => (
                    <div key={sec.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4 relative group">
                      <button 
                        onClick={() => handleDeleteSection(sec.id)}
                        className="absolute top-4 right-4 text-zinc-500 hover:text-red-500 transition-colors"
                        title="Delete Module"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Module Title</label>
                          <Input 
                            value={sec.title} 
                            onChange={e => handleUpdateSection(sec.id, 'title', e.target.value)}
                            placeholder="e.g. How to Join Tournaments"
                            className="bg-black/40 border-white/10 text-white text-xs h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                            <Link2 className="w-3 h-3 text-primary" /> Video Link (Optional)
                          </label>
                          <Input 
                            value={sec.videoUrl} 
                            onChange={e => handleUpdateSection(sec.id, 'videoUrl', e.target.value)}
                            placeholder="Paste YouTube Link"
                            className="bg-black/40 border-white/10 text-white text-xs h-10 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Instructional Content</label>
                        <Textarea 
                          value={sec.content} 
                          onChange={e => handleUpdateSection(sec.id, 'content', e.target.value)}
                          placeholder="Provide detailed participation or usage guidelines..."
                          className="bg-black/40 border-white/10 text-white text-xs min-h-[80px] rounded-xl resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-white/5">
                <Button 
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-wider h-11 px-6"
                >
                  Discard
                </Button>
                <Button 
                  onClick={handleSaveGuide}
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 text-white rounded-xl font-black uppercase text-[10px] tracking-wider h-11 px-6 glow-primary flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Guide Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guide View Screen */}
        {!loading && !isEditing && (
          <div className="space-y-8">
            
            {/* Primary Main Video Player in Glowing Frame */}
            {mainVideoId && (
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary flex items-center gap-1.5 ml-1">
                  <Play className="w-3 h-3 text-primary animate-pulse fill-primary" /> Core Battlefield Tutorial
                </p>
                {/* Glowing border container */}
                <div className="relative aspect-video rounded-[2.5rem] overflow-hidden border-2 border-primary/30 shadow-[0_0_30px_rgba(239,68,68,0.25)] bg-black group transition-all duration-500 hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-red-600/10 pointer-events-none" />
                  <iframe
                    src={`https://www.youtube.com/embed/${mainVideoId}?autoplay=0&rel=0`}
                    title="Clash Arena Main Guide Video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Guide modules checklist/card splits */}
            <div className="grid grid-cols-1 gap-6">
              {currentGuide.sections.map((sec: any, idx: number) => {
                const secVideoId = getYouTubeId(sec.videoUrl);
                
                // Assign icon dynamically based on title keywords
                let ModuleIcon = HelpCircle;
                if (sec.title.toLowerCase().includes("tournament") || sec.title.toLowerCase().includes("battle")) ModuleIcon = Swords;
                else if (sec.title.toLowerCase().includes("coin") || sec.title.toLowerCase().includes("recharge")) ModuleIcon = Coins;
                else if (sec.title.toLowerCase().includes("champions") || sec.title.toLowerCase().includes("rank")) ModuleIcon = Trophy;

                return (
                  <Card key={sec.id || idx} className="glass border-white/5 bg-black/40 rounded-3xl overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-white/10 to-transparent group-hover:from-primary transition-all duration-300" />
                    <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                      
                      {/* Left: Text Details */}
                      <div className="md:col-span-3 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-primary">
                            <ModuleIcon className="w-5 h-5" />
                          </div>
                          <h3 className="font-headline text-xl md:text-2xl font-black italic uppercase tracking-tighter text-white">
                            {sec.title}
                          </h3>
                        </div>
                        <p className="text-xs text-zinc-400 font-semibold leading-relaxed uppercase tracking-wide">
                          {sec.content}
                        </p>
                      </div>

                      {/* Right: Embedded Video if present */}
                      <div className="md:col-span-2">
                        {secVideoId ? (
                          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/15 bg-black group-hover:border-primary/20 transition-all duration-300">
                            <iframe
                              src={`https://www.youtube.com/embed/${secVideoId}?autoplay=0&rel=0`}
                              title={sec.title}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center aspect-video bg-white/[0.02] border border-white/5 border-dashed rounded-2xl p-4 text-center">
                            <Video className="w-8 h-8 text-zinc-700 mb-2 animate-pulse" />
                            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">No video attach</p>
                            <p className="text-[7px] font-bold text-zinc-600 mt-0.5 uppercase">Refer to core tutorial above</p>
                          </div>
                        )}
                      </div>

                    </CardContent>
                  </Card>
                );
              })}
            </div>

          </div>
        )}

      </div>
    </PageWrapper>
  );
}
