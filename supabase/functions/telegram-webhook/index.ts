// ---------- telegram-webhook.ts ----------
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
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
  const reply = async (chatId: number, text: string) => {
    if (!TELEGRAM_BOT_TOKEN) {
      console.error("❌ TELEGRAM_BOT_TOKEN missing");
      return { ok: false, error: "Bot token not configured" };
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    console.log(`📤 Sending message to chat ${chatId}:`, text.substring(0, 100));
    
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
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
        .select("id, telegram_chat_id, display_name")
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

      // Link account
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: chatId.toString() })
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
      const { chat, text, message_id, entities } = update.message;
      const chatId = chat.id;
      const fullText = text.trim();

      console.log(`💬 Regular message from chat ${chatId}: ${fullText.substring(0, 50)}`);

      if (!fullText) {
        console.log("⚠️ Empty message received");
        const result = await reply(chatId, "Please type a message.");
        
        if (!result.ok) {
          console.error("❌ Failed to send empty-message error:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if message contains bot mention and user mention
      const mentions = entities?.filter((e: any) => e.type === 'mention') || [];
      
      if (mentions.length < 2) {
        console.log("⚠️ Message must mention bot and recipient (e.g., @BotName @Username message)");
        const result = await reply(
          chatId,
          "To send a message, use: @BotName @Username your message"
        );
        
        if (!result.ok) {
          console.error("❌ Failed to send format instruction:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract mentions and clean content
      let content = fullText;
      const mentionedUsernames: string[] = [];
      
      // Sort mentions by offset in reverse to remove from end to start
      const sortedMentions = [...mentions].sort((a: any, b: any) => b.offset - a.offset);
      
      for (const mention of sortedMentions) {
        const username = fullText.substring(mention.offset, mention.offset + mention.length);
        mentionedUsernames.push(username.replace('@', ''));
        // Remove mention from content
        content = content.substring(0, mention.offset) + content.substring(mention.offset + mention.length);
      }
      
      content = content.trim();

      if (!content) {
        console.log("⚠️ No message content after mentions");
        const result = await reply(chatId, "Please include a message after the mentions.");
        
        if (!result.ok) {
          console.error("❌ Failed to send empty-content error:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`📝 Cleaned content: ${content}`);
      console.log(`👥 Mentioned usernames: ${mentionedUsernames.join(', ')}`);

      console.log(`🔍 Looking up sender by chat_id: ${chatId}`);

      // Find sender by telegram_chat_id
      const { data: sender, error: sErr } = await supabase
        .from("profiles")
        .select("id, display_name, telegram_username")
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

      // Find recipient by telegram username from mentions (skip bot mention)
      const recipientUsername = mentionedUsernames.find(u => !u.toLowerCase().includes('bot'));
      
      if (!recipientUsername) {
        console.log("⚠️ No recipient username found");
        const result = await reply(chatId, "Please mention a user (e.g., @BotName @Username message)");
        
        if (!result.ok) {
          console.error("❌ Failed to send no-recipient message:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`🔍 Looking for recipient with username: ${recipientUsername}`);

      const { data: recipient, error: rErr } = await supabase
        .from("profiles")
        .select("id, display_name, telegram_chat_id")
        .eq("telegram_username", recipientUsername)
        .single();

      if (rErr || !recipient) {
        console.error("❌ Recipient not found:", rErr);
        const result = await reply(chatId, `User @${recipientUsername} not found or not linked.`);
        
        if (!result.ok) {
          console.error("❌ Failed to send recipient-not-found message:", result);
        }
        
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`✅ Found recipient: ${recipient.display_name} (${recipient.id})`);

      // Find or create conversation between sender and recipient
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant_1_id.eq.${sender.id},participant_2_id.eq.${recipient.id}),and(participant_1_id.eq.${recipient.id},participant_2_id.eq.${sender.id})`)
        .maybeSingle();

      let convId = existingConv?.id;

      if (!convId) {
        console.log("📝 Creating new conversation");
        const { data: newConv, error: convErr } = await supabase
          .from("conversations")
          .insert({
            participant_1_id: sender.id,
            participant_2_id: recipient.id,
          })
          .select("id")
          .single();

        if (convErr) {
          console.error("❌ Failed to create conversation:", convErr);
          const result = await reply(chatId, "Failed to create conversation. Please try again.");
          
          if (!result.ok) {
            console.error("❌ Failed to send error message:", result);
          }
          
          return new Response(JSON.stringify({ ok: false, error: convErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        convId = newConv.id;
        console.log(`✅ Created conversation: ${convId}`);
      }

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

      console.log("📤 Notifying recipient...");

      // Notify recipient via Telegram if they have chat_id
      if (recipient.telegram_chat_id) {
        const notifyText = `${sender.display_name || "Someone"} sent:\n\n${content}`;
        const sent = await reply(parseInt(recipient.telegram_chat_id), notifyText);
        if (!sent?.ok) {
          console.error("❌ Failed to notify recipient:", sent);
        } else {
          console.log("✅ Recipient notified successfully");
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
