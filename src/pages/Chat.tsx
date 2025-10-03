import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Search, MoreVertical, Phone, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Chat = () => {
  const [currentMessage, setCurrentMessage] = useState("");
  const [selectedConversation, setSelectedConversation] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;
    
    try {
      // TODO: Call MongoDB edge function to send message
      // const { data, error } = await supabase.functions.invoke('mongodb-messages', {
      //   body: { 
      //     action: 'send', 
      //     data: { 
      //       conversationId: selectedConversation, 
      //       senderId: user.id,
      //       content: currentMessage 
      //     } 
      //   }
      // });
      
      console.log('Sending message:', currentMessage);
      setCurrentMessage("");
      toast({
        title: "Message sent",
        description: "Your message has been delivered"
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const conversations = [
    {
      id: "1",
      name: "Alice Johnson",
      lastMessage: "Sounds good! Let's finalize the contract.",
      time: "2m ago",
      unread: 2,
      avatar: "AJ",
      online: true
    },
    {
      id: "2",
      name: "Bob Smith",
      lastMessage: "Can we schedule a call tomorrow?",
      time: "1h ago",
      unread: 0,
      avatar: "BS",
      online: false
    },
    {
      id: "3",
      name: "Carol White",
      lastMessage: "The mockups look great!",
      time: "3h ago",
      unread: 1,
      avatar: "CW",
      online: true
    },
  ];

  const messages = [
    {
      id: "1",
      sender: "Alice Johnson",
      content: "Hi! I reviewed your proposal for the DeFi dashboard project.",
      time: "10:30 AM",
      isOwn: false,
    },
    {
      id: "2",
      sender: "You",
      content: "Great! I'm excited to work on this. When can we start?",
      time: "10:32 AM",
      isOwn: true,
    },
    {
      id: "3",
      sender: "Alice Johnson",
      content: "We can start next Monday. I'll send over the contract details.",
      time: "10:35 AM",
      isOwn: false,
    },
    {
      id: "4",
      sender: "You",
      content: "Perfect! I'll prepare the initial mockups by then.",
      time: "10:37 AM",
      isOwn: true,
    },
    {
      id: "5",
      sender: "Alice Johnson",
      content: "Sounds good! Let's finalize the contract.",
      time: "10:40 AM",
      isOwn: false,
    },
  ];

  const selectedConv = conversations.find(c => c.id === selectedConversation);

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
              {conversations.map((conv) => (
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
                          {conv.avatar}
                        </AvatarFallback>
                      </Avatar>
                      {conv.online && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-success rounded-full border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold truncate">{conv.name}</h3>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">{conv.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                    </div>
                    {conv.unread > 0 && (
                      <Badge className="bg-primary text-primary-foreground shrink-0">
                        {conv.unread}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
          
          {/* Chat Window */}
          <Card className="lg:col-span-2 p-0 flex flex-col h-[calc(100vh-200px)] bg-card/50 backdrop-blur overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b bg-card/80 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {selectedConv?.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedConv?.name}</h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      {selectedConv?.online ? (
                        <>
                          <span className="h-2 w-2 bg-success rounded-full" />
                          Online
                        </>
                      ) : (
                        "Offline"
                      )}
                    </p>
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
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isOwn ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-2xl shadow-sm ${
                      msg.isOwn
                        ? "bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-br-sm"
                        : "bg-card rounded-bl-sm"
                    }`}
                  >
                    {!msg.isOwn && (
                      <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender}</p>
                    )}
                    <p className="leading-relaxed">{msg.content}</p>
                    <span className="text-xs opacity-70 mt-2 block">{msg.time}</span>
                  </div>
                </div>
              ))}
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
        </div>
      </main>
    </div>
  );
};

export default Chat;
