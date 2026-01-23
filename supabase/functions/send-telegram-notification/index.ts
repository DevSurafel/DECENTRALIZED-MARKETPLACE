// ============================================
// SEND TELEGRAM NOTIFICATION
// ============================================
// Sends Telegram notifications when users receive new messages
// Called from frontend via: supabase.functions.invoke('send-telegram-notification', { body: {...} })
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CRITICAL: Use external DFM Supabase if available
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("EXTERNAL_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate bot token
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is missing in environment");
    return new Response(
      JSON.stringify({ error: "Bot token not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body;
  try {
    body = await req.json();
  } catch (e) {
    console.error("Invalid JSON payload:", e);
    return new Response(
      JSON.stringify({ error: "Invalid JSON" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const {
    recipient_id,
    message,
    sender_name,
    sender_id,
    conversation_id,
    url,
    button_text,
  } = body;

  if (!recipient_id || !message) {
    return new Response(
      JSON.stringify({ error: "recipient_id and message are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Get recipient's Telegram chat ID
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", recipient_id)
      .single();

    if (profileErr || !profile?.telegram_chat_id) {
      console.log("No Telegram linked for user:", recipient_id);
      return new Response(
        JSON.stringify({ success: false, message: "User has no Telegram linked" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chatId = parseInt(profile.telegram_chat_id);

    // Build notification text
    const notificationText = sender_name
      ? `New message from *${sender_name}*:\n\n${message}`
      : `New message:\n\n${message}`;

    // Send via Telegram
    const tgResult = await sendTelegramMessage(
      chatId,
      notificationText,
      sender_name ? sender_name.split(" ")[0] : "user",
      url,
      button_text
    );

    if (!tgResult.ok) {
      console.error("Telegram API error:", tgResult);
      return new Response(
        JSON.stringify({ success: false, error: tgResult }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Telegram notification sent to chat:", chatId);

    // Update last_notified_conversation_id
    if (conversation_id) {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ last_notified_conversation_id: conversation_id })
        .eq("id", recipient_id);

      if (updateErr) {
        console.error("Failed to update last_notified_conversation_id:", updateErr);
        // Don't fail the whole thing
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("FATAL ERROR in send-telegram-notification:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: Send message to Telegram
async function sendTelegramMessage(
  chatId: number,
  text: string,
  senderUsername: string,
  detailsUrl?: string,
  buttonText?: string
): Promise<any> {
  const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const messageBody: any = {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  };

  const inline_keyboard: any[] = [];

  // View Details button
  if (detailsUrl) {
    inline_keyboard.push([
      {
        text: buttonText || "View Details",
        url: detailsUrl,
      },
    ]);
  }

  // Reply button
  if (senderUsername && senderUsername !== "user") {
    inline_keyboard.push([
      {
        text: "Reply",
        switch_inline_query_current_chat: `@${senderUsername} `,
      },
    ]);
  }

  if (inline_keyboard.length > 0) {
    messageBody.reply_markup = { inline_keyboard };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messageBody),
  });

  return await response.json();
}
