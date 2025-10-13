import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { ethers } from 'https://esm.sh/ethers@6.7.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const transferServiceUrl = Deno.env.get('TRANSFER_SERVICE_URL')!;
const transferServiceSecret = Deno.env.get('TRANSFER_SERVICE_SECRET')!;
const rpcUrl = Deno.env.get('RPC_URL')!;
const walletPrivateKey = Deno.env.get('WALLET_PRIVATE_KEY')!;
const contractAddress = Deno.env.get('CONTRACT_ADDRESS')!;

const ESCROW_ABI = [
  'function approveJob(uint256 jobId) external',
  'function getJob(uint256 jobId) external view returns (tuple(address client, address freelancer, address token, uint256 amount, uint256 platformFee, uint256 freelancerStake, uint256 arbitrationDeposit, uint256 submissionDeadline, uint256 reviewDeadline, uint256 approvalDeadline, string ipfsHash, string gitCommitHash, uint256 currentRevisionNumber, uint256 allowedRevisions, bool autoReleaseEnabled, uint8 status, bool exists))'
];

// Convert UUID to numeric ID for blockchain
const uuidToNumericId = (uuid: string): bigint => {
  const hex = uuid.replace(/-/g, '').slice(0, 16);
  return BigInt('0x' + hex);
};

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

    // Transfer complete - now release payment via smart contract
    console.log('💰 Releasing payment via smart contract...');
    
    try {
      // Initialize ethers provider and signer
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(walletPrivateKey, provider);
      const escrowContract = new ethers.Contract(contractAddress, ESCROW_ABI, wallet);
      
      // Convert UUID to numeric job ID
      const numericJobId = uuidToNumericId(jobId);
      console.log('📋 Numeric Job ID:', numericJobId.toString());
      
      // Check if job exists on-chain
      const jobData = await escrowContract.getJob(numericJobId);
      if (!jobData.exists) {
        console.error('❌ Job not found on blockchain');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Job not found on blockchain. Please ensure escrow was funded.' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('🔗 Job found on-chain, status:', jobData.status);
      
      // Call approveJob to release payment
      console.log('📤 Calling approveJob on smart contract...');
      const tx = await escrowContract.approveJob(numericJobId);
      console.log('⏳ Transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('✅ Payment released! Block:', receipt.blockNumber);
      
      // Update job status to completed
      const { error: statusError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (statusError) {
        console.error('❌ Failed to update job status:', statusError);
      } else {
        console.log('✅ Job status updated to completed');
      }
    } catch (contractError: any) {
      console.error('❌ Smart contract error:', contractError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to release payment: ${contractError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update listing status to sold
    if (job.listing_id) {
      const { error: listingError } = await supabase
        .from('social_media_listings')
        .update({ status: 'sold' })
        .eq('id', job.listing_id);

      if (listingError) {
        console.error('❌ Failed to update listing status:', listingError);
      } else {
        console.log('✅ Listing marked as sold');
      }
    }

    // Notify buyer that transfer is complete
    try {
      await supabase.functions.invoke('send-telegram-notification', {
        body: {
          recipient_id: job.client_id,
          message: `🎉 Ownership Transfer Complete!\n\n${listing.account_name} has been successfully transferred to you.\n\nThe payment has been released to the seller.`,
          url: `https://your-app-url.com/job-details/${jobId}`,
          button_text: 'View Job Details'
        }
      });
      console.log('✅ Buyer notification sent');
    } catch (notifError) {
      console.error('⚠️ Failed to send buyer notification:', notifError);
    }

    // Notify seller that payment was released
    try {
      await supabase.functions.invoke('send-telegram-notification', {
        body: {
          recipient_id: job.freelancer_id,
          message: `💰 Payment Released!\n\nOwnership of ${listing.account_name} has been transferred and payment has been released to your wallet.`,
          url: `https://your-app-url.com/job-details/${jobId}`,
          button_text: 'View Job Details'
        }
      });
      console.log('✅ Seller notification sent');
    } catch (notifError) {
      console.error('⚠️ Failed to send seller notification:', notifError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Ownership transferred successfully and payment released.',
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
