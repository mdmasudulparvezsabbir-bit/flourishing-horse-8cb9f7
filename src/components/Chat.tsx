import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { User, Room, Message } from "../types";
import { Send, Hash, Plus, MessageCircle, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";

interface ChatProps {
  user: User;
}

export function Chat({ user }: ChatProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabase) return;
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!supabase || !activeRoom) return;
    
    fetchMessages(activeRoom.id);
    
    // Subscribe to real-time messages for the active room
    const channel = supabase
      .channel(`room-${activeRoom.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `room_id=eq.${activeRoom.id}`,
          },
          (payload: any) => {
            const msg = payload.new as Message;
            // Fetch user info for the new message
            fetchUserInfo(msg.userId).then((userData) => {
              setMessages((prev) => [...prev, { ...msg, user: userData }]);
            });
          }
        )
        .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [activeRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchRooms = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rooms:', error);
    } else {
      setRooms(data || []);
      if (data && data.length > 0 && !activeRoom) {
        setActiveRoom(data[0]);
      }
    }
  };

  const fetchMessages = async (roomId: string) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        user:users(*)
      `)
      .eq('room_id', roomId)
      .order('inserted_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const fetchUserInfo = async (userId: string) => {
    if (!supabase) return undefined;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) return undefined;
    return data;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom || !supabase) return;

    const messageData = {
      room_id: activeRoom.id,
      user_id: user.id,
      body: newMessage.trim(),
    };

    const { error } = await supabase
      .from('messages')
      .insert([messageData]);

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage("");
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !supabase) return;

    const { data, error } = await supabase
      .from('rooms')
      .insert([{ name: newRoomName.trim() }])
      .select()
      .single();

    if (error) {
      console.error('Error creating room:', error);
    } else {
      setRooms([data, ...rooms]);
      setActiveRoom(data);
      setNewRoomName("");
      setShowCreateRoom(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-slate-900/50 rounded-xl overflow-hidden backdrop-blur-md border border-white/10">
      {/* Sidebar - Room List */}
      <motion.div 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0 }}
        className="bg-slate-950/50 border-r border-white/10 flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-400" />
            Channels
          </h2>
          <button 
            onClick={() => setShowCreateRoom(true)}
            className="p-1 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-white"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setActiveRoom(room)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all mb-1 ${
                activeRoom?.id === room.id 
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" 
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Hash className="w-4 h-4" />
              <span className="truncate">{room.name}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Chat Header */}
        <div className="p-4 border-b border-white/10 bg-slate-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 hover:bg-white/10 rounded-md transition-colors text-slate-400 md:hidden"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            {activeRoom ? (
              <div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <Hash className="w-5 h-5 text-indigo-400" />
                  {activeRoom.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {messages.length} messages
                </p>
              </div>
            ) : (
              <h3 className="text-lg font-medium text-slate-400">Select a channel</h3>
            )}
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((message, index) => {
            const isMe = message.userId === user.id;
            const showAvatar = index === 0 || messages[index - 1].userId !== message.userId;
            
            return (
              <div 
                key={message.id} 
                className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 overflow-hidden ${!showAvatar ? "opacity-0" : ""}`}>
                  {message.user?.photo ? (
                    <img src={message.user.photo} alt={message.user.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div className={`max-w-[70%] space-y-1 ${isMe ? "items-end" : "items-start"}`}>
                  {showAvatar && (
                    <div className={`flex items-center gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                      <span className="text-xs font-semibold text-slate-300">
                        {message.user?.name || "Unknown User"}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {format(new Date(message.insertedAt), "h:mm a")}
                      </span>
                    </div>
                  )}
                  <div className={`px-4 py-2 rounded-2xl text-sm ${
                    isMe 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-slate-800 text-slate-200 rounded-tl-none border border-white/5"
                  }`}>
                    {message.body}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 bg-slate-900/30 border-t border-white/10">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={activeRoom ? `Message #${activeRoom.name}` : "Select a channel to chat"}
              disabled={!activeRoom}
              className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
            <button
              type="submit"
              disabled={!activeRoom || !newMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-4 py-3 rounded-xl transition-all flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Create Room Modal */}
      <AnimatePresence>
        {showCreateRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Create Channel</h3>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Channel Name</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      autoFocus
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g. general"
                      className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateRoom(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all font-medium"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
