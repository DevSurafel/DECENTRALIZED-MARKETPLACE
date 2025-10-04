// ============================================
// TELEGRAM BOT WEBHOOK HANDLER
// ============================================
// This edge function handles incoming messages from Telegram bot
// and syncs them with the DeFiLance messaging system
// 
// SETUP INSTRUCTIONS:
// 1. Create a bot via @BotFather on Telegram and get your bot token
// 2. Add TELEGRAM_BOT_TOKEN to your secrets
// 3. Set webhook URL to: https://[your-project].supabase.co/functions/v1/telegram-webhook
// 4. Use this command: https://api.telegram.org/bot[TOKEN]/setWebhook?url=[WEBHOOK_URL]
// 
// FEATURES:
// - Receive messages from Telegram and save to database
// - Send notifications when new messages arrive in app
// - Bidirectional sync between Telegram and web chat
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// TODO: Replace YOUR_TELEGRAM_BOT_TOKEN_HERE with your actual bot token
// OR add TELEGRAM_BOT_TOKEN to Lovable Secrets (Settings > Secrets)
// Get your bot token from @BotFather on Telegram
// Example: "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "YOUR_TELEGRAM_BOT_TOKEN_HERE";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const update = await req.json();

    console.log("Received Telegram update:", update);

    // Process incoming message from Telegram
    if (update.message) {
      const { chat, from, text, message_id } = update.message;
      const username = from.username || '';

      // Find user by telegram username or chat_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, telegram_chat_id")
        .or(`telegram_chat_id.eq.${chat.id},telegram_username.ilike.%${username}%`)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return new Response(JSON.stringify({ error: "Database error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!profile) {
        // User not found, send instructions
        await sendTelegramMessage(
          chat.id,
          "👋 Welcome to DeFiLance Bot!\n\n" +
          "To link your account:\n" +
          "1. Sign up on DeFiLance platform\n" +
          "2. Add your Telegram username (@" + username + ") during registration or in your profile\n" +
          "3. Come back here and send /start\n\n" +
          "You'll then receive real-time notifications for messages and jobs!"
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update chat_id if not set or different
      if (!profile.telegram_chat_id || profile.telegram_chat_id !== chat.id.toString()) {
        await supabase
          .from("profiles")
          .update({ telegram_chat_id: chat.id.toString() })
          .eq("id", profile.id);
        
        await sendTelegramMessage(
          chat.id,
          "✅ You are authorized!\n\n" +
          "Now you will receive notifications from the site DeFiLance directly in this chat."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Message from linked user:", profile.id, "Message:", text);

      // Get user's most recent conversation
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id")
        .or(`participant_1_id.eq.${profile.id},participant_2_id.eq.${profile.id}`)
        .order("last_message_at", { ascending: false })
        .limit(1);

      if (convError || !conversations || conversations.length === 0) {
        await sendTelegramMessage(
          chat.id,
          "No active conversations found. Please start a conversation on the platform first."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const conversationId = conversations[0].id;

      // Save message to database
      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          content: text,
          telegram_message_id: message_id.toString(),
        });

      if (messageError) {
        console.error("Error saving message:", messageError);
        await sendTelegramMessage(
          chat.id,
          "Failed to send message. Please try again."
        );
      } else {
        // Update conversation last message time
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);

        await sendTelegramMessage(
          chat.id,
          "✅ Message sent successfully!"
        );
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper function to send messages via Telegram API
async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });

    const result = await response.json();
    console.log("Telegram send result:", result);
    return result;
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
}
