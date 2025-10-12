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
            accounts: ["0xc71d8e7981441f3e71351e28b846072aaa308445e59aa23e5448eb0c92db4ff0"],
            chainId: 80002
        }
    }
};