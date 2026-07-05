'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  CheckCircle2, 
  Plus,
  Shield,
  ShieldAlert,
  Wifi,
  WifiOff,
  Trophy,
  Filter,
  Users,
  AlertCircle,
  Coins,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, doc, updateDoc, increment, limit } from 'firebase/firestore';
import Image from 'next/image';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export default function UserManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const userRef = useMemo(() => user ? doc(db, 'users', user.id) : null, [db, user?.id]);
  const { data: myProfile } = useDoc(userRef);

  const isSuperAdmin = user?.id === MASTER_SUPER_ADMIN_ID || myProfile?.isSuperAdmin;

  const [limitCount, setLimitCount] = useState(100);
  // Retrieve all users (Active Player Cache)
  const allUsersQuery = useMemo(() => query(collection(db, 'users'), limit(limitCount)), [db, limitCount]);
  const { data: allUsers, loading } = useCollection(allUsersQuery);

  const [userSearch, setUserSearch] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedTH, setSelectedTH] = useState<string>('all');
  const [selectedRelay, setSelectedRelay] = useState<string>('all');
  const [selectedWinsRange, setSelectedWinsRange] = useState<string>('all');
  const [selectedCoinRange, setSelectedCoinRange] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  // Confirmation Alert Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    username: string;
    isAdmin: boolean;
  } | null>(null);

  // Filter users list
  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    
    // Online threshold: 5.5 minutes ago
    const onlineThreshold = Date.now() - (5.5 * 60 * 1000);

    return allUsers.filter(u => {
      // 1. Search query
      const searchLower = userSearch.toLowerCase();
      const matchesSearch = !userSearch ||
        u.username?.toLowerCase().includes(searchLower) ||
        u.tag?.toLowerCase().includes(searchLower) ||
        u.id?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // 2. Town Hall filter
      if (selectedTH !== 'all') {
        const thVal = parseInt(selectedTH);
        if (u.townHall !== thVal) return false;
      }

      // 4. Relay (hasFcmToken) filter
      if (selectedRelay !== 'all') {
        const hasRelay = !!u.hasFcmToken;
        if (selectedRelay === 'on' && !hasRelay) return false;
        if (selectedRelay === 'off' && hasRelay) return false;
      }

      // 5. Wins Range filter
      if (selectedWinsRange !== 'all') {
        const wins = u.wins || 0;
        if (selectedWinsRange === '0' && wins !== 0) return false;
        if (selectedWinsRange === '1-5' && (wins < 1 || wins > 5)) return false;
        if (selectedWinsRange === '6-10' && (wins < 6 || wins > 10)) return false;
        if (selectedWinsRange === '11+' && wins < 11) return false;
      }

      // 6. Coin Balance Filter
      if (selectedCoinRange !== 'all') {
        const balance = u.balance || 0;
        if (selectedCoinRange === '1-100' && (balance < 1 || balance > 100)) return false;
        if (selectedCoinRange === '100-500' && (balance < 100 || balance > 500)) return false;
        if (selectedCoinRange === '500-1000' && (balance < 500 || balance > 1000)) return false;
        if (selectedCoinRange === '1000+' && balance < 1000) return false;
      }

      // 7. Role Filter (Admins)
      if (selectedRole !== 'all') {
        const adminStatus = u.isAdmin === true || u.role === 'admin';
        if (selectedRole === 'admin' && !adminStatus) return false;
        if (selectedRole === 'user' && adminStatus) return false;
      }

      return true;
    });
  }, [allUsers, userSearch, selectedTH, selectedRelay, selectedWinsRange, selectedCoinRange, selectedRole]);

  const top5Matches = useMemo(() => {
    if (!userSearch || userSearch.length < 1 || !allUsers) return [];
    const searchLower = userSearch.toLowerCase();
    return allUsers.filter(u => 
      u.username?.toLowerCase().includes(searchLower) ||
      u.tag?.toLowerCase().includes(searchLower) ||
      u.id?.toLowerCase().includes(searchLower)
    ).slice(0, 5);
  }, [allUsers, userSearch]);

  const handleInitiateAction = (userId: string, username: string, targetAdminState: boolean) => {
    setConfirmAction({ userId, username, isAdmin: targetAdminState });
    setConfirmOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!confirmAction) return;
    try {
      await updateDoc(doc(db, 'users', confirmAction.userId), { isAdmin: confirmAction.isAdmin });
      toast({
        title: confirmAction.isAdmin ? "Commander Promoted 🛡️" : "Commander Dismissed ❌",
        description: `Successfully ${confirmAction.isAdmin ? "promoted" : "dismissed"} admin privileges for ${confirmAction.username}.`
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err.message || "Failed to alter command privileges."
      });
    } finally {
      setConfirmOpen(false);
      setConfirmAction(null);
    }
  };

  const handleAddBalance = async (userId: string, username: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { balance: increment(50) });
      toast({
        title: "Coins Dispatched 🪙",
        description: `Dispatched 50 Arena Coins to ${username}.`
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Dispatch Failed",
        description: err.message || "Failed to credit coins."
      });
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-primary animate-pulse" />
        <h2 className="font-headline text-3xl font-black italic uppercase tracking-tighter text-white">ACCESS FORBIDDEN</h2>
        <p className="text-xs uppercase font-black tracking-widest text-muted-foreground max-w-md leading-relaxed">
          This console is reserved exclusively for Master and Super Administrators. Relocate back to base dashboard.
        </p>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-8 max-w-6xl mx-auto pb-20">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-black/20 p-6 rounded-3xl border border-white/5 gap-4">
          <div>
            <h2 className="font-headline text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
              <Users className="text-primary" /> COMMANDER <span className="text-primary">MODERATION</span>
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">
              Administer credentials, balance levels, and moderator roles of clash commanders.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-center min-w-[100px]">
              <p className="text-[8px] text-muted-foreground font-black uppercase tracking-wider">Filtered / Total</p>
              <p className="font-headline text-xl font-black italic text-white mt-0.5">
                {filteredUsers.length} <span className="text-primary text-xs">/ {allUsers?.length || 0}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Search Console */}
        <Card className="glass border-white/5 bg-black/40 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary via-red-600 to-transparent" />
          <CardHeader>
            <CardTitle className="font-headline text-lg uppercase text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" /> SEARCH & FILTER REGULATORS
            </CardTitle>
            <CardDescription className="text-xs uppercase font-bold text-muted-foreground/60 tracking-wider">
              Narrow search criteria using real-time attributes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Search input with Dropdown */}
              <div className="relative group md:col-span-2 z-50">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  value={userSearch} 
                  onChange={e => {
                    setUserSearch(e.target.value);
                    setShowSearchDropdown(true);
                  }} 
                  onFocus={() => setShowSearchDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                  placeholder="Smart search (Name, Player ID, User ID)..." 
                  className="pl-10 h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-zinc-500 font-medium" 
                />
                
                {/* Search Dropdown */}
                {showSearchDropdown && userSearch && top5Matches.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    {top5Matches.map(match => (
                      <div 
                        key={match.id}
                        onClick={() => {
                          setUserSearch(match.username);
                          setShowSearchDropdown(false);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white uppercase">{match.username || 'Warrior'}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{match.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Town Hall Filter */}
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Town Hall</label>
                <Select value={selectedTH} onValueChange={setSelectedTH}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12 font-bold text-xs rounded-xl text-white">
                    <SelectValue placeholder="All Town Halls" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10 text-white z-50">
                    <SelectItem value="all">All Town Halls</SelectItem>
                    {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((th) => (
                      <SelectItem key={th} value={th.toString()}>Town Hall {th}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Relay status Filter */}
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Relay alerts</label>
                <Select value={selectedRelay} onValueChange={setSelectedRelay}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12 font-bold text-xs rounded-xl text-white">
                    <SelectValue placeholder="All Devices" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10 text-white z-50">
                    <SelectItem value="all">All Devices</SelectItem>
                    <SelectItem value="on">Relay ON</SelectItem>
                    <SelectItem value="off">Relay OFF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Coin Balance Filter */}
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Coin Balance</label>
                <Select value={selectedCoinRange} onValueChange={setSelectedCoinRange}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12 font-bold text-xs rounded-xl text-white">
                    <SelectValue placeholder="All Balances" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10 text-white z-50">
                    <SelectItem value="all">All Balances</SelectItem>
                    <SelectItem value="1-100">1 - 100 Coins</SelectItem>
                    <SelectItem value="100-500">100 - 500 Coins</SelectItem>
                    <SelectItem value="500-1000">500 - 1000 Coins</SelectItem>
                    <SelectItem value="1000+">1000+ Coins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Role Filter */}
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Role</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12 font-bold text-xs rounded-xl text-white">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10 text-white z-50">
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admins Only</SelectItem>
                    <SelectItem value="user">Users Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Wins Range Filter */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tournament Wins</label>
                <Select value={selectedWinsRange} onValueChange={setSelectedWinsRange}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12 font-bold text-xs rounded-xl text-white">
                    <SelectValue placeholder="All Wins" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10 text-white">
                    <SelectItem value="all">All Wins Range</SelectItem>
                    <SelectItem value="0">0 Victories</SelectItem>
                    <SelectItem value="1-5">1 - 5 Victories</SelectItem>
                    <SelectItem value="6-10">6 - 10 Victories</SelectItem>
                    <SelectItem value="11+">11+ Legendary Victories</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Roster */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Syncing commander ledger...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 text-center bg-black/20 rounded-3xl border border-white/5 border-dashed space-y-4 opacity-40">
            <Users className="w-12 h-12 mx-auto text-muted-foreground animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest">No matching commanders discovered.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUsers.map((u) => {
              return (
                <div 
                  key={u.id} 
                  className="glass p-5 rounded-3xl border border-white/5 hover:border-white/10 bg-black/40 flex items-center justify-between gap-4 transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-white/10 to-transparent group-hover:from-primary transition-all duration-300" />
                  
                  <div className="flex items-center gap-4 min-w-0">
                    {/* User Avatar with Online Dot indicator */}
                    <div className="h-12 w-12 rounded-2xl bg-white/5 overflow-hidden relative border border-white/10 flex-shrink-0">
                      {u.avatarUrl ? (
                        <Image src={u.avatarUrl} alt="Commander Avatar" fill className="object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-black uppercase text-zinc-500 bg-white/5">
                          {u.username?.substring(0, 2) || 'CL'}
                        </div>
                      )}

                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-headline text-base font-black italic uppercase text-white truncate leading-none pt-0.5">
                          {u.username || 'Anonymous Commander'}
                        </p>
                        {u.isSuperAdmin && <CheckCircle2 className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                        {u.isAdmin && !u.isSuperAdmin && <Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[8px] font-black uppercase text-zinc-500 truncate select-all">{u.tag || '#NO-TAG'}</span>
                        <span className="text-zinc-600 text-[8px]">•</span>
                        <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                          <Coins className="w-3 h-3 text-emerald-400" /> {u.balance || 0}
                        </span>
                      </div>

                      {/* Display attributes: TH, Wins, Relay */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-white font-bold text-[8px] px-1.5 py-0 rounded">
                          TH {u.townHall || '??'}
                        </Badge>
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-amber-500 font-bold text-[8px] px-1.5 py-0 flex items-center gap-0.5 rounded">
                          <Trophy className="w-2.5 h-2.5 text-amber-500" /> WINS: {u.wins || 0}
                        </Badge>
                        {u.hasFcmToken ? (
                          <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold text-[8px] px-1.5 py-0 flex items-center gap-0.5 rounded">
                            <Wifi className="w-2.5 h-2.5 text-emerald-400" /> RELAY: ON
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-zinc-500/10 border-white/5 text-zinc-500 font-bold text-[8px] px-1.5 py-0 flex items-center gap-0.5 rounded">
                            <WifiOff className="w-2.5 h-2.5 text-zinc-500" /> RELAY: OFF
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Console */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button 
                      size="icon" 
                      variant="outline" 
                      title="Grant +50 Arena Coins"
                      className="h-9 w-9 rounded-xl border-emerald-500/20 hover:border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/20 text-emerald-400 transition-all flex items-center justify-center"
                      onClick={() => handleAddBalance(u.id, u.username)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                    
                    {u.id !== MASTER_SUPER_ADMIN_ID && (
                      u.isAdmin ? (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="h-9 rounded-xl text-[9px] font-black tracking-wider uppercase border border-red-500/30 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white transition-all px-3.5"
                          onClick={() => handleInitiateAction(u.id, u.username || 'Anonymous', false)}
                        >
                          DISMISS
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-9 rounded-xl text-[9px] font-black tracking-wider uppercase border border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:text-white transition-all px-3.5"
                          onClick={() => handleInitiateAction(u.id, u.username || 'Anonymous', true)}
                        >
                          PROMOTE
                        </Button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {allUsers && allUsers.length >= limitCount && (
          <div className="flex justify-center mt-6 mb-4">
            <Button 
              variant="outline" 
              className="glass border-white/10 hover:bg-white/5 text-white font-bold"
              onClick={() => setLimitCount(prev => prev + 20)}
            >
              Load More Users
            </Button>
          </div>
        )}

        {/* Action Confirmation AlertDialog */}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent className="glass border-white/15 bg-zinc-950 text-white max-w-md rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline text-lg uppercase text-white flex items-center gap-2">
                {confirmAction?.isAdmin ? (
                  <>
                    <Shield className="w-5 h-5 text-yellow-500" />
                    PROMOTE TO MODERATOR / ADMIN
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    REVOKE PRIVILEGES
                  </>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs uppercase text-zinc-400 font-bold tracking-wider pt-2 leading-relaxed">
                {confirmAction?.isAdmin ? (
                  <span>
                    You are about to promote <strong className="text-white">{confirmAction?.username}</strong> to Admin. This grants full access to create/update tournaments, dispatch manual recharge coins, and manage user details.
                  </span>
                ) : (
                  <span>
                    You are about to remove <strong className="text-white">{confirmAction?.username}</strong> from the Admin group. They will lose access to all admin tools, dashboard panels, and consoles instantly.
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-2 flex flex-col sm:flex-row">
              <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl font-black uppercase text-[10px] tracking-wider h-10 px-4">
                Abort
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleExecuteAction}
                className={cn(
                  "rounded-xl font-black uppercase text-[10px] tracking-wider text-white h-10 px-4",
                  confirmAction?.isAdmin ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                )}
              >
                I Understand, Confirm Action
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageWrapper>
  );
}
