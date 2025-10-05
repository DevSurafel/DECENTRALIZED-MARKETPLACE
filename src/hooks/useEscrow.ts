import { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from '@/hooks/use-toast';

// BSC Testnet USDT address - replace with mainnet for production
const USDT_CONTRACT_ADDRESS = '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'; // BSC Testnet
// For BSC Mainnet use: 0x55d398326f99059fF775485246999027B3197955

// Your deployed escrow contract address - MUST BE SET
const ESCROW_CONTRACT_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS || '';

const ESCROW_ABI = [
  'function fundJob(uint256 jobId, address freelancer, address token, uint256 amount) external',
  'function submitWork(uint256 jobId, string ipfsHash) external',
  'function approveJob(uint256 jobId) external',
  'function raiseDispute(uint256 jobId) external',
  'function resolveDispute(uint256 jobId, uint256 clientPercentage) external',
  'function reclaimFunds(uint256 jobId) external',
  'function getJob(uint256 jobId) external view returns (tuple(address client, address freelancer, address token, uint256 amount, uint256 platformFee, uint256 submissionDeadline, uint256 approvalDeadline, string ipfsHash, uint8 status, bool exists))',
  'event JobFunded(uint256 indexed jobId, address token, uint256 amount)',
  'event JobApproved(uint256 indexed jobId, uint256 freelancerAmount, uint256 platformFee)',
  'event DisputeRaised(uint256 indexed jobId, address indexed raiser)'
];

const USDT_ABI = [
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
    const bscTestnetChainId = 97n; // BSC Testnet
    // For mainnet, use: const bscMainnetChainId = 56n;
    
    if (network.chainId !== bscTestnetChainId) {
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x61' }], // 97 in hex for testnet, use 0x38 for mainnet
        });
      } catch (error: any) {
        if (error.code === 4902) {
          toast({
            title: "Network Not Added",
            description: "Please add BSC Testnet to MetaMask",
            variant: "destructive"
          });
        }
        throw error;
      }
    }
  };

  const fundJob = async (
    jobId: number,
    freelancerAddress: string,
    amountUSDT: string
  ): Promise<boolean> => {
    setLoading(true);
    try {
      if (!ESCROW_CONTRACT_ADDRESS) {
        toast({
          title: "Configuration Error",
          description: "Escrow contract address not configured. Please contact support.",
          variant: "destructive"
        });
        return false;
      }

      const provider = await getProvider();
      if (!provider) return false;

      await checkNetwork(provider);
      const signer = await provider.getSigner();

      // Convert USDT amount to proper decimals (18 for USDT BEP-20)
      const amount = ethers.parseUnits(amountUSDT, 18);

      // Initialize contracts
      const usdtContract = new ethers.Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, signer);
      const escrowContract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      // Check USDT balance
      const balance = await usdtContract.balanceOf(await signer.getAddress());
      if (balance < amount) {
        toast({
          title: "Insufficient Balance",
          description: `You need ${amountUSDT} USDT to fund this job`,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Approving USDT...",
        description: "Please confirm the approval transaction in MetaMask",
      });

      // Approve USDT spending
      const approveTx = await usdtContract.approve(ESCROW_CONTRACT_ADDRESS, amount);
      await approveTx.wait();

      toast({
        title: "Funding Escrow...",
        description: "Please confirm the funding transaction in MetaMask",
      });

      // Fund the escrow
      const fundTx = await escrowContract.fundJob(
        jobId,
        freelancerAddress,
        USDT_CONTRACT_ADDRESS,
        amount
      );
      const receipt = await fundTx.wait();

      toast({
        title: "Escrow Funded Successfully",
        description: `Job ${jobId} funded with ${amountUSDT} USDT`,
      });

      console.log('Transaction hash:', receipt.hash);
      return true;
    } catch (error: any) {
      console.error('Error funding job:', error);
      toast({
        title: "Funding Failed",
        description: error.reason || error.message || "Failed to fund escrow",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const submitWork = async (jobId: number, ipfsHash: string): Promise<boolean> => {
    setLoading(true);
    try {
      if (!ESCROW_CONTRACT_ADDRESS) {
        toast({
          title: "Configuration Error",
          description: "Escrow contract address not configured",
          variant: "destructive"
        });
        return false;
      }

      const provider = await getProvider();
      if (!provider) return false;

      await checkNetwork(provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      toast({
        title: "Submitting Work...",
        description: "Please confirm the transaction in MetaMask",
      });

      const tx = await contract.submitWork(jobId, ipfsHash);
      await tx.wait();

      toast({
        title: "Work Submitted",
        description: `Work for job ${jobId} has been submitted to blockchain`,
      });
      return true;
    } catch (error: any) {
      console.error('Error submitting work:', error);
      toast({
        title: "Submission Failed",
        description: error.reason || error.message || "Failed to submit work",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const approveJob = async (jobId: number): Promise<boolean> => {
    setLoading(true);
    try {
      if (!ESCROW_CONTRACT_ADDRESS) {
        toast({
          title: "Configuration Error",
          description: "Escrow contract address not configured",
          variant: "destructive"
        });
        return false;
      }

      const provider = await getProvider();
      if (!provider) return false;

      await checkNetwork(provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      toast({
        title: "Approving Job...",
        description: "Please confirm the transaction in MetaMask. Payment will be released to freelancer.",
      });

      const tx = await contract.approveJob(jobId);
      const receipt = await tx.wait();

      toast({
        title: "Job Approved",
        description: `Payment released for job ${jobId}. Funds sent to freelancer.`,
      });

      console.log('Transaction hash:', receipt.hash);
      return true;
    } catch (error: any) {
      console.error('Error approving job:', error);
      toast({
        title: "Approval Failed",
        description: error.reason || error.message || "Failed to approve job",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const raiseDispute = async (jobId: number): Promise<boolean> => {
    setLoading(true);
    try {
      if (!ESCROW_CONTRACT_ADDRESS) {
        toast({
          title: "Configuration Error",
          description: "Escrow contract address not configured",
          variant: "destructive"
        });
        return false;
      }

      const provider = await getProvider();
      if (!provider) return false;

      await checkNetwork(provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      toast({
        title: "Raising Dispute...",
        description: "Please confirm the transaction in MetaMask",
      });

      const tx = await contract.raiseDispute(jobId);
      await tx.wait();

      toast({
        title: "Dispute Raised",
        description: `Dispute raised for job ${jobId}. An arbitrator will review.`,
      });
      return true;
    } catch (error: any) {
      console.error('Error raising dispute:', error);
      toast({
        title: "Dispute Failed",
        description: error.reason || error.message || "Failed to raise dispute",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getJobDetails = async (jobId: number): Promise<EscrowJob | null> => {
    try {
      if (!ESCROW_CONTRACT_ADDRESS) return null;

      const provider = await getProvider();
      if (!provider) return null;

      await checkNetwork(provider);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, signer);

      const job = await contract.getJob(jobId);
      
      return {
        client: job.client,
        freelancer: job.freelancer,
        token: job.token,
        amount: ethers.formatUnits(job.amount, 18),
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
    loading,
    contractAddress: ESCROW_CONTRACT_ADDRESS
  };
};
