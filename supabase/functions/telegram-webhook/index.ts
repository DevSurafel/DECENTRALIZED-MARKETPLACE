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

      // Handle /start command to link account
      if (text?.startsWith('/start')) {
        // Support deep-link payload: /start <user_id>
        const parts = text.split(' ');
        const payloadUserId = parts.length > 1 ? parts[1] : undefined;

        if (payloadUserId) {
          // Link by supplied user id from deep link
          const { data: profileById, error: byIdErr } = await supabase
            .from('profiles')
            .select('id, display_name, telegram_chat_id, telegram_username')
            .eq('id', payloadUserId)
            .maybeSingle();

          if (byIdErr) {
            console.error('Error fetching profile by id:', byIdErr);
            await sendTelegramMessage(chat.id, '❌ Database error. Please try again later.');
          } else if (!profileById) {
            await sendTelegramMessage(chat.id, '⚠️ Account not found for this link. Please open your Profile in the app and try again.');
          } else {
            await supabase
              .from('profiles')
              .update({ telegram_chat_id: chat.id.toString(), telegram_username: profileById.telegram_username || username })
              .eq('id', profileById.id);

            await sendTelegramMessage(
              chat.id,
              '✅ You are authorized!\n\nYour Telegram account is now linked to DeFiLance. You will receive notifications for new messages and updates.'
            );
          }

          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fallback: Find user by telegram username
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, telegram_chat_id, telegram_username')
          .eq('telegram_username', username)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          await sendTelegramMessage(
            chat.id,
            '❌ Database error. Please try again later.'
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!profile) {
          // User not found, send instructions
          await sendTelegramMessage(
            chat.id,
            '👋 Welcome to DeFiLance Bot!\n\n' +
            'To link your account:\n' +
            '1. Sign in on DeFiLance\n' +
            "2. Go to your Profile > Connect Bot\n" +
            '3. Tap the button to open Telegram and press Start\n\n' +
            'Alternatively, update your Telegram username in your profile and send /start again.'
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update chat_id and confirm authorization
        await supabase
          .from('profiles')
          .update({ telegram_chat_id: chat.id.toString() })
          .eq('id', profile.id);
        
        await sendTelegramMessage(
          chat.id,
          '✅ You are authorized!\n\n' +
          'Your Telegram account is now linked to DeFiLance.\n' +
          'You will receive notifications for:\n' +
          '• New messages\n' +
          '• Job updates\n' +
          '• Bid responses\n\n' +
          'Stay connected and never miss an opportunity! 🚀'
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // For regular messages, find user by telegram chat_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, telegram_chat_id, telegram_username")
        .eq("telegram_chat_id", chat.id.toString())
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!profile) {
        await sendTelegramMessage(
          chat.id,
          "⚠️ Your account is not linked. Please send /start to link your Telegram account."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("Message from linked user:", profile.id, "Message:", text);

      // Extract mentioned username from leading mentions (handle cases like "@Bot @@user")
      const rawText = text || "";
      const mentionsBlockMatch = rawText.match(/^(@+[\w_]+(?:\s+@+[\w_]+)*)/);
      const mentionedUsername = mentionsBlockMatch
        ? mentionsBlockMatch[0].trim().split(/\s+/).slice(-1)[0].replace(/^@+/, '')
        : undefined;

      // Clean the message text by removing any leading @mentions (bot and/or user)
      let cleanedText = rawText.replace(/^@+[\w_]+(?:\s+@+[\w_]+)*\s*/, '').trim();

      if (!cleanedText) {
        await sendTelegramMessage(
          chat.id,
          "⚠️ Please enter a message to send."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the conversation that was last notified or most recent one
      const { data: userProfile, error: profileFetchError } = await supabase
        .from("profiles")
        .select("last_notified_conversation_id")
        .eq("id", profile.id)
        .maybeSingle();

      let conversationId = userProfile?.last_notified_conversation_id;

      // If no last notified conversation, try to resolve by mentioned username (if any)
      if (!conversationId && mentionedUsername) {
        const { data: targetProfile, error: targetErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("telegram_username", mentionedUsername)
          .maybeSingle();

        if (!targetErr && targetProfile?.id) {
          const { data: convByUser, error: convByUserErr } = await supabase
            .from("conversations")
            .select("id")
            .or(`and(participant_1_id.eq.${profile.id},participant_2_id.eq.${targetProfile.id}),and(participant_1_id.eq.${targetProfile.id},participant_2_id.eq.${profile.id})`)
            .order("last_message_at", { ascending: false })
            .limit(1);

          if (!convByUserErr && convByUser && convByUser.length > 0) {
            conversationId = convByUser[0].id;
          }
        }
      }

      // If still no conversation, get most recent one
      if (!conversationId) {
        const { data: conversations, error: convError } = await supabase
          .from("conversations")
          .select("id")
          .or(`participant_1_id.eq.${profile.id},participant_2_id.eq.${profile.id}`)
          .order("last_message_at", { ascending: false })
          .limit(1);

        if (convError || !conversations || conversations.length === 0) {
          await sendTelegramMessage(
            chat.id,
            "⚠️ No active conversations found. Please start a conversation on the platform first."
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        conversationId = conversations[0].id;
      }

      // Save message to database with cleaned content
      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          content: cleanedText,
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
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
