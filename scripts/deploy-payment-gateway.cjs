const hre = require("hardhat");

async function main() {
    console.log("Deploying PaymentGateway to Polygon Amoy...");

    // Your existing contract addresses
    const ESCROW_ADDRESS = "0xb95A71b5EfDb52eEa055eBD27168DC49E6c6685b";
    const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";

    const PaymentGateway = await hre.ethers.getContractFactory("PaymentGateway");
    const gateway = await PaymentGateway.deploy(ESCROW_ADDRESS, USDC_ADDRESS);

    await gateway.waitForDeployment();

    const address = await gateway.getAddress();
    console.log("✅ PaymentGateway deployed to:", address);
    
    console.log("\n📝 Update your WalletConnectFunding.tsx:");
    console.log(`const PAYMENT_GATEWAY_ADDRESS = '${address}';`);

    console.log("\n⚠️  IMPORTANT NEXT STEPS:");
    console.log("1. Update the PAYMENT_GATEWAY_ADDRESS in WalletConnectFunding.tsx");
    console.log("2. Users need to approve the Payment Gateway once to spend their USDC");
    console.log("3. After approval, they can fund jobs with 2 QR scans (no website login needed)");

    console.log("\nWaiting for block confirmations...");
    await gateway.deploymentTransaction().wait(6);

    console.log("✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
