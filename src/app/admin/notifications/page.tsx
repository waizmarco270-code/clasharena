'use client';

import { useMemo, useState } from 'react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { uploadToCloudinary } from '@/lib/cloudinary-utils';
import { 
  Bell, 
  Send, 
  Upload, 
  Image as ImageIcon,
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  History,
  Link2,
  Users
} from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Image from 'next/image';

export default function AdminNotificationsPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const [audience, setAudience] = useState<'broadcast' | 'admins' | 'user'>('broadcast');
  const [specificUserId, setSpecificUserId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Subscribe to last 30 notification logs
  const historyQuery = useMemo(() => query(
    collection(db, 'notification-history'),
    orderBy('createdAt', 'desc'),
    limit(30)
  ), [db]);
  const { data: history, loading: loadingHistory } = useCollection(historyQuery);

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear all transmission logs? This cannot be undone.")) {
      return;
    }
    setClearing(true);
    try {
      const q = query(collection(db, 'notification-history'));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      toast({
        title: "Logs Cleared 🧹",
        description: "Successfully cleared all notification transmission logs."
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Clear Failed",
        description: err.message || "Failed to clear transmission history."
      });
    } finally {
      setClearing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, { folder: 'notifications' });
      if (result.url) {
        setImageUrl(result.url);
        toast({ title: "Image Uploaded 🖼️", description: "Successfully attached notification banner." });
      } else {
        throw new Error("Upload failed");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: err.message || "Could not upload image to Cloudinary."
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please specify both a Title and Content body."
      });
      return;
    }

    if (audience === 'user' && !specificUserId.trim()) {
      toast({
        variant: "destructive",
        title: "User Required",
        description: "Please specify a target User ID."
      });
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience,
          title: title.trim(),
          body: body.trim(),
          userId: audience === 'user' ? specificUserId.trim() : undefined,
          imageUrl: imageUrl || undefined,
          redirectUrl: redirectUrl.trim() || undefined
        })
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "NOTIFICATIONS BROADCASTED 🚀",
        description: `Successfully delivered to ${data.successCount} devices. Failures: ${data.failureCount}`
      });

      // Clear Form on Success
      setTitle('');
      setBody('');
      setRedirectUrl('');
      setImageUrl('');
      setSpecificUserId('');
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Dispatch Failed",
        description: err.message || "Failed to broadcast notifications."
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-black/20 p-6 rounded-3xl border border-white/5 gap-4">
        <div>
          <h2 className="font-headline text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
            <Bell className="text-primary" /> PUSH ALERTS <span className="text-primary">DISPATCH</span>
          </h2>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Broadcast notifications to the arena instantly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dispatch Form Card */}
        <Card className="glass border-white/5 bg-black/40 lg:col-span-1 h-fit relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-red-600" />
          <CardHeader>
            <CardTitle className="font-headline text-lg uppercase text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> COMPOSE TELEMETRY
            </CardTitle>
            <CardDescription className="text-xs uppercase font-bold text-muted-foreground/60 tracking-wider">Configure dispatch parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendNotification} className="space-y-6">
              {/* Audience selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Target Audience</label>
                <div className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                  {(['broadcast', 'admins', 'user'] as const).map((aud) => (
                    <button
                      key={aud}
                      type="button"
                      onClick={() => setAudience(aud)}
                      className={`py-2 rounded-lg text-[9px] font-black uppercase transition-all ${
                        audience === aud 
                          ? "bg-primary text-white shadow-lg" 
                          : "text-muted-foreground hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {aud}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific user ID input */}
              {audience === 'user' && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Target Clerk User ID</label>
                  <Input
                    placeholder="user_..."
                    value={specificUserId}
                    onChange={(e) => setSpecificUserId(e.target.value)}
                    className="bg-black/40 border-white/10 rounded-xl text-white text-xs"
                  />
                </div>
              )}

              {/* Title input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Notification Title</label>
                <Input
                  placeholder="e.g. Tournament starting soon!"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-black/40 border-white/10 rounded-xl text-white text-xs"
                  required
                />
              </div>

              {/* Body Content input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Content Message</label>
                <Textarea
                  placeholder="Draft notification body content..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="bg-black/40 border-white/10 rounded-xl text-white text-xs min-h-[100px] resize-none"
                  required
                />
              </div>

              {/* Redirect url */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Link2 className="w-3 h-3 text-primary" /> Redirect Action URL (Optional)
                </label>
                <Input
                  placeholder="e.g. /arena/tournament/xyz (defaults to dashboard)"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  className="bg-black/40 border-white/10 rounded-xl text-white text-xs"
                />
              </div>

              {/* Image banner upload */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3 text-primary" /> Rich Image Banner (Optional)
                </label>
                
                {imageUrl ? (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-black group">
                    <Image src={imageUrl} alt="Attached Preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 text-[8px] font-bold uppercase transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      id="noti-image-upload"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    <label
                      htmlFor="noti-image-upload"
                      className="flex flex-col items-center justify-center border border-dashed border-white/20 hover:border-primary/50 bg-black/20 rounded-2xl p-6 cursor-pointer hover:bg-white/5 transition-all text-center"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                          <span className="text-[9px] font-black uppercase text-muted-foreground">Uploading banner to Cloudinary...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                          <span className="text-[10px] font-black uppercase text-white">Upload Banner Attachment</span>
                          <span className="text-[8px] font-bold text-muted-foreground mt-1 uppercase">Images up to 5MB</span>
                        </>
                      )}
                    </label>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-primary hover:bg-primary/95 text-white font-black uppercase rounded-xl h-12 glow-primary flex items-center justify-center gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                DISPATCH TELEMETRY
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History / Diagnostics Card */}
        <Card className="glass border-white/5 bg-black/40 lg:col-span-2 relative overflow-hidden h-fit">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-600 via-primary to-transparent" />
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1.5">
              <CardTitle className="font-headline text-lg uppercase text-white flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> TRANSMISSION ARCHIVE (LAST 30)
              </CardTitle>
              <CardDescription className="text-xs uppercase font-bold text-muted-foreground/60 tracking-wider">Historical dispatch logs & diagnostics</CardDescription>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearHistory}
              disabled={clearing || !history || history.length === 0}
              className="bg-red-600/10 hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center gap-2 h-9 self-end sm:self-auto"
            >
              {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Clear History
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loadingHistory ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Retrieving history logs...</p>
              </div>
            ) : !history || history.length === 0 ? (
              <div className="py-20 text-center space-y-4 opacity-40">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest">No Transmissions Dispatched Yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent bg-white/5">
                      <TableHead className="text-[9px] font-black uppercase">Notification</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">Audience</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">Delivery Analytics</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-right">Details & Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((log: any) => (
                      <TableRow key={log.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="max-w-[200px] space-y-1">
                          <p className="font-bold text-xs uppercase text-white line-clamp-1">{log.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{log.body}</p>
                          {log.imageUrl && (
                            <span className="inline-flex items-center gap-1 text-[8px] font-black text-amber-500 uppercase bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded mt-1">
                              Banner Attached
                            </span>
                          )}
                          {log.redirectUrl && log.redirectUrl !== '/dashboard' && (
                            <p className="text-[8px] text-muted-foreground flex items-center gap-1 font-semibold">
                              <Link2 className="w-2.5 h-2.5" /> {log.redirectUrl}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[8px] uppercase border-white/15 text-white font-bold whitespace-nowrap">
                            {log.audience}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-400" /> {log.successCount}
                              </span>
                              <span className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-red-400" /> {log.failureCount}
                              </span>
                            </div>
                            <span className="text-[8px] text-muted-foreground uppercase font-black">
                              {log.createdAt ? format(new Date(log.createdAt), 'MMM dd, HH:mm') : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right max-w-[200px]">
                          {log.errors && log.errors.length > 0 ? (
                            <div className="space-y-1 text-left inline-block">
                              <span className="text-[8px] font-black text-red-400 flex items-center gap-1 uppercase bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full w-fit ml-auto">
                                <AlertTriangle className="w-3 h-3" /> Diagnostic Errors
                              </span>
                              <div className="max-h-[80px] overflow-y-auto mt-1 space-y-0.5 text-right no-scrollbar">
                                {log.errors.map((err: string, idx: number) => (
                                  <p key={idx} className="text-[8px] font-semibold text-muted-foreground leading-tight">{err}</p>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              Fully Delivered
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
