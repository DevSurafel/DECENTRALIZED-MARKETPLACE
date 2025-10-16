require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 1
            },
            viaIR: true
        }
    },
    networks: {
        polygonAmoy: {
            url: "https://rpc-amoy.polygon.technology",
            accounts: [process.env.DEPLOYER_PRIVATE_KEY],
            chainId: 80002
        }
    }
};
