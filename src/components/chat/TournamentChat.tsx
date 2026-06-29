'use client';

import { useEffect, useState, useRef } from 'react';
import { StreamChat, Channel as StreamChannel } from 'stream-chat';
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  Window,
  LoadingIndicator,
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import { useUser } from '@clerk/nextjs';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;

export default function TournamentChat({ 
  tournamentId, 
  isActive, 
  onUnreadCountChange 
}: { 
  tournamentId: string;
  isActive: boolean;
  onUnreadCountChange: (count: number) => void;
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
          body: JSON.stringify({ tournamentId })
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const { token } = await response.json();

        client = StreamChat.getInstance(apiKey);
        
        await client.connectUser(
          {
            id: user.id,
            name: user.username || user.firstName || 'Warrior',
            image: user.imageUrl || '',
          },
          token
        );

        const chatChannel = client.channel('gaming', `tournament_${tournamentId}`);
        await chatChannel.watch();
        
        setChannel(chatChannel);
        setChatClient(client);

        // Notify parent of unread counts
        onUnreadCountChangeRef.current(chatChannel.countUnread());

        client.on('message.new', () => {
          onUnreadCountChangeRef.current(chatChannel.countUnread());
        });
        
        client.on('notification.mark_read', () => {
          onUnreadCountChangeRef.current(chatChannel.countUnread());
        });

      } catch (err: any) {
        console.error('Failed to initialize stream chat:', err);
        setError(err.message || 'Failed to connect to chat');
      }
    };

    initChat();

    return () => {
      if (client) {
        client.disconnectUser();
        setChatClient(null);
      }
    };
  }, [user, tournamentId]);

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
            <ChannelHeader title="Tournament Chat" />
            <MessageList />
            <MessageInput focus />
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
