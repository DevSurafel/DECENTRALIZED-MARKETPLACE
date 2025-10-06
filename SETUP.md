# FreelanceChain Setup Guide

## 🚨 Important: Contract Deployment Required

Before you can use the escrow features, you need to deploy two contracts:

1. **MockUSDC** - A test USDC token for Polygon Amoy testnet
2. **Escrow Contract** - The main escrow smart contract

## Prerequisites

- MetaMask wallet installed
- Polygon Amoy testnet added to MetaMask
- Amoy testnet MATIC for gas fees ([Get from Alchemy Faucet](https://www.alchemy.com/faucets/polygon-amoy))
- Node.js v18+ installed

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Your Wallet

1. Get your wallet's private key from MetaMask:
   - Click on the three dots → Account Details → Export Private Key
   - ⚠️ **WARNING**: Never share this key or commit it to git!

2. Create a `.env` file in the project root (if not exists) and add:
   ```
   PRIVATE_KEY=your_private_key_here
   ```

## Step 3: Get Testnet MATIC

1. Go to [Alchemy Polygon Amoy Faucet](https://www.alchemy.com/faucets/polygon-amoy)
2. Enter your wallet address
3. Request 0.1 POL (MATIC)
4. Wait for confirmation

## Step 4: Deploy MockUSDC Token

```bash
npx hardhat run scripts/deploy-mock-usdc.js --network amoy
```

**Expected output:**
```
Deploying MockUSDC to Polygon Amoy testnet...
MockUSDC deployed to: 0xAbC123...

✅ IMPORTANT: Update your .env file:
VITE_USDC_CONTRACT_ADDRESS=0xAbC123...
```

**Copy the contract address and add it to your `.env` file:**
```
VITE_USDC_CONTRACT_ADDRESS=0xYourMockUSDCAddress
```

### Verify the Contract (Optional)

```bash
npx hardhat verify --network amoy YOUR_MOCK_USDC_ADDRESS
```

## Step 5: Deploy Escrow Contract

```bash
npx hardhat run scripts/deploy.js --network amoy
```

**Copy the contract address and add it to your `.env` file:**
```
VITE_ESCROW_CONTRACT_ADDRESS=0xYourEscrowAddress
```

## Step 6: Mint Test USDC

You need USDC tokens to test the escrow functionality. You can mint unlimited test USDC:

### Option A: Using PolygonScan (Easiest)

1. Go to [Amoy PolygonScan](https://amoy.polygonscan.com)
2. Search for your MockUSDC contract address
3. Go to "Write Contract" tab
4. Connect your wallet
5. Use `mintUSDC` function:
   - `to`: Your wallet address
   - `amountInUSDC`: Amount you want (e.g., 10000 for 10,000 USDC)
6. Click "Write" and confirm the transaction

### Option B: Using Hardhat Console

```bash
npx hardhat console --network amoy
```

```javascript
const MockUSDC = await ethers.getContractFactory("MockUSDC");
const usdc = await MockUSDC.attach("YOUR_MOCK_USDC_ADDRESS");

// Mint 10,000 USDC to your wallet
await usdc.mintUSDC("YOUR_WALLET_ADDRESS", 10000);
```

## Step 7: Start the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Testing the Complete Flow

### For Clients:

1. **Create a Job**
   - Click "Post a Job"
   - Fill in job details
   - Set budget in USDC

2. **Fund Escrow**
   - After accepting a bid, click "Fund Escrow with Wallet"
   - Make sure you have enough USDC (mint if needed)
   - Approve USDC spending
   - Confirm escrow funding transaction

### For Freelancers:

1. **Submit Bids**
   - Browse available jobs
   - Submit your bid with proposed amount

2. **Submit Work**
   - After your bid is accepted and client funds escrow
   - Submit your work with IPFS hash and git commit

3. **Get Paid**
   - Client approves work
   - Funds automatically released to your wallet

## Common Issues & Solutions

### Issue: "USDC contract might not be deployed"

**Solution:** Make sure you:
1. Deployed MockUSDC successfully
2. Added `VITE_USDC_CONTRACT_ADDRESS` to `.env`
3. Restarted the dev server after updating `.env`

### Issue: "Insufficient USDC"

**Solution:** Mint more test USDC using the methods above

### Issue: "Wrong network"

**Solution:** 
1. Open MetaMask
2. Switch to Polygon Amoy Testnet
3. If not available, add it manually:
   - Network Name: Polygon Amoy Testnet
   - RPC URL: https://rpc-amoy.polygon.technology
   - Chain ID: 80002
   - Currency Symbol: POL
   - Block Explorer: https://amoy.polygonscan.com

### Issue: "Transaction failed"

**Solution:**
1. Check you have enough MATIC for gas fees
2. Verify contract addresses in `.env` are correct
3. Check transaction on [Amoy PolygonScan](https://amoy.polygonscan.com) for specific error

## Environment Variables Summary

Your `.env` file should contain:

```bash
# Blockchain Configuration
VITE_ESCROW_CONTRACT_ADDRESS=0xYourEscrowAddress
VITE_USDC_CONTRACT_ADDRESS=0xYourMockUSDCAddress

# For Deployment
PRIVATE_KEY=your_wallet_private_key_here

# Supabase (auto-generated, don't edit)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Additional Resources

- [MockUSDC Deployment Guide](MOCK_USDC_SETUP.md) - Detailed MockUSDC info
- [Polygon Deployment Guide](POLYGON_DEPLOYMENT.md) - Escrow deployment details
- [Backend Guide](BACKEND_GUIDE.md) - Supabase setup
- [Polygon Amoy Faucet](https://www.alchemy.com/faucets/polygon-amoy)
- [Polygon Amoy Explorer](https://amoy.polygonscan.com)

## Need Help?

If you encounter any issues:
1. Check console logs in browser DevTools
2. Verify all contract addresses are correct
3. Ensure you're on Polygon Amoy testnet
4. Check you have enough MATIC and USDC

## Security Notes

⚠️ **Important Security Reminders:**

1. **Never commit your PRIVATE_KEY to git**
2. **Never share your private key with anyone**
3. **This is testnet only** - Don't use these contracts on mainnet
4. **MockUSDC is for testing only** - It has no real value
5. Use the `.gitignore` file to exclude sensitive files

---

**You're all set!** 🎉 Start testing the complete escrow flow on Polygon Amoy testnet.
