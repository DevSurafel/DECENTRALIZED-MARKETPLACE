import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { ethers } from "https://esm.sh/ethers@6.7.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_FEE_PERCENTAGE = 0.08; // 2% platform fee
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

    const { jobId, freelancerWallet, amount } = await req.json();

    console.log(`Release Payment - Job: ${jobId}, Freelancer: ${freelancerWallet}, Amount: ${amount}`);

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
    const USDC_CONTRACT_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'; // USDC on Polygon

    if (!RPC_URL || !WALLET_PRIVATE_KEY) {
      throw new Error('Missing RPC_URL or WALLET_PRIVATE_KEY environment variables');
    }

    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

    // USDC contract ABI (minimal - only transfer function)
    const usdcAbi = [
      "function transfer(address to, uint256 amount) returns (bool)"
    ];
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, usdcAbi, wallet);

    console.log('Initiating USDC transfers...');

    // Get current gas price and set appropriate fees for Polygon
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('50', 'gwei'); // Fallback to 50 Gwei
    
    // Gas options for Polygon network
    const gasOptions = {
      maxPriorityFeePerGas: ethers.parseUnits('50', 'gwei'), // 50 Gwei tip
      maxFeePerGas: ethers.parseUnits('100', 'gwei'), // 100 Gwei max
      gasLimit: 100000 // Sufficient for USDC transfer
    };

    // Transfer to freelancer
    const freelancerTx = await usdcContract.transfer(
      freelancerWallet,
      ethers.parseUnits(freelancerAmount.toString(), 6), // USDC has 6 decimals
      gasOptions
    );
    const freelancerReceipt = await freelancerTx.wait();
    const freelancerTxHash = freelancerReceipt.hash;
    console.log(`Freelancer transfer completed: ${freelancerTxHash}`);

    // Transfer platform fee
    const platformTx = await usdcContract.transfer(
      PLATFORM_WALLET_ADDRESS,
      ethers.parseUnits(platformFee.toString(), 6),
      gasOptions
    );
    const platformReceipt = await platformTx.wait();
    const platformTxHash = platformReceipt.hash;
    console.log(`Platform fee transfer completed: ${platformTxHash}`);

    console.log(`Freelancer TX: ${freelancerTxHash}, Platform TX: ${platformTxHash}`);

    // Log the payment transaction
    const { error: logError } = await supabase
      .from('payment_transactions')
      .insert({
        job_id: jobId,
        freelancer_wallet: freelancerWallet,
        freelancer_amount: freelancerAmount,
        freelancer_tx_hash: freelancerTxHash,
        platform_fee: platformFee,
        platform_wallet: PLATFORM_WALLET_ADDRESS,
        platform_tx_hash: platformTxHash,
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
        freelancerTxHash,
        platformFee,
        platformTxHash,
        freelancerWallet,
        platformWallet: PLATFORM_WALLET_ADDRESS,
        message: 'Payment released successfully'
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
