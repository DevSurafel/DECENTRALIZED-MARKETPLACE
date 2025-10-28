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
      console.error("TELEGRAM_BOT_TOKEN missing");
      return null;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
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
      console.log("Telegram reply →", json.ok ? "OK" : "FAIL", JSON.stringify(json));
      return json;
    } catch (e) {
      console.error("Error sending Telegram message:", e);
      return null;
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

      if (!payload) {
        await reply(
          chatId,
          "*Welcome to DeFiLance!*\n\n" +
            "To connect your account:\n" +
            "1. Sign in on the web app\n" +
            "2. Go to *Profile → Connect Bot*\n" +
            "3. Click **Connect** – you’ll be redirected here.",
        );
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find user by ID
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, telegram_chat_id, display_name")
        .eq("id", payload)
        .single();

      if (pErr || !profile) {
        await reply(chatId, "Account not found. Please sign up on the web app first.");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (profile.telegram_chat_id && profile.telegram_chat_id !== chatId.toString()) {
        await reply(chatId, "This account is already linked to another Telegram chat.");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (profile.telegram_chat_id === chatId.toString()) {
        await reply(
          chatId,
          `Your account is already linked!\n\nHi *${profile.display_name || "there"}*!`,
        );
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Link account
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ telegram_chat_id: chatId.toString() })
        .eq("id", profile.id);

      if (updErr) {
        console.error("Failed to update profile:", updErr);
        await reply(chatId, "Failed to link account. Please try again.");
      } else {
        await reply(
          chatId,
          `*Success!* Your account is now linked!\n\n` +
            `Hi *${profile.display_name || "there"}*! ` +
            "You’ll receive message notifications here.\n\n" +
            "Just send a message to reply.",
        );
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
      const content = text.trim();

      if (!content) {
        await reply(chatId, "Please type a message.");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find sender by telegram_chat_id
      const { data: sender, error: sErr } = await supabase
        .from("profiles")
        .select("id, display_name, last_notified_conversation_id")
        .eq("telegram_chat_id", chatId.toString())
        .single();

      if (sErr || !sender) {
        await reply(
          chatId,
          "Your account isn’t linked yet.\n\n" +
            "Use **/start** with the link from the web app to connect.",
        );
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Determine conversation
      let convId = sender.last_notified_conversation_id;

      if (!convId) {
        const { data: recent } = await supabase
          .from("conversations")
          .select("id")
          .or(`participant_1_id.eq.${sender.id},participant_2_id.eq.${sender.id}`)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        convId = recent?.id;
      }

      if (!convId) {
        await reply(
          chatId,
          "No active conversation found.\n\n" +
            "Please start a conversation on the web app first.",
        );
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
        console.error("Failed to insert message:", msgErr);
        await reply(chatId, "Failed to send message. Try again.");
        return new Response(JSON.stringify({ ok: false, error: msgErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", convId);

      await reply(chatId, "Message sent!");

      // Notify recipient
      const { data: conv } = await supabase
        .from("conversations")
        .select("participant_1_id, participant_2_id")
        .eq("id", convId)
        .single();

      if (conv) {
        const recipientId =
          conv.participant_1_id === sender.id ? conv.participant_2_id : conv.participant_1_id;

        try {
          await supabase.functions.invoke("send-telegram-notification", {
            body: {
              recipient_id: recipientId,
              message: content,
              sender_name: sender.display_name || "Someone",
              sender_id: sender.id,
              conversation_id: convId,
            },
          });
        } catch (e) {
          console.error("Failed to send notification:", e);
        }
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
