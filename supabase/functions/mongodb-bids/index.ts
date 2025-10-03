import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MONGODB_URI = Deno.env.get('MONGODB_URI') || "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>";
const DB_NAME = "defilance";
const COLLECTION_NAME = "bids";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data, bidId, jobId, freelancerId } = await req.json();

    console.log(`MongoDB Bids API - Action: ${action}`);
    
    switch (action) {
      case 'create':
        const newBid = {
          _id: crypto.randomUUID(),
          ...data,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        console.log('Creating bid:', newBid);
        return new Response(
          JSON.stringify({ success: true, bid: newBid }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'list':
        const mockBids = [
          {
            _id: '1',
            jobId: jobId || '1',
            freelancerId: 'freelancer-1',
            amount: 4.5,
            proposalText: 'I have 5 years of experience in DeFi development...',
            estimatedDuration: '2 weeks',
            status: 'pending',
            createdAt: new Date().toISOString(),
            freelancer: {
              name: 'Sarah Developer',
              rating: 4.9,
              completedJobs: 45,
              skills: ['React', 'Solidity', 'Web3']
            }
          },
          {
            _id: '2',
            jobId: jobId || '1',
            freelancerId: 'freelancer-2',
            amount: 5.0,
            proposalText: 'Expert blockchain developer ready to deliver...',
            estimatedDuration: '3 weeks',
            status: 'pending',
            createdAt: new Date().toISOString(),
            freelancer: {
              name: 'Mike Blockchain',
              rating: 4.8,
              completedJobs: 38,
              skills: ['Solidity', 'Smart Contracts', 'Hardhat']
            }
          }
        ];
        return new Response(
          JSON.stringify({ success: true, bids: mockBids }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'accept':
        return new Response(
          JSON.stringify({ success: true, message: 'Bid accepted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'reject':
        return new Response(
          JSON.stringify({ success: true, message: 'Bid rejected' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'update':
        return new Response(
          JSON.stringify({ success: true, message: 'Bid updated successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in mongodb-bids function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
