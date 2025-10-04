# DeFiLance Escrow Smart Contract

This directory contains the Solidity smart contract for the DeFiLance escrow system.

## 📋 Overview

The `Escrow.sol` contract provides secure, trustless payment handling for freelance jobs with:
- ✅ Funds locked in smart contract (non-custodial)
- ✅ Automatic deadline enforcement
- ✅ Dispute resolution system
- ✅ Platform fee collection
- ✅ Multi-token support (USDC, DAI, etc.)

## 🚀 Deployment Guide

### Prerequisites

1. Install dependencies:
```bash
npm install --save-dev hardhat @openzeppelin/contracts @nomiclabs/hardhat-ethers ethers
```

2. Install Hardhat (if not already):
```bash
npx hardhat
```

### Deployment Steps

1. **Create Hardhat Config** (`hardhat.config.js`):
```javascript
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY",
      accounts: ["YOUR_PRIVATE_KEY"]
    },
    polygon: {
      url: "https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY",
      accounts: ["YOUR_PRIVATE_KEY"]
    }
  }
};
```

2. **Create Deployment Script** (`scripts/deploy.js`):
```javascript
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const platformWallet = "YOUR_PLATFORM_WALLET_ADDRESS";
  
  const Escrow = await ethers.getContractFactory("DeFiLanceEscrow");
  const escrow = await Escrow.deploy(platformWallet);
  
  await escrow.deployed();
  
  console.log("Escrow contract deployed to:", escrow.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

3. **Deploy to Testnet**:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

4. **Verify Contract** (optional but recommended):
```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS "PLATFORM_WALLET_ADDRESS"
```

## 🔧 Configuration

After deployment, update your `.env` file:
```
VITE_ESCROW_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

## 📝 Contract Functions

### For Clients:
- `fundJob(jobId, freelancer, token, amount)` - Create and fund escrow
- `approveJob(jobId)` - Approve work and release payment
- `raiseDispute(jobId)` - Raise a dispute
- `reclaimFunds(jobId)` - Reclaim if freelancer misses deadline

### For Freelancers:
- `submitWork(jobId, ipfsHash)` - Submit completed work

### For Arbitrators:
- `resolveDispute(jobId, clientPercentage)` - Resolve disputes with custom split

### View Functions:
- `getJob(jobId)` - Get job details

## 🔐 Security Features

- ✅ ReentrancyGuard protection
- ✅ Access control modifiers
- ✅ OpenZeppelin audited libraries
- ✅ Deadline enforcement
- ✅ No direct ETH handling (ERC20 only)

## 🧪 Testing

Create test file (`test/Escrow.test.js`):
```javascript
const { expect } = require("chai");

describe("DeFiLance Escrow", function () {
  it("Should fund a job", async function () {
    // Test implementation
  });
  
  it("Should release payment on approval", async function () {
    // Test implementation
  });
  
  it("Should handle disputes", async function () {
    // Test implementation
  });
});
```

Run tests:
```bash
npx hardhat test
```

## 📊 Supported Networks

Recommended networks for deployment:
- **Sepolia** (Ethereum testnet) - For testing
- **Polygon** (mainnet) - Low fees, fast transactions
- **Base** - Coinbase L2, good for payments
- **Arbitrum** - Low fees, Ethereum security

## 💰 Token Support

The contract supports any ERC20 token. Recommended stablecoins:
- USDC - Most widely used
- USDT - High liquidity
- DAI - Decentralized stablecoin

## 🔄 Integration with Frontend

The frontend uses `src/hooks/useEscrow.ts` to interact with this contract. Make sure to:

1. Update contract address in environment
2. Fund jobs through the UI
3. Approve ERC20 token spending before funding
4. Monitor events for real-time updates

## ⚠️ Important Notes

- **Never** share your private keys
- **Always** test on testnet first
- **Audit** before mainnet deployment
- **Monitor** contract for suspicious activity
- **Upgrade** carefully with governance

## 📚 Resources

- [Hardhat Documentation](https://hardhat.org/getting-started/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Ethers.js Documentation](https://docs.ethers.io/)
