'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, Trophy, Star } from 'lucide-react';
import { useDoc, useFirestore, useCollection, useAdminStatus } from '@/firebase';
import { doc, collection, query, where, updateDoc } from 'firebase/firestore';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Image as ImageIcon, Trash2, Maximize, Minimize, Crown, CheckCircle2 } from 'lucide-react';

export default function ThcBracketPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const db = useFirestore();

  const { data: t, loading: tLoading } = useDoc(doc(db, 'thc_tournaments', id));
  
  const matchesQuery = useMemo(() => query(collection(db, 'thc_matches'), where('tournamentId', '==', id)), [db, id]);
  const { data: rawMatches, loading: mLoading } = useCollection(matchesQuery);
  const matches = useMemo(() => {
     if (!rawMatches) return [];
     return [...rawMatches].sort((a, b) => a.matchNumber - b.matchNumber);
  }, [rawMatches]);

  const teamsQuery = useMemo(() => query(collection(db, 'thc_teams'), where('tournamentId', '==', id)), [db, id]);
  const { data: teams, loading: teamsLoading } = useCollection(teamsQuery);

  const { isAdmin } = useAdminStatus();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'upper' | 'lower'>('upper');
  const [uploadingBg, setUploadingBg] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const bracketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
     };
     document.addEventListener('fullscreenchange', handleFullscreenChange);
     return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
     if (!document.fullscreenElement) {
        bracketRef.current?.requestFullscreen().catch(err => {
           toast({ variant: 'destructive', title: 'Error', description: 'Could not enter fullscreen' });
        });
     } else {
        document.exitFullscreen();
     }
  };

  const presetBackgrounds = [
    { name: 'Dark Cyber', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop' },
    { name: 'Fantasy Battle', url: 'https://images.unsplash.com/photo-1588693892403-125daaa076cc?q=80&w=2070&auto=format&fit=crop' },
    { name: 'Volcanic Ash', url: 'https://images.unsplash.com/photo-1614613535808-3196b08fb8e5?q=80&w=2072&auto=format&fit=crop' },
    { name: 'Deep Space', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=2090&auto=format&fit=crop' }
  ];

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
       const res = await uploadToCloudinary(file, { folder: 'bracket_bgs' });
       if (res && res.url) {
          await updateDoc(doc(db, 'thc_tournaments', id), { bracketBgUrl: res.url });
          toast({ title: 'Background updated!' });
       }
    } catch (err: any) {
       toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    } finally {
       setUploadingBg(false);
    }
  };

  const handleSetBg = async (url: string | null) => {
     try {
        await updateDoc(doc(db, 'thc_tournaments', id), { bracketBgUrl: url });
        toast({ title: url ? 'Theme applied!' : 'Background removed!' });
     } catch(err) {
        toast({ variant: 'destructive', title: 'Failed to update' });
     }
  };

  if (tLoading || mLoading || teamsLoading) return <PageWrapper><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></PageWrapper>;

  const getTeam = (teamId: string | null) => {
    if (!teamId) return { name: 'TBD', logoUrl: '' };
    if (teamId === 'BYE') return { name: 'BYE', logoUrl: '' };
    return teams?.find(team => team.id === teamId) || { name: 'Unknown', logoUrl: '' };
  };

  const renderBracket = (bracketType: 'upper' | 'lower') => {
    const bracketMatches = matches?.filter(m => m.bracket === bracketType || (bracketType === 'upper' && m.bracket === 'final'));
    if (!bracketMatches || bracketMatches.length === 0) {
       return <div className="text-center py-12 text-muted-foreground font-black uppercase text-xs">No matches generated for this bracket yet.</div>;
    }

    // Group by round
    const rounds: Record<number, any[]> = {};
    let maxUpperRound = 0;
    
    // First, find max round for 'upper' to offset 'final' rounds
    bracketMatches.forEach(m => {
       if (m.bracket === 'upper' && m.round > maxUpperRound) {
          maxUpperRound = m.round;
       }
    });

    bracketMatches.forEach(m => {
       let roundKey = m.round;
       if (m.bracket === 'final') {
          // Push final rounds AFTER upper bracket
          roundKey = maxUpperRound + m.round;
       }
       if (!rounds[roundKey]) rounds[roundKey] = [];
       rounds[roundKey].push(m);
    });

    const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

    return (
      <div className="flex gap-12 overflow-x-auto pb-8 custom-scrollbar">
         {roundNumbers.map(roundNum => (
            <div key={roundNum} className="flex flex-col gap-6 min-w-[250px]">
               <div className="text-center mb-6">
                  <h4 className="font-black uppercase text-yellow-500 tracking-widest text-xs drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">{rounds[roundNum][0].roundLabel}</h4>
               </div>
               
               <div className="flex-1 flex flex-col justify-around gap-6 relative">
                  {rounds[roundNum].map((match, idx) => {
                     const isFinal = roundNum === roundNumbers[roundNumbers.length - 1];
                     const t1 = getTeam(match.team1Id);
                     const t2 = getTeam(match.team2Id);
                     
                     return (
                        <div key={match.id} className="relative flex items-center">
                           {/* Left Connector (Incoming) */}
                           {roundNum !== roundNumbers[0] && (
                              <div className="absolute top-1/2 -left-6 w-6 h-[3px] bg-blue-400/50 shadow-[0_0_10px_rgba(96,165,250,0.8)] z-0" />
                           )}
                           
                           <div className="flex flex-col items-center gap-1 z-10">
                           {t?.roundSchedules?.[match.roundLabel] && (
                              <div className="text-[9px] font-black uppercase text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                                 {new Date(t.roundSchedules[match.roundLabel]).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} IST
                              </div>
                           )}
                           <Card onClick={() => setSelectedMatch(match)} className={`relative w-[280px] overflow-hidden border-2 transition-all duration-300 hover:scale-105 cursor-pointer z-10 ${isFinal || match.bracket === 'final' ? 'border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.5)] bg-yellow-950/40' : match.status === 'live' ? 'border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.6)] bg-blue-950/40' : 'border-slate-700 bg-slate-900/80'}`}>
                              {(isFinal || match.bracket === 'final') && <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-transparent to-yellow-900/40 pointer-events-none" />}
                              {(!isFinal && match.bracket !== 'final') && <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-red-600/10 pointer-events-none" />}
                              
                              <div className="relative z-10 flex flex-col gap-1 p-1.5">
                                 {/* Team 1 */}
                                 <div className={`p-2.5 flex items-center justify-between transition-all duration-500 rounded border-l-4 ${match.winnerId && match.winnerId === match.team1Id ? 'bg-green-600/40 border-green-500 shadow-[inset_0_0_20px_rgba(34,197,94,0.5)]' : match.winnerId && match.winnerId !== match.team1Id ? 'bg-slate-900/50 border-slate-700 opacity-50 grayscale' : 'bg-slate-800/80 border-blue-900/80 hover:bg-blue-900/40 hover:border-blue-500/80'}`}>
                                 <div className="flex items-center gap-2 overflow-hidden">
                                    {t1.logoUrl && <img src={typeof t1.logoUrl === 'string' ? t1.logoUrl : t1.logoUrl?.url} alt="" className="w-6 h-6 rounded object-cover shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                                    <span className={`font-black uppercase text-xs truncate ${match.winnerId && match.winnerId === match.team1Id ? 'text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'text-slate-300'}`}>{t1.name}</span>
                                 </div>
                                 <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded">
                                    <span className={`text-[11px] font-black ${match.winnerId && match.winnerId === match.team1Id ? 'text-green-400' : 'text-blue-400'}`}>{match.team1Stars} <Star className="w-2.5 h-2.5 inline" /></span>
                                    {match.winnerId && match.winnerId === match.team1Id && <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />}
                                 </div>
                              </div>
                              {/* Team 2 */}
                              <div className={`p-2.5 flex items-center justify-between transition-all duration-500 rounded border-l-4 ${match.winnerId && match.winnerId === match.team2Id ? 'bg-green-600/40 border-green-500 shadow-[inset_0_0_20px_rgba(34,197,94,0.5)]' : match.winnerId && match.winnerId !== match.team2Id ? 'bg-slate-900/50 border-slate-700 opacity-50 grayscale' : 'bg-slate-800/80 border-red-900/80 hover:bg-red-900/40 hover:border-red-500/80'}`}>
                                 <div className="flex items-center gap-2 overflow-hidden">
                                    {t2.logoUrl && <img src={typeof t2.logoUrl === 'string' ? t2.logoUrl : t2.logoUrl?.url} alt="" className="w-6 h-6 rounded object-cover shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
                                    <span className={`font-black uppercase text-xs truncate ${match.winnerId && match.winnerId === match.team2Id ? 'text-green-400 drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'text-slate-300'}`}>{t2.name}</span>
                                 </div>
                                 <div className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded">
                                    <span className={`text-[11px] font-black ${match.winnerId && match.winnerId === match.team2Id ? 'text-green-400' : 'text-red-400'}`}>{match.team2Stars} <Star className="w-2.5 h-2.5 inline" /></span>
                                    {match.winnerId && match.winnerId === match.team2Id && <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />}
                                 </div>
                              </div>
                           </div>
                           {match.status === 'live' && (
                              <div className="absolute inset-x-0 bottom-0 bg-yellow-400 text-yellow-950 text-[10px] font-black uppercase text-center py-0.5 animate-pulse shadow-[0_0_15px_rgba(234,179,8,1)]">BATTLE IS LIVE</div>
                           )}
                           {match.status === 'completed' && match.team1Id === 'BYE' && (
                              <div className="absolute inset-x-0 bottom-0 bg-blue-500/20 text-blue-300 text-[9px] font-black uppercase text-center py-0.5">AUTO-ADVANCE (BYE)</div>
                           )}
                           {match.status === 'completed' && match.team2Id === 'BYE' && (
                              <div className="absolute inset-x-0 bottom-0 bg-red-500/20 text-red-300 text-[9px] font-black uppercase text-center py-0.5">AUTO-ADVANCE (BYE)</div>
                           )}
                        </Card>
                        </div>
                        
                        {/* Right Connector (Outgoing) */}
                        {!isFinal && match.roundLabel !== 'Grand Final Reset' && (
                           <div className="absolute -right-6 z-0">
                              <div className="w-6 h-[3px] bg-blue-400/50 shadow-[0_0_10px_rgba(96,165,250,0.8)] relative top-1/2" />
                              <div className={`w-[3px] bg-blue-400/50 shadow-[0_0_10px_rgba(96,165,250,0.8)] absolute right-0 ${match.bracket === 'final' ? 'hidden' : idx % 2 === 0 ? 'top-1/2 h-[calc(50%+1.5rem)]' : 'bottom-1/2 h-[calc(50%+1.5rem)]'}`} />
                           </div>
                        )}
                        </div>
                     )
                  })}
               </div>
            </div>
         ))}
         
         {/* The Ultimate Champion Slot */}
         {t?.status === 'completed' && t.results?.firstPlace && activeTab === 'upper' && (
            <div className="flex flex-col justify-center min-w-[250px] ml-12 relative animate-in zoom-in duration-700">
               <div className="absolute top-1/2 -left-12 w-12 h-[4px] bg-green-500 shadow-[0_0_15px_rgba(34,197,94,1)] z-0" />
               <div className="text-center mb-6">
                  <h4 className="font-black uppercase text-green-400 tracking-widest text-2xl drop-shadow-[0_0_20px_rgba(34,197,94,1)] animate-pulse">👑 TOURNAMENT CHAMPION 👑</h4>
               </div>
               <Card className="relative w-[320px] bg-gradient-to-br from-green-600 via-green-500 to-emerald-800 border-4 border-green-300 shadow-[0_0_80px_rgba(34,197,94,0.8)] overflow-hidden z-10 transform scale-110 group">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-40 mix-blend-overlay group-hover:opacity-60 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-emerald-300 to-green-400 opacity-30 blur-xl animate-pulse" />
                  
                  <div className="p-8 flex flex-col items-center justify-center gap-4 relative z-10">
                     <Crown className="w-20 h-20 text-yellow-300 drop-shadow-[0_0_30px_rgba(253,224,71,1)] animate-bounce" />
                     <h2 className="text-4xl font-black italic uppercase text-white drop-shadow-[0_0_15px_rgba(0,0,0,1)] text-center tracking-wider">
                        {getTeam(t.results.firstPlace).name}
                     </h2>
                  </div>
               </Card>
            </div>
         )}
      </div>
    );
  };

  return (
    <PageWrapper>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <Link href={`/arena/thc/${id}`} className="inline-flex items-center text-[10px] font-black uppercase text-muted-foreground hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> BACK TO LOBBY
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
              <h1 className="text-3xl font-headline font-black italic uppercase text-white flex items-center gap-2">
                 <Trophy className="w-6 h-6 text-primary" /> Tournament Bracket
              </h1>
              <p className="text-sm text-muted-foreground mt-2">{t?.name} - Watch the battle unfold.</p>
           </div>
           
           <div className="flex items-center gap-3">
              <Button onClick={toggleFullscreen} variant="outline" className="border-white/10 text-white hover:bg-white/5 font-black uppercase">
                 {isFullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
                 {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
              </Button>
              
              {isAdmin && (
              <Dialog>
                 <DialogTrigger asChild>
                    <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/20 font-black uppercase">
                       <Settings className="w-4 h-4 mr-2" /> Theme Settings
                    </Button>
                 </DialogTrigger>
                 <DialogContent className="bg-black/95 border border-white/10 text-white backdrop-blur-xl">
                    <DialogHeader>
                       <DialogTitle className="font-black uppercase text-xl">Customize Bracket Theme</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 mt-4">
                       <div>
                          <p className="text-xs font-black uppercase text-muted-foreground mb-3">Upload Custom Image</p>
                          <div className="flex items-center gap-4">
                             <Button asChild variant="outline" disabled={uploadingBg} className="border-white/20 relative w-full cursor-pointer overflow-hidden">
                                <label>
                                   {uploadingBg ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                   {uploadingBg ? 'Uploading...' : 'Upload Image (Landscape)'}
                                   <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} disabled={uploadingBg} />
                                </label>
                             </Button>
                             {t?.bracketBgUrl && (
                                <Button variant="destructive" size="icon" onClick={() => handleSetBg(null)}>
                                   <Trash2 className="w-4 h-4" />
                                </Button>
                             )}
                          </div>
                       </div>
                       
                       <div>
                          <p className="text-xs font-black uppercase text-muted-foreground mb-3">Premium Themes</p>
                          <div className="grid grid-cols-2 gap-3">
                             {presetBackgrounds.map((bg, i) => (
                                <div key={i} onClick={() => handleSetBg(bg.url)} className="relative h-20 rounded-lg overflow-hidden cursor-pointer border-2 border-white/10 hover:border-primary transition-all group">
                                   <img src={bg.url} alt={bg.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                   <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="bg-black/60 px-2 py-1 rounded text-[10px] font-black uppercase text-white backdrop-blur-sm shadow-xl">{bg.name}</span>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </DialogContent>
               </Dialog>
            )}
            </div>
        </div>

        {t?.format === 'double_elimination' && (
           <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="bg-black/40 border border-white/5 h-12 rounded-xl p-1 mb-6">
                 <TabsTrigger value="upper" className="data-[state=active]:bg-primary rounded-lg px-8 h-full font-black uppercase text-[10px]">Upper Bracket & Finals</TabsTrigger>
                 <TabsTrigger value="lower" className="data-[state=active]:bg-primary rounded-lg px-8 h-full font-black uppercase text-[10px]">Lower Bracket</TabsTrigger>
              </TabsList>
           </Tabs>
        )}

        <Card ref={bracketRef} className="relative glass border-white/10 min-h-[600px] overflow-hidden rounded-2xl bg-black">
           {t?.bracketBgUrl && (
              <div className="absolute inset-0 z-0">
                 <div className="absolute inset-0 bg-black/50 z-10 backdrop-blur-[2px]" />
                 <img src={t.bracketBgUrl} alt="Background" className="w-full h-full object-cover" />
              </div>
           )}
           <div className={`relative z-10 p-6 h-full ${isFullscreen ? 'overflow-auto' : ''}`}>
              {isFullscreen && (
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black italic uppercase text-white drop-shadow-md">{t?.name} Bracket</h2>
                    <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/10">
                       <Minimize className="w-6 h-6" />
                    </Button>
                 </div>
              )}
              {renderBracket(activeTab)}
           </div>
        </Card>

        {/* Match Details Popup */}
        {selectedMatch && (
           <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
              <DialogContent className="glass bg-black/95 border-white/10 text-white max-w-2xl p-0 overflow-hidden">
                 <div className="bg-gradient-to-r from-blue-900/40 to-red-900/40 p-6 border-b border-white/10">
                    <h2 className="text-2xl font-black uppercase text-center">{selectedMatch.roundLabel} Match Details</h2>
                    <p className="text-center text-xs text-muted-foreground uppercase font-bold mt-1">Status: {selectedMatch.status}</p>
                 </div>
                 
                 <div className="grid md:grid-cols-2 p-6 gap-6">
                    {/* Team 1 Details */}
                    <div className={`space-y-4 rounded-xl p-4 border ${selectedMatch.winnerId && selectedMatch.winnerId === selectedMatch.team1Id ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                       <h3 className="font-black uppercase flex items-center justify-between">
                          <span className={selectedMatch.winnerId && selectedMatch.winnerId === selectedMatch.team1Id ? 'text-green-400' : 'text-blue-400'}>{getTeam(selectedMatch.team1Id).name}</span>
                          {selectedMatch.winnerId && selectedMatch.winnerId === selectedMatch.team1Id && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                       </h3>
                       <div className="bg-black/50 rounded-lg p-3 space-y-2 text-sm font-bold uppercase">
                          <div className="flex justify-between"><span>Stars Claimed:</span> <span>{selectedMatch.team1Stars || 0}</span></div>
                          <div className="flex justify-between"><span>Avg Time:</span> <span>{selectedMatch.team1AvgTime || 0}s</span></div>
                       </div>
                       <div className="h-32 rounded-lg border border-white/10 overflow-hidden relative bg-zinc-900">
                          {selectedMatch.team1Screenshot ? (
                             <img src={selectedMatch.team1Screenshot} alt="Proof" className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(selectedMatch.team1Screenshot, '_blank')} />
                          ) : (
                             <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground font-black uppercase">No Proof Uploaded</div>
                          )}
                       </div>
                    </div>
                    
                    {/* Team 2 Details */}
                    <div className={`space-y-4 rounded-xl p-4 border ${selectedMatch.winnerId && selectedMatch.winnerId === selectedMatch.team2Id ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
                       <h3 className="font-black uppercase flex items-center justify-between">
                          <span className={selectedMatch.winnerId && selectedMatch.winnerId === selectedMatch.team2Id ? 'text-green-400' : 'text-red-400'}>{getTeam(selectedMatch.team2Id).name}</span>
                          {selectedMatch.winnerId && selectedMatch.winnerId === selectedMatch.team2Id && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                       </h3>
                       <div className="bg-black/50 rounded-lg p-3 space-y-2 text-sm font-bold uppercase">
                          <div className="flex justify-between"><span>Stars Claimed:</span> <span>{selectedMatch.team2Stars || 0}</span></div>
                          <div className="flex justify-between"><span>Avg Time:</span> <span>{selectedMatch.team2AvgTime || 0}s</span></div>
                       </div>
                       <div className="h-32 rounded-lg border border-white/10 overflow-hidden relative bg-zinc-900">
                          {selectedMatch.team2Screenshot ? (
                             <img src={selectedMatch.team2Screenshot} alt="Proof" className="w-full h-full object-cover cursor-pointer" onClick={() => window.open(selectedMatch.team2Screenshot, '_blank')} />
                          ) : (
                             <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground font-black uppercase">No Proof Uploaded</div>
                          )}
                       </div>
                    </div>
                 </div>
                 
                 {(isAdmin || true) && selectedMatch.status !== 'completed' && selectedMatch.team1Id !== 'BYE' && selectedMatch.team2Id !== 'BYE' && (
                    <div className="p-4 bg-white/5 border-t border-white/10 flex justify-center">
                       <Link href={`/arena/thc/${id}/match/${selectedMatch.id}`}>
                          <Button className="font-black uppercase bg-primary text-black glow-primary">Enter Match Lobby</Button>
                       </Link>
                    </div>
                 )}
              </DialogContent>
           </Dialog>
        )}
      </div>
    </PageWrapper>
  );
}
