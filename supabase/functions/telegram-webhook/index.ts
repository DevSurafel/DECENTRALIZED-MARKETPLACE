// ---------- telegram-webhook.ts ----------
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  // Get environment variables with fallbacks
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  console.log("🔧 Environment check:");
  console.log("  - TELEGRAM_BOT_TOKEN:", TELEGRAM_BOT_TOKEN ? "✅ Set" : "❌ Missing");
  console.log("  - SUPABASE_URL:", SUPABASE_URL ? `✅ ${SUPABASE_URL}` : "❌ Missing");
  console.log("  - SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "✅ Set" : "❌ Missing");

  if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing required environment variables");
    return new Response(JSON.stringify({ ok: false, error: "Missing environment variables" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use service role key directly — NO auth header needed
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let update: any;
  try {
    update = await req.json();
    console.log("Received Telegram update:", JSON.stringify(update, null, 2));
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Helper: Send message to Telegram
  const reply = async (chatId: number, text: string, senderUsername?: string) => {
    if (!TELEGRAM_BOT_TOKEN) {
      console.error("❌ TELEGRAM_BOT_TOKEN missing");
      return { ok: false, error: "Bot token not configured" };
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    console.log(`📤 Sending message to chat ${chatId}:`, text.substring(0, 100));
    
    const messageBody: any = {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    };

    // Add reply button if sender username is provided
    if (senderUsername) {
      messageBody.reply_markup = {
        inline_keyboard: [[
          {
            text: "Reply",
            switch_inline_query_current_chat: `@${senderUsername} `,
          },
        ]],
      };
    }
    
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageBody),
      });
      
      const json = await res.json();
      
      if (!res.ok || !json.ok) {
        console.error("❌ Telegram API error:", JSON.stringify(json));
        return json;
      }
      
      console.log("✅ Telegram reply sent successfully");
      return json;
    } catch (e) {
      console.error("❌ Fatal error sending Telegram message:", e);
      return { ok: false, error: String(e) };
    }
  };

  try {
    // ===========================================
    // 1. /start command — Link Telegram account
    // ===========================================
    if (update.message?.text?.startsWith("/start")) {
      const { chat, text } = update.message;
      const chatId = chat.id;
      const payload = text.trim().split(" ")[1]; // User ID after /start

      console.log(`🚀 /start command from chat ${chatId}, payload: ${payload || "none"}`);

      if (!payload) {
        console.log("ℹ️ No payload, sending welcome message");
        const result = await reply(
          chatId,
          "*Welcome to DeFiLance!*\n\n" +
            "To connect your account:\n" +
            "1. Sign in on the web app\n" +
            "2. Go to *Profile → Connect Bot*\n" +
            "3. Click **Connect** – you'll be redirected here.",
        );
        
        if (!result.ok) {
          console.error("❌ Failed to send welcome message:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`🔍 Looking up user with ID: ${payload}`);

      // Find user by ID
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, telegram_chat_id, display_name, telegram_username")
        .eq("id", payload)
        .single();

      if (pErr || !profile) {
        console.error("❌ User not found:", pErr);
        const result = await reply(chatId, "Account not found. Please sign up on the web app first.");
        
        if (!result.ok) {
          console.error("❌ Failed to send error message:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`✅ Found user: ${profile.display_name}, current chat_id: ${profile.telegram_chat_id}`);

      if (profile.telegram_chat_id && profile.telegram_chat_id !== chatId.toString()) {
        console.log("⚠️ Account already linked to different chat");
        const result = await reply(chatId, "This account is already linked to another Telegram chat.");
        
        if (!result.ok) {
          console.error("❌ Failed to send already-linked message:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (profile.telegram_chat_id === chatId.toString()) {
        console.log("ℹ️ Account already linked to this chat");
        const result = await reply(
          chatId,
          `Your account is already linked!\n\nHi *${profile.display_name || "there"}*!`,
        );
        
        if (!result.ok) {
          console.error("❌ Failed to send already-linked message:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`🔗 Linking account ${profile.id} to chat ${chatId}`);

      // Extract telegram username from the message
      const telegramUsername = chat.username || null;

      // Link account and store telegram username
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ 
          telegram_chat_id: chatId.toString(),
          telegram_username: telegramUsername
        })
        .eq("id", profile.id);

      if (updErr) {
        console.error("❌ Failed to update profile:", updErr);
        const result = await reply(chatId, "Failed to link account. Please try again.");
        
        if (!result.ok) {
          console.error("❌ Failed to send error message:", result);
        }
      } else {
        console.log("✅ Successfully linked account");
        const result = await reply(
          chatId,
          `*Success!* Your account is now linked!\n\n` +
            `Hi *${profile.display_name || "there"}*! ` +
            "You'll receive message notifications here.\n\n" +
            "Just send a message to reply.",
        );
        
        if (!result.ok) {
          console.error("❌ Failed to send success message:", result);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===========================================
    // 2. Regular message — Reply in conversation
    // ===========================================
    if (update.message?.text && !update.message.text.startsWith("/")) {
      const { chat, text, message_id } = update.message;
      const chatId = chat.id;
      const rawText = (text || '').trim();
      console.log(`💬 Incoming raw message from chat ${chatId}: ${rawText.substring(0, 100)}`);

      // Remove all leading @mentions (including bot and username)
      // Format: "@BotName @Username Message" -> extract only "Message"
      let content = rawText.replace(/^(?:@\S+\s*)+/, '').trim();
      
      console.log(`📝 Parsed content (after removing mentions): ${content.substring(0, 50)}`);

      if (!content) {
        console.log("⚠️ Empty message after parsing");
        const result = await reply(chatId, "Please type a message.");
        
        if (!result.ok) {
          console.error("❌ Failed to send empty-message error:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`🔍 Looking up sender by chat_id: ${chatId}`);

      // Find sender by telegram_chat_id
      const { data: sender, error: sErr } = await supabase
        .from("profiles")
        .select("id, display_name, telegram_username, last_notified_conversation_id")
        .eq("telegram_chat_id", chatId.toString())
        .single();

      if (sErr || !sender) {
        console.error("❌ Sender not found or not linked:", sErr);
        const result = await reply(
          chatId,
          "Your account isn't linked yet.\n\n" +
            "Use **/start** with the link from the web app to connect.",
        );
        
        if (!result.ok) {
          console.error("❌ Failed to send not-linked message:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`✅ Found sender: ${sender.display_name} (${sender.id})`);

      // Use last notified conversation as the reply target
      let convId = sender.last_notified_conversation_id;

      if (!convId) {
        console.log("⚠️ No recent conversation found");
        const result = await reply(
          chatId,
          "No recent conversation found. Please start a conversation from the web app first, or use: @Username your message"
        );
        
        if (!result.ok) {
          console.error("❌ Failed to send no-conversation message:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`💬 Replying to conversation ${convId}`);

      // Verify sender is part of the conversation
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .select("participant_1_id, participant_2_id")
        .eq("id", convId)
        .single();

      console.log(`🔍 Conversation lookup result:`, JSON.stringify({ conv, convErr }));
      console.log(`📊 Sender ID: ${sender.id}`);
      console.log(`📊 Participant 1: ${conv?.participant_1_id}`);
      console.log(`📊 Participant 2: ${conv?.participant_2_id}`);

      const isParticipant = conv && (conv.participant_1_id === sender.id || conv.participant_2_id === sender.id);
      console.log(`📊 Is participant: ${isParticipant}`);

      if (!conv || !isParticipant) {
        console.error(`❌ Sender not part of conversation. Conv found: ${!!conv}, isParticipant: ${isParticipant}`);
        const result = await reply(chatId, "You are not part of this conversation.");
        
        if (!result.ok) {
          console.error("❌ Failed to send error message:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get the other participant
      const recipientId = conv.participant_1_id === sender.id ? conv.participant_2_id : conv.participant_1_id;

      console.log(`💾 Inserting message into conversation ${convId}`);

      // Insert message
      const { error: msgErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_id: sender.id,
          content,
          telegram_message_id: message_id.toString(),
        });

      if (msgErr) {
        console.error("❌ Failed to insert message:", msgErr);
        const result = await reply(chatId, "Failed to send message. Try again.");
        
        if (!result.ok) {
          console.error("❌ Failed to send error message:", result);
        }
        
        return new Response(JSON.stringify({ ok: false, error: msgErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("✅ Message inserted successfully");

      // Update conversation timestamp
      const { error: updateErr } = await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", convId);

      if (updateErr) {
        console.error("⚠️ Failed to update conversation timestamp:", updateErr);
      }

      const result = await reply(chatId, "✅ Message sent!");
      
      if (!result.ok) {
        console.error("❌ Failed to send confirmation:", result);
      }

      // Update sender's last_notified_conversation_id for easy follow-up replies
      await supabase
        .from("profiles")
        .update({ last_notified_conversation_id: convId })
        .eq("id", sender.id);

      console.log("📤 Notifying recipient...");

      // Get recipient info and notify
      const { data: recipient } = await supabase
        .from("profiles")
        .select("telegram_chat_id, display_name")
        .eq("id", recipientId)
        .single();

      if (recipient?.telegram_chat_id) {
        const notifyText = `New message from *${sender.display_name || "Someone"}*:\n\n${content}`;
        const sent = await reply(
          parseInt(recipient.telegram_chat_id), 
          notifyText, 
          (sender.display_name ? sender.display_name.split(" ")[0] : "user")
        );
        if (!sent?.ok) {
          console.error("❌ Failed to notify recipient:", sent);
        } else {
          console.log("✅ Recipient notified successfully");
          
          // Update recipient's last_notified_conversation_id
          await supabase
            .from("profiles")
            .update({ last_notified_conversation_id: convId })
            .eq("id", recipientId);
        }
      } else {
        console.warn("⚠️ Recipient has no linked Telegram, skipping notification");
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===========================================
    // Unknown update — acknowledge
    // ===========================================
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("FATAL ERROR:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message || "Unknown error" }),
      {
        status: 200, // Must be 200 to stop Telegram retries
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
