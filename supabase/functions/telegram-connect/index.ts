// -------------------------------------------------
// TELEGRAM CONNECT – generate deep-link
// -------------------------------------------------
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.log("No authenticated user");
    return new Response(
      JSON.stringify({ error: "Unauthenticated" }), 
      { status: 401, headers: corsHeaders }
    );
  }

  console.log("Generating Telegram link for user:", user.id);

  const meRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
  if (!meRes.ok) {
    console.error("Telegram API error:", await meRes.text());
    return new Response(
      JSON.stringify({ error: "Telegram unreachable" }), 
      { status: 502, headers: corsHeaders }
    );
  }
  
  const { result } = await meRes.json();
  const botUsername = result?.username;
  
  console.log("Bot username:", botUsername);
  
  if (!botUsername) {
    return new Response(
      JSON.stringify({ error: "Bot has no username" }), 
      { status: 500, headers: corsHeaders }
    );
  }

  const deepLink = `https://t.me/${botUsername}?start=${user.id}`;
  
  console.log("Generated deep link:", deepLink);

  return new Response(
    JSON.stringify({ 
      bot_username: botUsername, 
      link: deepLink,
      user_id: user.id 
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
