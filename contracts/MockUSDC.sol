// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Simple ERC20 token for testing on Polygon Amoy testnet
 * Anyone can mint tokens for testing purposes
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private _decimals;
    
    constructor() ERC20("Mock USDC", "USDC") Ownable(msg.sender) {
        _decimals = 6; // USDC uses 6 decimals
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**_decimals); // 1 million USDC
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Allows anyone to mint tokens for testing
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in smallest unit, e.g., 1000000 = 1 USDC)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
    
    /**
     * @dev Convenient function to mint USDC with proper decimals
     * @param to Address to mint tokens to
     * @param amountInUSDC Amount in USDC (e.g., 100 = 100 USDC)
     */
    function mintUSDC(address to, uint256 amountInUSDC) external {
        _mint(to, amountInUSDC * 10**_decimals);
    }
}
