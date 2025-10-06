const hre = require("hardhat");

async function main() {
  console.log("Deploying MockUSDC to Polygon Amoy testnet...");

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();

  await mockUSDC.waitForDeployment();
  const address = await mockUSDC.getAddress();

  console.log("MockUSDC deployed to:", address);
  console.log("\nTo verify on PolygonScan:");
  console.log(`npx hardhat verify --network amoy ${address}`);
  
  console.log("\n✅ IMPORTANT: Update your .env file:");
  console.log(`VITE_USDC_CONTRACT_ADDRESS=${address}`);
  
  // Mint some tokens to the deployer
  console.log("\nMinting 10,000 USDC to deployer...");
  const [deployer] = await hre.ethers.getSigners();
  await mockUSDC.mintUSDC(deployer.address, 10000);
  console.log("Minted successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
