// -------------------------------------------------
// TELEGRAM BOT WEBHOOK – FIXED & CLEAN
// -------------------------------------------------
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

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const update = await req.json();

    // Helper: send reply and log result
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

    // === /start command ===
    if (update.message?.text?.startsWith("/start")) {
      const { chat, text } = update.message;
      const parts = text.split(" ");
      const payloadUserId = parts[1];

      if (payloadUserId) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("id, telegram_chat_id")
          .eq("id", payloadUserId)
          .maybeSingle();

        if (error || !profile) {
          await reply(chat.id, "Account not found – sign in on the web first.");
        } else if (profile.telegram_chat_id) {
          await reply(chat.id, "Your Telegram is already linked!");
        } else {
          await supabase
            .from("profiles")
            .update({ telegram_chat_id: chat.id.toString() })
            .eq("id", profile.id);
          await reply(chat.id, "You are now linked! You will receive notifications here.");
        }
      } else {
        await reply(
          chat.id,
          "Welcome! Open the app → Profile → *Connect Bot* and tap the button."
        );
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Regular message ===
    if (update.message) {
      const { chat, text, message_id } = update.message;
      const chatId = chat.id;

      // 1. Find user by chat_id
      const { data: sender, error: sErr } = await supabase
        .from("profiles")
        .select("id, display_name, last_notified_conversation_id")
        .eq("telegram_chat_id", chatId.toString())
        .maybeSingle();

      if (sErr || !sender) {
        await reply(chatId, "Your account isn’t linked. Send /start first.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Clean message
      const raw = text.trim();
      const cleaned = raw.replace(/^(@\w+\s*)+/, "").trim();
      if (!cleaned) {
        await reply(chatId, "Please type a message.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 3. Find conversation
      let convId = sender.last_notified_conversation_id;

      if (!convId && raw.startsWith("@")) {
        const mention = raw.match(/^@(\w+)/)?.[1];
        if (mention) {
          const { data: target } = await supabase
            .from("profiles")
            .select("id")
            .eq("telegram_username", mention)
            .maybeSingle();
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
            if (c?.[0]) convId = c[0].id;
          }
        }
      }

      if (!convId) {
        const { data: recent } = await supabase
          .from("conversations")
          .select("id")
          .or(`participant_1_id.eq.${sender.id},participant_2_id.eq.${sender.id}`)
          .order("last_message_at", { ascending: false })
          .limit(1);
        convId = recent?.[0]?.id;
      }

      if (!convId) {
        await reply(chatId, "No active conversation – start one on the web first.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 4. Save message
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
        await reply(chatId, "Failed to save message – try again.");
      } else {
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", convId);

        await reply(chatId, "Message sent!");

        const { data: conv } = await supabase
          .from("conversations")
          .select("participant_1_id, participant_2_id")
          .eq("id", convId)
          .single();

        const recipientId =
          conv.participant_1_id === sender.id ? conv.participant_2_id : conv.participant_1_id;

        await supabase.functions.invoke("send-telegram-notification", {
          body: {
            recipient_id: recipientId,
            message: cleaned,
            sender_name: sender.display_name,
            sender_id: sender.id,
            conversation_id: convId,
          },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("FATAL:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
