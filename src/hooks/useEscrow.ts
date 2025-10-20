import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Polygon Amoy Testnet USDC address (Official Circle USDC)
const USDC_CONTRACT_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'; // Polygon Amoy Testnet
// Note: This is Circle's official test USDC which may have blacklist restrictions
// For Polygon Mainnet use: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
// If you encounter blacklist errors, use fresh wallet addresses or deploy your own test token

// Your deployed escrow contract address on Polygon Amoy Testnet
const ESCROW_CONTRACT_ADDRESS = '0xb95A71b5EfDb52eEa055eBD27168DC49E6c6685b';

// Network configuration
const POLYGON_AMOY_CHAIN_ID = 80002n;
const POLYGON_MAINNET_CHAIN_ID = 137n;

// Use testnet for development
const NETWORK_CONFIG = {
  chainId: POLYGON_AMOY_CHAIN_ID,
  chainIdHex: '0x13882',
  networkName: 'Polygon Amoy Testnet',
  rpcUrl: 'https://rpc-amoy.polygon.technology',
  blockExplorer: 'https://amoy.polygonscan.com',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18
  }
};

const ESCROW_ABI = [
  'function fundJob(uint256 jobId, address freelancer, address token, uint256 amount, bool requiresStake, uint256 allowedRevisions) external',
  'function submitWork(uint256 jobId, string ipfsHash, string gitCommitHash) external',
  'function submitRevision(uint256 jobId, string ipfsHash, string gitCommitHash) external',
  'function approveJob(uint256 jobId) external',
  'function autoReleasePayment(uint256 jobId) external',
  'function raiseDispute(uint256 jobId) external',
  'function resolveDispute(uint256 jobId, uint256 clientPercentage, bool penalizeClient, bool slashFreelancerStake, string notes) external',
  'function reclaimFunds(uint256 jobId) external',
  'function requestRevision(uint256 jobId, string notes) external',
  'function getJob(uint256 jobId) external view returns (tuple(address client, address freelancer, address token, uint256 amount, uint256 platformFee, uint256 freelancerStake, uint256 arbitrationDeposit, uint256 submissionDeadline, uint256 reviewDeadline, uint256 approvalDeadline, string ipfsHash, string gitCommitHash, uint256 currentRevisionNumber, uint256 allowedRevisions, bool autoReleaseEnabled, uint8 status, bool exists))',
  'function defaultStakePercentage() view returns (uint256)',
  'event JobFunded(uint256 indexed jobId, address indexed token, uint256 amount, uint256 stake)',
  'event WorkSubmitted(uint256 indexed jobId, string ipfsHash, string gitCommitHash)',
  'event RevisionRequested(uint256 indexed jobId, string notes)',
  'event RevisionSubmitted(uint256 indexed jobId, uint256 revisionNumber, string ipfsHash)',
  'event JobApproved(uint256 indexed jobId, uint256 freelancerAmount, uint256 platformFee)',
  'event DisputeRaised(uint256 indexed jobId, address indexed raiser, uint256 deposit)',
  'event DisputeResolved(uint256 indexed jobId, uint256 clientAmount, uint256 freelancerAmount, string notes)',
  'event AutoReleaseTriggered(uint256 indexed jobId, uint256 amount)',
  'event FundsReclaimed(uint256 indexed jobId, uint256 amount)'
];

const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)'
];

interface EscrowJob {
  client: string;
  freelancer: string;
  token: string;
  amount: string;
  platformFee: string;
  submissionDeadline: number;
  approvalDeadline: number;
  ipfsHash: string;
  status: number;
  exists: boolean;
}

