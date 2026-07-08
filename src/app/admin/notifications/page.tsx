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
import { UserSearchSelect } from '@/components/ui/user-search-select';

export default function AdminNotificationsPage() {
  const db = useFirestore();
  const { toast } = useToast();

  const [audience, setAudience] = useState<'broadcast' | 'admins' | 'user'>('broadcast');
  const [selectedUsers, setSelectedUsers] = useState<{id: string, username: string, cocTag: string, photoURL: string}[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);

  // History is permanently disabled for performance

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

    if (audience === 'user' && selectedUsers.length === 0) {
      toast({
        variant: "destructive",
        title: "Users Required",
        description: "Please select at least one target user."
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
          userIds: audience === 'user' ? selectedUsers.map(u => u.id) : undefined,
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
      setSelectedUsers([]);
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
                <div className="space-y-2 animate-fadeIn overflow-visible z-50 relative">
                  <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Target Users</label>
                  <UserSearchSelect 
                    selectedUsers={selectedUsers} 
                    onChange={setSelectedUsers} 
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
          <CardHeader className="flex flex-col justify-center items-center h-64 opacity-50">
            <Bell className="w-12 h-12 text-muted-foreground mb-4" />
            <CardTitle className="font-headline text-xl uppercase text-muted-foreground">HISTORY DISABLED</CardTitle>
            <CardDescription className="text-xs uppercase font-bold text-muted-foreground/60 text-center max-w-sm mt-2">
              Notification archiving has been permanently disabled to optimize database write operations and preserve quota.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
