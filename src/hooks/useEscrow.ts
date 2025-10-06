import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Polygon Amoy Testnet USDC address (Official Circle USDC)
const USDC_CONTRACT_ADDRESS = '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582'; // Polygon Amoy Testnet
// For Polygon Mainnet use: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359

// Your deployed escrow contract address - MUST BE SET
const ESCROW_CONTRACT_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || '';

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

      // Convert UUID to numeric ID for smart contract
      const numericJobId = uuidToNumericId(jobId);
      
      // USDC uses 6 decimals on Polygon
      const amount = ethers.parseUnits(amountUSDC, 6);

      // Initialize contracts
      const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, signer);
      const escrowContract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      // Check USDC balance with error handling
      let balance;
      try {
        balance = await usdcContract.balanceOf(await signer.getAddress());
      } catch (balanceError: any) {
        console.warn('Could not check USDC balance, proceeding anyway:', balanceError);
        // Continue without balance check if RPC has issues
        balance = amount; // Assume they have enough to avoid blocking
      }
      
      if (balance < amount) {
        toast({
          title: "Insufficient Balance",
          description: `You need ${amountUSDC} USDC to fund this job. Get testnet USDC from Circle faucet.`,
          variant: "destructive"
        });
        return { success: false };
      }

      toast({
        title: "Approving USDC...",
        description: "Please confirm the approval transaction in MetaMask",
      });

      // Approve USDC spending
      const approveTx = await usdcContract.approve(ESCROW_CONTRACT_ADDRESS, amount);
      await approveTx.wait();

      toast({
        title: "Funding Escrow...",
        description: "Please confirm the funding transaction in MetaMask",
      });

      // Fund the escrow with new parameters - use numeric job ID
      const fundTx = await escrowContract.fundJob(
        numericJobId,
        freelancerAddress,
        USDC_CONTRACT_ADDRESS,
        amount,
        requiresStake,
        allowedRevisions
      );
      const receipt = await fundTx.wait();

      // Store transaction hash in database
      await supabase
        .from('jobs')
        .update({ 
          contract_address: receipt.hash,
          escrow_address: ESCROW_CONTRACT_ADDRESS,
          status: 'in_progress'
        })
        .eq('id', jobId);

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
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      // Convert UUID to numeric ID
      const numericJobId = uuidToNumericId(jobId);

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
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      // Convert UUID to numeric ID
      const numericJobId = uuidToNumericId(jobId);

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
      toast({
        title: "Approval Failed",
        description: error.reason || error.message || "Failed to approve job",
        variant: "destructive"
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
      return () => {};
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

  return {
    fundJob,
    submitWork,
    approveJob,
    raiseDispute,
    getJobDetails,
    subscribeToEvents,
    loading,
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    networkConfig: NETWORK_CONFIG
  };
};
