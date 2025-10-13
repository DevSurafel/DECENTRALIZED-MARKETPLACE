// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IDeFiLanceEscrow {
    function fundJob(
        uint256 jobId,
        address freelancer,
        address token,
        uint256 amount,
        bool requiresStake,
        uint256 allowedRevisions
    ) external;
}

/**
 * @title PaymentGateway
 * @notice Allows users to fund escrow in a single transaction
 * @dev Users approve this gateway once, then it can fund multiple jobs
 */
contract PaymentGateway {
    IDeFiLanceEscrow public immutable escrow;
    IERC20 public immutable usdc;
    
    event JobFundedViaGateway(
        address indexed client,
        uint256 indexed jobId,
        uint256 amount
    );
    
    constructor(address _escrow, address _usdc) {
        escrow = IDeFiLanceEscrow(_escrow);
        usdc = IERC20(_usdc);
    }
    
    /**
     * @notice Fund a job in one transaction
     * @dev User must have approved this gateway to spend USDC
     * @param jobId The job ID to fund
     * @param freelancer The freelancer address
     * @param amount The amount of USDC to fund (with 6 decimals)
     * @param requiresStake Whether the job requires freelancer stake
     * @param allowedRevisions Number of allowed revisions
     */
    function fundJobOneClick(
        uint256 jobId,
        address freelancer,
        uint256 amount,
        bool requiresStake,
        uint256 allowedRevisions
    ) external {
        // Transfer USDC from user to this gateway
        require(
            usdc.transferFrom(msg.sender, address(this), amount),
            "USDC transfer failed"
        );
        
        // Approve escrow to spend USDC
        require(
            usdc.approve(address(escrow), amount),
            "USDC approval failed"
        );
        
        // Fund the job through escrow
        escrow.fundJob(
            jobId,
            freelancer,
            address(usdc),
            amount,
            requiresStake,
            allowedRevisions
        );
        
        emit JobFundedViaGateway(msg.sender, jobId, amount);
    }
    
    /**
     * @notice Emergency function to recover stuck tokens
     * @dev Only use if tokens get stuck in the gateway
     */
    function recoverTokens(address token, uint256 amount) external {
        require(
            IERC20(token).transfer(msg.sender, amount),
            "Recovery failed"
        );
    }
}
