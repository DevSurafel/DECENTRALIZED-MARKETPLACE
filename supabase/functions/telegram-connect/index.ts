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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

    // Validate bot token exists
    if (!TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Bot token not configured" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { 
        headers: { 
          Authorization: req.headers.get("Authorization") ?? "" 
        } 
      },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthenticated" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Generating Telegram link for user:", user.id);

    // Fetch bot information from Telegram API (FIXED: added proper template literal)
    const meRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    
    if (!meRes.ok) {
      const errorText = await meRes.text();
      console.error("Telegram API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to connect to Telegram API" }),
        { 
          status: 502, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Parse Telegram API response
    const meData = await meRes.json();
    console.log("Telegram API response:", meData);

    // Validate response structure
    if (!meData.ok || !meData.result) {
      console.error("Invalid Telegram API response:", meData);
      return new Response(
        JSON.stringify({ error: "Invalid response from Telegram" }),
        { 
          status: 502, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const botUsername = meData.result.username;
    
    console.log("Bot username:", botUsername);
    
    if (!botUsername) {
      console.error("Bot has no username set");
      return new Response(
        JSON.stringify({ error: "Bot has no username" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Generate deep link with user ID as payload
    const deepLink = `https://t.me/${botUsername}?start=${user.id}`;
    
    console.log("Generated deep link:", deepLink);

    // Return success response
    return new Response(
      JSON.stringify({ 
        bot_username: botUsername, 
        link: deepLink,
        user_id: user.id 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    // Catch any unexpected errors
    console.error("Unexpected error in telegram-connect:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
