'use client';

import { useEffect, useState, useRef } from 'react';
import { StreamChat, Channel as StreamChannel } from 'stream-chat';
import {
  Chat,
  Channel,
  MessageList,
  MessageComposer,
  Thread,
  Window,
  LoadingIndicator,
  useChannelStateContext,
  useChatContext
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';
import { useUser } from '@clerk/nextjs';
import { AlertCircle, Users, Pin } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

const CustomChannelHeader = ({ channelName }: { channelName: string }) => {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  
  const [pinnedMessages, setPinnedMessages] = useState<any[]>(channel.state.pinnedMessages || []);
  const [onlineMembers, setOnlineMembers] = useState<any[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);

  useEffect(() => {
    const updateState = () => {
      setPinnedMessages([...(channel.state.pinnedMessages || [])]);
      const members = Object.values(channel.state.members || {});
      setTotalMembers(members.length);
      setOnlineMembers(members.filter(m => m.user?.online));
    };

    updateState(); // initial load

    const handleEvent = () => updateState();
    
    client.on('message.updated', handleEvent);
    client.on('message.deleted', handleEvent);
    client.on('user.presence.changed', handleEvent);
    
    return () => {
      client.off('message.updated', handleEvent);
      client.off('message.deleted', handleEvent);
      client.off('user.presence.changed', handleEvent);
    };
  }, [channel, client]);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/5 h-16">
      <div className="flex flex-col">
        <h3 className="font-black text-sm uppercase text-white tracking-widest">{channelName}</h3>
        <p className="text-[10px] font-bold text-muted-foreground uppercase">{totalMembers} MEMBERS</p>
      </div>

      <div className="flex items-center gap-3">
        {/* ONLINE USERS */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md hover:bg-green-500/20 transition-colors">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
               <span className="text-[10px] font-black text-green-400 uppercase">{onlineMembers.length} Online</span>
            </button>
          </DialogTrigger>
          <DialogContent className="glass bg-black border-white/10 sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-green-400" /> ONLINE PLAYERS ({onlineMembers.length})
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-2 mt-4 custom-scrollbar pr-2">
              {onlineMembers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No players online right now.</p>}
              {onlineMembers.map(m => (
                <div key={m.user_id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/5">
                  <Avatar className="w-8 h-8 border border-white/10">
                    <AvatarImage src={m.user?.image} />
                    <AvatarFallback className="bg-zinc-800 text-[10px]">{m.user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white uppercase">{m.user?.name}</span>
                    <span className="text-[9px] text-green-400 font-black uppercase">Online Now</span>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* PINNED MESSAGES */}
        <Dialog>
          <DialogTrigger asChild>
             <button className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md hover:bg-blue-500/20 transition-colors relative">
               <Pin className="w-3 h-3 text-blue-400" />
               <span className="text-[10px] font-black text-blue-400 uppercase">Pins</span>
               {pinnedMessages.length > 0 && (
                 <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-500 rounded-full text-[8px] font-black text-white flex items-center justify-center">
                   {pinnedMessages.length}
                 </span>
               )}
             </button>
          </DialogTrigger>
          <DialogContent className="glass bg-black border-white/10 sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <Pin className="w-4 h-4 text-blue-400" /> PINNED MESSAGES
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto space-y-3 mt-4 custom-scrollbar pr-2">
              {pinnedMessages.length === 0 && <p className="text-xs text-muted-foreground text-center py-4 uppercase font-black tracking-widest">No pinned messages yet.</p>}
              {pinnedMessages.map((msg: any) => (
                <div key={msg.id} className="flex gap-3 p-3 bg-blue-900/10 rounded-xl border border-blue-500/20 relative group">
                  <Avatar className="w-8 h-8 border border-white/10 shrink-0">
                    <AvatarImage src={msg.user?.image} />
                    <AvatarFallback className="bg-zinc-800 text-[10px]">{msg.user?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] font-black text-blue-300 uppercase">{msg.user?.name}</span>
                      <span className="text-[8px] text-muted-foreground uppercase">{msg.created_at ? format(new Date(msg.created_at), 'MMM dd HH:mm') : ''}</span>
                    </div>
                    <p className="text-xs text-white/90 whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;

export default function TournamentChat({ 
  tournamentId, 
  isActive, 
  onUnreadCountChange,
  teamId
}: { 
  tournamentId: string;
  isActive: boolean;
  onUnreadCountChange: (count: number) => void;
  teamId?: string;
}) {
  const { user } = useUser();
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onUnreadCountChangeRef = useRef(onUnreadCountChange);

  // Keep ref updated to avoid stale closures without dependency arrays issues
  useEffect(() => {
    onUnreadCountChangeRef.current = onUnreadCountChange;
  }, [onUnreadCountChange]);

  useEffect(() => {
    if (!user || !apiKey) return;

    let client: StreamChat;

    const initChat = async () => {
      try {
        const response = await fetch('/api/stream/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournamentId, teamId })
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const { token } = await response.json();

        client = StreamChat.getInstance(apiKey, { timeout: 15000 });
        
        // Only connect if not already connected as this user
        if (client.userID !== user.id) {
          if (client.userID) {
            await client.disconnectUser();
          }
          await client.connectUser(
            {
              id: user.id,
              name: user.username || user.firstName || 'Warrior',
              image: user.imageUrl || '',
            },
            token
          );
        }

        const safeChannelId = teamId 
          ? `tournament_${tournamentId.toLowerCase()}_${teamId.toLowerCase()}` 
          : `tournament_${tournamentId.toLowerCase()}`;
        const chatChannel = client.channel('gaming', safeChannelId);
        await chatChannel.watch();
        
        setChannel(chatChannel);
        setChatClient(client);

        // Notify parent of unread counts
        onUnreadCountChangeRef.current(chatChannel.countUnread());

        const handleNewMessage = () => {
          onUnreadCountChangeRef.current(chatChannel.countUnread());
        };

        client.on('message.new', handleNewMessage);
        client.on('notification.mark_read', handleNewMessage);

        return () => {
          client.off('message.new', handleNewMessage);
          client.off('notification.mark_read', handleNewMessage);
          // Do not disconnect the singleton client here to prevent React 18 Strict Mode errors
        };
      } catch (err: any) {
        console.error('Failed to initialize stream chat:', err);
        setError(err.message || 'Failed to connect to chat');
      }
    };

    let cleanupFn: any;
    initChat().then((cleanup) => {
       cleanupFn = cleanup;
    });

    return () => {
      if (cleanupFn) {
         cleanupFn();
      }
      setChatClient(null);
    };
  }, [user, tournamentId, teamId]);

  if (error) {
    if (!isActive) return null;
    return (
      <div className="h-full flex items-center justify-center p-6 mt-4">
        <Alert variant="destructive" className="glass bg-red-950/20 border-red-500/20 max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-black uppercase tracking-widest text-[10px]">Connection Error</AlertTitle>
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!chatClient || !channel) {
    if (!isActive) return null;
    return (
      <div className="flex h-[80vh] items-center justify-center mt-4 glass border-white/5 bg-[#0a0a0a] rounded-[2.5rem]">
        <div className="flex flex-col items-center gap-4">
          <LoadingIndicator size={30} />
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground animate-pulse">Establishing Secure Connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-[80vh] mt-4 w-full bg-[#0a0a0a] rounded-[2.5rem] overflow-hidden border border-white/5 str-chat-custom-container ${isActive ? 'block' : 'hidden'}`}>
      <Chat client={chatClient} theme="str-chat__theme-dark">
        <Channel channel={channel}>
          <Window>
            <CustomChannelHeader channelName={teamId ? "Tournament Chat" : "Global Chat"} />
            <MessageList />
            <MessageComposer />
          </Window>
          <Thread />
        </Channel>
      </Chat>
      <style dangerouslySetInnerHTML={{__html: `
        .str-chat-custom-container {
          --str-chat__primary-color: #ea580c;
          --str-chat__surface-color: rgba(255, 255, 255, 0.02);
          --str-chat__border-radius-circle: 50%;
          --str-chat__border-radius-sm: 8px;
          --str-chat__border-radius-md: 12px;
          --str-chat__border-radius-lg: 16px;
        }
        .str-chat {
          --str-chat__background-color: transparent !important;
          background: transparent !important;
        }
        .str-chat__channel-header {
          background: rgba(0, 0, 0, 0.4) !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
        .str-chat__list {
          background: transparent !important;
        }
        .str-chat__message-input {
          background: rgba(0, 0, 0, 0.6) !important;
          border-top: 1px solid rgba(255,255,255,0.05) !important;
        }
        .str-chat__message-simple-text-inner {
           background: rgba(255, 255, 255, 0.05) !important;
           color: #fff !important;
           border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .str-chat__message-simple--me .str-chat__message-simple-text-inner {
           background: #ea580c !important;
           border-color: #ea580c;
        }
        .str-chat__avatar {
           border: 1px solid rgba(255,255,255,0.1);
        }
      `}} />
    </div>
  );
}
