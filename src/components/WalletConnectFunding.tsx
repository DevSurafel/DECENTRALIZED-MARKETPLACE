import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, Smartphone, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ethers } from 'ethers';
import QRCodeStyling from 'qr-code-styling';

interface WalletConnectFundingProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (txHash: string) => void;
  jobId: string;
  freelancerAddress: string;
  amountUSDC: string;
  escrowContractAddress: string;
  usdcContractAddress: string;
  requiresStake?: boolean;
  allowedRevisions?: number;
}

const ESCROW_ABI = [
  'function fundJob(uint256 jobId, address freelancer, address token, uint256 amount, bool requiresStake, uint256 allowedRevisions) external'
];

const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)'
];

// Chain config for Polygon Amoy
const AMOY_HEX = '0x13882';

const ensureCorrectChain = async (provider: any) => {
  const current = await provider.request({ method: 'eth_chainId' });
  if (current !== AMOY_HEX) {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AMOY_HEX }]
      });
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: AMOY_HEX,
            chainName: 'Polygon Amoy',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://rpc-amoy.polygon.technology'],
            blockExplorerUrls: ['https://www.oklink.com/amoy']
          }]
        });
      } else {
        throw switchError;
      }
    }
  }
};

export const WalletConnectFunding = ({
  isOpen,
  onClose,
  onSuccess,
  jobId,
  freelancerAddress,
  amountUSDC,
  escrowContractAddress,
  usdcContractAddress,
  requiresStake = false,
  allowedRevisions = 3
}: WalletConnectFundingProps) => {
  const [wcUri, setWcUri] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'approving' | 'funding' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [wcProvider, setWcProvider] = useState<any>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<any>(null);

  const uuidToNumericId = (uuid: string): bigint => {
    const hex = uuid.replace(/-/g, '').slice(0, 16);
    return BigInt('0x' + hex);
  };

  useEffect(() => {
    if (isOpen && status === 'idle') {
      initializeWalletConnect();
    }

    return () => {
      if (wcProvider) {
        try {
          wcProvider.disconnect();
        } catch (e) {
          console.log('Cleanup disconnect error:', e);
        }
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (wcUri && qrCodeRef.current) {
      if (!qrCodeInstance.current) {
        qrCodeInstance.current = new QRCodeStyling({
          width: window.innerWidth < 640 ? 200 : 220,
          height: window.innerWidth < 640 ? 200 : 220,
          data: wcUri,
          margin: 10,
          qrOptions: {
            typeNumber: 0,
            mode: 'Byte',
            errorCorrectionLevel: 'Q'
          },
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.4,
            margin: 0
          },
          dotsOptions: {
            type: 'rounded',
            color: '#000000'
          },
          backgroundOptions: {
            color: '#ffffff'
          },
          cornersSquareOptions: {
            type: 'extra-rounded',
            color: '#000000'
          },
          cornersDotOptions: {
            type: 'dot',
            color: '#000000'
          }
        });
        qrCodeInstance.current.append(qrCodeRef.current);
      } else {
        qrCodeInstance.current.update({ data: wcUri });
      }
    }
  }, [wcUri]);

  const initializeWalletConnect = async () => {
    setStatus('connecting');

    try {
      let EthereumProvider;

      try {
        EthereumProvider = (await import('@walletconnect/ethereum-provider')).EthereumProvider;
      } catch (importError) {
        console.error('WalletConnect not installed:', importError);
        setStatus('error');
        setErrorMessage('Please install: npm install @walletconnect/ethereum-provider qr-code-styling');
        return;
      }

      const provider = await EthereumProvider.init({
        projectId: '22774a64e30fb9eb3014ccbad85d5b71',
        chains: [80002],
        showQrModal: false,
        methods: [
          'eth_sendTransaction',
          'eth_sign',
          'personal_sign',
        ],
        events: ['chainChanged', 'accountsChanged'],
        rpcMap: {
          80002: 'https://rpc-amoy.polygon.technology'
        },
        metadata: {
          name: 'DeFiLance',
          description: 'Decentralized Freelance Platform',
          url: window.location.origin,
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      });

      setWcProvider(provider);

      provider.on('display_uri', (uri: string) => {
        console.log('WalletConnect URI:', uri);
        setWcUri(uri);
      });

      provider.on('connect', async (session: any) => {
        console.log('Wallet connected!', session);
        try {
          await ensureCorrectChain(provider);
        } catch (e) {
          console.error('Chain switch failed on connect:', e);
        }
        await executePayment(provider);
      });

      provider.on('chainChanged', async (chainId: string) => {
        console.log('Chain changed to', chainId);
        if (chainId !== AMOY_HEX) {
          try {
            await ensureCorrectChain(provider);
            toast({ title: '🔄 Switched Network', description: 'Switched to Polygon Amoy. Retrying payment...' });
            await executePayment(provider);
          } catch (e) {
            console.error('Failed to switch to Amoy after change:', e);
          }
        }
      });

      provider.on('disconnect', () => {
        console.log('Wallet disconnected');
        if (status !== 'success') {
          setStatus('error');
          setErrorMessage('Wallet disconnected. Please try again.');
        }
      });

      await provider.enable();

    } catch (error: any) {
      console.error('WalletConnect initialization error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to initialize WalletConnect. Make sure the package is installed.');
    }
  };

  const executePayment = async (provider: any) => {
    try {
      await ensureCorrectChain(provider);
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();

      console.log('Connected wallet:', address);

      // Pre-flight checks
      const maticBalance = await ethersProvider.getBalance(address);
      const maticBalanceEth = ethers.formatEther(maticBalance);
      console.log('Wallet MATIC balance:', maticBalanceEth, 'MATIC');

      const minMatic = ethers.parseEther('0.01');
      if (maticBalance < minMatic) {
        throw new Error(`⛽ Insufficient MATIC for gas fees.\n\nYour balance: ${maticBalanceEth} MATIC\nRequired: at least 0.01 MATIC\n\nGet free test MATIC from Alchemy Faucet to continue.`);
      }

      // Check USDC balance
      const usdcContract = new ethers.Contract(usdcContractAddress, USDC_ABI, signer);
      const usdcBalance = await usdcContract.balanceOf(address);
      const usdcBalanceFormatted = ethers.formatUnits(usdcBalance, 6);
      console.log('Wallet USDC balance:', usdcBalanceFormatted, 'USDC');

      const numericJobId = uuidToNumericId(jobId);
      const amount = ethers.parseUnits(amountUSDC, 6);

      if (usdcBalance < amount) {
        throw new Error(`💵 Insufficient USDC balance.\n\nRequired: ${amountUSDC} USDC\nYour balance: ${usdcBalanceFormatted} USDC\n\nPlease add more USDC to your wallet.`);
      }

      // Verify contracts exist
      const [escrowCode, usdcCode] = await Promise.all([
        ethersProvider.getCode(escrowContractAddress),
        ethersProvider.getCode(usdcContractAddress),
      ]);
      if (escrowCode === '0x' || escrowCode === '0x0') {
        setStatus('error');
        setErrorMessage(`Escrow contract not deployed at ${escrowContractAddress}.`);
        toast({ title: 'Contract Not Deployed', description: 'Escrow contract is not deployed on this network.', variant: 'destructive' });
        return;
      }
      if (usdcCode === '0x' || usdcCode === '0x0') {
        setStatus('error');
        setErrorMessage(`USDC contract not deployed at ${usdcContractAddress}.`);
        toast({ title: 'Invalid USDC', description: 'USDC contract is not deployed on this network.', variant: 'destructive' });
        return;
      }

      // If freelancer stake is required, verify
      if (requiresStake) {
        try {
          const escrowRead = new ethers.Contract(
            escrowContractAddress,
            ['function defaultStakePercentage() view returns (uint256)'],
            ethersProvider
          );
          const stakeBps: bigint = await escrowRead.defaultStakePercentage();
          const stakeAmount: bigint = (amount * stakeBps) / 10000n;

          const freelancerBal: bigint = await usdcContract.balanceOf(freelancerAddress);
          const freelancerAllowance: bigint = await new ethers.Contract(
            usdcContractAddress,
            USDC_ABI,
            ethersProvider
          ).allowance(freelancerAddress, escrowContractAddress);

          if (freelancerBal < stakeAmount) {
            const needed = ethers.formatUnits(stakeAmount, 6);
            setStatus('error');
            setErrorMessage(`Freelancer stake missing. Needs ${needed} USDC available.`);
            toast({
              title: 'Freelancer Stake Missing',
              description: `Freelancer must have ${needed} USDC to deposit stake before funding.`,
              variant: 'destructive',
            });
            return;
          }
          if (freelancerAllowance < stakeAmount) {
            const needed = ethers.formatUnits(stakeAmount, 6);
            setStatus('error');
            setErrorMessage(`Freelancer approval required for ${needed} USDC.`);
            toast({
              title: 'Freelancer Approval Required',
              description: `Ask the freelancer to approve ${needed} USDC to the escrow contract before funding.`,
              variant: 'destructive',
            });
            return;
          }
        } catch (stakeCheckErr) {
          console.warn('Stake pre-check failed:', stakeCheckErr);
        }
      }

      // Step 1: Approve USDC
      setStatus('approving');
      toast({
        title: '📝 Step 1 of 2',
        description: 'Approve USDC spending in your wallet',
      });

      const usdcContractWithSigner = new ethers.Contract(usdcContractAddress, USDC_ABI, signer);
      
      // Check current allowance
      const currentAllowance = await usdcContractWithSigner.allowance(address, escrowContractAddress);
      console.log('Current USDC allowance:', ethers.formatUnits(currentAllowance, 6), 'USDC');
      
      if (currentAllowance >= amount) {
        console.log('Sufficient allowance already exists, skipping approval');
        toast({
          title: '✅ Already Approved',
          description: 'USDC spending already approved',
        });
      } else {
        console.log('Requesting USDC approval for amount:', ethers.formatUnits(amount, 6), 'USDC');
        
        // Approve with a high amount to avoid multiple approvals
        const approvalAmount = amount * 2n; // Approve 2x the amount for future transactions
        
        let approveTx;
        try {
          // Try with gas estimation
          const gasEstimate = await usdcContractWithSigner.approve.estimateGas(escrowContractAddress, approvalAmount);
          console.log('Approve gas estimate:', gasEstimate.toString());
          const gasLimit = (gasEstimate * 150n) / 100n; // 50% buffer
          approveTx = await usdcContractWithSigner.approve(escrowContractAddress, approvalAmount, { gasLimit });
        } catch (gasError) {
          console.warn('Gas estimation failed, trying without override:', gasError);
          // Fallback: send without gas override
          approveTx = await usdcContractWithSigner.approve(escrowContractAddress, approvalAmount);
        }
        
        console.log('Approval transaction sent:', approveTx.hash);
        
        toast({
          title: '⏳ Approving...',
          description: 'Waiting for blockchain confirmation',
        });

        const approvalReceipt = await approveTx.wait();
        
        if (!approvalReceipt || approvalReceipt.status !== 1) {
          throw new Error('Approval transaction failed');
        }
        
        console.log('Approval confirmed in block:', approvalReceipt.blockNumber);
        
        // Wait for network to fully propagate the approval (critical fix)
        console.log('Waiting 5 seconds for network propagation...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verify allowance was actually updated on-chain
        const newAllowance = await usdcContractWithSigner.allowance(address, escrowContractAddress);
        console.log('Verified new allowance:', ethers.formatUnits(newAllowance, 6), 'USDC');
        
        if (newAllowance < amount) {
          throw new Error('Allowance not updated correctly. Please try again.');
        }
        
        toast({
          title: '✅ Approved!',
          description: 'USDC approval successful',
        });
      }

      // Step 2: Fund Job
      setStatus('funding');
      toast({
        title: '💰 Step 2 of 2',
        description: `Confirm payment of $${amountUSDC} USDC`,
      });

      const escrowContract = new ethers.Contract(escrowContractAddress, ESCROW_ABI, signer);
      
      // Pre-flight simulation to catch errors before sending
      console.log('Running pre-flight simulation...');
      try {
        await escrowContract.fundJob.staticCall(
          numericJobId,
          freelancerAddress,
          usdcContractAddress,
          amount,
          requiresStake,
          allowedRevisions
        );
        console.log('Pre-flight simulation passed');
      } catch (simulationError: any) {
        console.error('Pre-flight simulation failed:', simulationError);
        const errMsg = simulationError?.reason || simulationError?.message || '';
        
        if (errMsg.includes('Job already exists')) {
          throw new Error('Job already exists - Escrow is already funded');
        } else if (errMsg.includes('Insufficient allowance')) {
          // This shouldn't happen after our checks, but just in case
          throw new Error('⚠️ USDC approval still insufficient. The approval may not have propagated yet. Please wait 30 seconds and try again.');
        } else if (errMsg.includes('ERC20: insufficient balance')) {
          throw new Error('💵 Insufficient USDC balance in your wallet.');
        } else if (errMsg.includes('Stake transfer failed')) {
          throw new Error('⚠️ Freelancer stake not approved. Ask the freelancer to approve the required stake to the escrow.');
        } else if (errMsg.includes('Transfer failed')) {
          throw new Error('⚠️ Token transfer would fail. This may be due to allowance not propagating yet. Please wait 30 seconds and try again.');
        } else {
          throw new Error(`Transaction would fail: ${errMsg}`);
        }
      }
      
      // Estimate gas with better error handling
      let fundTx;
      try {
        console.log('Estimating gas for fundJob...');
        const gasEstimate = await escrowContract.fundJob.estimateGas(
          numericJobId,
          freelancerAddress,
          usdcContractAddress,
          amount,
          requiresStake,
          allowedRevisions
        );
        console.log('Gas estimate:', gasEstimate.toString());
        
        // Add 50% buffer for gas
        const gasLimit = (gasEstimate * 150n) / 100n;
        console.log('Gas limit with buffer:', gasLimit.toString());
        
        fundTx = await escrowContract.fundJob(
          numericJobId,
          freelancerAddress,
          usdcContractAddress,
          amount,
          requiresStake,
          allowedRevisions,
          { gasLimit }
        );
        
        console.log('FundJob transaction sent:', fundTx.hash);
      } catch (fundError: any) {
        console.error('Fund transaction error:', fundError);
        
        const errorMsg = (fundError?.message || '').toLowerCase();
        const errorReason = (fundError?.reason || '').toLowerCase();
        
        if (errorMsg.includes('insufficient funds') || errorReason.includes('insufficient funds')) {
          throw new Error('⛽ Insufficient MATIC for gas fees. Please ensure your wallet has MATIC on Polygon Amoy testnet to pay for transaction fees.');
        }
        
        if (errorMsg.includes('user rejected') || fundError?.code === 4001 || fundError?.code === 'ACTION_REJECTED') {
          throw new Error('❌ Transaction rejected by user');
        }
        
        if (errorReason.includes('job already exists')) {
          throw new Error('Job already exists - Escrow is already funded');
        }
        
        if (errorMsg.includes('allowance') || errorReason.includes('allowance')) {
          throw new Error('⚠️ USDC approval insufficient. The approval transaction may still be processing. Please wait 30 seconds and try again.');
        }
        
        throw fundError;
      }

      toast({
        title: '⏳ Processing...',
        description: 'Waiting for payment confirmation',
      });

      const receipt = await fundTx.wait();
      
      if (!receipt || receipt.status !== 1) {
        throw new Error('Funding transaction failed');
      }

      console.log('Funding confirmed in block:', receipt.blockNumber);

      // Payment successful!
      setStatus('success');
      toast({
        title: '🎉 Payment Complete!',
        description: `Successfully paid $${amountUSDC} USDC`,
      });

      setTimeout(() => {
        onSuccess(receipt.hash);
        if (wcProvider) {
          wcProvider.disconnect();
        }
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('Payment error:', error);
      console.error('Payment error details:', {
        code: error?.code,
        message: error?.message,
        reason: error?.reason,
        shortMessage: error?.shortMessage,
        data: error?.data,
        info: error?.info
      });

      const msg = (error?.reason || error?.shortMessage || error?.message || '').toString();
      
      // If escrow/job is already created on-chain, treat as a success
      if (msg.includes('Job already exists')) {
        setStatus('success');
        toast({
          title: '✅ Already Funded',
          description: 'Escrow is already funded and locked.',
        });
        setTimeout(() => {
          onSuccess('already-funded');
          if (wcProvider) {
            wcProvider.disconnect();
          }
          onClose();
        }, 1200);
        return;
      }

      setStatus('error');
      let errorMsg = 'Payment failed';
      
      if (error?.code === 'ACTION_REJECTED' || error?.code === 4001) {
        errorMsg = 'Transaction rejected by user';
      } else if (msg.includes('⛽ Insufficient MATIC')) {
        errorMsg = msg;
      } else if (msg.includes('💵 Insufficient USDC')) {
        errorMsg = msg;
      } else if (msg.includes('Job already exists')) {
        errorMsg = msg;
      } else if (msg.includes('allowance')) {
        errorMsg = '⚠️ USDC Approval Issue\n\nThe approval may still be processing on the blockchain. Please:\n1. Wait 30-60 seconds\n2. Try the payment again\n\nIf this persists, refresh the page and restart.';
      } else if (msg.toLowerCase().includes('network changed')) {
        errorMsg = '🔄 Network switched to Polygon Amoy (80002). Please confirm the transaction again in your wallet.';
      } else if (msg.toLowerCase().includes('could not coalesce error') || msg.toLowerCase().includes('internal json-rpc error')) {
        errorMsg = '⚠️ Network Synchronization Issue\n\nThe blockchain node may be temporarily out of sync. This can happen if:\n• Approval transaction hasn\'t fully propagated\n• Network congestion\n\nPlease wait 60 seconds and try again.';
      } else if (msg) {
        errorMsg = msg;
      }

      setErrorMessage(errorMsg);
      toast({
        title: '❌ Payment Failed',
        description: errorMsg,
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && wcProvider) {
        wcProvider.disconnect();
      }
      onClose();
    }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background/95 to-primary/5 border-2 border-primary/30 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            <Wallet className="h-5 w-5 sm:h-4 sm:w-4 text-primary" />
            Fund Escrow via WalletConnect
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-xs text-muted-foreground">
            Scan the QR code with your mobile wallet or use MetaMask
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-3 py-2 sm:py-2">
          {/* Amount Display */}
          <div className="text-center p-4 sm:p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl border border-primary/20 shadow-lg">
            <p className="text-xs sm:text-xs text-muted-foreground mb-1 sm:mb-1 font-medium">You're paying</p>
            <p className="text-3xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">${amountUSDC}</p>
            <p className="text-xs sm:text-xs text-muted-foreground font-semibold">USDC</p>
          </div>

          {/* Status Display */}
          {status === 'connecting' && (
            <div className="flex flex-col items-center gap-3 sm:gap-3">
              {wcUri ? (
                <>
                  <div className="p-2 sm:p-2 bg-white dark:bg-gray-800 rounded-xl border-2 sm:border-2 border-primary shadow-lg">
                    <div ref={qrCodeRef} className="flex items-center justify-center w-[200px] h-[200px] sm:w-[220px] sm:h-[220px]" />
                  </div>

                  <div className="text-center space-y-1 sm:space-y-1">
                    <p className="text-xs sm:text-xs font-semibold flex items-center justify-center gap-2">
                      <Smartphone className="h-3 w-3 sm:h-3 sm:w-3 text-primary animate-pulse" />
                      Scan with your wallet app
                    </p>
                    <p className="text-[10px] sm:text-[10px] text-muted-foreground">
                      MetaMask • Trust Wallet • Coinbase Wallet • Rainbow
                    </p>
                  </div>

                  <div className="w-full p-2 sm:p-2 bg-blue-50 dark:bg-blue-950 rounded-lg text-[10px] sm:text-[10px] text-center">
                    <p className="text-blue-700 dark:text-blue-300 animate-pulse">
                      💡 Waiting for wallet connection...
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 sm:gap-3 py-4 sm:py-4">
                  <Loader2 className="h-10 w-10 sm:h-10 sm:w-10 animate-spin text-primary" />
                  <p className="text-xs sm:text-xs text-muted-foreground">Generating QR code...</p>
                  <p className="text-[10px] sm:text-[10px] text-muted-foreground">This may take a few seconds</p>
                </div>
              )}
            </div>
          )}

          {status === 'approving' && (
            <div className="flex flex-col items-center gap-3 sm:gap-3 py-4 sm:py-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 sm:h-12 sm:w-12 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 sm:h-6 sm:w-6 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-base sm:text-sm mb-1">Step 1 of 2</p>
                <p className="text-xs sm:text-xs text-muted-foreground">
                  Approve USDC spending
                </p>
                <p className="text-[10px] sm:text-[10px] text-muted-foreground mt-2">
                  Check your wallet app for approval request
                </p>
              </div>
            </div>
          )}

          {status === 'funding' && (
            <div className="flex flex-col items-center gap-3 sm:gap-3 py-4 sm:py-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 sm:h-12 sm:w-12 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wallet className="h-6 w-6 sm:h-6 sm:w-6 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-base sm:text-sm mb-1">Step 2 of 2</p>
                <p className="text-xs sm:text-xs text-muted-foreground">
                  Confirm payment of ${amountUSDC} USDC
                </p>
                <p className="text-[10px] sm:text-[10px] text-muted-foreground mt-2">
                  Check your wallet app to confirm the transaction
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 sm:gap-3 py-4 sm:py-4">
              <div className="rounded-full bg-green-500/10 p-4 sm:p-4">
                <CheckCircle2 className="h-12 w-12 sm:h-12 sm:w-12 text-green-500" />
              </div>
              <div className="text-center">
                <h3 className="text-lg sm:text-lg font-bold text-green-500 mb-2">Payment Complete!</h3>
                <p className="text-xs sm:text-xs text-muted-foreground">
                  Successfully paid ${amountUSDC} USDC
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 sm:gap-3 py-4 sm:py-4">
              <div className="rounded-full bg-red-500/10 p-4 sm:p-4">
                <AlertCircle className="h-12 w-12 sm:h-12 sm:w-12 text-red-500" />
              </div>
              <div className="text-center">
                <h3 className="text-base sm:text-base font-bold text-red-500 mb-2">Something Went Wrong</h3>
                <p className="text-xs sm:text-xs text-muted-foreground px-2 sm:px-4 whitespace-pre-line">
                  {errorMessage}
                </p>
                {errorMessage.includes('⛽ Insufficient MATIC') && (
                  <div className="mt-3 sm:mt-3 p-2 sm:p-2 bg-amber-50 dark:bg-amber-950 rounded-lg text-[10px] sm:text-[10px] text-left space-y-2">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">💡 How to fix:</p>
                    <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-200">
                      <li>Get free test MATIC from <a href="https://www.alchemy.com/faucets/polygon-amoy" target="_blank" rel="noopener noreferrer" className="underline">Alchemy Faucet</a></li>
                      <li>Wait 1-2 minutes for MATIC to arrive</li>
                      <li>Try payment again</li>
                    </ol>
                  </div>
                )}
                {errorMessage.includes('allowance') && (
                  <div className="mt-3 sm:mt-3 p-2 sm:p-2 bg-blue-50 dark:bg-blue-950 rounded-lg text-[10px] sm:text-[10px] text-left space-y-2">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">💡 What to do:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                      <li>Wait 60 seconds for blockchain to sync</li>
                      <li>Click "Try Again" below</li>
                      <li>If still failing, refresh the entire page</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Help Text */}
          {(status === 'connecting' || status === 'approving' || status === 'funding') && (
            <div className="p-2 sm:p-2 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-[10px] sm:text-[10px] text-amber-900 dark:text-amber-100">
                <strong>📱 Need a wallet?</strong>
                <br />
                Download MetaMask, Trust Wallet, or any WalletConnect-compatible wallet from your app store.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 sm:gap-2 pt-3 sm:pt-2 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (wcProvider) {
                wcProvider.disconnect();
              }
              onClose();
            }}
            className="flex-1 text-xs sm:text-xs"
          >
            Cancel
          </Button>
          {status === 'error' && (
            <Button
              onClick={() => {
                setStatus('idle');
                setErrorMessage('');
                setWcUri('');
                initializeWalletConnect();
              }}
              className="flex-1 text-xs sm:text-xs"
            >
              Try Again
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
