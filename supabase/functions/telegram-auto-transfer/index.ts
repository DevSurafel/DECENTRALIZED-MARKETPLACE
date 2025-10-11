import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const transferServiceUrl = Deno.env.get('TRANSFER_SERVICE_URL')!;
const transferServiceSecret = Deno.env.get('TRANSFER_SERVICE_SECRET')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📨 Request received:', JSON.stringify(body));
    
    const { jobId, channelUsername } = body;
    
    if (!jobId) {
      throw new Error('jobId is required');
    }

    if (!transferServiceUrl || !transferServiceSecret) {
      throw new Error('Transfer service not configured. Set TRANSFER_SERVICE_URL and TRANSFER_SERVICE_SECRET.');
    }

    console.log('🔍 Processing Telegram auto-transfer for job:', jobId);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to fetch job: ${jobError?.message}`);
    }

    if (job.status !== 'awaiting_escrow_verification') {
      throw new Error(`Job status is ${job.status}, expected awaiting_escrow_verification`);
    }

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from('social_media_listings')
      .select('account_name, platform')
      .eq('id', job.listing_id)
      .single();

    if (listingError || !listing) {
      throw new Error(`Failed to fetch listing: ${listingError?.message}`);
    }

    if (listing.platform !== 'telegram') {
      throw new Error('Job is not for a Telegram channel/group');
    }

    let targetChannelUsername = channelUsername || listing.account_name;
    
    if (!targetChannelUsername || targetChannelUsername.trim() === '') {
      throw new Error('Channel username not provided');
    }
    
    console.log('📢 Target channel:', targetChannelUsername);

    // Get buyer profile
    const { data: buyerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_username')
      .eq('id', job.client_id)
      .single();

    if (profileError || !buyerProfile?.telegram_username) {
      throw new Error('Buyer telegram username not found');
    }

    const buyerUsername = buyerProfile.telegram_username;
    console.log('👤 Buyer username:', buyerUsername);

    // Call the external transfer service
    console.log('📡 Calling transfer service...');
    const transferResponse = await fetch(`${transferServiceUrl}/api/transfer-ownership`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Secret': transferServiceSecret,
      },
      body: JSON.stringify({
        jobId,
        channelUsername: targetChannelUsername,
        buyerUsername,
      }),
    });

    const transferResult = await transferResponse.json();
    console.log('📥 Transfer service response:', transferResult);

    if (!transferResponse.ok) {
      if (transferResponse.status === 400) {
        return new Response(
          JSON.stringify(transferResult),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      throw new Error(transferResult.error || 'Transfer service failed');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Ownership transferred and funds released successfully',
        jobId: jobId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in telegram-auto-transfer:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
