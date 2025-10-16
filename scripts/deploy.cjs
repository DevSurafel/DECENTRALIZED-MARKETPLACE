const hre = require("hardhat");

async function main() {
    console.log("Deploying DeFiLanceEscrow to Polygon Amoy...");

    const USDC_ADDRESS = "0x8b0180f2101c8260d49339abfee87927412494b4";

    const DeFiLanceEscrow = await hre.ethers.getContractFactory("DeFiLanceEscrow");
    const escrow = await DeFiLanceEscrow.deploy(USDC_ADDRESS);

    await escrow.waitForDeployment();

    const address = await escrow.getAddress();
    console.log("DeFiLanceEscrow deployed to:", address);

    console.log("\nWaiting for block confirmations...");
    await escrow.deploymentTransaction().wait(6);

    // Set the edge function wallet as arbitrator
    const ARBITRATOR_WALLET = "0x04AB61505d33DC4738E9d963722E5FB3e059d406";
    console.log("\nSetting arbitrator wallet:", ARBITRATOR_WALLET);
    const setArbitratorTx = await escrow.setArbitrator(ARBITRATOR_WALLET, true);
    await setArbitratorTx.wait();
    console.log("✅ Arbitrator wallet set successfully!");

    console.log("\n=== DEPLOYMENT COMPLETE ===");
    console.log("\n1. Add this to your .env file:");
    console.log(`VITE_ESCROW_CONTRACT_ADDRESS="${address}"`);
    console.log("\n2. Update the CONTRACT_ADDRESS secret in Supabase:");
    console.log(`   Go to: https://supabase.com/dashboard/project/qyjauqjduzbbwjmenczr/settings/functions`);
    console.log(`   Update CONTRACT_ADDRESS to: ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
