// ============================================
// SEND TELEGRAM NOTIFICATION
// ============================================
// This edge function sends notifications to users via Telegram
// when they receive new messages in the DeFiLance platform
// 
// USAGE:
// Call this function from your frontend when a new message is sent
// Example:
// supabase.functions.invoke('send-telegram-notification', {
//   body: { 
//     recipient_id: '[user_id]',
//     message: 'You have a new message from [sender]'
//   }
// })
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// TODO: Replace with your actual Telegram bot token
// Get it from @BotFather on Telegram
// Example: const TELEGRAM_BOT_TOKEN = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "YOUR_TELEGRAM_BOT_TOKEN_HERE";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { recipient_id, message, sender_name } = await req.json();

    if (!recipient_id || !message) {
      throw new Error("recipient_id and message are required");
    }

    // Get recipient's Telegram chat ID
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("telegram_chat_id, telegram_username")
      .eq("id", recipient_id)
      .single();

    if (error || !profile?.telegram_chat_id) {
      console.log("User does not have Telegram linked:", recipient_id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "User does not have Telegram linked" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notification via Telegram
    if (TELEGRAM_BOT_TOKEN) {
      const notificationText = sender_name 
        ? `💬 New message from ${sender_name}:\n\n${message}`
        : `💬 New message:\n\n${message}`;

      await sendTelegramMessage(
        parseInt(profile.telegram_chat_id),
        notificationText
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
    }),
  });

  return await response.json();
}
