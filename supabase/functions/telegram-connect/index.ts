// ---------- telegram-connect.ts ----------
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

const SUPABASE_URL = Deno.env.get("QYJ_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("QYJ_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

  if (!TELEGRAM_BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "Bot token missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- Supabase client with user JWT (anon key + Authorization header) ----
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ---- Get bot username ----
  const meRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
  if (!meRes.ok) {
    const txt = await meRes.text();
    console.error("Telegram getMe error", txt);
    return new Response(JSON.stringify({ error: "Telegram API error" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const me = await meRes.json();
  if (!me.ok || !me.result?.username) {
    return new Response(JSON.stringify({ error: "Bot has no username" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const botUsername = me.result.username;

  const deepLink = `https://t.me/${botUsername}?start=${user.id}`;

  return new Response(
    JSON.stringify({
      bot_username: botUsername,
      link: deepLink,
      user_id: user.id,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
