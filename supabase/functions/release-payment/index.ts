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

    // Escrow contract ABI - including release to address function
    const escrowAbi = [
      "function releaseAfterTransferToAddress(uint256 jobId, address sellerAddress) external",
      "function getJob(uint256 jobId) external view returns (tuple(address client, address freelancer, address token, uint256 amount, uint256 freelancerStake, uint256 platformFee, uint8 status, uint256 submissionDeadline, uint256 reviewDeadline, uint256 approvalDeadline, string ipfsHash, string gitCommitHash, uint256 currentRevisionNumber, uint256 allowedRevisions, bool autoReleaseEnabled, uint8 jobStatus, bool exists))",
      "function jobs(uint256) external view returns (address client, address freelancer, address token, uint256 amount, uint256 platformFee, uint256 freelancerStake, uint256 arbitrationDeposit, uint256 submissionDeadline, uint256 reviewDeadline, uint256 approvalDeadline, string ipfsHash, string gitCommitHash, uint256 currentRevisionNumber, uint256 allowedRevisions, bool autoReleaseEnabled, uint8 status, bool exists)"
    ];
    const escrowContract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, escrowAbi, wallet);

    // FIXED: Use the same UUID to numeric conversion as the frontend
    const uuidToNumericId = (uuid: string): bigint => {
      const hex = uuid.replace(/-/g, '').slice(0, 16);
      return BigInt('0x' + hex);
    };
    
    const numericJobId = uuidToNumericId(jobId);

    console.log(`Numeric Job ID: ${numericJobId.toString()}`);

    // First, check if job exists on-chain
    try {
      const jobData = await escrowContract.jobs(numericJobId);
      console.log('Job on-chain data:', {
        exists: jobData.exists,
        client: jobData.client,
        freelancer: jobData.freelancer,
        amount: jobData.amount.toString(),
        status: jobData.status.toString()
      });

      if (!jobData.exists) {
        throw new Error('⚠️ Job not funded on blockchain.\n\n' +
          'The job exists in the database but was never funded through the smart contract.\n\n' +
          'To fix this:\n' +
          '1. Go to the job details page\n' +
          '2. Click "Fund Escrow" button\n' +
          '3. Connect wallet and complete the funding transaction\n' +
          '4. Then try approving/releasing payment again');
      }

      // Status codes: 0=CREATED, 1=FUNDED, 2=IN_PROGRESS, 3=SUBMITTED, 4=REVISION_REQUESTED, 5=COMPLETED, 6=DISPUTED, 7=REFUNDED
      if (jobData.status !== 2 && jobData.status !== 3) {
        throw new Error(`Invalid job status: ${jobData.status}. Expected IN_PROGRESS(2) or SUBMITTED(3). Please ensure the job is properly funded and in correct state.`);
      }
    } catch (error) {
      console.error('Job validation error:', error);
      throw error;
    }

    console.log(`Calling escrow contract to release payment to ${freelancerWallet}...`);

    // Call the escrow contract's release function with freelancer wallet address
    const releaseTx = await escrowContract.releaseAfterTransferToAddress(
      numericJobId, 
      freelancerWallet,
      {
        maxPriorityFeePerGas: ethers.parseUnits('50', 'gwei'),
        maxFeePerGas: ethers.parseUnits('100', 'gwei'),
        gasLimit: 500000
      }
    );
    
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
