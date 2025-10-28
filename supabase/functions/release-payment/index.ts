import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { ethers } from "https://esm.sh/ethers@6.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_FEE_PERCENTAGE = 0.08; // 8% platform fee
const PLATFORM_WALLET_ADDRESS = '0x04AB61505d33DC4738E9d963722E5FB3e059d406';

// UUID to numeric conversion - MUST match frontend exactly
const uuidToNumericId = (uuid: string): bigint => {
  const hex = uuid.replace(/-/g, '').slice(0, 16);
  return BigInt('0x' + hex);
};

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

    console.log(`\n=== Release Payment Request ===`);
    console.log(`Job UUID: ${jobId}`);

    // Fetch job details including freelancer wallet address
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('freelancer_wallet_address, budget_usdc, freelancer_id, contract_address, status')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found or error fetching job details');
    }

    console.log(`Job Status: ${job.status}`);
    console.log(`Contract Address (TX Hash): ${job.contract_address}`);
    console.log(`Freelancer Wallet: ${job.freelancer_wallet_address}`);
    console.log(`Budget USDC: ${job.budget_usdc}`);

    const freelancerWallet = job.freelancer_wallet_address;
    const amount = job.budget_usdc;

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

    console.log(`Using Escrow Contract: ${ESCROW_CONTRACT_ADDRESS}`);

    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

    // Escrow contract ABI
    const escrowAbi = [
      "function releaseAfterTransferToAddress(uint256 jobId, address sellerAddress) external",
      "function jobs(uint256) external view returns (address client, address freelancer, address token, uint256 amount, uint256 platformFee, uint256 freelancerStake, uint256 arbitrationDeposit, uint256 submissionDeadline, uint256 reviewDeadline, uint256 approvalDeadline, string ipfsHash, string gitCommitHash, uint256 currentRevisionNumber, uint256 allowedRevisions, bool autoReleaseEnabled, uint8 status, bool exists)",
      "event JobFunded(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount)"
    ];
    const escrowContract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, escrowAbi, wallet);

    // Convert UUID to numeric ID using the SAME method as frontend
    const numericJobId = uuidToNumericId(jobId);
    
    console.log(`\n=== Job ID Conversion ===`);
    console.log(`UUID: ${jobId}`);
    console.log(`Hex (no dashes, first 16 chars): ${jobId.replace(/-/g, '').slice(0, 16)}`);
    console.log(`Numeric Job ID (decimal): ${numericJobId.toString()}`);
    console.log(`Numeric Job ID (hex): 0x${numericJobId.toString(16)}`);

    // Try multiple possible job IDs to debug
    console.log(`\n=== Checking Multiple Possible Job IDs ===`);
    
    // Method 1: Hex conversion (what we expect to work)
    const method1Id = uuidToNumericId(jobId);
    console.log(`Method 1 (hex): ${method1Id.toString()}`);
    
    // Method 2: Old byte conversion (for comparison)
    const uuidBytes = new TextEncoder().encode(jobId);
    let method2Id = BigInt(0);
    for (let i = 0; i < Math.min(uuidBytes.length, 8); i++) {
      method2Id = (method2Id << BigInt(8)) | BigInt(uuidBytes[i]);
    }
    console.log(`Method 2 (bytes): ${method2Id.toString()}`);

    // Check both methods
    let foundJobId: bigint | null = null;
    let jobData: any = null;

    for (const [methodName, testId] of [['Method 1 (hex)', method1Id], ['Method 2 (bytes)', method2Id]]) {
      try {
        console.log(`\nTrying ${methodName}: ${testId.toString()}`);
        const testJobData = await escrowContract.jobs(testId);
        console.log(`Result for ${methodName}:`, {
          exists: testJobData.exists,
          client: testJobData.client,
          freelancer: testJobData.freelancer,
          amount: testJobData.amount.toString(),
          status: testJobData.status.toString()
        });

        if (testJobData.exists) {
          console.log(`✅ FOUND! Job exists with ${methodName}`);
          foundJobId = testId;
          jobData = testJobData;
          break;
        }
      } catch (error) {
        console.error(`Error checking ${methodName}:`, error);
      }
    }

    if (!foundJobId || !jobData) {
      // If we can't find it, let's check recent events
      console.log(`\n=== Checking Recent JobFunded Events ===`);
      try {
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10k blocks
        
        console.log(`Searching events from block ${fromBlock} to ${currentBlock}`);
        
        const filter = escrowContract.filters.JobFunded();
        const events = await escrowContract.queryFilter(filter, fromBlock, currentBlock);
        
        console.log(`Found ${events.length} JobFunded events`);
        
        // Show the last 5 events
        const recentEvents = events.slice(-5);
        for (const event of recentEvents) {
          console.log(`Event - JobId: ${event.args?.jobId?.toString()}, Client: ${event.args?.client}, Freelancer: ${event.args?.freelancer}, Amount: ${event.args?.amount?.toString()}`);
        }
        
        // Try to match by transaction hash
        if (job.contract_address) {
          console.log(`\nLooking for event with TX hash: ${job.contract_address}`);
          const matchingEvent = events.find(e => e.transactionHash.toLowerCase() === job.contract_address.toLowerCase());
          if (matchingEvent) {
            console.log(`✅ FOUND MATCHING EVENT!`);
            console.log(`Actual Job ID used: ${matchingEvent.args?.jobId?.toString()}`);
            foundJobId = matchingEvent.args?.jobId;
            jobData = await escrowContract.jobs(foundJobId);
          }
        }
      } catch (eventError) {
        console.error('Error checking events:', eventError);
      }

      if (!foundJobId || !jobData) {
        throw new Error(
          `⚠️ Job not found on blockchain.\n\n` +
          `We tried multiple job ID conversion methods and checked recent events, but couldn't find this job on-chain.\n\n` +
          `UUID: ${jobId}\n` +
          `Method 1 ID: ${method1Id.toString()}\n` +
          `Method 2 ID: ${method2Id.toString()}\n` +
          `TX Hash: ${job.contract_address || 'N/A'}\n\n` +
          `This suggests the job was never actually funded through the smart contract.\n\n` +
          `To fix:\n` +
          `1. Go to the job details page\n` +
          `2. Click "Fund Escrow" button\n` +
          `3. Connect wallet and complete the funding transaction\n` +
          `4. Then try approving/releasing payment again`
        );
      }
    }

    console.log(`\n=== Using Job ID: ${foundJobId.toString()} ===`);
    console.log('Job on-chain data:', {
      exists: jobData.exists,
      client: jobData.client,
      freelancer: jobData.freelancer,
      amount: jobData.amount.toString(),
      status: jobData.status.toString()
    });

    // Status codes: 0=CREATED, 1=FUNDED, 2=IN_PROGRESS, 3=SUBMITTED, 4=REVISION_REQUESTED, 5=COMPLETED, 6=DISPUTED, 7=REFUNDED
    if (jobData.status !== 2 && jobData.status !== 3) {
      throw new Error(`Invalid job status: ${jobData.status}. Expected IN_PROGRESS(2) or SUBMITTED(3).`);
    }

    console.log(`\n=== Releasing Payment ===`);
    console.log(`Calling releaseAfterTransferToAddress(${foundJobId.toString()}, ${freelancerWallet})`);

    // Call the escrow contract's release function
    const releaseTx = await escrowContract.releaseAfterTransferToAddress(
      foundJobId, 
      freelancerWallet,
      {
        maxPriorityFeePerGas: ethers.parseUnits('50', 'gwei'),
        maxFeePerGas: ethers.parseUnits('100', 'gwei'),
        gasLimit: 500000
      }
    );
    
    console.log(`Transaction sent: ${releaseTx.hash}`);
    
    const receipt = await releaseTx.wait();
    const txHash = receipt.hash;
    
    console.log(`✅ Payment released successfully! TX: ${txHash}`);

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
    console.error('\n=== ERROR ===');
    console.error('Error releasing payment:', error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
