'use client'

import { useEffect, useState, useRef } from 'react'
import { useUser, UserButton } from '@clerk/nextjs'
import { useChatStore } from '@/store/chatStore'
import { pusherClient } from '@/lib/pusher'
import EmojiPicker from 'emoji-picker-react'

interface Message {
  id: string;
  content: string;
  userId: string;
  userName?: string;
  createdAt: string;
}

export default function ChatPage() {
  const { user } = useUser()
  const [message, setMessage] = useState('')
  const { messages, addMessage, setMessages } = useChatStore()
  const messagesEndRef = useRef<null | HTMLDivElement>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  useEffect(() => {
    const channel = pusherClient.subscribe('chat')
    channel.bind('new-message', (newMessage: Omit<Message, 'createdAt'> & { createdAt: string }) => {
      addMessage({
        ...newMessage,
        createdAt: new Date(newMessage.createdAt).toISOString(),
        userName: newMessage.userName || ''
      })
    })

    return () => {
      pusherClient.unsubscribe('chat')
    }
  }, [addMessage])

  useEffect(() => {
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => {
        setMessages(data.map((msg: Message) => ({
          ...msg,
          createdAt: new Date(msg.createdAt).toISOString()
        })))
      })
  }, [setMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: message }),
    })

    if (response.ok) {
      setMessage('')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
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

  const handleEmojiClick = (emojiObject: any) => {
    setMessage(prevMessage => prevMessage + emojiObject.emoji)
    setShowEmojiPicker(false)
  }

  const groupedMessages = groupMessagesByDate(messages)

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-indigo-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-2xl font-bold">Nexus Chat</h1>
        <div className="flex items-center space-x-4">
          {user && (
            <>
              <span className="text-sm">{user.fullName}</span>
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-10 h-10'
                  }
                }}
              />
            </>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <div className="text-center my-4">
              <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded-full text-sm">
                {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            {msgs.map((msg) => (
              <div key={msg.id} className={`flex ${msg.userId === user?.id ? 'justify-end' : 'justify-start'} mb-4`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.userId === user?.id ? 'bg-indigo-500 text-white' : 'bg-white text-gray-800'
                } shadow`}>
                  <p className="font-semibold text-sm mb-1">{msg.userName}</p>
                  <p>{msg.content}</p>
                  <p className="text-xs mt-1 opacity-75">{formatDate(msg.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>
      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 right-0 z-10">
                <EmojiPicker onEmojiClick={handleEmojiClick} />
              </div>
            )}
          </div>
          <button 
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-300"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
