const hre = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0xb95A71b5EfDb52eEa055eBD27168DC49E6c6685b";
    const NEW_PLATFORM_WALLET = "0x04AB61505d33DC4738E9d963722E5FB3e059d406";
    const NEW_PLATFORM_FEE = 800; // 8% (800 basis points)

    console.log("Connecting to DeFiLanceEscrow contract...");
    console.log("Contract Address:", CONTRACT_ADDRESS);

    // Get contract factory and attach to deployed address
    const DeFiLanceEscrow = await hre.ethers.getContractFactory("DeFiLanceEscrow");
    const escrow = DeFiLanceEscrow.attach(CONTRACT_ADDRESS);

    // Read current settings
    console.log("\n📊 Current Settings:");
    const currentWallet = await escrow.platformWallet();
    const currentFee = await escrow.defaultPlatformFee();
    console.log("Current Platform Wallet:", currentWallet);
    console.log(
        "Current Platform Fee:",
        currentFee.toString(),
        "basis points (",
        Number(currentFee) / 100,
        "%)"
    );

    // Update platform wallet
    if (currentWallet.toLowerCase() !== NEW_PLATFORM_WALLET.toLowerCase()) {
        console.log("\n🔄 Updating platform wallet to:", NEW_PLATFORM_WALLET);
        const walletTx = await escrow.setPlatformWallet(NEW_PLATFORM_WALLET);
        console.log("Transaction sent:", walletTx.hash);
        console.log("Waiting for confirmation...");
        await walletTx.wait();
        console.log("✅ Platform wallet updated!");
    } else {
        console.log("\nℹ️  Platform wallet already set to desired address. Skipping.");
    }

    // Update platform fee
    if (Number(currentFee) !== NEW_PLATFORM_FEE) {
        console.log(
            "\n🔄 Updating platform fee to:",
            NEW_PLATFORM_FEE,
            "basis points (",
            NEW_PLATFORM_FEE / 100,
            "%)"
        );
        const feeTx = await escrow.setPlatformFee(NEW_PLATFORM_FEE);
        console.log("Transaction sent:", feeTx.hash);
        console.log("Waiting for confirmation...");
        await feeTx.wait();
        console.log("✅ Platform fee updated!");
    } else {
        console.log("\nℹ️  Platform fee already set to desired value. Skipping.");
    }

    // Verify new settings
    console.log("\n✨ New Settings:");
    const newWallet = await escrow.platformWallet();
    const newFee = await escrow.defaultPlatformFee();
    console.log("New Platform Wallet:", newWallet);
    console.log(
        "New Platform Fee:",
        newFee.toString(),
        "basis points (",
        Number(newFee) / 100,
        "%)"
    );

    console.log("\n🎉 All updates completed successfully!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        console.error(error);
        process.exit(1);
    });