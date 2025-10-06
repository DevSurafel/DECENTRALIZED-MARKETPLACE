# Mock USDC Deployment Guide

Since there's no reliable public USDC test token on Polygon Amoy testnet, we've created a simple mock USDC contract that you can deploy.

## Prerequisites

1. MetaMask wallet with some Amoy testnet MATIC (get from [Alchemy Faucet](https://www.alchemy.com/faucets/polygon-amoy))
2. Node.js and npm installed
3. Hardhat configured (already set up in this project)

## Deployment Steps

### 1. Install OpenZeppelin Contracts

```bash
npm install @openzeppelin/contracts
```

### 2. Update Hardhat Config

Make sure your `hardhat.config.cjs` has your private key set. Add to your `.env`:

```
PRIVATE_KEY=your_wallet_private_key_here
```

### 3. Deploy Mock USDC

```bash
npx hardhat run scripts/deploy-mock-usdc.js --network amoy
```

This will:
- Deploy the MockUSDC contract
- Mint 10,000 USDC to your wallet
- Display the contract address

### 4. Update Environment Variables

Copy the deployed contract address and add it to your `.env` file:

```
VITE_USDC_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

### 5. Verify Contract (Optional but Recommended)

```bash
npx hardhat verify --network amoy YOUR_CONTRACT_ADDRESS
```

## Using Mock USDC

### Mint Tokens for Testing

You can mint unlimited test USDC tokens using any of these methods:

#### Method 1: Using the Contract on PolygonScan

1. Go to your contract on [Amoy PolygonScan](https://amoy.polygonscan.com)
2. Navigate to "Write Contract"
3. Connect your wallet
4. Use the `mintUSDC` function:
   - `to`: Your wallet address
   - `amountInUSDC`: Amount you want (e.g., 1000 for 1000 USDC)

#### Method 2: Using Hardhat Console

```bash
npx hardhat console --network amoy
```

```javascript
const MockUSDC = await ethers.getContractFactory("MockUSDC");
const usdc = await MockUSDC.attach("YOUR_CONTRACT_ADDRESS");
await usdc.mintUSDC("WALLET_ADDRESS", 1000); // Mint 1000 USDC
```

#### Method 3: Using Remix IDE

1. Go to [Remix IDE](https://remix.ethereum.org)
2. Create a new file with the MockUSDC contract
3. Compile it
4. Connect to Polygon Amoy via MetaMask
5. Use "At Address" feature with your deployed address
6. Call `mintUSDC` function

## Testing the Integration

After deploying and configuring:

1. Mint some USDC to your client wallet
2. Mint some USDC to your freelancer wallet (if stake is required)
3. Test the full escrow flow:
   - Fund escrow
   - Submit work
   - Approve and release funds

## Security Note

⚠️ **This is a TEST TOKEN only!** Never use this contract on mainnet or for real funds. It allows anyone to mint unlimited tokens and is designed solely for testing purposes on testnets.

## Alternative: Use Existing Test Token

If you prefer not to deploy your own token, you can search for existing test tokens on Polygon Amoy:

1. Check [Amoy PolygonScan](https://amoy.polygonscan.com/tokens)
2. Look for verified ERC20 tokens with "Test" or "Mock" in the name
3. Update the USDC_CONTRACT_ADDRESS in `src/hooks/useEscrow.ts`

Make sure the token:
- Has 6 decimals (to match USDC)
- Has a public faucet or mint function
- Is actively maintained
