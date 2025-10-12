# Platform Fee & Wallet Management Guide

## Current Setup

Your DeFiLance Escrow contract has these fee settings:

- **Platform Fee**: 2% (200 basis points) - Line 63 in `contracts/Escrow.sol`
- **Platform Wallet**: Set during contract deployment (Line 62)

## How Platform Fees Work

1. **When Fees Are Collected**: 
   - Fees are deducted when a job is completed
   - Payment flow: Job Amount → Freelancer (98%) + Platform Fee (2%)

2. **Fee Currency**: 
   - Fees are paid in the same token as the job (usually USDC)
   - Location: `_releasePayment()` function (Lines 289-295)

## Changing Platform Wallet Address

**Good News**: You can change the wallet WITHOUT redeploying the contract!

### Steps to Change Wallet:

1. Connect to your contract as the owner (deployer address)
2. Call the `setPlatformWallet` function:
   ```solidity
   setPlatformWallet("YOUR_NEW_WALLET_ADDRESS")
   ```
3. Only the contract owner can execute this function

**Code Reference**: Lines 478-481 in `contracts/Escrow.sol`

## Changing Platform Fee Percentage

### To Change Fee to 8%:

1. Connect as the contract owner
2. Call the `setPlatformFee` function:
   ```solidity
   setPlatformFee(800)  // 800 basis points = 8%
   ```

### Fee Limits:
- Maximum allowed: 10% (1000 basis points)
- Current: 2% (200 basis points)
- Recommended: 3-5% for competitive marketplace

**Code Reference**: Lines 469-472 in `contracts/Escrow.sol`

## Checking Current Wallet

To verify which wallet is receiving fees:

1. Read the `platformWallet` public variable from your deployed contract
2. Use a blockchain explorer or contract interface
3. The wallet address is visible at line 62 in the contract

## Fee Distribution Example

**Job Amount: $1,000 USDC, Fee: 8%**

- Freelancer receives: $920 USDC
- Platform wallet receives: $80 USDC (8%)

**Location in Code**: `_releasePayment()` function handles all transfers

## Important Notes

- ✅ Wallet address can be changed anytime (owner only)
- ✅ Fee percentage can be changed anytime (owner only)
- ✅ No redeployment needed for changes
- ✅ Fees paid in USDC automatically
- ❌ Cannot exceed 10% maximum fee
- ❌ Only contract owner can make changes

## Contract Owner Functions

All these functions require owner privileges:

1. `setPlatformWallet(address newWallet)` - Update fee recipient
2. `setPlatformFee(uint256 newFee)` - Update fee percentage
3. `setArbitrator(address arbitrator, bool status)` - Manage arbitrators

**Owner Address**: The wallet that deployed the contract
