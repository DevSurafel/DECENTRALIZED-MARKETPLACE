// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeFiLance Escrow Contract
 * @notice Secure escrow system for freelance jobs with dispute resolution
 * @dev Handles job funding, approval, disputes, and automatic deadline enforcement
 */
contract DeFiLanceEscrow is ReentrancyGuard, Ownable {
    
    enum JobStatus { 
        CREATED,      // Job posted but not funded
        FUNDED,       // Client has locked funds
        SUBMITTED,    // Freelancer submitted work
        COMPLETED,    // Job approved and paid
        DISPUTED,     // Dispute raised
        REFUNDED      // Refunded to client
    }
    
    struct Job {
        address client;
        address freelancer;
        address token;           // ERC20 token address (USDC, DAI, etc.)
        uint256 amount;
        uint256 platformFee;     // Fee in basis points (e.g., 200 = 2%)
        uint256 submissionDeadline;
        uint256 approvalDeadline;
        string ipfsHash;         // IPFS hash of job details/submission
        JobStatus status;
        bool exists;
    }
    
    // State variables
    mapping(uint256 => Job) public jobs;
    mapping(address => bool) public arbitrators;
    address public platformWallet;
    uint256 public defaultPlatformFee = 200; // 2% in basis points
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public submissionWindow = 30 days;
    uint256 public approvalWindow = 7 days;
    
    // Events
    event JobCreated(uint256 indexed jobId, address indexed client, address indexed freelancer, uint256 amount);
    event JobFunded(uint256 indexed jobId, address token, uint256 amount);
    event WorkSubmitted(uint256 indexed jobId, string ipfsHash);
    event JobApproved(uint256 indexed jobId, uint256 freelancerAmount, uint256 platformFee);
    event DisputeRaised(uint256 indexed jobId, address indexed raiser);
    event DisputeResolved(uint256 indexed jobId, uint256 clientAmount, uint256 freelancerAmount);
    event JobRefunded(uint256 indexed jobId, uint256 amount);
    event ArbitratorUpdated(address indexed arbitrator, bool status);
    event PlatformFeeUpdated(uint256 newFee);
    
    // Modifiers
    modifier onlyClient(uint256 jobId) {
        require(jobs[jobId].client == msg.sender, "Not the client");
        _;
    }
    
    modifier onlyFreelancer(uint256 jobId) {
        require(jobs[jobId].freelancer == msg.sender, "Not the freelancer");
        _;
    }
    
    modifier onlyArbitrator() {
        require(arbitrators[msg.sender] || msg.sender == owner(), "Not an arbitrator");
        _;
    }
    
    modifier jobExists(uint256 jobId) {
        require(jobs[jobId].exists, "Job does not exist");
        _;
    }
    
    constructor(address _platformWallet) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
        arbitrators[msg.sender] = true;
    }
    
    /**
     * @notice Create and fund a new escrow job
     * @param jobId Unique job identifier
     * @param freelancer Address of the freelancer
     * @param token ERC20 token address for payment
     * @param amount Total payment amount
     */
    function fundJob(
        uint256 jobId,
        address freelancer,
        address token,
        uint256 amount
    ) external nonReentrant {
        require(!jobs[jobId].exists, "Job already exists");
        require(freelancer != address(0), "Invalid freelancer address");
        require(token != address(0), "Invalid token address");
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens to contract
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        // Calculate deadlines
        uint256 submissionDeadline = block.timestamp + submissionWindow;
        uint256 approvalDeadline = submissionDeadline + approvalWindow;
        
        // Create job
        jobs[jobId] = Job({
            client: msg.sender,
            freelancer: freelancer,
            token: token,
            amount: amount,
            platformFee: defaultPlatformFee,
            submissionDeadline: submissionDeadline,
            approvalDeadline: approvalDeadline,
            ipfsHash: "",
            status: JobStatus.FUNDED,
            exists: true
        });
        
        emit JobCreated(jobId, msg.sender, freelancer, amount);
        emit JobFunded(jobId, token, amount);
    }
    
    /**
     * @notice Freelancer submits completed work
     * @param jobId Job identifier
     * @param ipfsHash IPFS hash of the submitted work
     */
    function submitWork(uint256 jobId, string memory ipfsHash) 
        external 
        jobExists(jobId) 
        onlyFreelancer(jobId) 
        nonReentrant 
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.FUNDED, "Job not in FUNDED status");
        require(block.timestamp <= job.submissionDeadline, "Submission deadline passed");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        
        job.ipfsHash = ipfsHash;
        job.status = JobStatus.SUBMITTED;
        
        emit WorkSubmitted(jobId, ipfsHash);
    }
    
    /**
     * @notice Client approves work and releases payment
     * @param jobId Job identifier
     */
    function approveJob(uint256 jobId) 
        external 
        jobExists(jobId) 
        onlyClient(jobId) 
        nonReentrant 
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.SUBMITTED, "Job not submitted");
        
        _releasePayment(jobId);
    }
    
    /**
     * @notice Auto-release payment if approval deadline passes
     * @param jobId Job identifier
     */
    function autoReleasePayment(uint256 jobId) 
        external 
        jobExists(jobId) 
        nonReentrant 
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.SUBMITTED, "Job not submitted");
        require(block.timestamp > job.approvalDeadline, "Approval deadline not passed");
        
        _releasePayment(jobId);
    }
    
    /**
     * @notice Internal function to release payment to freelancer
     */
    function _releasePayment(uint256 jobId) internal {
        Job storage job = jobs[jobId];
        
        // Calculate platform fee
        uint256 feeAmount = (job.amount * job.platformFee) / FEE_DENOMINATOR;
        uint256 freelancerAmount = job.amount - feeAmount;
        
        // Transfer payment
        IERC20(job.token).transfer(job.freelancer, freelancerAmount);
        
        // Transfer platform fee
        if (feeAmount > 0) {
            IERC20(job.token).transfer(platformWallet, feeAmount);
        }
        
        job.status = JobStatus.COMPLETED;
        
        emit JobApproved(jobId, freelancerAmount, feeAmount);
    }
    
    /**
     * @notice Client raises a dispute
     * @param jobId Job identifier
     */
    function raiseDispute(uint256 jobId) 
        external 
        jobExists(jobId) 
        onlyClient(jobId) 
        nonReentrant 
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.SUBMITTED, "Job not submitted");
        
        job.status = JobStatus.DISPUTED;
        
        emit DisputeRaised(jobId, msg.sender);
    }
    
    /**
     * @notice Arbitrator resolves dispute with custom split
     * @param jobId Job identifier
     * @param clientPercentage Percentage to refund to client (in basis points)
     */
    function resolveDispute(uint256 jobId, uint256 clientPercentage) 
        external 
        jobExists(jobId) 
        onlyArbitrator 
        nonReentrant 
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.DISPUTED, "Job not disputed");
        require(clientPercentage <= FEE_DENOMINATOR, "Invalid percentage");
        
        uint256 clientAmount = (job.amount * clientPercentage) / FEE_DENOMINATOR;
        uint256 freelancerAmount = job.amount - clientAmount;
        
        // Transfer funds
        if (clientAmount > 0) {
            IERC20(job.token).transfer(job.client, clientAmount);
        }
        if (freelancerAmount > 0) {
            IERC20(job.token).transfer(job.freelancer, freelancerAmount);
        }
        
        job.status = JobStatus.COMPLETED;
        
        emit DisputeResolved(jobId, clientAmount, freelancerAmount);
    }
    
    /**
     * @notice Client can reclaim funds if freelancer never submits work
     * @param jobId Job identifier
     */
    function reclaimFunds(uint256 jobId) 
        external 
        jobExists(jobId) 
        onlyClient(jobId) 
        nonReentrant 
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.FUNDED, "Job not in FUNDED status");
        require(block.timestamp > job.submissionDeadline, "Submission deadline not passed");
        
        uint256 refundAmount = job.amount;
        job.status = JobStatus.REFUNDED;
        
        IERC20(job.token).transfer(job.client, refundAmount);
        
        emit JobRefunded(jobId, refundAmount);
    }
    
    /**
     * @notice Update arbitrator status
     * @param arbitrator Address to update
     * @param status True to grant, false to revoke
     */
    function setArbitrator(address arbitrator, bool status) external onlyOwner {
        require(arbitrator != address(0), "Invalid arbitrator address");
        arbitrators[arbitrator] = status;
        emit ArbitratorUpdated(arbitrator, status);
    }
    
    /**
     * @notice Update default platform fee
     * @param newFee New fee in basis points (max 1000 = 10%)
     */
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        defaultPlatformFee = newFee;
        emit PlatformFeeUpdated(newFee);
    }
    
    /**
     * @notice Update platform wallet
     * @param newWallet New platform wallet address
     */
    function setPlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet address");
        platformWallet = newWallet;
    }
    
    /**
     * @notice Get job details
     * @param jobId Job identifier
     */
    function getJob(uint256 jobId) external view returns (Job memory) {
        require(jobs[jobId].exists, "Job does not exist");
        return jobs[jobId];
    }
}
