import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONGODB_URI = Deno.env.get('MONGODB_URI') || "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>";
const DB_NAME = "defilance";
const COLLECTION_NAME = "messages";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data, conversationId, userId } = await req.json();

    console.log(`MongoDB Messages API - Action: ${action}`);
    
    switch (action) {
      case 'send':
        const newMessage = {
          _id: crypto.randomUUID(),
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content,
          timestamp: new Date().toISOString(),
          read: false
        };
        console.log('Sending message:', newMessage);
        return new Response(
          JSON.stringify({ success: true, message: newMessage }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'getConversations':
        const mockConversations = [
          {
            _id: '1',
            participants: [userId, 'user-2'],
            lastMessage: 'Thanks for the update!',
            lastMessageTime: new Date().toISOString(),
            unreadCount: 2,
            otherUser: {
              name: 'Alice Johnson',
              avatar: null,
              online: true
            }
          },
          {
            _id: '2',
            participants: [userId, 'user-3'],
            lastMessage: 'When can we start?',
            lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
            unreadCount: 0,
            otherUser: {
              name: 'Bob Smith',
              avatar: null,
              online: false
            }
          }
        ];
        return new Response(
          JSON.stringify({ success: true, conversations: mockConversations }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'getMessages':
        const mockMessages = [
          {
            _id: '1',
            senderId: 'user-2',
            content: 'Hi! I saw your project and I\'m interested.',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            read: true
          },
          {
            _id: '2',
            senderId: userId,
            content: 'Great! Can you share your portfolio?',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: true
          },
          {
            _id: '3',
            senderId: 'user-2',
            content: 'Sure! Here\'s my recent work: [link]',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            read: false
          }
        ];
        return new Response(
          JSON.stringify({ success: true, messages: mockMessages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'markAsRead':
        return new Response(
          JSON.stringify({ success: true, message: 'Messages marked as read' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'createConversation':
        const newConversation = {
          _id: crypto.randomUUID(),
          participants: [data.userId1, data.userId2],
          createdAt: new Date().toISOString(),
          messages: []
        };
        return new Response(
          JSON.stringify({ success: true, conversation: newConversation }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in mongodb-messages function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/*
  REAL-TIME MESSAGING INTEGRATION:
  
  For real-time messaging, consider integrating with:
  
  1. MongoDB Change Streams:
     - Watch for new messages in real-time
     - Notify connected clients via WebSocket
  
  2. Socket.IO or WebSocket:
     - Set up WebSocket server for instant message delivery
     - Connect frontend to WebSocket endpoint
  
  3. Example WebSocket Integration:
     import { WebSocketServer } from "https://deno.land/x/websocket/mod.ts";
     
     const wss = new WebSocketServer(8080);
     wss.on("connection", (ws) => {
       ws.on("message", async (message) => {
         // Save to MongoDB and broadcast to participants
       });
     });
*/
