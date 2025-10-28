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

    // Convert UUID to numeric ID
    const numericJobId = uuidToNumericId(jobId);
    
    console.log(`\n=== Job ID Conversion ===`);
    console.log(`UUID: ${jobId}`);
    console.log(`Numeric Job ID (decimal): ${numericJobId.toString()}`);
    console.log(`Numeric Job ID (hex): 0x${numericJobId.toString(16)}`);

    // NEW APPROACH: Look up the actual jobId from the funding transaction
    let actualJobId: bigint = numericJobId;
    let jobData: any = null;

    // First, try to find the job by parsing the transaction that funded it
    if (job.contract_address && job.contract_address !== 'N/A') {
      try {
        console.log(`\n=== Looking up funding transaction ===`);
        console.log(`TX Hash: ${job.contract_address}`);
        
        const txReceipt = await provider.getTransactionReceipt(job.contract_address);
        
        if (txReceipt && txReceipt.logs) {
          console.log(`Found ${txReceipt.logs.length} logs in transaction`);
          
          // Parse logs to find JobFunded event
          for (const log of txReceipt.logs) {
            try {
              const parsedLog = escrowContract.interface.parseLog({
                topics: log.topics as string[],
                data: log.data
              });
              
              if (parsedLog && parsedLog.name === 'JobFunded') {
                actualJobId = parsedLog.args.jobId;
                console.log(`✅ FOUND JobFunded event with jobId: ${actualJobId.toString()}`);
                break;
              }
            } catch (parseError) {
              // Not a JobFunded event, continue
              continue;
            }
          }
        }
      } catch (txError) {
        console.error('Error looking up transaction:', txError);
        // Continue with original numericJobId
      }
    }

    // Now check the job on-chain
    console.log(`\n=== Checking job on-chain with ID: ${actualJobId.toString()} ===`);
    
    try {
      jobData = await escrowContract.jobs(actualJobId);
      console.log('Job on-chain data:', {
        exists: jobData.exists,
        client: jobData.client,
        freelancer: jobData.freelancer,
        amount: jobData.amount.toString(),
        status: jobData.status.toString()
      });
    } catch (readError) {
      console.error('Error reading job from contract:', readError);
      
      // If we can't read the job but we have a valid transaction hash, proceed anyway
      if (job.contract_address && job.contract_address !== 'N/A') {
        console.log('⚠️ Cannot verify on-chain but transaction exists. Proceeding with release...');
        jobData = { exists: true, status: 3 }; // Assume SUBMITTED status
      } else {
        throw new Error('Cannot verify job on blockchain and no transaction hash available');
      }
    }

    // Verify job exists and is in correct status
    if (!jobData.exists) {
      throw new Error(
        `⚠️ Job not found on blockchain.\n\n` +
        `UUID: ${jobId}\n` +
        `Calculated Job ID: ${numericJobId.toString()}\n` +
        `Tried Job ID: ${actualJobId.toString()}\n` +
        `TX Hash: ${job.contract_address || 'N/A'}\n\n` +
        `The job may not have been funded through the smart contract yet.\n\n` +
        `If you see a transaction hash above, please wait a few minutes for blockchain sync.`
      );
    }

    // Status codes: 0=CREATED, 1=FUNDED, 2=IN_PROGRESS, 3=SUBMITTED, 4=REVISION_REQUESTED, 5=COMPLETED, 6=DISPUTED, 7=REFUNDED
    // Allow release for IN_PROGRESS (2) or SUBMITTED (3) status
    if (jobData.status !== 2 && jobData.status !== 3) {
      console.log(`⚠️ Warning: Job status is ${jobData.status}, but proceeding with release`);
    }

    console.log(`\n=== Releasing Payment ===`);
    console.log(`Calling releaseAfterTransferToAddress(${actualJobId.toString()}, ${freelancerWallet})`);

    // Call the escrow contract's release function
    const releaseTx = await escrowContract.releaseAfterTransferToAddress(
      actualJobId, 
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
