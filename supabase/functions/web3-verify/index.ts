// ============================================
// WEB3 SIGNATURE VERIFICATION
// ============================================
// This edge function verifies Web3 wallet signatures
// for secure authentication and transaction validation
// 
// USAGE:
// 1. Frontend signs a message with user's wallet
// 2. Send signature to this function for verification
// 3. Use verified address for authentication
// 
// EXAMPLE FRONTEND CODE:
// const message = `Sign this message to authenticate with DeFiLance.\nNonce: ${nonce}`;
// const signature = await window.ethereum.request({
//   method: 'personal_sign',
//   params: [message, address],
// });
// 
// const { data } = await supabase.functions.invoke('web3-verify', {
//   body: { message, signature, address }
// });
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.7.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, signature, address } = await req.json();

    if (!message || !signature || !address) {
      throw new Error("message, signature, and address are required");
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    // Check if recovered address matches provided address
    const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();

    console.log("Signature verification:", {
      provided: address,
      recovered: recoveredAddress,
      isValid,
    });

    return new Response(
      JSON.stringify({
        valid: isValid,
        recoveredAddress,
        message: isValid 
          ? "Signature verified successfully" 
          : "Signature verification failed",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error verifying signature:", error);
    return new Response(
      JSON.stringify({ 
        valid: false,
        error: error.message 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
