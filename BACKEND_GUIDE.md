# DeFiLance Backend Implementation Guide

## Project Structure

This project follows the standard Lovable architecture:
- **Frontend**: `src/` directory (React + TypeScript + Vite)
- **Backend**: `supabase/functions/` directory (Edge Functions with Deno)
- **Database**: Managed via Supabase (migrations in `supabase/migrations/`)

**Note**: The frontend and backend are already properly separated. Do not try to restructure into separate folders.

## Backend Features Implemented

### 1. Database (Already Set Up)
Located in `supabase/migrations/`:
- ✅ User profiles with wallet addresses
- ✅ Jobs marketplace with skills and budgets
- ✅ Bidding system
- ✅ Messaging/conversations
- ✅ Reviews and ratings
- ✅ Milestone tracking
- ✅ Row Level Security (RLS) policies

### 2. Authentication (Already Set Up)
- ✅ Email/password authentication
- ✅ Wallet address storage
- ✅ Auto-confirm emails for development
- ✅ Session management

### 3. Edge Functions (Sample Implementation)

#### A. Telegram Bot Integration
**Files**:
- `supabase/functions/telegram-webhook/index.ts` - Receives messages from Telegram
- `supabase/functions/send-telegram-notification/index.ts` - Sends notifications to Telegram

**Setup Instructions**:
1. Create a bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Get your bot token
3. Add `TELEGRAM_BOT_TOKEN` secret via Lovable backend interface
4. Set webhook URL using: 
   ```
   https://api.telegram.org/bot[YOUR_TOKEN]/setWebhook?url=https://waayddlcbsvcitnjycfs.supabase.co/functions/v1/telegram-webhook
   ```
5. Update `profiles` table with user's `telegram_chat_id` and `telegram_username`

**To Modify**:
- Update message routing logic in `telegram-webhook/index.ts`
- Customize notification templates in `send-telegram-notification/index.ts`
- Add commands handling (e.g., /start, /help)

#### B. IPFS Upload Handler
**File**: `supabase/functions/ipfs-upload/index.ts`

**Setup Instructions**:
1. Sign up for an IPFS service:
   - [Pinata](https://pinata.cloud/) (Recommended)
   - [Web3.Storage](https://web3.storage/)
   - [Infura IPFS](https://infura.io/)
2. Add API keys as secrets:
   - `PINATA_API_KEY`
   - `PINATA_SECRET_KEY`
3. Uncomment the Pinata upload code in the function

**Usage Example**:
```typescript
const formData = new FormData();
formData.append('file', fileBlob);

const { data } = await supabase.functions.invoke('ipfs-upload', {
  body: formData
});
console.log('IPFS Hash:', data.ipfsHash);
console.log('Gateway URL:', data.gateway);
```

#### C. Web3 Signature Verification
**File**: `supabase/functions/web3-verify/index.ts`

**Features**:
- ✅ Verifies wallet signatures for authentication
- ✅ Recovers signer address from signature
- ✅ Uses ethers.js library

**Usage Example**:
```typescript
// Frontend: Sign message with wallet
const message = `Sign this to authenticate with DeFiLance.\nNonce: ${Date.now()}`;
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [message, address],
});

// Verify signature
const { data } = await supabase.functions.invoke('web3-verify', {
  body: { message, signature, address }
});

if (data.valid) {
  console.log('Signature verified!');
}
```

## Features You Need to Implement

### 1. Smart Contracts (Blockchain Layer)
**Technologies**: Solidity, Hardhat/Foundry, OpenZeppelin

**Contracts to Create**:
- **JobEscrow.sol**: Holds funds in escrow until milestones complete
- **DeFiLanceMarketplace.sol**: Main contract for job/bid management
- **DisputeResolution.sol**: Handles disputes between clients and freelancers
- **ReputationNFT.sol**: Issues NFTs based on completed jobs and ratings

**Steps**:
1. Set up Hardhat project: `npm install --save-dev hardhat`
2. Write contracts in `contracts/` folder
3. Deploy to testnet (Goerli/Sepolia)
4. Store contract addresses in environment variables
5. Create ABIs and import in frontend

### 2. Web3 Integration (Frontend)
**File Locations**: 
- Create `src/lib/web3.ts` for Web3 utilities
- Create `src/hooks/useContract.ts` for contract interactions
- Update `src/pages/` to include wallet connection flows

**Libraries Needed**:
```bash
npm install ethers wagmi viem @rainbow-me/rainbowkit
```

**Features to Add**:
- Connect/disconnect wallet (already started in Auth.tsx)
- Send transactions for job creation, bidding, payments
- Listen to contract events
- Display transaction status

**Example Hook**:
```typescript
// src/hooks/useContract.ts
import { useContract, useProvider } from 'wagmi';
import JobEscrowABI from '@/contracts/JobEscrow.json';

export const useJobEscrow = () => {
  const provider = useProvider();
  const contract = useContract({
    address: '0x...', // Your deployed contract
    abi: JobEscrowABI,
    signerOrProvider: provider,
  });
  
  return { contract };
};
```

### 3. IPFS File Storage (Frontend Integration)
**Files to Create**:
- `src/lib/ipfs.ts` - IPFS upload utilities
- `src/components/FileUpload.tsx` - File upload component

**Integration**:
```typescript
// src/lib/ipfs.ts
import { supabase } from '@/integrations/supabase/client';

export const uploadToIPFS = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const { data, error } = await supabase.functions.invoke('ipfs-upload', {
    body: formData
  });
  
  if (error) throw error;
  return data.ipfsHash;
};
```

### 4. Real-time Features
**Already Available via Supabase**:
- Real-time message updates (see `src/pages/Chat.tsx`)
- Live job updates
- Bid notifications

**To Enable**:
```sql
-- Run in Supabase SQL editor
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
```

**Subscribe to Changes**:
```typescript
const channel = supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    console.log('New message:', payload);
  })
  .subscribe();
```

## Managing Secrets

Use the Lovable backend interface to add secrets:
1. Click "Manage Backend" in the chat
2. Go to Secrets section
3. Add your API keys:
   - `TELEGRAM_BOT_TOKEN`
   - `PINATA_API_KEY`
   - `PINATA_SECRET_KEY`
   - Any other service API keys

## Testing Edge Functions Locally

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Test function
supabase functions serve telegram-webhook --no-verify-jwt
```

## Deployment

✅ **Edge functions deploy automatically** when you update code in Lovable!

No manual deployment needed - just save your changes and they'll be live.

## Next Steps

1. **Smart Contracts**: Write and deploy your Solidity contracts
2. **Web3 Setup**: Install wagmi/ethers and create contract interaction hooks
3. **IPFS Setup**: Configure Pinata account and add API keys
4. **Telegram Bot**: Create bot and configure webhook
5. **Testing**: Test each feature individually before integration

## Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Pinata IPFS Guide](https://docs.pinata.cloud/)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

**Remember**: This is a working application with a complete database and authentication system. Focus on adding the blockchain layer and external service integrations.
