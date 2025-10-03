# MongoDB Atlas Integration Guide

This project includes MongoDB Atlas integration via Supabase Edge Functions. The functions are implemented with mock data that you can replace with real MongoDB operations when deploying.

## Edge Functions Created

### 1. `mongodb-jobs` - Job Management
**Location:** `supabase/functions/mongodb-jobs/index.ts`

**Actions:**
- `create` - Create a new job posting
- `list` - Get all jobs with optional filters
- `get` - Get a single job by ID
- `update` - Update job details
- `delete` - Remove a job

**Usage Example:**
```typescript
const { data, error } = await supabase.functions.invoke('mongodb-jobs', {
  body: {
    action: 'create',
    data: {
      title: 'Smart Contract Development',
      description: 'Build a DeFi protocol',
      budget: 5.5,
      skills: ['Solidity', 'Web3'],
      clientId: 'user-123'
    }
  }
});
```

### 2. `mongodb-bids` - Bidding System
**Location:** `supabase/functions/mongodb-bids/index.ts`

**Actions:**
- `create` - Submit a bid on a job
- `list` - Get all bids for a job
- `accept` - Accept a bid
- `reject` - Reject a bid
- `update` - Update bid details

**Usage Example:**
```typescript
const { data, error } = await supabase.functions.invoke('mongodb-bids', {
  body: {
    action: 'create',
    data: {
      jobId: 'job-123',
      freelancerId: 'user-456',
      amount: 4.5,
      proposalText: 'I can complete this in 3 weeks...',
      estimatedDuration: '3 weeks'
    }
  }
});
```

### 3. `mongodb-payments` - Payment & Escrow
**Location:** `supabase/functions/mongodb-payments/index.ts`

**Actions:**
- `createEscrow` - Lock funds in escrow
- `releasePayment` - Release payment to freelancer
- `refund` - Process refund to client
- `getHistory` - Get payment history
- `getBalance` - Get user's balance

**Usage Example:**
```typescript
const { data, error } = await supabase.functions.invoke('mongodb-payments', {
  body: {
    action: 'createEscrow',
    data: {
      jobId: 'job-123',
      clientId: 'user-123',
      freelancerId: 'user-456',
      amount: 5.5
    }
  }
});
```

### 4. `mongodb-messages` - Messaging System
**Location:** `supabase/functions/mongodb-messages/index.ts`

**Actions:**
- `send` - Send a message
- `getConversations` - Get user's conversations
- `getMessages` - Get messages in a conversation
- `markAsRead` - Mark messages as read
- `createConversation` - Start a new conversation

**Usage Example:**
```typescript
const { data, error } = await supabase.functions.invoke('mongodb-messages', {
  body: {
    action: 'send',
    data: {
      conversationId: 'conv-123',
      senderId: 'user-123',
      content: 'Hello! Let\'s discuss the project.'
    }
  }
});
```

## Setup Instructions

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (M0 Sandbox is free)
4. Create a database user with password
5. Whitelist IP addresses (0.0.0.0/0 for development)

### Step 2: Get Connection String
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<username>`, `<password>`, and `<database>` with your values

Example:
```
mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/defilance?retryWrites=true&w=majority
```

### Step 3: Add Secret to Lovable
1. In Lovable, go to your project settings
2. Navigate to Backend → Secrets
3. Add a new secret:
   - Name: `MONGODB_URI`
   - Value: Your MongoDB connection string

### Step 4: Install MongoDB Deno Driver

In each edge function, uncomment the import line:
```typescript
import { MongoClient } from "https://deno.land/x/mongo@v0.31.1/mod.ts";
```

### Step 5: Replace Mock Implementation

Replace the mock implementations with real MongoDB operations:

```typescript
// Connect to MongoDB
const client = new MongoClient();
await client.connect(MONGODB_URI);
const db = client.database(DB_NAME);
const collection = db.collection(COLLECTION_NAME);

