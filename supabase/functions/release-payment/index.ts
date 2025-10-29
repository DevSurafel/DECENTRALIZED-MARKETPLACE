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

    // Verify we have a transaction hash - this is proof the job was funded
    if (!job.contract_address || job.contract_address === 'N/A') {
      throw new Error(
        '⚠️ No funding transaction found.\n\n' +
        'This job has not been funded through the escrow contract.\n\n' +
        'Please fund the escrow first before releasing payment.'
      );
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

    // CRITICAL: Look up the actual jobId from the funding transaction
    console.log(`\n=== Looking up job ID from funding transaction ===`);
    console.log(`TX Hash: ${job.contract_address}`);
    
    let actualJobId: bigint | null = null;
    
    try {
      const txReceipt = await provider.getTransactionReceipt(job.contract_address);
      
      if (!txReceipt) {
        throw new Error('Transaction receipt not found. The transaction may still be pending.');
      }
      
      console.log(`Found transaction with ${txReceipt.logs.length} logs`);
      
      // Parse logs to find JobFunded event
      for (const log of txReceipt.logs) {
        try {
          const parsedLog = escrowContract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
          
          if (parsedLog && parsedLog.name === 'JobFunded') {
            actualJobId = parsedLog.args.jobId;
            if (actualJobId) {
              console.log(`✅ FOUND JobFunded event with jobId: ${actualJobId.toString()}`);
              console.log(`Event details:`, {
                jobId: actualJobId.toString(),
                client: parsedLog.args.client,
                freelancer: parsedLog.args.freelancer,
                amount: parsedLog.args.amount.toString()
              });
            }
            break;
          }
        } catch (parseError) {
          // Not a JobFunded event, continue
          continue;
        }
      }
      
      if (!actualJobId) {
        throw new Error('JobFunded event not found in transaction logs');
      }
    } catch (txError: any) {
      console.error('Error looking up transaction:', txError);
      
      // Fallback: try the UUID conversion method
      console.log('⚠️ Falling back to UUID conversion method');
      const calculatedId = uuidToNumericId(jobId);
      console.log(`Calculated Job ID from UUID: ${calculatedId.toString()}`);
      
      // Try to verify this ID exists on-chain
      try {
        const jobData = await escrowContract.jobs(calculatedId);
        if (jobData.exists) {
          console.log('✅ Found job on-chain using calculated ID');
          actualJobId = calculatedId;
        }
      } catch (verifyError) {
        console.error('Could not verify calculated ID:', verifyError);
      }
      
      if (!actualJobId) {
        throw new Error(
          `⚠️ Cannot determine on-chain job ID.\n\n` +
          `Transaction: ${job.contract_address}\n` +
          `Error: ${txError.message}\n\n` +
          `The funding transaction exists but we cannot parse its job ID. ` +
          `Please contact support with this transaction hash.`
        );
      }
    }

    // Now verify the job on-chain
    console.log(`\n=== Verifying job on-chain with ID: ${actualJobId.toString()} ===`);
    
    let jobData: any;
    try {
      jobData = await escrowContract.jobs(actualJobId);
      console.log('Job on-chain data:', {
        exists: jobData.exists,
        client: jobData.client,
        freelancer: jobData.freelancer,
        amount: ethers.formatUnits(jobData.amount, 6),
        status: jobData.status.toString()
      });
      
      if (!jobData.exists) {
        throw new Error('Job not found on-chain despite valid transaction hash');
      }
    } catch (readError: any) {
      console.error('Error reading job from contract:', readError);
      throw new Error(
        `⚠️ Cannot read job from blockchain.\n\n` +
        `Job ID: ${actualJobId.toString()}\n` +
        `Error: ${readError.message}\n\n` +
        `The RPC endpoint may be temporarily unavailable. Please try again in a few minutes.`
      );
    }

    // Status codes: 0=CREATED, 1=FUNDED, 2=IN_PROGRESS, 3=SUBMITTED, 4=REVISION_REQUESTED, 5=COMPLETED, 6=DISPUTED, 7=REFUNDED
    console.log(`Job status on-chain: ${jobData.status}`);
    
    // Allow release for IN_PROGRESS (2) or SUBMITTED (3) status
    if (jobData.status !== 2 && jobData.status !== 3) {
      console.log(`⚠️ Warning: Job status is ${jobData.status}, expected 2 (IN_PROGRESS) or 3 (SUBMITTED)`);
      console.log(`Proceeding with release anyway - smart contract will enforce correct status`);
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
