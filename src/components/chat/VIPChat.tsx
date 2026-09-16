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
  Message,
  useMessageContext,
  useChatContext
} from 'stream-chat-react';
import 'stream-chat-react/dist/css/index.css';
import { useUser } from '@clerk/nextjs';
import { useProfile } from '@/firebase';
import { doc } from 'firebase/firestore';
import { AvatarFrame } from '@/components/cosmetics/AvatarFrame';
import { ProfileInspectModal } from '@/components/profile/ProfileInspectModal';
import { Users, ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import './vip-chat-theme.css'; // We'll create this to override dark theme to light whatsapp style

const ChatActionsContext = createContext<{ onInspectUser: (id: string) => void }>({ onInspectUser: () => {} });

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
          <p className="text-xs text-muted-foreground font-black uppercase tracking-widest mt-1">Exclusive VIP Lounge</p>
        </div>
      </div>
    </div>
  );
};

const CustomMessageWrapper = (props: any) => {
  const { message } = useMessageContext();
  const { client } = useChatContext();
  const isMine = message.user?.id === client.userID;
  const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ');
  const { onInspectUser } = useContext(ChatActionsContext);
  
  const { profile } = useProfile();
  
  const avatarId = isMine ? profile?.equippedAvatar : undefined;
  const imageUrl = isMine ? profile?.avatarUrl || message.user?.image : undefined;
  const username = isMine ? profile?.username || message.user?.name : undefined;
  
  return (
    <div className={cn("flex items-end gap-2 w-full mt-2 mb-2", isMine ? "flex-row-reverse" : "flex-row")}>
      {isMine && (
        <div className="shrink-0 z-10 relative self-end cursor-pointer" onClick={() => onInspectUser(client.userID)}>
          <AvatarFrame 
            avatarId={avatarId as string}
            imageUrl={imageUrl as string}
            username={username as string}
            className="w-8 h-8 md:w-10 md:h-10"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <Message {...props} />
      </div>
    </div>
  );
};

const LiveAvatar = (props: any) => {
  const { onInspectUser } = useContext(ChatActionsContext);
  
  const avatarId = props.user?.equippedAvatar;
  const imageUrl = props.image || props.user?.image;
  const username = props.name || props.user?.name;

  return (
    <div className="shrink-0 mr-2 relative z-10 mt-1 cursor-pointer" onClick={() => onInspectUser(props.user?.id)}>
      <AvatarFrame 
        avatarId={avatarId as string}
        imageUrl={imageUrl as string}
        username={username as string}
        className="w-8 h-8 md:w-10 md:h-10"
      />
    </div>
  );
};

export default function VIPChat() {
  const { user, isLoaded } = useUser();
  const { profile } = useProfile();
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

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
            name: user.username || user.firstName || 'User',
            image: user.imageUrl || '',
            equippedAvatar: profile?.equippedAvatar,
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
      <Chat client={chatClient} theme="str-chat__theme-dark">
        <ChatActionsContext.Provider value={{ onInspectUser: setInspectId }}>
        <Channel 
          channel={channel}
          Avatar={LiveAvatar}
          Message={CustomMessageWrapper}
        >
          <Window>
            <CustomChannelHeader />
            <MessageList />
            <MessageComposer focus />
          </Window>
        </Channel>
        </ChatActionsContext.Provider>
      </Chat>
      <ProfileInspectModal userId={inspectId} open={!!inspectId} onOpenChange={(o) => !o && setInspectId(null)} />
    </div>
  );
}