export const useEscrow = () => {
  const [loading, setLoading] = useState(false);

  const getProvider = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask to use this feature",
        variant: "destructive"
      });
      return null;
    }

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);

      // Verify the connected wallet matches the user's profile
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_address')
          .eq('id', user.id)
          .single();

        if (profile?.wallet_address && profile.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
          toast({
            title: "Wrong Wallet Connected",
            description: `This account requires wallet ${profile.wallet_address.substring(0, 6)}...${profile.wallet_address.substring(38)}. Please switch in MetaMask.`,
            variant: "destructive",
            duration: 10000
          });
          return null;
        }

        // Update profile with wallet address if not set
        if (!profile?.wallet_address) {
          await supabase
            .from('profiles')
            .update({ wallet_address: walletAddress })
            .eq('id', user.id);
        }
      }

      return provider;
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to MetaMask",
        variant: "destructive"
      });
      return null;
    }
  };

  const checkNetwork = async (provider: ethers.BrowserProvider) => {
    const network = await provider.getNetwork();

    if (network.chainId !== NETWORK_CONFIG.chainId) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: NETWORK_CONFIG.chainIdHex }],
        });
      } catch (error: any) {
        // If network not added, add it
        if (error.code === 4902) {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: NETWORK_CONFIG.chainIdHex,
                chainName: NETWORK_CONFIG.networkName,
                rpcUrls: [NETWORK_CONFIG.rpcUrl],
                blockExplorerUrls: [NETWORK_CONFIG.blockExplorer],
                nativeCurrency: NETWORK_CONFIG.nativeCurrency
              }]
            });
          } catch (addError) {
            toast({
              title: "Network Error",
              description: `Failed to add ${NETWORK_CONFIG.networkName}`,
              variant: "destructive"
            });
            throw addError;
          }
        } else {
          throw error;
        }
      }
    }
  };

  // Convert UUID to numeric ID for blockchain
  const uuidToNumericId = (uuid: string): bigint => {
    // Remove dashes and take first 16 hex characters (64 bits)
    const hex = uuid.replace(/-/g, '').slice(0, 16);
    return BigInt('0x' + hex);
  };

  const fundJob = async (
    jobId: string,
    freelancerAddress: string,
    amountUSDC: string,
    requiresStake: boolean = false,
    allowedRevisions: number = 3
  ): Promise<{ success: boolean; txHash?: string }> => {
    setLoading(true);
    try {
      if (!ESCROW_CONTRACT_ADDRESS) {
        toast({
          title: "Configuration Error",
          description: "Escrow contract address not configured. Please contact support.",
          variant: "destructive"
        });
        return { success: false };
      }

      const provider = await getProvider();
      if (!provider) return { success: false };

      await checkNetwork(provider);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Verify the escrow contract is deployed
      const contractCode = await provider.getCode(ESCROW_CONTRACT_ADDRESS);
      if (contractCode === '0x' || contractCode === '0x0') {
        toast({
          title: "Contract Not Deployed",
          description: `The escrow contract at ${ESCROW_CONTRACT_ADDRESS} is not deployed on Polygon Amoy testnet. Please deploy the contract first using: npx hardhat run scripts/deploy.js --network amoy`,
          variant: "destructive",
          duration: 10000
        });
        return { success: false };
      }

      // Convert UUID to numeric ID for smart contract
      const numericJobId = uuidToNumericId(jobId);

      // USDC uses 6 decimals on Polygon
      const amount = ethers.parseUnits(amountUSDC, 6);

      // Initialize contracts
      const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, signer);
      const escrowContract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      // Check MATIC balance for gas fees
      const maticBalance = await provider.getBalance(userAddress);
      const minMatic = ethers.parseEther("0.01"); // Minimum 0.01 MATIC for gas

      if (maticBalance < minMatic) {
        toast({
          title: "Insufficient MATIC",
          description: `You need at least 0.01 MATIC for gas fees. Get testnet MATIC from Polygon faucet.`,
          variant: "destructive"
        });
        return { success: false };
      }

      // Check USDC balance
      try {
        const balance = await usdcContract.balanceOf(userAddress);
        console.log(`USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);

        if (balance < amount) {
          toast({
            title: "Insufficient USDC",
            description: `You need ${amountUSDC} USDC but have ${ethers.formatUnits(balance, 6)} USDC. Get testnet USDC from Circle faucet.`,
            variant: "destructive"
          });
          return { success: false };
        }
      } catch (balanceError: any) {
        console.error('Error checking USDC balance:', balanceError);
        toast({
          title: "Balance Check Failed",
          description: "Could not verify USDC balance. The USDC contract might not be deployed on this network.",
          variant: "destructive"
        });
        return { success: false };
      }

      // Check existing USDC allowance to skip redundant approvals
      try {
        const currentAllowance: bigint = await usdcContract.allowance(userAddress, ESCROW_CONTRACT_ADDRESS);
        if (currentAllowance >= amount) {
          console.log('USDC already approved. Allowance:', ethers.formatUnits(currentAllowance, 6));
          toast({
            title: "USDC Already Approved",
            description: "Allowance is sufficient. Skipping approval step.",
          });
        } else {
          toast({
            title: "Approving USDC...",
            description: "Please confirm the approval transaction in MetaMask",
          });

          // Approve USDC spending with better error handling and explicit gas estimation
          try {
            // Verify USDC contract exists
            try {
              const decimals = await usdcContract.decimals();
              console.log('USDC contract verified, decimals:', decimals);
            } catch (contractCheckError) {
              console.error('USDC contract check failed:', contractCheckError);
              toast({
                title: "Invalid USDC Contract",
                description: "The USDC contract address is not valid on this network. Please contact support.",
                variant: "destructive"
              });
              return { success: false };
            }

            // Estimate gas for approval
            let gasEstimate: bigint | undefined;
            try {
              gasEstimate = await usdcContract.approve.estimateGas(ESCROW_CONTRACT_ADDRESS, amount);
              console.log('Estimated gas for approval:', gasEstimate.toString());
            } catch (gasEstError: any) {
              console.warn('Gas estimation failed (will try without override):', gasEstError);
            }

            // If we have an estimate, add 20% buffer
            const overrides = gasEstimate ? { gasLimit: (gasEstimate * 120n) / 100n } : {};

            // Try approval (with overrides if present)
            let approveTx;
            try {
              approveTx = await usdcContract.approve(ESCROW_CONTRACT_ADDRESS, amount, overrides as any);
            } catch (sendErr: any) {
              // Retry without overrides if wallet/provider chokes on custom gas
              console.warn('Approve with overrides failed, retrying without overrides:', sendErr);
              approveTx = await usdcContract.approve(ESCROW_CONTRACT_ADDRESS, amount);
            }

            toast({
              title: "Waiting for Confirmation...",
              description: "USDC approval transaction submitted, waiting for confirmation",
            });
            const approvalReceipt = await approveTx.wait();
            console.log('USDC approval confirmed');

            if (!approvalReceipt || approvalReceipt.status !== 1) {
              toast({
                title: "Approval Failed",
                description: "USDC approval transaction failed.",
                variant: "destructive"
              });
              return { success: false };
            }

            // Wait for network to settle after approval
            toast({
              title: "Approval Confirmed",
              description: "Waiting for network to settle before funding...",
            });
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (approveError: any) {
            console.error('USDC approval error:', approveError);
            let errorMsg = "Failed to approve USDC. ";
            if (approveError.code === 'INSUFFICIENT_FUNDS') {
              errorMsg += "You don't have enough MATIC for gas fees.";
            } else if (approveError.message?.toLowerCase()?.includes('insufficient funds')) {
              errorMsg += "Insufficient MATIC for gas fees. Get testnet MATIC from Polygon faucet.";
            } else if (approveError.code === 'ACTION_REJECTED') {
              errorMsg = "Transaction rejected by user.";
            } else if (approveError.code === -32603 || approveError.message?.toLowerCase()?.includes('coalesce')) {
              errorMsg += "Wallet RPC error (-32603). Please retry or reopen your wallet. Skipping approval might work if allowance already set.";
            } else if (approveError.shortMessage) {
              errorMsg += approveError.shortMessage;
            } else if (approveError.reason) {
              errorMsg += approveError.reason;
            } else {
              errorMsg += approveError.message || "Unknown error occurred.";
            }
            toast({ title: "Approval Failed", description: errorMsg, variant: "destructive" });
            return { success: false };
          }
        }
      } catch (allowanceErr) {
        console.warn('Allowance check failed, continuing to approval flow:', allowanceErr);
      }

      // Check if job already exists in contract
      try {
        const existingJob = await escrowContract.getJob(numericJobId);
        if (existingJob.exists) {
          toast({
            title: "Job Already Funded",
            description: "This job has already been funded in the escrow contract.",
            variant: "destructive"
          });
          return { success: false };
        }
      } catch (checkError) {
        console.log('Job does not exist yet, proceeding with funding');
      }

      toast({
        title: "Funding Escrow...",
        description: "Please confirm the funding transaction in MetaMask",
      });

      // Fund the escrow with new parameters - use numeric job ID
      let fundTx;
      try {
        console.log('Funding job with params:', {
          jobId: numericJobId.toString(),
          freelancer: freelancerAddress,
          token: USDC_CONTRACT_ADDRESS,
          amount: amount.toString(),
          requiresStake,
          allowedRevisions
        });

        // Validate freelancer address
        if (!ethers.isAddress(freelancerAddress)) {
          toast({
            title: "Invalid Address",
            description: "Freelancer wallet address is invalid.",
            variant: "destructive"
          });
          return { success: false };
        }

        // If stake is required, ensure freelancer has balance and allowance
        if (requiresStake) {
          try {
            const stakeBps: bigint = await escrowContract.defaultStakePercentage();
            const stakeAmount: bigint = (amount * stakeBps) / 10000n;
            const freelancerBal: bigint = await usdcContract.balanceOf(freelancerAddress);
            const freelancerAllowance: bigint = await usdcContract.allowance(freelancerAddress, ESCROW_CONTRACT_ADDRESS);

            if (freelancerBal < stakeAmount) {
              toast({
                title: "Freelancer Stake Missing",
                description: `Freelancer needs ${ethers.formatUnits(stakeAmount, 6)} USDC balance for the stake.`,
                variant: "destructive"
              });
              return { success: false };
            }
            if (freelancerAllowance < stakeAmount) {
              toast({
                title: "Freelancer Approval Required",
                description: `Freelancer must approve ${ethers.formatUnits(stakeAmount, 6)} USDC to the escrow before funding.`,
                variant: "destructive"
              });
              return { success: false };
            }
          } catch (stakeCheckErr) {
            console.warn('Stake precheck failed:', stakeCheckErr);
          }
        }

        // Static call to catch revert reasons before sending the transaction
        try {
          await escrowContract.fundJob.staticCall(
            numericJobId,
            freelancerAddress,
            USDC_CONTRACT_ADDRESS,
            amount,
            requiresStake,
            allowedRevisions
          );
        } catch (preflightError: any) {
          console.error('Preflight fundJob failed:', preflightError);
          let reason = preflightError.shortMessage || preflightError.reason || preflightError.message || "Transaction would revert";
          if (reason.includes('Stake transfer failed')) {
            reason = 'Freelancer stake transfer would fail. Ensure freelancer has sufficient USDC and has approved the escrow.';
          } else if (reason.includes('Transfer failed')) {
            reason = 'USDC transfer from client would fail. Check your USDC balance and allowance.';
          } else if (reason.includes('Job already exists')) {
            reason = 'This job is already funded on-chain.';
          } else if (reason.includes('Invalid freelancer')) {
            reason = 'Freelancer address is invalid.';
          } else if (reason.includes('Must allow at least 1 revision')) {
            reason = 'Allowed revisions must be at least 1.';
          }
          toast({ title: "Funding Would Fail", description: reason, variant: "destructive" });
          return { success: false };
        }

        // Estimate gas with buffer to avoid out-of-gas errors
        let gasEstimate: bigint;
        try {
          gasEstimate = await escrowContract.fundJob.estimateGas(
            numericJobId,
            freelancerAddress,
            USDC_CONTRACT_ADDRESS,
            amount,
            requiresStake,
            allowedRevisions
          );
          console.log('Gas estimate for fundJob:', gasEstimate.toString());
        } catch (gasErr: any) {
          console.error('Gas estimation failed:', gasErr);
          toast({
            title: "Gas Estimation Failed",
            description: "Transaction may fail. Please ensure sufficient MATIC for gas.",
            variant: "destructive"
          });
          return { success: false };
        }

        // Add 30% buffer to gas limit
        const gasLimit = (gasEstimate * 130n) / 100n;

        fundTx = await escrowContract.fundJob(
          numericJobId,
          freelancerAddress,
          USDC_CONTRACT_ADDRESS,
          amount,
          requiresStake,
          allowedRevisions,
          { gasLimit }
        );
      } catch (fundError: any) {
        console.error('Fund transaction error:', fundError);

        let errorMsg = "Failed to fund escrow. ";

        if (fundError.code === 'ACTION_REJECTED' || fundError.code === 4001) {
          errorMsg = "Transaction rejected by user.";
        } else if (fundError.code === -32603 || fundError.message?.toLowerCase()?.includes('internal json-rpc')) {
          errorMsg = "Network error. The approval may still be processing. Please wait a moment and try again.";
        } else if (fundError.message?.includes('nonce')) {
          errorMsg = "Transaction nonce error. Please wait a moment and try again.";
        } else if (fundError.reason) {
          errorMsg += fundError.reason;
        } else if (fundError.message?.includes('execution reverted')) {
          errorMsg += "Contract execution reverted. The contract may have validation rules that failed.";
        } else {
          errorMsg += fundError.message || "Unknown error occurred.";
        }

        toast({
          title: "Funding Failed",
          description: errorMsg,
          variant: "destructive"
        });
        return { success: false };
      }

      const receipt = await fundTx.wait();

      console.log('Transaction receipt:', receipt);
      console.log('Attempting to update job status to in_progress for job:', jobId);

      // Update job status in Supabase database
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          contract_address: receipt.hash,
          status: 'in_progress'
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Failed to update job status:', updateError);
        toast({
          title: "Escrow Funded!",
          description: "Transaction successful but status update failed. Refreshing page...",
        });
        // Force page reload to fetch latest data
        setTimeout(() => window.location.reload(), 2000);
        return { success: true, txHash: receipt.hash };
      }
      
      console.log('Job status updated successfully to in_progress');

      toast({
        title: "Escrow Funded Successfully",
        description: `Job funded with ${amountUSDC} USDC on Polygon`,
      });

      console.log('Transaction hash:', receipt.hash);
      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      console.error('Error funding job:', error);
      toast({
        title: "Funding Failed",
        description: error.reason || error.message || "Failed to fund escrow",
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const submitWork = async (jobId: string, ipfsHash: string, gitCommitHash: string = ''): Promise<{ success: boolean; txHash?: string }> => {
    setLoading(true);
    try {
      if (!ESCROW_CONTRACT_ADDRESS) {
        toast({
          title: "Configuration Error",
          description: "Escrow contract address not configured",
          variant: "destructive"
        });
        return { success: false };
      }

      const provider = await getProvider();
      if (!provider) return { success: false };

      await checkNetwork(provider);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      // Convert UUID to numeric ID
      const numericJobId = uuidToNumericId(jobId);

      // Verify the current wallet matches the freelancer on-chain
      try {
        const jobData = await contract.getJob(numericJobId);
        if (!jobData.exists) {
          toast({
            title: "Job Not Found",
            description: "This job has not been funded on the blockchain yet.",
            variant: "destructive"
          });
          return { success: false };
        }

        const freelancerOnChain = jobData.freelancer;
        if (freelancerOnChain.toLowerCase() !== userAddress.toLowerCase()) {
          toast({
            title: "Wrong Wallet",
            description: `You must use the freelancer's wallet (${freelancerOnChain.substring(0, 6)}...${freelancerOnChain.substring(38)}) to submit work. Currently connected: ${userAddress.substring(0, 6)}...${userAddress.substring(38)}`,
            variant: "destructive"
          });
          return { success: false };
        }
      } catch (verifyError: any) {
        console.error('Error verifying freelancer address:', verifyError);
        toast({
          title: "Verification Failed",
          description: "Could not verify freelancer address on-chain.",
          variant: "destructive"
        });
        return { success: false };
      }

      toast({
        title: "Submitting Work to Blockchain...",
        description: "Please confirm the transaction in MetaMask",
      });

      const tx = await contract.submitWork(numericJobId, ipfsHash, gitCommitHash);
      const receipt = await tx.wait();

      // Store transaction hash
      await supabase
        .from('jobs')
        .update({ contract_address: receipt.hash })
        .eq('id', jobId);

      toast({
        title: "Work Submitted",
        description: `Work submitted to blockchain with tx: ${receipt.hash.substring(0, 10)}...`,
      });
      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      console.error('Error submitting work:', error);
      toast({
        title: "Submission Failed",
        description: error.reason || error.message || "Failed to submit work",
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const approveJob = async (jobId: string): Promise<{ success: boolean; txHash?: string }> => {
    setLoading(true);
    try {
      if (!ESCROW_CONTRACT_ADDRESS) {
        toast({
          title: "Configuration Error",
          description: "Escrow contract address not configured",
          variant: "destructive"
        });
        return { success: false };
      }

      const provider = await getProvider();
      if (!provider) return { success: false };

      await checkNetwork(provider);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      // Convert UUID to numeric ID
      const numericJobId = uuidToNumericId(jobId);

      // Verify the current wallet matches the client on-chain
      try {
        const jobData = await contract.getJob(numericJobId);
        console.log('Job data from contract:', jobData);
        
        if (!jobData || jobData.client === '0x0000000000000000000000000000000000000000') {
          toast({
            title: "Job Not Found",
            description: "This job has not been funded on the blockchain yet.",
            variant: "destructive"
          });
          return { success: false };
        }

        const clientOnChain = jobData.client;
        console.log('Client on-chain:', clientOnChain);
        console.log('Current user:', userAddress);
        
        if (clientOnChain.toLowerCase() !== userAddress.toLowerCase()) {
          toast({
            title: "Wrong Wallet",
            description: `You must use the client's wallet (${clientOnChain.substring(0, 6)}...${clientOnChain.substring(38)}) to approve. Currently connected: ${userAddress.substring(0, 6)}...${userAddress.substring(38)}`,
            variant: "destructive",
            duration: 10000
          });
          return { success: false };
        }
        
        // Check job status
        console.log('Job status:', jobData.status);
        if (jobData.status !== 2) { // 2 = WorkSubmitted
          const statusNames = ['None', 'Funded', 'WorkSubmitted', 'Completed', 'Disputed', 'Resolved'];
          toast({
            title: "Invalid Job Status",
            description: `Job must be in WorkSubmitted status to approve. Current status: ${statusNames[jobData.status] || 'Unknown'}`,
            variant: "destructive"
          });
          return { success: false };
        }
      } catch (verifyError: any) {
        console.error('Error verifying client address:', verifyError);
        
        // Try to extract more specific error info
        let errorMsg = "Could not verify job details on-chain.";
        if (verifyError.message?.includes('circuit breaker')) {
          errorMsg = "RPC connection issue. Please try again in a moment.";
        } else if (verifyError.reason) {
          errorMsg = verifyError.reason;
        }
        
        toast({
          title: "Verification Failed",
          description: errorMsg,
          variant: "destructive"
        });
        return { success: false };
      }

      // Try to estimate gas first to catch any issues
      try {
        console.log('Estimating gas for approveJob...');
        const gasEstimate = await contract.approveJob.estimateGas(numericJobId);
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (estimateError: any) {
        console.error('Gas estimation failed:', estimateError);
        
        let errorMsg = "Transaction would fail. ";
        if (estimateError.message?.includes('Job is already completed')) {
          errorMsg = "Job has already been approved and payment released.";
        } else if (estimateError.message?.includes('Only client')) {
          errorMsg = "Only the client can approve this job.";
        } else if (estimateError.message?.includes('Work not submitted')) {
          errorMsg = "Freelancer must submit work before approval.";
        } else if (estimateError.reason) {
          errorMsg += estimateError.reason;
        } else {
          errorMsg += estimateError.message || "Unknown error";
        }
        
        toast({
          title: "Cannot Approve Job",
          description: errorMsg,
          variant: "destructive"
        });
        return { success: false };
      }

      toast({
        title: "Approving Job...",
        description: "Please confirm the transaction in MetaMask. Payment will be released to freelancer.",
      });

      const tx = await contract.approveJob(numericJobId);
      const receipt = await tx.wait();

      // Store transaction hash
      await supabase
        .from('jobs')
        .update({ contract_address: receipt.hash })
        .eq('id', jobId);

      toast({
        title: "Job Approved",
        description: `Payment released! Tx: ${receipt.hash.substring(0, 10)}...`,
      });

      console.log('Transaction hash:', receipt.hash);
      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      console.error('Error approving job:', error);

      let errorTitle = "Approval Failed";
      let errorMsg = "Failed to approve job. ";

      // Handle USDC blacklist error specifically
      if (error.message?.includes('Blacklistable') || error.message?.includes('blacklisted') ||
        error.data?.includes('Blacklistable') || error.reason?.includes('blacklisted')) {
        errorTitle = "USDC Blacklist Error";
        errorMsg = "One of the addresses involved (escrow contract, platform wallet, or freelancer wallet) is blacklisted by the USDC contract. This is a testnet limitation. Solution: Use a different test token or deploy a new escrow contract with fresh wallet addresses.";
      } else if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        errorMsg = "Transaction rejected by user.";
      } else if (error.reason) {
        errorMsg += error.reason;
      } else {
        errorMsg += error.message || "Unknown error occurred.";
      }

      toast({
        title: errorTitle,
        description: errorMsg,
        variant: "destructive",
        duration: 10000,
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const raiseDispute = async (jobId: string): Promise<{ success: boolean; txHash?: string }> => {
    setLoading(true);
    try {
      if (!ESCROW_CONTRACT_ADDRESS) {
        toast({
          title: "Configuration Error",
          description: "Escrow contract address not configured",
          variant: "destructive"
        });
        return { success: false };
      }

      const provider = await getProvider();
      if (!provider) return { success: false };

      await checkNetwork(provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      // Convert UUID to numeric ID
      const numericJobId = uuidToNumericId(jobId);

      toast({
        title: "Raising Dispute...",
        description: "Please confirm the transaction in MetaMask",
      });

      const tx = await contract.raiseDispute(numericJobId);
      const receipt = await tx.wait();

      // Store transaction hash
      await supabase
        .from('jobs')
        .update({ contract_address: receipt.hash })
        .eq('id', jobId);

      toast({
        title: "Dispute Raised",
        description: `Dispute raised. An arbitrator will review. Tx: ${receipt.hash.substring(0, 10)}...`,
      });
      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      console.error('Error raising dispute:', error);
      toast({
        title: "Dispute Failed",
        description: error.reason || error.message || "Failed to raise dispute",
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Listen to real-time contract events
  const subscribeToEvents = (jobId: string, onEvent: (event: string, data: any) => void) => {
    if (!ESCROW_CONTRACT_ADDRESS || typeof window === 'undefined' || !(window as any).ethereum) {
      return () => { };
    }

    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);

    // Listen to all events for this job
    const filters = {
      jobFunded: contract.filters.JobFunded(jobId),
      workSubmitted: contract.filters.WorkSubmitted(jobId),
      revisionRequested: contract.filters.RevisionRequested(jobId),
      revisionSubmitted: contract.filters.RevisionSubmitted(jobId),
      jobApproved: contract.filters.JobApproved(jobId),
      disputeRaised: contract.filters.DisputeRaised(jobId),
      disputeResolved: contract.filters.DisputeResolved(jobId),
      autoRelease: contract.filters.AutoReleaseTriggered(jobId),
      fundsReclaimed: contract.filters.FundsReclaimed(jobId)
    };

    Object.entries(filters).forEach(([eventName, filter]) => {
      contract.on(filter, (...args) => {
        onEvent(eventName, args);
      });
    });

    // Cleanup function
    return () => {
      Object.values(filters).forEach(filter => {
        contract.off(filter);
      });
    };
  };

  const getJobDetails = async (jobId: string): Promise<EscrowJob | null> => {
    try {
      if (!ESCROW_CONTRACT_ADDRESS) return null;

      const provider = await getProvider();
      if (!provider) return null;

      await checkNetwork(provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      // Convert UUID to numeric ID
      const numericJobId = uuidToNumericId(jobId);

      const job = await contract.getJob(numericJobId);

      return {
        client: job.client,
        freelancer: job.freelancer,
        token: job.token,
        amount: ethers.formatUnits(job.amount, 6), // USDC has 6 decimals
        platformFee: job.platformFee.toString(),
        submissionDeadline: Number(job.submissionDeadline) * 1000,
        approvalDeadline: Number(job.approvalDeadline) * 1000,
        ipfsHash: job.ipfsHash,
        status: Number(job.status),
        exists: job.exists
      };
    } catch (error) {
      console.error('Error getting job details:', error);
      return null;
    }
  };

  const checkJobFunded = async (jobId: string): Promise<{ funded: boolean; error?: string; canProceed?: boolean }> => {
    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        return { funded: false, error: 'MetaMask not available', canProceed: false };
      }

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, provider);
      
      const numericJobId = uuidToNumericId(jobId);
      
      try {
      const jobData = await contract.getJob(numericJobId);
      
      // status 0 = doesn't exist or not funded yet
      return { funded: jobData.exists && jobData.status !== 0, canProceed: true };
    } catch (error: any) {
      console.error('Error checking if job is funded:', error);
      
      // Check if job doesn't exist on-chain yet (this is normal before first funding)
      if (error?.message?.includes('Job does not exist') || error?.reason?.includes('Job does not exist')) {
        console.log('Job not created on-chain yet - user can proceed to fund');
        return { funded: false, error: 'Not funded yet', canProceed: true };
      }
      
      // Check if it's an RPC indexing issue (not a real "not funded" state)
      const isRpcIndexingIssue = 
        error?.message?.includes('state histories') || 
        error?.message?.includes('haven\'t been fully indexed') ||
        error?.info?.error?.data?.message?.includes('state histories');
      
      if (isRpcIndexingIssue) {
        console.warn('RPC indexing issue detected - allowing transfer to proceed');
        // For RPC errors, we can't verify but we should allow the transfer
        // The smart contract will reject it anyway if not funded
        return { funded: false, error: 'RPC indexing - cannot verify', canProceed: true };
      }
      
      return { funded: false, error: 'Failed to check blockchain', canProceed: false };
    }
    } catch (outerError: any) {
      console.error('Outer error in checkJobFunded:', outerError);
      return { funded: false, error: 'Failed to connect to blockchain', canProceed: false };
    }
  };

  return {
    fundJob,
    submitWork,
    approveJob,
    raiseDispute,
    getJobDetails,
    subscribeToEvents,
    checkJobFunded,
    loading,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    networkConfig: NETWORK_CONFIG
  };
};
