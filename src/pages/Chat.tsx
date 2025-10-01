import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import {
  Send,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  Search,
} from "lucide-react";

const Chat = () => {
  const [message, setMessage] = useState("");

  const conversations = [
    {
      id: 1,
      name: "Client A",
      address: "0x742d...3a9f",
      lastMessage: "Thanks for the update!",
      time: "2m ago",
      unread: 2,
      online: true,
    },
    {
      id: 2,
      name: "Client B",
      address: "0x8b1c...4f2e",
      lastMessage: "Can we schedule a call?",
      time: "1h ago",
      unread: 0,
      online: false,
    },
    {
      id: 3,
      name: "Client C",
      address: "0x3c5d...7a8b",
      lastMessage: "Perfect, approved!",
      time: "3h ago",
      unread: 0,
      online: true,
    },
  ];

  const messages = [
    {
      id: 1,
      sender: "them",
      text: "Hi! I reviewed your proposal for the DeFi project. Looks great!",
      time: "10:30 AM",
    },
    {
      id: 2,
      sender: "me",
      text: "Thanks! Happy to answer any questions you might have.",
      time: "10:32 AM",
    },
    {
      id: 3,
      sender: "them",
      text: "What's your timeline for the first milestone?",
      time: "10:35 AM",
    },
    {
      id: 4,
      sender: "me",
      text: "I can deliver the UI mockups and smart contract architecture within 5 days.",
      time: "10:37 AM",
    },
    {
      id: 5,
      sender: "them",
      text: "Perfect! Let's move forward. I'll create the escrow contract now.",
      time: "10:40 AM",
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-4 px-4">
        <div className="container mx-auto">
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2">Messages</h1>
            <p className="text-muted-foreground">
              Chat with clients and freelancers
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-240px)]">
            {/* Conversations List */}
            <Card className="lg:col-span-4 glass-card shadow-card overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="p-4 border-b border-border hover:bg-muted/50 cursor-pointer transition-smooth"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarFallback>{conv.name[0]}</AvatarFallback>
                        </Avatar>
                        {conv.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold truncate">{conv.name}</span>
                          <span className="text-xs text-muted-foreground">{conv.time}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage}
                          </p>
                          {conv.unread > 0 && (
                            <Badge className="ml-2">{conv.unread}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Chat Window */}
            <Card className="lg:col-span-8 glass-card shadow-card overflow-hidden flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>CA</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
                  </div>
                  <div>
                    <div className="font-bold">Client A</div>
                    <div className="text-sm text-muted-foreground">0x742d...3a9f</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender === "me"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p>{msg.text}</p>
                      <span className="text-xs opacity-70 mt-1 block">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        setMessage("");
                      }
                    }}
                    className="flex-1"
                  />
                  <Button size="icon" className="shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Messages sync with Telegram. Get notified and reply from anywhere!
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
