require('dotenv').config();
const hre = require("hardhat");

async function main() {
  const escrowAddress = process.env.CONTRACT_ADDRESS;
  const platformWallet = '0x04AB61505d33DC4738E9d963722E5FB3e059d406';

  if (!escrowAddress) {
    console.error('❌ CONTRACT_ADDRESS not found in .env file');
    process.exit(1);
  }

  console.log('Setting arbitrator...');
  console.log('Contract:', escrowAddress);
  console.log('Platform wallet:', platformWallet);

  const Escrow = await hre.ethers.getContractFactory("DeFiLanceEscrow");
  const escrow = Escrow.attach(escrowAddress);

  // Check if already an arbitrator
  const isArbitrator = await escrow.arbitrators(platformWallet);
  console.log('Current arbitrator status:', isArbitrator);

  if (isArbitrator) {
    console.log('✅ Platform wallet is already an arbitrator');
    return;
  }

  // Set as arbitrator
  console.log('Setting platform wallet as arbitrator...');
  const tx = await escrow.setArbitrator(platformWallet, true, {
    maxPriorityFeePerGas: hre.ethers.parseUnits('50', 'gwei'),
    maxFeePerGas: hre.ethers.parseUnits('100', 'gwei'),
  });
  
  console.log('Transaction submitted:', tx.hash);
  await tx.wait();
  
  console.log('✅ Platform wallet is now an arbitrator');
  
  // Verify
  const verified = await escrow.arbitrators(platformWallet);
  console.log('Verified arbitrator status:', verified);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
