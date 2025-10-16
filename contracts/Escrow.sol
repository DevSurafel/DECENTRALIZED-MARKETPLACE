// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DeFiLance Escrow Contract with Dispute Protection
 * @notice Secure escrow system with revisions, stakes, deposits, and evidence-based disputes
 * @dev Handles full job lifecycle with client/freelancer protections
 */
contract DeFiLanceEscrow is ReentrancyGuard, Ownable {
    
    // Job status enumeration
    enum JobStatus {
        CREATED,              // Job created but not funded
        FUNDED,               // Escrow funded, work can begin
        IN_PROGRESS,          // Freelancer accepted, work in progress
        SUBMITTED,            // Work submitted by freelancer
        REVISION_REQUESTED,   // Client requested revision
        COMPLETED,            // Work approved, payment released
        DISPUTED,             // Dispute raised
        REFUNDED              // Funds returned to client
    }
    
    // Job structure with all protection mechanisms
    struct Job {
        address client;
        address freelancer;
        address token;                  // ERC20 token address (e.g., USDC)
        uint256 amount;
        uint256 platformFee;            // Fee in basis points
        uint256 freelancerStake;        // Freelancer's stake (slashed if fraud)
        uint256 arbitrationDeposit;     // Client's deposit when raising dispute
        uint256 submissionDeadline;     // When work must be submitted
        uint256 reviewDeadline;         // When client must review (7 days)
        uint256 approvalDeadline;       // Final deadline for auto-release
        string ipfsHash;                // IPFS hash of submitted work
        string gitCommitHash;           // Git commit hash for verification
        uint256 currentRevisionNumber;
        uint256 allowedRevisions;       // Max revisions allowed
        bool autoReleaseEnabled;
        JobStatus status;
        bool exists;
    }
    
    // Revision tracking
    struct Revision {
        string ipfsHash;
        string gitCommitHash;
        uint256 timestamp;
        string notes;
    }
    
    // State variables
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => Revision[]) public revisions;
    mapping(address => bool) public arbitrators;
    mapping(address => uint256) public reputationStrikes;
    
    address public platformWallet;
    uint256 public defaultPlatformFee = 200;           // 2% in basis points
    uint256 public defaultStakePercentage = 500;       // 5% in basis points
    uint256 public defaultArbitrationDeposit = 200;    // 2% in basis points
    uint256 public constant SUBMISSION_WINDOW = 30 days;
    uint256 public constant REVIEW_WINDOW = 7 days;
    uint256 public constant REVISION_REVIEW_WINDOW = 3 days;
    
    // Events
    event JobFunded(uint256 indexed jobId, address indexed token, uint256 amount, uint256 stake);
    event WorkSubmitted(uint256 indexed jobId, string ipfsHash, string gitCommitHash);
    event RevisionRequested(uint256 indexed jobId, string notes);
    event RevisionSubmitted(uint256 indexed jobId, uint256 revisionNumber, string ipfsHash);
    event JobApproved(uint256 indexed jobId, uint256 freelancerAmount, uint256 platformFee);
    event DisputeRaised(uint256 indexed jobId, address indexed raiser, uint256 deposit);
    event DisputeResolved(uint256 indexed jobId, uint256 clientAmount, uint256 freelancerAmount, string notes);
    event FundsReclaimed(uint256 indexed jobId, uint256 amount);
    event StakeSlashed(uint256 indexed jobId, address indexed freelancer, uint256 amount);
    event AutoReleaseTriggered(uint256 indexed jobId, uint256 amount);
    
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
    
    constructor(address _platformWallet) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        platformWallet = _platformWallet;
        arbitrators[msg.sender] = true;
    }
    
    /**
     * @notice Fund a job and lock funds in escrow (with optional freelancer stake)
     * @param jobId Unique identifier for the job
     * @param freelancer Address of the freelancer
     * @param token ERC20 token address
     * @param amount Total payment amount
     * @param requiresStake Whether freelancer must provide stake
     * @param allowedRevisions Max number of revisions allowed
     */
    function fundJob(
        uint256 jobId,
        address freelancer,
        address token,
        uint256 amount,
        bool requiresStake,
        uint256 allowedRevisions
    ) external nonReentrant {
        require(!jobs[jobId].exists, "Job already exists");
        require(freelancer != address(0), "Invalid freelancer");
        require(amount > 0, "Amount must be > 0");
        require(allowedRevisions > 0, "Must allow at least 1 revision");
        
        uint256 platformFeeAmount = (amount * defaultPlatformFee) / 10000;
        uint256 stakeAmount = requiresStake ? (amount * defaultStakePercentage) / 10000 : 0;
        
        // Transfer tokens from client to contract
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        // If stake required, freelancer must deposit stake
        if (requiresStake) {
            require(
                IERC20(token).transferFrom(freelancer, address(this), stakeAmount),
                "Stake transfer failed"
            );
        }
        
        jobs[jobId] = Job({
            client: msg.sender,
            freelancer: freelancer,
            token: token,
            amount: amount,
            platformFee: platformFeeAmount,
            freelancerStake: stakeAmount,
            arbitrationDeposit: 0,
            submissionDeadline: block.timestamp + SUBMISSION_WINDOW,
            reviewDeadline: 0,
            approvalDeadline: 0,
            ipfsHash: "",
            gitCommitHash: "",
            currentRevisionNumber: 0,
            allowedRevisions: allowedRevisions,
            autoReleaseEnabled: true,
            status: JobStatus.IN_PROGRESS,
            exists: true
        });
        
        emit JobFunded(jobId, token, amount, stakeAmount);
    }
    
    /**
     * @notice Submit completed work with Git commit for verification
     * @param jobId Job identifier
     * @param ipfsHash IPFS hash of the deliverable
     * @param gitCommitHash Git commit hash for code verification
     */
    function submitWork(uint256 jobId, string memory ipfsHash, string memory gitCommitHash) 
        external 
        onlyFreelancer(jobId) 
        jobExists(jobId) 
        nonReentrant 
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.IN_PROGRESS, "Invalid status");
        require(block.timestamp <= job.submissionDeadline, "Submission deadline passed");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        
        job.ipfsHash = ipfsHash;
        job.gitCommitHash = gitCommitHash;
        job.status = JobStatus.SUBMITTED;
        job.reviewDeadline = block.timestamp + REVIEW_WINDOW;
        job.approvalDeadline = block.timestamp + REVIEW_WINDOW + 1 days;
        
        // Store revision
        revisions[jobId].push(Revision({
            ipfsHash: ipfsHash,
            gitCommitHash: gitCommitHash,
            timestamp: block.timestamp,
            notes: "Initial submission"
        }));
        
        emit WorkSubmitted(jobId, ipfsHash, gitCommitHash);
    }
    
    /**
     * @notice Client requests revision
     * @param jobId Job identifier
     * @param notes Revision notes explaining what needs to be fixed
     */
    function requestRevision(uint256 jobId, string memory notes)
        external
        onlyClient(jobId)
        jobExists(jobId)
        nonReentrant
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.SUBMITTED, "Work not submitted");
        require(job.currentRevisionNumber < job.allowedRevisions, "Max revisions exceeded");
        require(block.timestamp <= job.reviewDeadline, "Review deadline passed");
        
        job.status = JobStatus.REVISION_REQUESTED;
        job.currentRevisionNumber++;
        
        emit RevisionRequested(jobId, notes);
    }
    
    /**
     * @notice Freelancer submits revision
     * @param jobId Job identifier
     * @param ipfsHash IPFS hash of revised work
     * @param gitCommitHash Updated git commit hash
     */
    function submitRevision(uint256 jobId, string memory ipfsHash, string memory gitCommitHash)
        external
        onlyFreelancer(jobId)
        jobExists(jobId)
        nonReentrant
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.REVISION_REQUESTED, "Revision not requested");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        
        job.ipfsHash = ipfsHash;
        job.gitCommitHash = gitCommitHash;
        job.status = JobStatus.SUBMITTED;
        job.reviewDeadline = block.timestamp + REVISION_REVIEW_WINDOW;
        
        // Store revision
        revisions[jobId].push(Revision({
            ipfsHash: ipfsHash,
            gitCommitHash: gitCommitHash,
            timestamp: block.timestamp,
            notes: string(abi.encodePacked("Revision #", uint2str(job.currentRevisionNumber)))
        }));
        
        emit RevisionSubmitted(jobId, job.currentRevisionNumber, ipfsHash);
    }
    
    /**
     * @notice Client approves work and releases payment
     * @param jobId Job identifier
     */
    function approveJob(uint256 jobId) 
        external 
        onlyClient(jobId) 
        jobExists(jobId) 
        nonReentrant 
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.SUBMITTED, "Work not submitted");
        
        _releasePayment(jobId);
    }
    
    /**
     * @notice Owner/arbitrator releases payment after verified Telegram transfer
     * @dev Used for automated Telegram account transfers where ownership is verified off-chain
     * @param jobId Job identifier
     */
    function releaseAfterTransfer(uint256 jobId) 
        external 
        onlyArbitrator
        jobExists(jobId) 
        nonReentrant 
    {
        Job storage job = jobs[jobId];
        require(
            job.status == JobStatus.SUBMITTED || job.status == JobStatus.IN_PROGRESS, 
            "Invalid status for release"
        );
        
        _releasePayment(jobId);
    }
    
    /**
     * @notice Owner/arbitrator releases payment to custom address after verified transfer
     * @dev Used when seller provides a different wallet address for payment
     * @param jobId Job identifier
     * @param sellerAddress Seller's wallet address to receive payment
     */
    function releaseAfterTransferToAddress(uint256 jobId, address sellerAddress) 
        external 
        onlyArbitrator
        jobExists(jobId) 
        nonReentrant 
    {
        require(sellerAddress != address(0), "Invalid seller address");
        
        Job storage job = jobs[jobId];
        require(
            job.status == JobStatus.SUBMITTED || job.status == JobStatus.IN_PROGRESS, 
            "Invalid status for release"
        );
        
        _releasePaymentToAddress(jobId, sellerAddress);
    }
    
    /**
     * @notice Internal function to release payment to freelancer
     */
    function _releasePayment(uint256 jobId) internal {
        Job storage job = jobs[jobId];
        
        uint256 freelancerAmount = job.amount - job.platformFee + job.freelancerStake;
        
        // Transfer payment to freelancer
        require(
            IERC20(job.token).transfer(job.freelancer, freelancerAmount),
            "Freelancer transfer failed"
        );
        
        // Transfer platform fee
        if (job.platformFee > 0) {
            require(
                IERC20(job.token).transfer(platformWallet, job.platformFee),
                "Platform fee transfer failed"
            );
        }
        
        job.status = JobStatus.COMPLETED;
        
        emit JobApproved(jobId, freelancerAmount, job.platformFee);
    }
    
    /**
     * @notice Internal function to release payment to a custom address
     * @param jobId Job identifier
     * @param recipient Address to receive the payment
     */
    function _releasePaymentToAddress(uint256 jobId, address recipient) internal {
        Job storage job = jobs[jobId];
        
        uint256 freelancerAmount = job.amount - job.platformFee + job.freelancerStake;
        
        // Transfer payment to specified recipient
        require(
            IERC20(job.token).transfer(recipient, freelancerAmount),
            "Recipient transfer failed"
        );
        
        // Transfer platform fee
        if (job.platformFee > 0) {
            require(
                IERC20(job.token).transfer(platformWallet, job.platformFee),
                "Platform fee transfer failed"
            );
        }
        
        job.status = JobStatus.COMPLETED;
        
        emit JobApproved(jobId, freelancerAmount, job.platformFee);
    }
    
    /**
     * @notice Auto-release funds if client doesn't respond within deadline
     * @param jobId Job identifier
     */
    function autoReleasePayment(uint256 jobId)
        external
        jobExists(jobId)
        nonReentrant
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.SUBMITTED, "Work not submitted");
        require(job.autoReleaseEnabled, "Auto-release disabled");
        require(block.timestamp > job.reviewDeadline, "Review period not over");
        
        _releasePayment(jobId);
        
        emit AutoReleaseTriggered(jobId, job.amount);
    }
    
    /**
     * @notice Raise a dispute (client must pay arbitration deposit)
     * @param jobId Job identifier
     */
    function raiseDispute(uint256 jobId) 
        external 
        payable
        jobExists(jobId) 
        nonReentrant 
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.SUBMITTED, "Work not submitted");
        require(msg.sender == job.client, "Only client can raise dispute");
        
        uint256 depositAmount = (job.amount * defaultArbitrationDeposit) / 10000;
        
        // Client must pay arbitration deposit
        require(
            IERC20(job.token).transferFrom(msg.sender, address(this), depositAmount),
            "Deposit transfer failed"
        );
        
        job.arbitrationDeposit = depositAmount;
        job.status = JobStatus.DISPUTED;
        
        emit DisputeRaised(jobId, msg.sender, depositAmount);
    }
    
    /**
     * @notice Resolve a dispute with evidence-based decision (arbitrator only)
     * @param jobId Job identifier
     * @param clientPercentage Percentage to refund to client (0-10000)
     * @param penalizeClient Whether to penalize client (forfeit deposit)
     * @param slashFreelancerStake Whether to slash freelancer stake
     * @param notes Resolution explanation
     */
    function resolveDispute(
        uint256 jobId,
        uint256 clientPercentage,
        bool penalizeClient,
        bool slashFreelancerStake,
        string memory notes
    )
        external
        onlyArbitrator
        jobExists(jobId)
        nonReentrant
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.DISPUTED, "Not in dispute");
        require(clientPercentage <= 10000, "Invalid percentage");
        
        uint256 clientAmount = (job.amount * clientPercentage) / 10000;
        uint256 freelancerAmount = job.amount - clientAmount;
        
        // Handle arbitration deposit
        if (penalizeClient) {
            // Client loses deposit (goes to freelancer as penalty)
            freelancerAmount += job.arbitrationDeposit;
            reputationStrikes[job.client]++;
        } else {
            // Return deposit to client
            clientAmount += job.arbitrationDeposit;
        }
        
        // Handle freelancer stake
        if (slashFreelancerStake && job.freelancerStake > 0) {
            // Slash stake (goes to client as compensation)
            clientAmount += job.freelancerStake;
            reputationStrikes[job.freelancer]++;
            emit StakeSlashed(jobId, job.freelancer, job.freelancerStake);
        } else if (job.freelancerStake > 0) {
            // Return stake to freelancer
            freelancerAmount += job.freelancerStake;
        }
        
        // Transfer amounts
        if (clientAmount > 0) {
            require(
                IERC20(job.token).transfer(job.client, clientAmount),
                "Client transfer failed"
            );
        }
        
        if (freelancerAmount > 0) {
            uint256 netFreelancerAmount = freelancerAmount - job.platformFee;
            require(
                IERC20(job.token).transfer(job.freelancer, netFreelancerAmount),
                "Freelancer transfer failed"
            );
            require(
                IERC20(job.token).transfer(platformWallet, job.platformFee),
                "Platform fee transfer failed"
            );
        }
        
        job.status = JobStatus.COMPLETED;
        
        emit DisputeResolved(jobId, clientAmount, freelancerAmount, notes);
    }
    
    /**
     * @notice Client can reclaim funds if freelancer never submits work
     * @param jobId Job identifier
     */
    function reclaimFunds(uint256 jobId) 
        external 
        onlyClient(jobId) 
        jobExists(jobId) 
        nonReentrant 
    {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.IN_PROGRESS, "Job not in progress");
        require(block.timestamp > job.submissionDeadline, "Submission deadline not passed");
        
        uint256 refundAmount = job.amount;
        job.status = JobStatus.REFUNDED;
        
        require(
            IERC20(job.token).transfer(job.client, refundAmount),
            "Refund transfer failed"
        );
        
        // Return freelancer stake if exists
        if (job.freelancerStake > 0) {
            require(
                IERC20(job.token).transfer(job.freelancer, job.freelancerStake),
                "Stake return failed"
            );
        }
        
        emit FundsReclaimed(jobId, refundAmount);
    }
    
    /**
     * @notice Set arbitrator status
     * @param arbitrator Address to update
     * @param status True to grant, false to revoke
     */
    function setArbitrator(address arbitrator, bool status) external onlyOwner {
        require(arbitrator != address(0), "Invalid arbitrator");
        arbitrators[arbitrator] = status;
    }
    
    /**
     * @notice Update platform fee
     * @param newFee New fee in basis points (max 1000 = 10%)
     */
    function setPlatformFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high");
        defaultPlatformFee = newFee;
    }
    
    /**
     * @notice Update platform wallet
     * @param newWallet New platform wallet address
     */
    function setPlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Invalid wallet");
        platformWallet = newWallet;
    }
    
    /**
     * @notice Get revision history for a job
     * @param jobId Job identifier
     */
    function getRevisions(uint256 jobId)
        external
        view
        jobExists(jobId)
        returns (Revision[] memory)
    {
        return revisions[jobId];
    }
    
    /**
     * @notice Get reputation strikes for an address
     * @param user User address
     */
    function getReputationStrikes(address user) external view returns (uint256) {
        return reputationStrikes[user];
    }
    
    /**
     * @notice Get full job details
     * @param jobId Job identifier
     */
    function getJob(uint256 jobId) 
        external 
        view 
        jobExists(jobId) 
        returns (Job memory) 
    {
        return jobs[jobId];
    }
    
    /**
     * @notice Convert uint to string (helper function)
     */
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}