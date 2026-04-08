import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ChatRoom, ChatMessage } from '../types';
import { MessageCircle, Send, ArrowLeft, Headphones } from 'lucide-react';

const QUICK_MESSAGES = [
  "I'm on my way.",
  "I've arrived.",
  "Where should I set up?",
  "Running a few minutes late.",
  "Everything is going well!",
];

export default function ChatPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadRooms();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (eventId && rooms.length > 0) {
      const eventRoom = rooms.find(r => r.event_id === eventId);
      if (eventRoom) setSelectedRoom(eventRoom);
    }
  }, [eventId, rooms]);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => loadMessages(selectedRoom.id), 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedRoom?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadRooms = async () => {
    try {
      const data = await api.get<ChatRoom[]>('/api/chat/rooms');
      setRooms(data);
    } catch {
      // no rooms yet
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const data = await api.get<ChatMessage[]>(`/api/chat/rooms/${roomId}/messages`);
      setMessages(data);
    } catch {
      // error loading messages
    }
  };

  const sendMessage = async (text: string, isQuick = false) => {
    if (!selectedRoom || !text.trim()) return;
    try {
      await api.post(`/api/chat/rooms/${selectedRoom.id}/messages`, {
        message: text.trim(),
        is_quick_message: isQuick,
      });
      setNewMessage('');
      setShowQuickMessages(false);
      loadMessages(selectedRoom.id);
    } catch {
      // error sending
    }
  };

  const createSupportChat = async () => {
    try {
      const room = await api.post<ChatRoom>('/api/chat/support', {
        subject: 'Support Request',
      });
      setRooms(prev => {
        if (prev.find(r => r.id === room.id)) return prev;
        return [...prev, room];
      });
      setSelectedRoom(room);
    } catch {
      // error creating support chat
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Chat room view
  if (selectedRoom) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
          <button onClick={() => setSelectedRoom(null)} className="p-1 hover:bg-gray-100 rounded">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-semibold text-gray-900">{selectedRoom.name || 'Chat'}</h2>
            <p className="text-xs text-gray-500">{selectedRoom.members.join(', ')}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No messages yet. Say hello!</p>
          )}
          {messages.map(msg => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isMine
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  {!isMine && (
                    <p className={`text-xs font-medium mb-1 ${isMine ? 'text-indigo-200' : 'text-indigo-600'}`}>
                      {msg.sender_name}
                    </p>
                  )}
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick messages */}
        {showQuickMessages && (
          <div className="border-t border-gray-100 py-2 flex flex-wrap gap-2">
            {QUICK_MESSAGES.map(qm => (
              <button
                key={qm}
                onClick={() => sendMessage(qm, true)}
                className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100"
              >
                {qm}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 pt-3 flex gap-2">
          <button
            onClick={() => setShowQuickMessages(!showQuickMessages)}
            className={`p-2 rounded-lg ${showQuickMessages ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            title="Quick messages"
          >
            <MessageCircle size={20} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(newMessage)}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => sendMessage(newMessage)}
            disabled={!newMessage.trim()}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Room list view
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        <button
          onClick={createSupportChat}
          className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
        >
          <Headphones size={16} />
          Support
        </button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No conversations yet</p>
          <p className="text-gray-400 text-xs mt-1">Chat rooms are created when workers are assigned to your events</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              className="w-full text-left bg-white rounded-xl p-4 border border-gray-200 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">{room.name || 'Chat'}</h3>
                    {room.room_type === 'support' && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Support</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {room.last_message || 'No messages yet'}
                  </p>
                </div>
                {room.unread_count > 0 && (
                  <span className="ml-2 bg-indigo-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                    {room.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
