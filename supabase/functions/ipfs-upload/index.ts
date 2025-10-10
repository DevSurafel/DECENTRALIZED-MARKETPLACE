// ============================================
// IPFS UPLOAD HANDLER
// ============================================
// This edge function handles uploading files to IPFS
// for decentralized storage of portfolios, contracts, and deliverables
// 
// SETUP INSTRUCTIONS:
// 1. Sign up for a service like Pinata, Web3.Storage, or Infura IPFS
// 2. Add your API keys as secrets (e.g., IPFS_API_KEY, IPFS_API_SECRET)
// 3. Call this function from frontend to upload files
// 
// USAGE EXAMPLE:
// const formData = new FormData();
// formData.append('file', fileBlob);
// 
// const { data } = await supabase.functions.invoke('ipfs-upload', {
//   body: formData
// });
// console.log('IPFS Hash:', data.ipfsHash);
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PINATA_API_KEY = Deno.env.get("PINATA_API_KEY");
const PINATA_SECRET_KEY = Deno.env.get("PINATA_SECRET_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if API keys are configured
    if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
      console.error("Pinata API keys not configured");
      throw new Error("IPFS service not configured. Please add Pinata API keys.");
    }

    // Get file from request
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new Error("No file provided");
    }

    console.log("File received:", file.name, "Size:", file.size);

    // Upload to Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);

    console.log("Uploading to Pinata...");
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': PINATA_API_KEY,
        'pinata_secret_api_key': PINATA_SECRET_KEY,
      },
      body: pinataFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pinata API error:", errorText);
      throw new Error(`Pinata API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const ipfsHash = result.IpfsHash;

    console.log("Successfully uploaded to IPFS:", ipfsHash);

    return new Response(
      JSON.stringify({
        success: true,
        ipfsHash: ipfsHash,
        gateway: `https://ipfs.io/ipfs/${ipfsHash}`,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
