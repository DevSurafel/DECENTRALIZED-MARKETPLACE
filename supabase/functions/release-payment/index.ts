import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { ethers } from "https://esm.sh/ethers@6.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_FEE_PERCENTAGE = 0.08; // 8% platform fee
const PLATFORM_WALLET_ADDRESS = '0x04AB61505d33DC4738E9d963722E5FB3e059d406'; // Platform wallet to receive fees (lowercase)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { jobId } = await req.json();

      console.log(`Release Payment - Job: ${jobId}`);

      // Fetch job details including freelancer wallet address
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('freelancer_wallet_address, budget_usdc, freelancer_id')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Job not found or error fetching job details');
      }

      const freelancerWallet = job.freelancer_wallet_address;
      const amount = job.budget_usdc;

      console.log(`Payment details - Freelancer: ${freelancerWallet}, Amount: ${amount}`);

      if (!freelancerWallet || !amount) {
        throw new Error('Missing freelancer wallet address or amount');
      }

    // Calculate amounts
    const platformFee = amount * PLATFORM_FEE_PERCENTAGE;
    const freelancerAmount = amount - platformFee;

    console.log(`Platform Fee: ${platformFee}, Freelancer Amount: ${freelancerAmount}`);

    // Get environment variables for blockchain interaction
    const RPC_URL = Deno.env.get('RPC_URL');
    const WALLET_PRIVATE_KEY = Deno.env.get('WALLET_PRIVATE_KEY');
    const ESCROW_CONTRACT_ADDRESS = Deno.env.get('CONTRACT_ADDRESS');

    if (!RPC_URL || !WALLET_PRIVATE_KEY || !ESCROW_CONTRACT_ADDRESS) {
      throw new Error('Missing RPC_URL, WALLET_PRIVATE_KEY, or CONTRACT_ADDRESS environment variables');
    }

    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

    // Escrow contract ABI - just the release function
    const escrowAbi = [
      "function releaseAfterTransfer(uint256 jobId) external",
      "function getJob(uint256 jobId) external view returns (tuple(address client, address freelancer, address token, uint256 amount, uint256 freelancerStake, uint256 platformFee, uint8 status, uint256 deadline, uint256 reviewDeadline, uint256 allowedRevisions, uint256 currentRevisionNumber))"
    ];
    const escrowContract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, escrowAbi, wallet);

    console.log('Calling escrow contract to release payment...');

    // Convert UUID to numeric ID
    const uuidBytes = new TextEncoder().encode(jobId);
    let numericJobId = BigInt(0);
    for (let i = 0; i < Math.min(uuidBytes.length, 8); i++) {
      numericJobId = (numericJobId << BigInt(8)) | BigInt(uuidBytes[i]);
    }

    // Call the escrow contract's release function
    const releaseTx = await escrowContract.releaseAfterTransfer(numericJobId, {
      maxPriorityFeePerGas: ethers.parseUnits('50', 'gwei'),
      maxFeePerGas: ethers.parseUnits('100', 'gwei'),
      gasLimit: 300000
    });
    
    const receipt = await releaseTx.wait();
    const txHash = receipt.hash;
    console.log(`Payment released via escrow contract: ${txHash}`);

    console.log(`Transaction hash: ${txHash}`);

    // Log the payment transaction
    const { error: logError } = await supabase
      .from('payment_transactions')
      .insert({
        job_id: jobId,
        freelancer_wallet: freelancerWallet,
        freelancer_amount: freelancerAmount,
        freelancer_tx_hash: txHash,
        platform_fee: platformFee,
        platform_wallet: PLATFORM_WALLET_ADDRESS,
        platform_tx_hash: txHash,
        total_amount: amount,
        status: 'completed',
        processed_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging transaction:', logError);
      // Don't throw - payment was successful even if logging failed
    }

    return new Response(
      JSON.stringify({
        success: true,
        freelancerAmount,
        txHash,
        platformFee,
        freelancerWallet,
        platformWallet: PLATFORM_WALLET_ADDRESS,
        message: 'Payment released successfully via escrow contract'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error releasing payment:', error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
