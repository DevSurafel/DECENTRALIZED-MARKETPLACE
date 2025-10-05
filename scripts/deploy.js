const hre = require("hardhat");

async function main() {
  console.log("Deploying DeFiLanceEscrow to Polygon Amoy...");

  // Get the USDC token address for Polygon Amoy
  const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582"; // Polygon Amoy USDC

  // Deploy the contract
  const DeFiLanceEscrow = await hre.ethers.getContractFactory("DeFiLanceEscrow");
  const escrow = await DeFiLanceEscrow.deploy(USDC_ADDRESS);

  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("DeFiLanceEscrow deployed to:", address);
  console.log("\nAdd this to your .env file:");
  console.log(`VITE_ESCROW_CONTRACT_ADDRESS="${address}"`);

  // Wait for block confirmations before verification
  console.log("\nWaiting for block confirmations...");
  await escrow.deploymentTransaction().wait(6);

  // Verify contract on PolygonScan (optional, requires API key)
  if (process.env.POLYGONSCAN_API_KEY) {
    console.log("\nVerifying contract on PolygonScan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [USDC_ADDRESS],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
