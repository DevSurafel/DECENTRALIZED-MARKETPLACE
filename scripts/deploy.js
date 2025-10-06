import hre from "hardhat";

async function main() {
    console.log("Deploying DeFiLanceEscrow to Polygon Amoy...");

    const USDC_ADDRESS = "0x8b0180f2101c8260d49339abfee87927412494b4"; // Mock USDC from Polygon Amoy faucet

    const DeFiLanceEscrow = await hre.ethers.getContractFactory("DeFiLanceEscrow");
    const escrow = await DeFiLanceEscrow.deploy(USDC_ADDRESS);

    await escrow.waitForDeployment();

    const address = await escrow.getAddress();
    console.log("DeFiLanceEscrow deployed to:", address);
    console.log("\nAdd this to your .env file:");
    console.log(`VITE_ESCROW_CONTRACT_ADDRESS="${address}"`);

    console.log("\nWaiting for block confirmations...");
    await escrow.deploymentTransaction().wait(6);

    console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
