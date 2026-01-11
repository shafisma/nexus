import { create } from 'zustand';

interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

interface Guild {
    id: string;
    name: string;
    ownerId: string;
    inviteCode: string;
    role?: 'owner' | 'admin' | 'member';
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  userName?: string;
  createdAt: string;
  updatedAt?: string;
  type: 'text' | 'file' | 'image' | 'poll' | 'gif';
  fileUrl?: string;
  fileName?: string;
  pollQuestion?: string;
  pollOptions?: PollOption[];
  guildId?: string | null;
  seenBy?: string[]; // Array of user IDs
  status?: 'sent' | 'delivered' | 'read';
}

interface ChatStore {
  messages: Message[];
  guilds: Guild[];
  currentGuild: Guild | null;
  onlineUsers: number;
  
  // Actions
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  updateMessage: (message: Partial<Message> & { id: string }) => void;
  deleteMessage: (id: string) => void;
  
  setGuilds: (guilds: Guild[]) => void;
  setCurrentGuild: (guild: Guild | null) => void;
  addGuild: (guild: Guild) => void;
  
  setOnlineUsers: (count: number) => void;
  incrementOnlineUsers: () => void;
  decrementOnlineUsers: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  guilds: [],
  currentGuild: null,
  onlineUsers: 0,

  addMessage: (message) => set((state) => {
      // Filter by guild if needed, but handled by fetch usually
      // Prevent duplicates
      if (state.messages.some(m => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
  }),
  setMessages: (messages) => set({ messages }),
  updateMessage: (updatedMessage) => set((state) => ({
    messages: state.messages.map((msg) => 
      msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
    )
  })),
  deleteMessage: (id) => set((state) => ({
      messages: state.messages.filter(m => m.id !== id)
  })),

  setGuilds: (guilds) => set({ guilds }),
  setCurrentGuild: (guild) => set({ currentGuild: guild }),
  addGuild: (guild) => set((state) => ({ guilds: [...state.guilds, guild] })),

  setOnlineUsers: (count) => set({ onlineUsers: count }),
  incrementOnlineUsers: () => set((state) => ({ onlineUsers: state.onlineUsers + 1 })),
  decrementOnlineUsers: () => set((state) => ({ onlineUsers: Math.max(0, state.onlineUsers - 1) })),
}));
