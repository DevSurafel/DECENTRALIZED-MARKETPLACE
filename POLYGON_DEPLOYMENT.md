# Polygon & USDC Deployment Guide

## Overview
This guide covers deploying the DeFiLance Escrow smart contract on Polygon with USDC payments.

## Network Configuration

### Polygon Mumbai Testnet (Development)
- Chain ID: 80001
- RPC URL: https://rpc-mumbai.maticvigil.com
- Block Explorer: https://mumbai.polygonscan.com
- USDC Contract: `0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97`
- Faucet: https://faucet.polygon.technology

### Polygon Mainnet (Production)
- Chain ID: 137
- RPC URL: https://polygon-rpc.com
- Block Explorer: https://polygonscan.com
- USDC Contract: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`

## Prerequisites

1. **Install Hardhat**
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
```

2. **Get Test MATIC**
   - Visit https://faucet.polygon.technology
   - Enter your wallet address
   - Get free test MATIC for gas fees

3. **Get Test USDC**
   - Use Polygon Mumbai USDC faucet
   - Or bridge from Ethereum testnet

## Deployment Steps

### Step 1: Configure Hardhat

Create `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    polygonMumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 80001
    },
    polygon: {
      url: "https://polygon-rpc.com",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 137
    }
  },
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY
    }
  }
};
```

### Step 2: Deploy Contract

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const platformWallet = "YOUR_PLATFORM_WALLET_ADDRESS";
  
  console.log("Deploying DeFiLanceEscrow...");
  
  const DeFiLanceEscrow = await hre.ethers.getContractFactory("DeFiLanceEscrow");
  const escrow = await DeFiLanceEscrow.deploy(platformWallet);
  
  await escrow.waitForDeployment();
  
  const address = await escrow.getAddress();
  console.log("DeFiLanceEscrow deployed to:", address);
  
  // Wait for confirmations before verifying
  console.log("Waiting for confirmations...");
  await escrow.deploymentTransaction().wait(5);
  
  // Verify on PolygonScan
  console.log("Verifying contract...");
  await hre.run("verify:verify", {
    address: address,
    constructorArguments: [platformWallet],
  });
  
  console.log("Contract verified!");
  console.log(`Add this to your .env file:`);
  console.log(`VITE_ESCROW_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Step 3: Deploy to Testnet

```bash
# Deploy to Polygon Mumbai Testnet
npx hardhat run scripts/deploy.js --network polygonMumbai
```

### Step 4: Configure Frontend

Add to your `.env` file:
```
VITE_ESCROW_CONTRACT_ADDRESS=<deployed_contract_address>
```

The frontend is already configured to use:
- Polygon Mumbai Testnet
- USDC (6 decimals)
- Auto network switching
- Real-time event listening

## Testing the Integration

### 1. Connect MetaMask
- Add Polygon Mumbai network to MetaMask
- Get test MATIC from faucet
- Get test USDC

### 2. Test Flow
1. **Client funds job**: `fundJob(jobId, freelancer, USDC_ADDRESS, amount, false, 3)`
2. **Freelancer submits work**: `submitWork(jobId, ipfsHash, gitHash)`
3. **Client reviews**: Either approve or request revision
4. **Payment release**: Funds automatically released to freelancer

### 3. Monitor Transactions
- View on Mumbai PolygonScan: https://mumbai.polygonscan.com
- Check real-time events in the app
- Transaction hashes stored in database

## Real-Time Features

The integration includes:

1. **Event Listening**: Real-time updates for all contract events
2. **Transaction Tracking**: All tx hashes stored in database
3. **Telegram Notifications**: Automatic notifications for key events
4. **Auto-Release**: Funds auto-release if client doesn't respond
5. **IPFS Integration**: Work deliverables stored on IPFS

## Security Features

- ✅ ReentrancyGuard protection
- ✅ Access control (only client/freelancer/arbitrator)
- ✅ Revision limits (default: 3)
- ✅ Auto-release timeouts
- ✅ Dispute resolution with arbitration
- ✅ Freelancer stake slashing for fraud
- ✅ Platform fee collection (2%)

## Production Deployment

For mainnet deployment:

1. Update network config to Polygon Mainnet
2. Update USDC address to mainnet: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
3. Get security audit before mainnet launch
4. Test thoroughly on testnet first
5. Deploy with mainnet private key
6. Verify contract on PolygonScan
7. Update frontend environment variables

## Gas Estimates (Polygon)

Typical transaction costs on Polygon Mainnet:

- **Fund Job**: ~$0.01 - $0.02
- **Submit Work**: ~$0.01
- **Approve Job**: ~$0.02 - $0.03
- **Raise Dispute**: ~$0.02
- **Resolve Dispute**: ~$0.03 - $0.04

## Troubleshooting

### Network Not Added
- The app auto-adds Polygon Mumbai if not in MetaMask

### Insufficient Balance
- Get test MATIC from faucet for gas
- Get test USDC for payments

### Transaction Fails
- Check gas limits
- Verify contract address is set
- Ensure network is correct (Mumbai for testnet)

### Event Not Firing
- Check block explorer for transaction
- Verify event listener is active
- Refresh page to reconnect

## Support

- Polygon Docs: https://docs.polygon.technology
- Hardhat Docs: https://hardhat.org/docs
- OpenZeppelin: https://docs.openzeppelin.com
- MetaMask: https://docs.metamask.io

## Next Steps

1. Deploy contract to Polygon Mumbai testnet
2. Test end-to-end payment flow
3. Monitor events and transaction hashes
4. Test dispute resolution
5. Prepare for mainnet deployment after audit
