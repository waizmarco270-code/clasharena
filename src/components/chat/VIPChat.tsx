'use client';

import { useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import {
  Chat,
  Channel,
  MessageList,
  MessageComposer,
  Window,
  LoadingIndicator,
  useChatContext
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';
import { useUser } from '@clerk/nextjs';
import { Users, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import './vip-chat-theme.css'; // We'll create this to override dark theme to light whatsapp style

const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;

const CustomChannelHeader = () => {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-[#075E54] text-white shadow-md z-10 relative h-16">
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 border border-white/20">
          <AvatarImage src="https://ui-avatars.com/api/?name=VIP&background=25D366&color=fff" />
        </Avatar>
        <div className="flex flex-col">
          <h3 className="font-bold text-sm">Elite VIP Community</h3>
          <p className="text-[10px] text-white/80 flex items-center gap-1">
             <ShieldCheck className="w-3 h-3" /> Exclusive Access
          </p>
        </div>
      </div>
    </div>
  );
};

export default function VIPChat() {
  const { user, isLoaded } = useUser();
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!isLoaded || !user || !apiKey) return;

    let client: StreamChat;

    const initChat = async () => {
      try {
        client = StreamChat.getInstance(apiKey, { timeout: 15000 });
        
        const res = await fetch('/api/stream/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournamentId: 'vip_lounge' })
        });
        
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text);
        }
        
        const { token } = await res.json();
        
        if (!token) throw new Error("No chat token");

        await client.connectUser(
          {
            id: user.id,
            name: user.firstName || user.username || 'VIP Member',
            image: user.imageUrl,
          },
          token
        );

        const newChannel = client.channel('gaming', 'tournament_vip_lounge', {
          name: 'Elite VIP Community',
          members: [user.id],
        });

        await newChannel.watch();
        setChannel(newChannel);
        setChatClient(client);

      } catch (error) {
        console.error("VIP Chat init error:", error);
      }
    };

    initChat();

    return () => {
      if (client) {
        client.disconnectUser().catch(console.error);
      }
    };
  }, [user, isLoaded]);

  if (!chatClient || !channel) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#E5DDD5]">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div className="vip-chat-container h-full w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
      <Chat client={chatClient} theme="str-chat__theme-light">
        <Channel channel={channel}>
          <Window>
            <CustomChannelHeader />
            <MessageList />
            <MessageComposer focus />
          </Window>
        </Channel>
      </Chat>
    </div>
  );
}
