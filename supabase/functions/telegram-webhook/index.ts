// ============================================
// TELEGRAM BOT WEBHOOK HANDLER - DIAGNOSTIC VERSION
// ============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const update = await req.json();

    console.log("=== TELEGRAM UPDATE RECEIVED ===");
    console.log(JSON.stringify(update, null, 2));

    if (update.message) {
      const { chat, from, text, message_id } = update.message;
      const username = from.username || '';

      console.log(`📨 Message from: ${from.username} (${chat.id})`);
      console.log(`📝 Text: "${text}"`);

      // Handle /start command
      if (text?.startsWith('/start')) {
        console.log("🔐 Handling /start command");
        const parts = text.split(' ');
        const payloadUserId = parts.length > 1 ? parts[1] : undefined;

        if (payloadUserId) {
          const { data: profileById, error: byIdErr } = await supabase
            .from('profiles')
            .select('id, display_name, telegram_chat_id, telegram_username')
            .eq('id', payloadUserId)
            .maybeSingle();

          if (byIdErr) {
            console.error('❌ Error fetching profile by id:', byIdErr);
            await sendTelegramMessage(chat.id, '❌ Database error. Please try again later.');
          } else if (!profileById) {
            console.log('⚠️ Profile not found for user ID:', payloadUserId);
            await sendTelegramMessage(chat.id, '⚠️ Account not found for this link. Please ensure you are signed in to the app, then go to Profile > Connect Bot and try again.');
          } else {
            console.log('✅ Linking account for user:', profileById.id);
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

        if (profileError || !profile) {
          await sendTelegramMessage(
            chat.id,
            '👋 Welcome to DeFiLance Bot!\n\nTo link your account:\n1. Sign in on DeFiLance\n2. Go to your Profile > Connect Bot\n3. Tap the button to open Telegram and press Start'
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await supabase
          .from('profiles')
          .update({ telegram_chat_id: chat.id.toString() })
          .eq('id', profile.id);
        
        await sendTelegramMessage(
          chat.id,
          '✅ You are authorized!\n\nYour Telegram account is now linked to DeFiLance.'
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // === REGULAR MESSAGE PROCESSING ===
      console.log("💬 Processing regular message...");
      
      // Find user by telegram chat_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, telegram_chat_id, telegram_username")
        .eq("telegram_chat_id", chat.id.toString())
        .maybeSingle();

      console.log("👤 Profile lookup result:", profile ? `Found: ${profile.id}` : "Not found");
      if (profileError) console.error("❌ Profile error:", profileError);

      if (!profile) {
        await sendTelegramMessage(
          chat.id,
          "⚠️ Your account is not linked. Please send /start to link your Telegram account."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clean message text
      const rawText = text || "";
      const mentionsBlockMatch = rawText.match(/^(@+[\w_]+(?:\s+@+[\w_]+)*)/);
      const mentionedUsername = mentionsBlockMatch
        ? mentionsBlockMatch[0].trim().split(/\s+/).slice(-1)[0].replace(/^@+/, '')
        : undefined;
      let cleanedText = rawText.replace(/^@+[\w_]+(?:\s+@+[\w_]+)*\s*/, '').trim();

      console.log("🧹 Cleaned text:", cleanedText);
      console.log("👥 Mentioned user:", mentionedUsername || "none");

      if (!cleanedText) {
        await sendTelegramMessage(chat.id, "⚠️ Please enter a message to send.");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get conversation
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("last_notified_conversation_id")
        .eq("id", profile.id)
        .maybeSingle();

      let conversationId = userProfile?.last_notified_conversation_id;
      console.log("💾 Last notified conversation:", conversationId || "none");

      // Try to find conversation by mentioned username
      if (!conversationId && mentionedUsername) {
        console.log("🔍 Looking for conversation with:", mentionedUsername);
        const { data: targetProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("telegram_username", mentionedUsername)
          .maybeSingle();

        if (targetProfile?.id) {
          console.log("✅ Found target user:", targetProfile.id);
          const { data: convByUser } = await supabase
            .from("conversations")
            .select("id")
            .or(`and(participant_1_id.eq.${profile.id},participant_2_id.eq.${targetProfile.id}),and(participant_1_id.eq.${targetProfile.id},participant_2_id.eq.${profile.id})`)
            .order("last_message_at", { ascending: false })
            .limit(1);

          if (convByUser && convByUser.length > 0) {
            conversationId = convByUser[0].id;
            console.log("✅ Found conversation by user:", conversationId);
          }
        }
      }

      // Get most recent conversation
      if (!conversationId) {
        console.log("🔍 Getting most recent conversation...");
        const { data: conversations, error: convError } = await supabase
          .from("conversations")
          .select("id, participant_1_id, participant_2_id, last_message_at")
          .or(`participant_1_id.eq.${profile.id},participant_2_id.eq.${profile.id}`)
          .order("last_message_at", { ascending: false })
          .limit(1);

        console.log("📊 Conversations found:", conversations?.length || 0);
        if (conversations && conversations.length > 0) {
          console.log("Conversation details:", JSON.stringify(conversations[0], null, 2));
        }

        if (convError || !conversations || conversations.length === 0) {
          console.error("❌ No conversations found. Error:", convError);
          await sendTelegramMessage(
            chat.id,
            "⚠️ No active conversations found. Please start a conversation on the platform first."
          );
          return new Response(JSON.stringify({ ok: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        conversationId = conversations[0].id;
        console.log("✅ Using most recent conversation:", conversationId);
      }

      // Verify conversation exists and user is participant
      console.log("🔐 Verifying conversation access...");
      const { data: conversationCheck, error: convCheckError } = await supabase
        .from("conversations")
        .select("id, participant_1_id, participant_2_id")
        .eq("id", conversationId)
        .maybeSingle();

      console.log("📋 Conversation check:", {
        found: !!conversationCheck,
        error: convCheckError,
        details: conversationCheck
      });

      if (convCheckError) {
        console.error("❌ Error checking conversation:", convCheckError);
        await sendTelegramMessage(
          chat.id,
          `❌ Database error: ${convCheckError.message}`
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!conversationCheck) {
        console.error("❌ Conversation not found:", conversationId);
        await sendTelegramMessage(
          chat.id,
          "❌ Conversation not found. Please start a new conversation on the platform."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isParticipant = 
        conversationCheck.participant_1_id === profile.id || 
        conversationCheck.participant_2_id === profile.id;

      console.log("👥 Participant check:", {
        userId: profile.id,
        participant1: conversationCheck.participant_1_id,
        participant2: conversationCheck.participant_2_id,
        isParticipant
      });

      if (!isParticipant) {
        console.error("❌ User not a participant in conversation");
        await sendTelegramMessage(
          chat.id,
          "❌ You are not a participant in this conversation."
        );
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert message
      console.log("💾 Attempting to insert message...");
      console.log("Insert data:", {
        conversation_id: conversationId,
        sender_id: profile.id,
        content: cleanedText,
        telegram_message_id: message_id.toString(),
      });

      const { data: insertedMessage, error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          content: cleanedText,
          telegram_message_id: message_id.toString(),
        })
        .select()
        .single();

      if (messageError) {
        console.error("❌ ERROR INSERTING MESSAGE:");
        console.error("Code:", messageError.code);
        console.error("Message:", messageError.message);
        console.error("Details:", messageError.details);
        console.error("Hint:", messageError.hint);
        console.error("Full error:", JSON.stringify(messageError, null, 2));
        
        let errorMsg = "❌ Failed to send message:\n\n";
        if (messageError.code === "23503") {
          errorMsg += "Foreign key constraint violation. The conversation may have been deleted.";
        } else if (messageError.code === "23505") {
          errorMsg += "This message was already sent.";
        } else if (messageError.code === "42501") {
          errorMsg += "Permission denied. RLS policy may be blocking this.";
        } else {
          errorMsg += `${messageError.message}\n\nCode: ${messageError.code}`;
        }
        errorMsg += "\n\nPlease try again or contact support.";
        
        await sendTelegramMessage(chat.id, errorMsg);
      } else {
        console.log("✅ Message inserted successfully!");
        console.log("Inserted message:", JSON.stringify(insertedMessage, null, 2));
        
        // Update conversation timestamp
        await supabase
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);

        await sendTelegramMessage(chat.id, "✅ Message sent successfully!");
        
        // Send notification to recipient
        const recipientId = conversationCheck.participant_1_id === profile.id 
          ? conversationCheck.participant_2_id 
          : conversationCheck.participant_1_id;
        
        console.log("📤 Sending notification to recipient:", recipientId);
        try {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              recipient_id: recipientId,
              message: cleanedText,
              sender_name: profile.display_name,
              sender_id: profile.id,
              conversation_id: conversationId,
            }
          });
          console.log("✅ Notification sent");
        } catch (notifError) {
          console.error("⚠️ Notification failed:", notifError);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("💥 FATAL ERROR:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === "YOUR_TELEGRAM_BOT_TOKEN_HERE") {
    console.error("TELEGRAM_BOT_TOKEN not set");
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
      }),
    });

    const result = await response.json();
    console.log("📨 Telegram response:", result.ok ? "✅ Sent" : "❌ Failed");
    return result;
  } catch (error) {
    console.error("❌ Error sending Telegram message:", error);
  }
}
