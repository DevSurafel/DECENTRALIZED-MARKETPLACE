import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useMessages = () => {
  const [loading, setLoading] = useState(false);

  const getConversations = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant1:profiles!conversations_participant_1_id_fkey(id, display_name, avatar_url),
          participant2:profiles!conversations_participant_2_id_fkey(id, display_name, avatar_url),
          messages(id, content, created_at, is_read, sender_id)
        `)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getMessages = async (conversationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(display_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (conversationId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Get conversation details to find recipient
      const { data: conv } = await supabase
        .from("conversations")
        .select("participant_1_id, participant_2_id")
        .eq("id", conversationId)
        .single();

      if (conv) {
        const recipientId = conv.participant_1_id === user.id 
          ? conv.participant_2_id 
          : conv.participant_1_id;

        // Get sender profile
        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        // Send Telegram notification
        try {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: recipientId,
              message: content,
              sender_name: senderProfile?.display_name || 'Someone'
            }
          });
        } catch (telegramError) {
          console.error("Failed to send Telegram notification:", telegramError);
          // Don't fail the message send if Telegram fails
        }
      }

      return message;
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return null;
    }
  };

  const createConversation = async (participantId: string, jobId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to start a conversation",
          variant: "destructive"
        });
        return null;
      }

      // Prevent users from creating conversations with themselves
      if (user.id === participantId) {
        toast({
          title: "Invalid action",
          description: "You cannot start a conversation with yourself",
          variant: "destructive"
        });
        return null;
      }

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1_id.eq.${user.id},participant_2_id.eq.${participantId}),and(participant_1_id.eq.${participantId},participant_2_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) return existing.id;

      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          participant_1_id: user.id,
          participant_2_id: participantId,
          job_id: jobId
        }])
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
      return null;
    }
  };

  const subscribeToMessages = (conversationId: string, callback: (message: any) => void) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => callback(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    getConversations,
    getMessages,
    sendMessage,
    createConversation,
    subscribeToMessages,
    loading
  };
};
