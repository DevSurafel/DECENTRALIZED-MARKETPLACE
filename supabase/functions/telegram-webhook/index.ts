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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const update = await req.json();

  const reply = async (chatId: number, text: string) => {
    if (!TELEGRAM_BOT_TOKEN) return;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    const json = await res.json();
    console.log("Telegram reply →", json.ok ? "OK" : "FAIL", json);
  };

  try {
    // /start command - link Telegram account
    if (update.message?.text?.startsWith("/start")) {
      const { chat, text } = update.message;
      console.log("Received /start command:", { chat_id: chat.id, text });
      
      const parts = text.trim().split(" ");
      const payloadUserId = parts[1];

      if (payloadUserId) {
        console.log("Attempting to link user:", payloadUserId);
        
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, telegram_chat_id, display_name")
          .eq("id", payloadUserId)
          .maybeSingle();

        console.log("Profile lookup result:", { profile, error });

        if (error || !profile) {
          console.error("Profile not found:", error);
          await reply(chat.id, "❌ Account not found. Please sign up on the platform first:\nhttps://qyjauqjduzbbwjmenczr.supabase.co");
        } else if (profile.telegram_chat_id && profile.telegram_chat_id !== chat.id.toString()) {
          await reply(chat.id, "⚠️ This account is already linked to another Telegram account!");
        } else if (profile.telegram_chat_id === chat.id.toString()) {
          await reply(chat.id, `✅ Your account is already linked!\n\nHi ${profile.display_name || 'there'}! You will receive notifications here.`);
        } else {
          const { error: updErr } = await supabase
            .from("profiles")
            .update({ telegram_chat_id: chat.id.toString() })
            .eq("id", profile.id);

          console.log("Profile update result:", { error: updErr });

          if (updErr) {
            console.error("DB UPDATE ERROR:", updErr);
            await reply(chat.id, "❌ Failed to link your account. Please try again or contact support.");
          } else {
            await reply(
              chat.id, 
              `✅ Success! Your account is now linked!\n\n` +
              `Hi ${profile.display_name || 'there'}! You will receive message notifications here.\n\n` +
              `To reply to messages, just type your message and send it. Make sure to reply to the notification message.`
            );
          }
        }
      } else {
        await reply(
          chat.id, 
          "👋 Welcome to DeFiLance!\n\n" +
          "To connect your account:\n" +
          "1. Sign in to the platform\n" +
          "2. Go to Profile → Connect Telegram\n" +
          "3. Click the connect button"
        );
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regular message - handle replies
    if (update.message?.text && !update.message.text.startsWith("/")) {
      const { chat, text, message_id, reply_to_message } = update.message;
      const chatId = chat.id;

      console.log("Received message:", { chat_id: chatId, text, has_reply: !!reply_to_message });

      const { data: sender, error: sErr } = await supabase
        .from("profiles")
        .select("id, display_name, last_notified_conversation_id")
        .eq("telegram_chat_id", chatId.toString())
        .maybeSingle();

      if (sErr || !sender) {
        console.log("Sender not found:", { chatId, error: sErr });
        await reply(chatId, "❌ Your account isn't linked yet.\n\nSend /start to connect your Telegram account.");
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      console.log("Sender found:", { sender_id: sender.id, display_name: sender.display_name });

      const raw = text.trim();
      const cleaned = raw.replace(/^(@\w+\s*)+/, "").trim();
      
      if (!cleaned) {
        await reply(chatId, "⚠️ Please type a message.");
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let convId = sender.last_notified_conversation_id;
      console.log("Initial conversation ID from last notification:", convId);

      // Try to find conversation from @mention
      if (!convId && raw.startsWith("@")) {
        const mention = raw.match(/^@(\w+)/)?.[1];
        console.log("Looking for conversation with mention:", mention);
        
        if (mention) {
          const { data: target } = await supabase
            .from("profiles")
            .select("id, display_name")
            .eq("telegram_username", mention)
            .maybeSingle();
          
          console.log("Target user from mention:", target);
          
          if (target) {
            const { data: c } = await supabase
              .from("conversations")
              .select("id")
              .or(
                `and(participant_1_id.eq.${sender.id},participant_2_id.eq.${target.id}),` +
                `and(participant_1_id.eq.${target.id},participant_2_id.eq.${sender.id})`
              )
              .order("last_message_at", { ascending: false })
              .limit(1);
            
            if (c?.[0]) {
              convId = c[0].id;
              console.log("Found conversation from mention:", convId);
            }
          }
        }
      }

      // If still no conversation, use most recent
      if (!convId) {
        console.log("No conversation found, looking for most recent");
        
        const { data: recent } = await supabase
          .from("conversations")
          .select("id, participant_1_id, participant_2_id, last_message_at")
          .or(`participant_1_id.eq.${sender.id},participant_2_id.eq.${sender.id}`)
          .order("last_message_at", { ascending: false })
          .limit(1);
        
        console.log("Recent conversations:", recent);
        convId = recent?.[0]?.id;
      }

      if (!convId) {
        console.log("No conversation found for user");
        await reply(
          chatId, 
          "❌ No active conversation found.\n\n" +
          "Please start a conversation on the platform first, then you can reply here."
        );
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      console.log("Sending message to conversation:", convId);

      // Insert message
      const { error: msgErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_id: sender.id,
          content: cleaned,
          telegram_message_id: message_id.toString(),
        });

      if (msgErr) {
        console.error("DB insert error:", msgErr);
        await reply(chatId, "❌ Failed to send message. Please try again.");
      } else {
        console.log("Message saved successfully");
        
        // Update conversation timestamp
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", convId);

        await reply(chatId, "✅ Message sent!");

        // Get conversation details to notify recipient
        const { data: conv } = await supabase
          .from("conversations")
          .select("participant_1_id, participant_2_id")
          .eq("id", convId)
          .single();

        if (conv) {
          const recipientId = conv.participant_1_id === sender.id ? conv.participant_2_id : conv.participant_1_id;
          console.log("Sending notification to recipient:", recipientId);

          // Send notification to recipient
          await supabase.functions.invoke("send-telegram-notification", {
            body: {
              recipient_id: recipientId,
              message: cleaned,
              sender_name: sender.display_name || "Someone",
              sender_id: sender.id,
              conversation_id: convId,
            },
          });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("FATAL:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
