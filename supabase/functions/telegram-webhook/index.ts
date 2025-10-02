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

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
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

      // Find user profile by telegram_chat_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("telegram_chat_id", chat.id.toString())
        .single();

      if (profileError || !profile) {
        console.log("User not linked to Telegram chat:", chat.id);
        
        // Send instructions to link account
        await sendTelegramMessage(
          chat.id,
          "Welcome to DeFiLance! Please link your account by providing your Telegram username in your profile settings on the web app."
        );
        
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // TODO: Implement message routing
      // 1. Parse the message to determine if it's a reply to a specific conversation
      // 2. Save message to the messages table
      // 3. Notify the recipient via real-time subscription
      
      console.log("Message from linked user:", profile.id, "Message:", text);

      // Example: Save message to database
      // const { error: messageError } = await supabase
      //   .from("messages")
      //   .insert({
      //     conversation_id: "[conversation_id]",
      //     sender_id: profile.id,
      //     content: text,
      //     telegram_message_id: message_id.toString(),
      //   });

      // Send acknowledgment
      await sendTelegramMessage(
        chat.id,
        "Message received! This feature is coming soon. 🚀"
      );
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
