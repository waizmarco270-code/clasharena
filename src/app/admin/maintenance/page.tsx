'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCollection, useFirestore, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Wrench,
  Clock,
  Power,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

export default function MaintenancePage() {
  const db = useFirestore();
  const { toast } = useToast();

  // 1. Maintenance Status Hook
  const maintenanceDocRef = useMemo(() => doc(db, 'app-settings', 'maintenance'), [db]);
  const { data: maintenanceData, loading: maintenanceLoading } = useDoc(maintenanceDocRef);

  // 2. Releases Hook
  const releasesQuery = useMemo(() => query(collection(db, 'releases'), orderBy('createdAt', 'desc')), [db]);
  const { data: releases, loading: releasesLoading } = useCollection(releasesQuery);

  // Maintenance form state
  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState('');
  const [endTime, setEndTime] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Release form state
  const [version, setVersion] = useState('');
  const [heading, setHeading] = useState('');
  const [bulletsText, setBulletsText] = useState('');
  const [savingRelease, setSavingRelease] = useState(false);

  // Sync state when DB loads
  useEffect(() => {
    if (maintenanceData) {
      setIsActive(maintenanceData.isActive || false);
      setMessage(maintenanceData.message || '');
      
      if (maintenanceData.endAt) {
        // Convert to local datetime string format for input value (YYYY-MM-DDThh:mm)
        try {
          const date = new Date(maintenanceData.endAt);
          const tzoffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
          const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
          setEndTime(localISOTime);
        } catch (e) {
          console.error("Error parsing endAt date", e);
        }
      } else {
        setEndTime('');
      }
    }
  }, [maintenanceData]);

  // Handle Maintenance Save
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      let isoEndTime = '';
      if (endTime) {
        isoEndTime = new Date(endTime).toISOString();
      }

      await setDoc(maintenanceDocRef, {
        isActive,
        message,
        endAt: isoEndTime,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({
        title: "MAINTENANCE SETTINGS UPDATED",
        description: isActive ? "Maintenance mode is now active." : "Maintenance mode has been disabled.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to Update Settings",
        description: err.message,
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Add Release Log
  const handleAddRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim() || !heading.trim() || !bulletsText.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please populate all fields.",
      });
      return;
    }

    setSavingRelease(true);
    try {
      const bulletPoints = bulletsText
        .split('\n')
        .map(pt => pt.trim())
        .filter(pt => pt.length > 0);

      await addDoc(collection(db, 'releases'), {
        version: version.trim(),
        heading: heading.trim(),
        bullets: bulletPoints,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "RELEASE LOG ADDED",
        description: `Version ${version} published to What's New timeline.`,
      });

      // Clear fields
      setVersion('');
      setHeading('');
      setBulletsText('');
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to Add Release Log",
        description: err.message,
      });
    } finally {
      setSavingRelease(false);
    }
  };

  // Handle Delete Release Log
  const handleDeleteRelease = async (id: string, verNum: string) => {
    if (!confirm(`Are you sure you want to delete the release notes for version ${verNum}?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'releases', id));
      toast({
        title: "RELEASE NOTES DELETED",
        description: `Version ${verNum} removed.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: err.message,
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Maintenance Controls Card */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="glass border-primary/20 bg-black/40">
          <CardHeader>
            <CardTitle className="font-headline text-xl font-bold uppercase tracking-tight flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary shrink-0" />
              MAINTENANCE <span className="text-primary italic">SHIELD</span>
            </CardTitle>
            <CardDescription className="text-xs uppercase font-bold text-muted-foreground">
              Configure system maintenance lockdowns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {maintenanceLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="animate-spin text-primary w-8 h-8" />
              </div>
            ) : (
              <form onSubmit={handleSaveMaintenance} className="space-y-6">
                {/* Active Toggle Switch */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold uppercase tracking-wider">Shield Status</Label>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Toggle active client lockdown</p>
                  </div>
                  <Button
                    type="button"
                    variant={isActive ? 'destructive' : 'outline'}
                    onClick={() => setIsActive(!isActive)}
                    className="gap-2 font-bold px-4 h-11 uppercase"
                  >
                    <Power className="w-4 h-4" />
                    {isActive ? 'SHIELD ACTIVE' : 'SHIELD INACTIVE'}
                  </Button>
                </div>

                {/* Message Textarea */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider">Lockdown Broadcast Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide a reason (e.g. Clan War League updates, server upgrade)..."
                    className="min-h-[100px] border-white/10 bg-black/20 focus:ring-primary rounded-xl text-xs font-medium"
                  />
                </div>

                {/* End Date Datepicker */}
                <div className="space-y-2">
                  <Label htmlFor="endTime" className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Lockdown End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="border-white/10 bg-black/20 focus:ring-primary rounded-xl text-xs"
                  />
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase leading-normal">
                    Once this timestamp is reached, the client bypasses the shield automatically.
                  </p>
                </div>

                {/* Submit Action */}
                <Button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full bg-primary hover:bg-primary/95 text-white font-headline font-black italic uppercase tracking-wider rounded-xl h-12 shadow-lg glow-primary"
                >
                  {savingSettings ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                  COMMIT LOCKDOWN CHANGES
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Informative Guidance Card */}
        <Card className="glass border-white/5 bg-white/[0.01] p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-white">Shield Rules</h4>
              <p className="text-muted-foreground leading-relaxed">
                When active, all non-admin pages display a full-screen maintenance layout. 
                Admins and Super Admins can continue accessing all routes for staging, testing, and validations.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* What's New Releases Compilation */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="glass border-primary/20 bg-black/40">
          <CardHeader>
            <CardTitle className="font-headline text-xl font-bold uppercase tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary shrink-0 animate-pulse" />
              RELEASES <span className="text-primary italic">COMPILER</span>
            </CardTitle>
            <CardDescription className="text-xs uppercase font-bold text-muted-foreground">
              Add new updates to the "What's New" timeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddRelease} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Version */}
                <div className="space-y-1">
                  <Label htmlFor="version" className="text-xs font-bold uppercase tracking-wider">Version (e.g. v1.2.0)</Label>
                  <Input
                    id="version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="v1.2.0"
                    className="border-white/10 bg-black/20 focus:ring-primary rounded-xl text-xs font-bold"
                  />
                </div>

                {/* Heading */}
                <div className="space-y-1">
                  <Label htmlFor="heading" className="text-xs font-bold uppercase tracking-wider">Heading / Feature Title</Label>
                  <Input
                    id="heading"
                    value={heading}
                    onChange={(e) => setHeading(e.target.value)}
                    placeholder="New Esports Hub Releases"
                    className="border-white/10 bg-black/20 focus:ring-primary rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Bullets text */}
              <div className="space-y-1">
                <Label htmlFor="bullets" className="text-xs font-bold uppercase tracking-wider">Features / Updates (One per line)</Label>
                <Textarea
                  id="bullets"
                  value={bulletsText}
                  onChange={(e) => setBulletsText(e.target.value)}
                  placeholder="Added real-time tournament brackets&#10;Integrated instant Razorpay recharging&#10;Enabled push alerts for registrations"
                  className="min-h-[100px] border-white/10 bg-black/20 focus:ring-primary rounded-xl text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={savingRelease}
                className="bg-primary hover:bg-primary/95 text-white font-bold rounded-xl h-11 uppercase"
              >
                {savingRelease ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Add Release Log
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Releases list */}
        <Card className="glass border-white/5 bg-black/40">
          <CardHeader>
            <CardTitle className="font-headline text-lg font-bold uppercase tracking-tight">
              RELEASE <span className="text-primary italic">LEDGER</span>
            </CardTitle>
            <CardDescription className="text-xs uppercase font-bold text-muted-foreground">
              History of release updates visible to players
            </CardDescription>
          </CardHeader>
          <CardContent>
            {releasesLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="animate-spin text-primary w-8 h-8" />
              </div>
            ) : !releases || releases.length === 0 ? (
              <p className="text-xs font-bold text-muted-foreground text-center py-8 uppercase tracking-widest">No release logs published yet</p>
            ) : (
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {releases.map((release: any) => (
                  <div key={release.id} className="relative p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all flex justify-between items-start group">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                          {release.version}
                        </span>
                        <h4 className="font-bold text-sm text-white uppercase tracking-tight">{release.heading}</h4>
                      </div>
                      <ul className="list-disc pl-4 space-y-1">
                        {release.bullets?.map((bullet: string, idx: number) => (
                          <li key={idx} className="text-xs font-medium text-muted-foreground leading-normal">{bullet}</li>
                        ))}
                      </ul>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRelease(release.id, release.version)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
