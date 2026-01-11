'use client'

import { useEffect, useState, useRef } from 'react'
import { useUser, UserButton } from '@clerk/nextjs'
import { useChatStore, Message } from '@/store/chatStore'
import { pusherClient } from '@/lib/pusher'
import { 
  PaperAirplaneIcon, 
  FaceSmileIcon, 
  PaperClipIcon, 
  ChartBarIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  GifIcon,
  PlusIcon,
  HashtagIcon,
  UserGroupIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon
} from '@heroicons/react/24/solid'
import { UserCircleIcon, DocumentIcon, EyeIcon } from '@heroicons/react/24/outline'
import { useTheme } from 'next-themes'
import EmojiPicker, { EmojiClickData, Theme as EmojiTheme } from 'emoji-picker-react'
import GifPicker, { TenorImage, Theme as GifTheme } from 'gif-picker-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ErrorBoundary } from '@/components/error-boundary'

export default function ChatPage() {
  const { user } = useUser()
  const [message, setMessage] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showGif, setShowGif] = useState(false)
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  
  // Guild State
  const [isGuildModalOpen, setIsGuildModalOpen] = useState(false)
  const [newGuildName, setNewGuildName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  
  // Poll State
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])

  // Edit State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const { 
    messages, addMessage, setMessages, updateMessage, deleteMessage,
    guilds, setGuilds, currentGuild, setCurrentGuild, addGuild,
    onlineUsers, setOnlineUsers, incrementOnlineUsers, decrementOnlineUsers 
  } = useChatStore() 
  
  const messagesEndRef = useRef<null | HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Hydration fix for next-themes
  useEffect(() => setMounted(true), [])

  // Fetch Guilds
  useEffect(() => {
      fetch('/api/guilds')
          .then(res => res.json())
          .then(data => {
              if (Array.isArray(data)) setGuilds(data);
          });
  }, [setGuilds]);

  // Fetch Messages when Guild Changes
  useEffect(() => {
    const url = currentGuild ? `/api/messages?guildId=${currentGuild.id}` : '/api/messages';
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const msgs = data.map((msg: any): Message => ({
          ...msg,
          createdAt: new Date(msg.createdAt).toISOString(),
          type: (msg.type || 'text') as Message['type']
        }));
        setMessages(msgs);

        // Mark unseen messages as seen
        if (user?.id) {
            const unseenIds = msgs
                .filter((m: Message) => m.userId !== user.id && !m.seenBy?.includes(user.id))
                .map((m: Message) => m.id);
            
            if (unseenIds.length > 0) {
                fetch('/api/messages/seen', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messageIds: unseenIds })
                }).catch(err => console.error("Failed to mark seen", err));
            }
        }
      })
  }, [currentGuild, setMessages, user?.id])

  // Pusher Subscription
  useEffect(() => {
    const channelName = currentGuild ? `presence-guild-${currentGuild.id}` : 'presence-global';
    const channel = pusherClient.subscribe(channelName)
    
    // Message Events
    channel.bind('new-message', (newMessage: Omit<Message, 'createdAt'> & { createdAt: string }) => {
      addMessage({
        ...newMessage,
        createdAt: new Date(newMessage.createdAt).toISOString(),
        type: (newMessage.type || 'text') as Message['type']
      } as Message)
    })
    
    channel.bind('message-deleted', (id: string) => {
        deleteMessage(id);
    });

    channel.bind('message-updated', (updated: any) => {
         updateMessage(updated);
    });

    // Presence Events
    channel.bind('pusher:subscription_succeeded', (members: any) => {
        setOnlineUsers(members.count);
    });

    channel.bind('pusher:member_added', () => {
        incrementOnlineUsers();
    });

    channel.bind('pusher:member_removed', () => {
        decrementOnlineUsers();
    });

    return () => {
      pusherClient.unsubscribe(channelName)
    }
  }, [currentGuild, addMessage, deleteMessage, updateMessage, setOnlineUsers, incrementOnlineUsers, decrementOnlineUsers])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (e?: React.FormEvent, type: Message['type'] = 'text', payload: any = {}) => {
    if (e) e.preventDefault()
    
    // Validation
    if (type === 'text' && !message.trim()) return;
    
    const body: any = { content: 'Attachment', type, ...payload, guildId: currentGuild?.id };
    if (type === 'text') {
        body.content = message;
    }

    try {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })

        if (response.ok) {
            setMessage('')
            setShowEmoji(false)
            setShowGif(false)
            setIsPollModalOpen(false)
            setPollQuestion('')
            setPollOptions(['', ''])
        }
    } catch (error) {
        console.error("Send failed", error)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (res.ok) {
            const data = await res.json();
            const type = file.type.startsWith('image/') ? 'image' : 'file';
            await sendMessage(undefined, type, { 
                fileUrl: data.fileUrl, 
                fileName: data.fileName,
                content: type === 'image' ? 'Sent an image' : `Sent a file: ${data.fileName}`
            });
        }
    } catch (error) {
        console.error("Upload failed", error);
    }
  }

  const handleCreateGuild = async () => {
      if (!newGuildName.trim()) return;
      
      const res = await fetch('/api/guilds', {
          method: 'POST',
          body: JSON.stringify({ name: newGuildName })
      });
      
      if (res.ok) {
          const guild = await res.json();
          addGuild(guild);
          setCurrentGuild(guild); // Switch to new guild
          setIsGuildModalOpen(false);
          setNewGuildName('');
      }
  }

  const handleJoinGuild = async () => {
      if (!joinCode.trim()) return;

      const res = await fetch('/api/guilds/join', {
          method: 'POST',
          body: JSON.stringify({ inviteCode: joinCode })
      });
      
      if (res.ok) {
          const guild = await res.json();
          addGuild(guild);
          setCurrentGuild(guild);
          setIsGuildModalOpen(false);
          setJoinCode('');
      } else {
          alert("Invalid invite code");
      }
  }

  const handleDeleteMessage = async (id: string) => {
      if (!confirm("Delete this message?")) return;
      deleteMessage(id); // Optimistic
      await fetch(`/api/messages?id=${id}`, { method: 'DELETE' });
  }

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  }

  const handleEditMessage = async (messageId: string) => {
      if (!editContent.trim()) return;
      
      try {
          const res = await fetch('/api/messages', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messageId, content: editContent })
          });
          
          if (!res.ok) throw new Error("Failed to edit");
          
          setEditingMessageId(null);
          setEditContent("");
      } catch (err) {
          console.error("Edit failed", err);
      }
  }

  const handleCreatePoll = () => {
    const validOptions = pollOptions.filter(o => o.trim() !== '');
    if (!pollQuestion.trim() || validOptions.length < 2) return;

    const formattedOptions = validOptions.map((text, index) => ({
        id: `opt-${Date.now()}-${index}`,
        text,
        votes: []
    }));

    sendMessage(undefined, 'poll', {
        content: 'Poll',
        pollQuestion,
        pollOptions: formattedOptions
    });
  }

  const handleVote = async (messageId: string, optionId: string) => {
    await fetch('/api/polls/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, optionId })
    });
    // Optimistic or wait for pusher? Pusher handles it.
  }

  const handleGifClick = (gif: TenorImage) => {
      sendMessage(undefined, 'gif', {
          fileUrl: gif.url,
          content: 'Sent a GIF'
      });
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', { 
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })
  }

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {}
    messages.forEach(msg => {
      const date = new Date(msg.createdAt).toLocaleDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(msg)
    })
    return groups
  }

  const groupedMessages = groupMessagesByDate(messages)

  if (!mounted) return null;

  return (
    <div className={clsx("flex h-screen transition-colors duration-300", 
        theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-gray-900'
    )}>
      {/* Sidebar - Guilds */}
      <aside className={clsx("w-20 lg:w-64 flex flex-col border-r h-full",
          theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-gray-200'
      )}>
        {/* Guild List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
            <div className="flex flex-col gap-2">
                <button 
                    onClick={() => setCurrentGuild(null)}
                    className={clsx("p-3 rounded-2xl flex items-center gap-3 transition-all",
                        !currentGuild ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                    )}
                >
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <UserGroupIcon className="w-6 h-6" />
                    </div>
                    <span className="hidden lg:block font-bold truncate">Global Chat</span>
                </button>
                
                <div className="h-px bg-gray-200 dark:bg-slate-800 my-2" />
                
                {guilds.map(guild => (
                    <button 
                        key={guild.id}
                        onClick={() => setCurrentGuild(guild)}
                        className={clsx("p-2 rounded-2xl flex items-center gap-3 transition-all",
                            currentGuild?.id === guild.id 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800'
                        )}
                    >
                        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                            {guild.name[0].toUpperCase()}
                        </div>
                        <div className="hidden lg:block text-left overflow-hidden">
                            <div className="font-bold truncate">{guild.name}</div>
                            {guild.role === 'owner' && <div className="text-[10px] opacity-70">Owner</div>}
                        </div>
                    </button>
                ))}

                <button 
                    onClick={() => setIsGuildModalOpen(true)}
                    className="p-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-700 flex items-center justify-center gap-2 hover:border-indigo-500 hover:text-indigo-500 transition-colors group"
                >
                    <PlusIcon className="w-6 h-6" />
                    <span className="hidden lg:block font-medium">Add Server</span>
                </button>
            </div>
        </div>
        
        {/* User Profile Mini */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex items-center gap-3">
             <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
             <div className="hidden lg:block overflow-hidden">
                 <div className="text-sm font-bold truncate">{user?.fullName}</div>
                 <div className="text-xs opacity-60">Online</div>
             </div>
        </div>
      </aside>

      {/* Main Chat Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
      
      {/* Header */}
      <header className={clsx("backdrop-blur-md border-b sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm",
          theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-gray-200'
      )}>
        <div className="flex items-center gap-2">
           <HashtagIcon className="w-6 h-6 text-gray-400" />
           <div className="flex flex-col">
               <h1 className="text-xl font-bold leading-none">
                   {currentGuild ? currentGuild.name : 'Global Chat'}
               </h1>
               <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                   <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                   {onlineUsers} online
               </span>
           </div>
           {currentGuild && currentGuild.role === 'owner' && (
               <span className="ml-4 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded select-all" title="Invite Code">
                   Code: {currentGuild.inviteCode}
               </span>
           )}
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition">
             {theme === 'dark' ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5 text-indigo-600" />}
          </button>
        </div>
      </header>
      
      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="text-center my-6">
              <span className={clsx("px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm",
                  theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-gray-400' : 'bg-gray-100/80 border-gray-200 text-gray-500'
              )}>
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            {msgs.map((msg, index) => {
               const isOwnMessage = msg.userId === user?.id;
               const isSequence = index > 0 && msgs[index - 1].userId === msg.userId;
               const canDelete = isOwnMessage || currentGuild?.role === 'owner';
               const canEdit = isOwnMessage && msg.type === 'text';

               return (
                <div key={msg.id} className={`group flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1' : 'mt-4'}`}>
                  {!isOwnMessage && !isSequence && (
                     <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2 self-end mb-1 text-indigo-600 flex-shrink-0">
                        {msg.userName ? <span className="text-xs font-bold">{msg.userName[0].toUpperCase()}</span> : <UserCircleIcon className="w-5 h-5"/>}
                     </div>
                  )}
                  {!isOwnMessage && isSequence && <div className="w-10 mr-0" />}

                  <div className={clsx(`max-w-[85%] lg:max-w-[70%] px-5 py-3 shadow-sm  text-left relative`,
                    isOwnMessage 
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                      : (theme === 'dark' ? 'bg-slate-800 text-gray-100 border-slate-700' : 'bg-white text-gray-800 border-gray-100') + ' border rounded-2xl rounded-tl-sm',
                    isSequence && isOwnMessage && 'rounded-tr-2xl',
                    isSequence && !isOwnMessage && 'rounded-tl-2xl'
                  )}>
                    {!isOwnMessage && !isSequence && <p className="text-xs font-bold text-indigo-500 mb-1">{msg.userName}</p>}
                    
                    {/* Content Rendering based on Type */}
                    {editingMessageId === msg.id ? (
                        <div className="flex gap-2 items-center">
                            <input 
                                className="bg-white/20 text-inherit p-1 rounded w-full"
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                autoFocus
                            />
                            <button onClick={() => handleEditMessage(msg.id)} className="p-1 hover:bg-white/20 rounded"><CheckIcon className="w-4 h-4" /></button>
                            <button onClick={() => setEditingMessageId(null)} className="p-1 hover:bg-white/20 rounded"><XMarkIcon className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <>
                            {msg.type === 'text' && <p className="leading-relaxed whitespace-pre-wrap flex items-end gap-2">
                                {msg.content}
                                {msg.updatedAt && msg.updatedAt !== msg.createdAt && <span className="text-[10px] opacity-60 ml-1">(edited)</span>}
                            </p>}
                        </>
                    )}
                    
                    {(msg.type === 'image' || msg.type === 'gif') && (
                        <div className="mt-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={msg.fileUrl} alt="uploaded" className="max-w-full rounded-lg max-h-60 object-cover" />
                        </div>
                    )}

                    {msg.type === 'file' && (
                        <div className="flex items-center gap-2 p-2 bg-black/10 rounded-lg">
                            <DocumentIcon className="w-8 h-8 opacity-70" />
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-medium truncate">{msg.fileName}</span>
                                <a href={msg.fileUrl} download target="_blank" className="text-xs underline opacity-75 hover:opacity-100">Download</a>
                            </div>
                        </div>
                    )}

                    {msg.type === 'poll' && msg.pollOptions && (
                        <div className="min-w-[200px]">
                            <p className="font-bold mb-3 block">{msg.pollQuestion}</p>
                            <div className="space-y-2">
                                {msg.pollOptions.map(opt => {
                                    const voteCount = opt.votes?.length || 0;
                                    const totalVotes = msg.pollOptions?.reduce((acc, o) => acc + (o.votes?.length || 0), 0) || 0;
                                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                    const hasVoted = opt.votes?.includes(user?.id || '');

                                    return (
                                        <div key={opt.id} className="relative">
                                            <button 
                                                onClick={() => handleVote(msg.id, opt.id)}
                                                className={clsx("w-full text-left relative z-10 px-3 py-2 rounded border text-sm transition-colors flex justify-between",
                                                    hasVoted 
                                                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-medium' 
                                                        : 'border-gray-300/20 hover:bg-gray-500/10'
                                                )}
                                            >
                                                <span>{opt.text}</span>
                                                <span>{percentage}%</span>
                                            </button>
                                            <div 
                                                className="absolute top-0 left-0 h-full bg-indigo-500/20 rounded z-0 transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-2 text-xs opacity-60 text-right">
                                {msg.pollOptions.reduce((acc, o) => acc + (o.votes?.length || 0), 0)} votes
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-end mt-1.5 gap-2">
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEdit && (
                                <button onClick={() => handleStartEdit(msg)} className="text-[10px] hover:underline opacity-80">Edit</button>
                            )}
                            {canDelete && (
                                <button onClick={() => handleDeleteMessage(msg.id)} className="text-[10px] hover:underline text-red-400">Delete</button>
                            )}
                         </div>
                         <div className="flex items-center gap-1">
                             <p className={`text-[10px] ${isOwnMessage ? 'text-indigo-200' : 'opacity-50'}`}>
                               {formatDate(msg.createdAt)}
                             </p>
                             {isOwnMessage && (
                                 <span title={`Seen by: ${msg.seenBy?.join(', ') || 'No one'}`}>
                                     {msg.seenBy && msg.seenBy.length > 0 
                                      ? <EyeIcon className="w-3 h-3 text-indigo-200" /> 
                                      : <CheckIcon className="w-3 h-3 text-indigo-200 opacity-50" />
                                     }
                                 </span>
                             )}
                         </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <div className={clsx("p-4 border-t sticky bottom-0 backdrop-blur-md transition-colors duration-300",
           theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-gray-200'
      )}>
        {showEmoji && (
            <div className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl">
                <EmojiPicker 
                    theme={theme === 'dark' ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                    onEmojiClick={(emojiData: EmojiClickData) => setMessage(prev => prev + emojiData.emoji)} 
                />
            </div>
        )}

        {showGif && (
             <div className="absolute bottom-20 left-12 z-50 shadow-2xl rounded-2xl overflow-hidden">
                {/* Temporary replacement to prevent crash */}
                <div className={clsx("p-4 w-64 text-center text-sm border", 
                     theme === 'dark' ? 'bg-slate-800 border-slate-700 text-gray-300' : 'bg-white border-gray-200 text-gray-500'
                )}>
                    <p className="font-bold mb-2">GIFs Unavailable</p>
                    <p className="text-xs">The Tenor API integration is currently causing crashes (likely due to an invalid API Key or limited Quota).</p>
                    <p className="text-xs mt-2 opacity-70">Please verify your NEXT_PUBLIC_TENOR_API_KEY in .env enables the <strong>Tenor API</strong> in Google Cloud Console.</p>
                </div>
            </div>
        )}

        <form onSubmit={(e) => sendMessage(e, 'text')} className="max-w-4xl mx-auto flex items-end gap-2">
            {/* Actions Menu */}
            <div className="flex gap-1 pb-2">
                 <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-full transition"
                    title="Upload File"
                >
                    <PaperClipIcon className="w-6 h-6" />
                 </button>
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload} 
                />
                 
                 <button 
                    type="button"
                    onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }} 
                    className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-slate-800 rounded-full transition"
                    title="Emojis"
                >
                    <FaceSmileIcon className="w-6 h-6" />
                 </button>

                 <button 
                    type="button"
                    onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
                    className="p-2 text-gray-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-slate-800 rounded-full transition"
                    title="GIFs"
                 >
                    <GifIcon className="w-6 h-6" />
                 </button>

                 <button 
                    type="button"
                    onClick={() => setIsPollModalOpen(true)}
                    className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-slate-800 rounded-full transition"
                    title="Create Poll"
                 >
                    <ChartBarIcon className="w-6 h-6" />
                 </button>
            </div>

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Message ${currentGuild ? '#' + currentGuild.name : 'Global Chat'}`}
            className={clsx("flex-1 py-3 px-5 bg-transparent border rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all duration-200 placeholder:text-gray-400 min-h-[50px]",
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-100 border-transparent text-gray-900 focus:bg-white'
            )}
          />
          <button 
            type="submit"
            disabled={!message.trim()}
            className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all duration-200 shadow-md hover:shadow-lg transform active:scale-95 mb-0.5"
          >
            <PaperAirplaneIcon className="w-5 h-5 translate-x-px translate-y-px" />
          </button>
        </form>
      </div>

        {/* Poll Modal */}
        {isPollModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className={clsx("w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200", 
                     theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
                )}>
                    <button 
                        onClick={() => setIsPollModalOpen(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    <h2 className="text-xl font-bold mb-4">Create a Poll</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Question</label>
                            <input 
                                type="text"
                                value={pollQuestion}
                                onChange={e => setPollQuestion(e.target.value)}
                                className={clsx("w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none",
                                    theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'
                                )}
                                placeholder="Ask something..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium">Options</label>
                            {pollOptions.map((opt, i) => (
                                <input 
                                    key={i}
                                    type="text"
                                    value={opt}
                                    onChange={e => {
                                        const newOpts = [...pollOptions];
                                        newOpts[i] = e.target.value;
                                        setPollOptions(newOpts);
                                    }}
                                    className={clsx("w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none",
                                        theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'
                                    )}
                                    placeholder={`Option ${i + 1}`}
                                />
                            ))}
                            <button 
                                onClick={() => setPollOptions([...pollOptions, ''])}
                                className="text-sm text-indigo-500 hover:underline font-medium"
                            >
                                + Add Option
                            </button>
                        </div>

                        <button 
                            onClick={handleCreatePoll}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition duration-300 mt-2"
                        >
                            Create Poll
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Guild Modals */}
        {/* Create/Join Modal Wrapper */}
        {isGuildModalOpen && (
             <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className={clsx("w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200", 
                     theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'
                )}>
                    <button 
                        onClick={() => setIsGuildModalOpen(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                    
                    <div className="space-y-6">
                        {/* Create Section */}
                        <div>
                             <h2 className="text-xl font-bold mb-3">Create New Server</h2>
                             <div className="flex gap-2">
                                 <input 
                                    className={clsx("flex-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500",
                                        theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'
                                    )}
                                    placeholder="Server Name"
                                    value={newGuildName}
                                    onChange={e => setNewGuildName(e.target.value)}
                                 />
                                 <button onClick={handleCreateGuild} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">Create</button>
                             </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1"/>
                            <span className="text-xs text-gray-400 font-medium">OR JOIN EXISTING</span>
                            <div className="h-px bg-gray-200 dark:bg-slate-700 flex-1"/>
                        </div>

                        {/* Join Section */}
                        <div>
                             <h2 className="text-xl font-bold mb-3">Join Server</h2>
                             <div className="flex gap-2">
                                 <input 
                                    className={clsx("flex-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500",
                                        theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-300'
                                    )}
                                    placeholder="Invite Code (e.g. abcd-1234)"
                                    value={joinCode}
                                    onChange={e => setJoinCode(e.target.value)}
                                 />
                                 <button onClick={handleJoinGuild} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold">Join</button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}