// Perform operations
switch (action) {
  case 'create':
    const result = await collection.insertOne(data);
    return new Response(
      JSON.stringify({ success: true, id: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  case 'list':
    const items = await collection.find(filters).toArray();
    return new Response(
      JSON.stringify({ success: true, items }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  // ... more cases
}

// Close connection
client.close();
```

## Database Schema Recommendations

### Jobs Collection
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  budget: Number,
  budgetCurrency: String, // 'ETH', 'USD'
  duration: String,
  skills: [String],
  status: String, // 'open', 'in_progress', 'completed', 'cancelled'
  clientId: String,
  freelancerId: String,
  acceptedBidId: String,
  featured: Boolean,
  urgent: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Bids Collection
```javascript
{
  _id: ObjectId,
  jobId: String,
  freelancerId: String,
  amount: Number,
  proposalText: String,
  estimatedDuration: String,
  status: String, // 'pending', 'accepted', 'rejected'
  createdAt: Date
}
```

### Payments Collection
```javascript
{
  _id: ObjectId,
  jobId: String,
  clientId: String,
  freelancerId: String,
  amount: Number,
  status: String, // 'locked', 'released', 'refunded'
  transactionHash: String,
  type: String, // 'escrow', 'release', 'refund'
  createdAt: Date
}
```

### Messages Collection
```javascript
{
  _id: ObjectId,
  conversationId: String,
  senderId: String,
  content: String,
  read: Boolean,
  timestamp: Date
}
```

### Conversations Collection
```javascript
{
  _id: ObjectId,
  participants: [String], // Array of user IDs
  jobId: String,
  lastMessageAt: Date,
  createdAt: Date
}
```

## Frontend Integration

The frontend pages are already set up to call these edge functions. You just need to uncomment the API calls and remove the mock data.

### Example: Calling from React Component
```typescript
import { supabase } from "@/integrations/supabase/client";

// Fetch jobs
const fetchJobs = async () => {
  const { data, error } = await supabase.functions.invoke('mongodb-jobs', {
    body: { action: 'list', filters: { status: 'open' } }
  });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  setJobs(data.jobs);
};

// Submit a bid
const submitBid = async (jobId, amount, proposal) => {
  const { data, error } = await supabase.functions.invoke('mongodb-bids', {
    body: {
      action: 'create',
      data: {
        jobId,
        freelancerId: user.id,
        amount,
        proposalText: proposal,
        estimatedDuration: '2 weeks'
      }
    }
  });
  
  if (error) {
    console.error('Error:', error);
    toast({ title: "Error", description: "Failed to submit bid" });
    return;
  }
  
  toast({ title: "Success", description: "Bid submitted!" });
};
```

## Web3 Payment Integration

For blockchain payments, you'll need to:

1. Install ethers.js in edge functions
2. Set up smart contracts for escrow
3. Add wallet private key as a secret
4. Integrate with blockchain RPC endpoint

See comments in `mongodb-payments/index.ts` for detailed implementation.

## Testing

1. **Local Testing** (without MongoDB):
   - The functions currently return mock data
   - Test API calls and UI integration
   
2. **With MongoDB**:
   - Add your MONGODB_URI secret
   - Deploy functions (automatic in Lovable)
   - Test CRUD operations through the UI

## Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with strong password
- [ ] Connection string added as MONGODB_URI secret
- [ ] MongoDB driver imported in edge functions
- [ ] Mock implementations replaced with real DB operations
- [ ] All edge functions tested
- [ ] Error handling implemented
- [ ] Proper indexes created in MongoDB
- [ ] RLS/security rules reviewed

## Additional Features to Implement

1. **Real-time Messaging**: Use MongoDB Change Streams + WebSockets
2. **File Storage**: Integrate with IPFS or cloud storage
3. **Smart Contracts**: Deploy escrow contracts to blockchain
4. **Search**: Implement full-text search in MongoDB
5. **Analytics**: Track user activity and job metrics
6. **Notifications**: Email/SMS notifications for bids and messages

## Support

For issues or questions:
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Deno MongoDB Driver: https://deno.land/x/mongo
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
