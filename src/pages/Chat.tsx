import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Search, MoreVertical, Phone, Video, Check, CheckCheck } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Chat = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { getConversations, getMessages, sendMessage: sendMsg, subscribeToMessages } = useMessages();

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      setSelectedConversation(conversationId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      markMessagesAsRead(selectedConversation);
      const unsubscribe = subscribeToMessages(selectedConversation, (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
        scrollToBottom();
        markMessagesAsRead(selectedConversation);
      });
      return unsubscribe;
    }
  }, [selectedConversation]);

  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);
    
    if (!error) {
      // Reload conversations to update unread indicators
      loadConversations();
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    const data = await getConversations();
    setConversations(data);
    if (data.length > 0 && !selectedConversation) {
      setSelectedConversation(data[0].id);
    }
  };

  const loadMessages = async () => {
    if (selectedConversation) {
      const data = await getMessages(selectedConversation);
      setMessages(data);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !selectedConversation) return;
    
    const result = await sendMsg(selectedConversation, currentMessage);
    if (result) {
      setCurrentMessage("");
      setMessages(prev => [...prev, result]);
    }
  };

  const selectedConv = selectedConversation 
    ? conversations.find(c => c.id === selectedConversation)
    : null;

  const getOtherParticipant = (conv: any) => {
    if (!user) return null;
    return conv.participant1?.id === user.id ? conv.participant2 : conv.participant1;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Messages
          </h1>
          <p className="text-muted-foreground">Connect with clients and freelancers</p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <Card className="lg:col-span-1 p-0 bg-card/50 backdrop-blur overflow-hidden">
            <div className="p-4 border-b bg-card/80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-250px)]">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No conversations yet
                </div>
              ) : conversations.map((conv) => {
                const other = getOtherParticipant(conv);
                if (!other) return null;
                const lastMsg = conv.messages?.[0];
                const hasUnread = conv.messages?.some((m: any) => !m.is_read && m.sender_id !== user?.id);
                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`p-4 border-b cursor-pointer transition-all hover:bg-accent/50 ${
                      selectedConversation === conv.id ? "bg-accent/30 border-l-4 border-l-primary" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {other.display_name?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={`font-semibold truncate ${hasUnread ? 'text-foreground' : ''}`}>
                            {other.display_name || 'Unknown User'}
                          </h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {lastMsg?.content || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
          
          {/* Chat Window */}
          {!selectedConv ? (
            <Card className="lg:col-span-2 p-8 flex items-center justify-center h-[calc(100vh-200px)] bg-card/50 backdrop-blur">
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
            </Card>
          ) : (
            <Card className="lg:col-span-2 p-0 flex flex-col h-[calc(100vh-200px)] bg-card/50 backdrop-blur overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b bg-card/80 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        const other = getOtherParticipant(selectedConv);
                        if (other?.id) navigate(`/profile/${other.id}`);
                      }}
                    >
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getOtherParticipant(selectedConv)?.display_name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 
                        className="text-xl font-semibold cursor-pointer hover:underline"
                        onClick={() => {
                          const other = getOtherParticipant(selectedConv);
                          if (other?.id) navigate(`/profile/${other.id}`);
                        }}
                      >
                        {getOtherParticipant(selectedConv)?.display_name || 'Unknown User'}
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="hover:bg-accent">
                      <Phone className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:bg-accent">
                      <Video className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:bg-accent">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/20">
                {messages.map((msg) => {
                  const isOwn = user && msg.sender_id === user.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${
                          isOwn
                            ? "bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-br-sm"
                            : "bg-card rounded-bl-sm"
                        }`}
                      >
                        {!isOwn && msg.sender && (
                          <p 
                            className="text-xs font-semibold mb-1 opacity-70 cursor-pointer hover:opacity-100"
                            onClick={() => msg.sender_id && navigate(`/profile/${msg.sender_id}`)}
                          >
                            {msg.sender.display_name}
                          </p>
                        )}
                        <p className="leading-relaxed">{msg.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                          {isOwn && (
                            msg.is_read ? (
                              <CheckCheck className="w-3 h-3 opacity-70" />
                            ) : (
                              <Check className="w-3 h-3 opacity-70" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t bg-card/80 backdrop-blur">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 bg-background"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    className="shadow-glow hover-scale"
                    disabled={!currentMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Chat;
