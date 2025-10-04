import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONGODB_URI = Deno.env.get('MONGODB_URI') || "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>";
const DB_NAME = "defilance";
const COLLECTION_NAME = "payments";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data, paymentId, userId } = await req.json();

    console.log(`MongoDB Payments API - Action: ${action}`);
    
    switch (action) {
      case 'createEscrow':
        // Create escrow and fund on blockchain
        const escrow = {
          _id: crypto.randomUUID(),
          jobId: data.jobId,
          clientId: data.clientId,
          freelancerId: data.freelancerId,
          amount: data.amount,
          tokenAddress: data.tokenAddress || '0x0000000000000000000000000000000000000000',
          status: 'pending', // pending -> funded -> released/refunded
          transactionHash: null,
          blockchainJobId: data.jobId,
          submissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          approvalDeadline: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // In production: Call smart contract fundJob() function here
        // const tx = await contract.fundJob(jobId, freelancerAddress, tokenAddress, amount);
        // escrow.transactionHash = tx.hash;
        // escrow.status = 'funded';
        
        console.log('Creating escrow:', escrow);
        
        // TODO: Store in MongoDB
        // await db.collection('escrows').insertOne(escrow);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            escrow,
            message: 'Escrow created. Please fund via smart contract to activate.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'releasePayment':
        // Release payment from escrow (client approval)
        // In production: Call smart contract approveJob() function
        // const tx = await contract.approveJob(jobId);
        // await tx.wait();
        
        const releaseResult = {
          success: true,
          message: 'Payment released to freelancer',
          transactionHash: '0x' + crypto.randomUUID().replace(/-/g, ''),
          jobId: data.jobId,
          amount: data.amount,
          freelancerAddress: data.freelancerAddress,
          platformFee: data.platformFee || 0.02,
          releasedAt: new Date().toISOString()
        };
        
        // TODO: Update in MongoDB
        // await db.collection('escrows').updateOne(
        //   { jobId: data.jobId },
        //   { $set: { status: 'released', transactionHash: releaseResult.transactionHash, updatedAt: new Date() } }
        // );
        
        console.log('Payment released:', releaseResult);
        return new Response(
          JSON.stringify(releaseResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'refund':
        // Refund escrow to client (missed deadline or dispute resolution)
        // In production: Call smart contract reclaimFunds() or resolveDispute()
        // const tx = await contract.reclaimFunds(jobId);
        // await tx.wait();
        
        const refundResult = {
          success: true,
          message: 'Refund processed',
          transactionHash: '0x' + crypto.randomUUID().replace(/-/g, ''),
          jobId: data.jobId,
          amount: data.amount,
          clientAddress: data.clientAddress,
          reason: data.reason || 'deadline_missed',
          refundedAt: new Date().toISOString()
        };
        
        // TODO: Update in MongoDB
        console.log('Refund processed:', refundResult);
        return new Response(
          JSON.stringify(refundResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'raiseDispute':
        // Raise dispute on smart contract
        // In production: Call smart contract raiseDispute() function
        // const tx = await contract.raiseDispute(jobId);
        // await tx.wait();
        
        const disputeResult = {
          success: true,
          message: 'Dispute raised successfully',
          transactionHash: '0x' + crypto.randomUUID().replace(/-/g, ''),
          jobId: data.jobId,
          disputeReason: data.reason,
          raisedBy: data.raisedBy,
          raisedAt: new Date().toISOString()
        };
        
        console.log('Dispute raised:', disputeResult);
        return new Response(
          JSON.stringify(disputeResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'submitWork':
        // Freelancer submits work to smart contract
        // In production: Call smart contract submitWork() function
        // const tx = await contract.submitWork(jobId, ipfsHash);
        // await tx.wait();
        
        const submitResult = {
          success: true,
          message: 'Work submitted successfully',
          transactionHash: '0x' + crypto.randomUUID().replace(/-/g, ''),
          jobId: data.jobId,
          ipfsHash: data.ipfsHash,
          submittedAt: new Date().toISOString()
        };
        
        console.log('Work submitted:', submitResult);
        return new Response(
          JSON.stringify(submitResult),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'getHistory':
        // Get payment/escrow history
        // TODO: Fetch from MongoDB
        const mockHistory = [
          {
            _id: '1',
            type: 'escrow_created',
            amount: 5.5,
            status: 'funded',
            jobTitle: 'DeFi Dashboard Development',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            transactionHash: '0xabc123...',
            submissionDeadline: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
            approvalDeadline: new Date(Date.now() + 36 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            _id: '2',
            type: 'payment_released',
            amount: 3.2,
            status: 'completed',
            jobTitle: 'Smart Contract Audit',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            transactionHash: '0xdef456...',
            releasedAt: new Date(Date.now() - 172800000).toISOString()
          },
          {
            _id: '3',
            type: 'dispute_raised',
            amount: 2.8,
            status: 'disputed',
            jobTitle: 'NFT Marketplace Integration',
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            transactionHash: '0xghi789...',
            disputeReason: 'Work not as specified'
          }
        ];
        
        // Filter by userId if provided
        const filteredHistory = userId 
          ? mockHistory 
          : mockHistory;
        
        return new Response(
          JSON.stringify({ success: true, payments: filteredHistory }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'getBalance':
        // Mock balance retrieval
        return new Response(
          JSON.stringify({ 
            success: true, 
            balance: {
              available: 12.5,
              locked: 8.3,
              total: 20.8
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in mongodb-payments function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/*
  WEB3 PAYMENT INTEGRATION:
  
  This function handles payment escrow and release using blockchain.
  
  1. Install ethers.js for Web3 interactions:
     import { ethers } from "https://esm.sh/ethers@6.7.0";
  
  2. Add environment variables:
     - WALLET_PRIVATE_KEY: Server wallet for automated transactions
     - CONTRACT_ADDRESS: Deployed escrow smart contract address
     - RPC_URL: Blockchain RPC endpoint (Infura, Alchemy, etc.)
  
  3. Smart Contract Integration:
     const provider = new ethers.JsonRpcProvider(RPC_URL);
     const wallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
     const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
     
     // Create escrow
     const tx = await contract.createEscrow(jobId, freelancerAddress, amount);
     await tx.wait();
     
     // Release payment
     const releaseTx = await contract.releasePayment(escrowId);
     await releaseTx.wait();
  
  4. Store transaction details in MongoDB for tracking
*/
