# DeFiLance Crypto Payment Deployment Guide

## Overview
This guide will help you deploy the real crypto payment system using USDT BEP-20 on Binance Smart Chain (BSC).

## Prerequisites
1. MetaMask wallet installed
2. BNB for gas fees (BSC Testnet or Mainnet)
3. Hardhat or Remix for smart contract deployment
4. Basic understanding of blockchain transactions

## Step 1: Deploy Escrow Smart Contract

### Option A: Using Remix (Easiest)
1. Go to https://remix.ethereum.org
2. Create a new file `Escrow.sol` and paste the contract from `contracts/Escrow.sol`
3. Compile the contract (Solidity 0.8.19+)
4. Connect MetaMask to BSC Testnet:
   - Network: BSC Testnet
   - RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/
   - Chain ID: 97
   - Symbol: BNB
   - Block Explorer: https://testnet.bscscan.com
5. Deploy the contract:
   - Set constructor parameter `_platformWallet` to your platform wallet address
   - Deploy and confirm transaction
6. **Save the deployed contract address** - you'll need this!

### Option B: Using Hardhat
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

Create deployment script in `scripts/deploy.js`:
```javascript
async function main() {
  const [deployer] = await ethers.getSigners();
  const platformWallet = "YOUR_PLATFORM_WALLET_ADDRESS";
  
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(platformWallet);
  await escrow.deployed();
  
  console.log("Escrow deployed to:", escrow.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Deploy:
```bash
npx hardhat run scripts/deploy.js --network bscTestnet
```

## Step 2: Configure Environment Variables

Add your deployed contract address to `.env`:
```
VITE_ESCROW_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

**Important**: Never commit the `.env` file to version control!

## Step 3: Get Test USDT (Testnet Only)

For BSC Testnet:
1. Get test BNB from faucet: https://testnet.binance.org/faucet-smart
2. Get test USDT from: https://testnet.binance.org/faucet-smart
   - Contract: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd`

## Step 4: Test the Flow

### As Client:
1. Login to the platform with your wallet address
2. Post a job with budget in USDT (e.g., 50 USDT)
3. Wait for freelancer bids
4. Accept a bid - this will:
   - Prompt MetaMask for USDT approval
   - Prompt MetaMask to fund escrow
   - Lock funds in smart contract

### As Freelancer:
1. Browse marketplace and submit bid
2. Once accepted, complete the work
3. Submit work with IPFS hash
4. Wait for client approval

### As Client (Final):
1. Review submitted work
2. Approve the job - this will:
   - Prompt MetaMask confirmation
   - Release payment to freelancer's wallet
   - Deduct platform fee automatically

## Step 5: Production Deployment (Mainnet)

### Important Changes for Mainnet:

1. Update USDT contract address in `src/hooks/useEscrow.ts`:
```typescript
const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955'; // BSC Mainnet
```

2. Update network check to BSC Mainnet (Chain ID 56):
```typescript
const bscMainnetChainId = 56n;
// In wallet_switchEthereumChain: use '0x38'
```

3. Deploy contract to BSC Mainnet with sufficient BNB for gas

4. **Security Audit**: Get your smart contract audited before handling real funds!

## Smart Contract Features

✅ **Escrow Protection**: Funds locked until work approved  
✅ **Dispute Resolution**: Arbitrator can resolve conflicts  
✅ **Auto-release**: Automatic payment if client doesn't respond  
✅ **Platform Fee**: Configurable fee (default 2%)  
✅ **Revisions**: Support for work revisions  
✅ **Reputation**: Strike system for disputes  

## Gas Fee Estimates (BSC Mainnet)

- Fund Job: ~0.002 BNB
- Submit Work: ~0.001 BNB
- Approve Job: ~0.003 BNB
- Raise Dispute: ~0.002 BNB

## Troubleshooting

### "Insufficient Balance" Error
- Check USDT balance in MetaMask
- Ensure you have BNB for gas fees

### "Network Not Added" Error
- Add BSC network to MetaMask manually
- Check network settings match BSC specs

### Transaction Failed
- Increase gas limit in MetaMask
- Check contract is deployed correctly
- Verify wallet has sufficient funds

## Security Best Practices

1. **Never share private keys** or seed phrases
2. **Verify contract addresses** before transactions
3. **Test on testnet** thoroughly before mainnet
4. **Monitor transactions** on BSCScan
5. **Set appropriate deadlines** for escrow release
6. **Enable auto-release** to protect against client abandonment

## Support & Resources

- BSC Documentation: https://docs.binance.org/smart-chain/
- BSCScan (Testnet): https://testnet.bscscan.com
- BSCScan (Mainnet): https://bscscan.com
- MetaMask Support: https://support.metamask.io

## Next Steps

1. Deploy contract to testnet
2. Test complete job flow
3. Verify all transactions on BSCScan
4. Get security audit
5. Deploy to mainnet
6. Monitor and maintain

---

**Warning**: This involves real cryptocurrency transactions. Always test thoroughly on testnet before deploying to mainnet. The developers are not responsible for any loss of funds due to misuse or bugs.
