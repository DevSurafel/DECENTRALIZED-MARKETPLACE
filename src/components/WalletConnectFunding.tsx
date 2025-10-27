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
  'function allowance(address owner, address spender) external view returns (uint256)'
];

// Chain config for Polygon Amoy
const AMOY_DEC = 80002;
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
      // Create QR code when URI is available
      if (!qrCodeInstance.current) {
        qrCodeInstance.current = new QRCodeStyling({
      width: window.innerWidth < 640 ? 200 : 300,
          height: window.innerWidth < 640 ? 200 : 300,
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
      // Try to import WalletConnect
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
        projectId: '22774a64e30fb9eb3014ccbad85d5b71', // ⚠️ REPLACE WITH YOUR WALLETCONNECT PROJECT ID
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

      // Listen for display_uri event
      provider.on('display_uri', (uri: string) => {
        console.log('WalletConnect URI:', uri);
        setWcUri(uri);
      });

      // Listen for connection
      provider.on('connect', async (session: any) => {
        console.log('Wallet connected!', session);
        try {
          await ensureCorrectChain(provider);
        } catch (e) {
          console.error('Chain switch failed on connect:', e);
        }
        await executePayment(provider);
      });

      // React to chain changes
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

      // Connect
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

      // Check if wallet has at least 0.01 MATIC for gas
      const minMatic = ethers.parseEther('0.01');
      if (maticBalance < minMatic) {
        throw new Error(`⛽ Insufficient MATIC for gas fees.\n\nYour balance: ${maticBalanceEth} MATIC\nRequired: at least 0.01 MATIC\n\nGet free test MATIC from Alchemy Faucet to continue.`);
      }

      // Check USDC balance
      const usdcContract = new ethers.Contract(usdcContractAddress, [
        'function balanceOf(address) view returns (uint256)'
      ], signer);
      const usdcBalance = await usdcContract.balanceOf(address);
      const usdcBalanceFormatted = ethers.formatUnits(usdcBalance, 6);
      console.log('Wallet USDC balance:', usdcBalanceFormatted, 'USDC');

      const numericJobId = uuidToNumericId(jobId);
      const amount = ethers.parseUnits(amountUSDC, 6);

      if (usdcBalance < amount) {
        throw new Error(`💵 Insufficient USDC balance.\n\nRequired: ${amountUSDC} USDC\nYour balance: ${usdcBalanceFormatted} USDC\n\nPlease add more USDC to your wallet.`);
      }

      // Pre-flight: verify contracts exist and stake requirements
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

      // If freelancer stake is required, verify freelancer balance and allowance before sending
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
      
      let approveTx;
      try {
        console.log('Requesting USDC approval for amount:', ethers.formatUnits(amount, 6), 'USDC');
        console.log('USDC Contract:', usdcContractAddress);
        console.log('Escrow Contract:', escrowContractAddress);
        console.log('Signer address:', address);
        
        // First check if approval is needed
        const currentAllowance = await usdcContractWithSigner.allowance(address, escrowContractAddress);
        console.log('Current USDC allowance:', ethers.formatUnits(currentAllowance, 6), 'USDC');
        
        if (currentAllowance >= amount) {
          console.log('Sufficient allowance already exists, skipping approval');
          toast({
            title: '✅ Already Approved',
            description: 'USDC spending already approved',
          });
        } else {
          // Try to estimate gas first
          try {
            const gasEstimate = await usdcContractWithSigner.approve.estimateGas(escrowContractAddress, amount);
            console.log('Approve gas estimate:', gasEstimate.toString());
          } catch (estimateError: any) {
            console.error('Approve gas estimation failed:', estimateError);
            throw new Error('❌ Approval transaction would fail. Please check your wallet has MATIC for gas and try again.');
          }
          
          approveTx = await usdcContractWithSigner.approve(escrowContractAddress, amount);
          console.log('Approval transaction sent:', approveTx.hash);
          
          toast({
            title: '⏳ Approving...',
            description: 'Waiting for blockchain confirmation',
          });

          await approveTx.wait();
          
          toast({
            title: '✅ Approved!',
            description: 'USDC approval successful',
          });
        }
      } catch (approveError: any) {
        // Log full error details for debugging
        console.error('USDC Approve Error Details:', {
          code: approveError?.code,
          message: approveError?.message,
          reason: approveError?.reason,
          data: approveError?.data,
          error: approveError
        });
        
        // Check for actual gas/balance issues
        const errorMsg = (approveError?.message || '').toLowerCase();
        const errorReason = (approveError?.reason || '').toLowerCase();
        
        if (errorMsg.includes('insufficient funds') || errorReason.includes('insufficient funds')) {
          throw new Error('⛽ Insufficient MATIC for gas fees. Please ensure your wallet has at least 0.01 MATIC on Polygon Amoy testnet.');
        }
        
        if (errorMsg.includes('user rejected') || approveError?.code === 4001 || approveError?.code === 'ACTION_REJECTED') {
          throw new Error('❌ Transaction rejected by user');
        }
        
        throw approveError;
      }

      // Step 2: Fund Job
      setStatus('funding');
      toast({
        title: '💰 Step 2 of 2',
        description: `Confirm payment of $${amountUSDC} USDC`,
      });

      const escrowContract = new ethers.Contract(escrowContractAddress, ESCROW_ABI, signer);
      
      let fundTx;
      try {
        // First, try to estimate gas to catch contract reverts before sending
        console.log('Estimating gas for fundJob...');
        try {
          const gasEstimate = await escrowContract.fundJob.estimateGas(
            numericJobId,
            freelancerAddress,
            usdcContractAddress,
            amount,
            requiresStake,
            allowedRevisions
          );
          console.log('Gas estimate successful:', gasEstimate.toString());
        } catch (estimateError: any) {
          console.error('Gas estimation failed:', estimateError);
          
          // Try to extract the revert reason
          const revertReason = estimateError?.reason || estimateError?.message || '';
          
          if (revertReason.includes('Job already exists')) {
            throw new Error('Job already exists - Escrow is already funded');
          } else if (revertReason.includes('Insufficient allowance')) {
            throw new Error('⚠️ USDC approval insufficient. Please try again or refresh the page.');
          } else if (revertReason.includes('ERC20: insufficient balance')) {
            throw new Error('💵 Insufficient USDC balance in your wallet.');
          } else if (revertReason.includes('Stake transfer failed')) {
            throw new Error('⚠️ Freelancer stake not approved. Ask the freelancer to approve the required stake to the escrow.');
          } else if (revertReason.includes('Transfer failed')) {
            throw new Error('⚠️ Token transfer failed. Check allowances and balances, then try again.');
          } else {
            throw new Error(`❌ Transaction would fail: ${revertReason}`);
          }
        }

        // If gas estimation succeeded, send the transaction
        fundTx = await escrowContract.fundJob(
          numericJobId,
          freelancerAddress,
          usdcContractAddress,
          amount,
          requiresStake,
          allowedRevisions
        );
        console.log('FundJob transaction sent:', fundTx.hash);
      } catch (fundError: any) {
        // Log full error details for debugging
        console.error('Fund Job Error Details:', {
          code: fundError?.code,
          message: fundError?.message,
          reason: fundError?.reason,
          error: fundError
        });
        
        // Check for actual gas/balance issues
        const errorMsg = (fundError?.message || '').toLowerCase();
        const errorReason = (fundError?.reason || '').toLowerCase();
        
        if (errorMsg.includes('insufficient funds') || errorReason.includes('insufficient funds')) {
          throw new Error('⛽ Insufficient MATIC for gas fees. Please ensure your wallet has MATIC on Polygon Amoy testnet to pay for transaction fees.');
        }
        
        if (errorMsg.includes('user rejected') || fundError?.code === 4001 || fundError?.code === 'ACTION_REJECTED') {
          throw new Error('❌ Transaction rejected by user');
        }
        
        throw fundError;
      }

      toast({
        title: '⏳ Processing...',
        description: 'Waiting for payment confirmation',
      });

      const receipt = await fundTx.wait();

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
      // If escrow/job is already created on-chain, treat as a success to prevent duplicate payments
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
        errorMsg = msg; // Use the specific gas error message
      } else if (msg.includes('💵 Insufficient USDC')) {
        errorMsg = msg; // Use the specific USDC error message
      } else if (msg.includes('Job already exists')) {
        errorMsg = msg; // Use the job exists message
      } else if (msg.toLowerCase().includes('network changed')) {
        errorMsg = '🔄 Network switched to Polygon Amoy (80002). Please confirm the transaction again in your wallet.';
      } else if (msg.toLowerCase().includes('could not coalesce error') || msg.toLowerCase().includes('internal json-rpc error')) {
        errorMsg = '⚠️ Transaction Failed\n\nThe smart contract rejected this transaction. This might happen if:\n• Job is already funded\n• Insufficient USDC allowance\n• Network congestion\n\nPlease refresh and try again.';
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
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto glass-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
            Scan to Pay
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Scan QR code with your mobile wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          {/* Amount Display */}
          <div className="text-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">You're paying</p>
            <p className="text-3xl sm:text-5xl font-bold text-primary mb-1">${amountUSDC}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">USDC</p>
          </div>

          {/* Status Display */}
          {status === 'connecting' && (
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              {wcUri ? (
                <>
                  <div className="p-2 sm:p-4 bg-white dark:bg-gray-800 rounded-xl border-2 sm:border-4 border-primary shadow-lg">
                    <div ref={qrCodeRef} className="flex items-center justify-center w-[200px] h-[200px] sm:w-[300px] sm:h-[300px]" />
                  </div>

                  <div className="text-center space-y-1 sm:space-y-2">
                    <p className="text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
                      <Smartphone className="h-3 w-3 sm:h-4 sm:w-4 text-primary animate-pulse" />
                      Scan with your wallet app
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      MetaMask • Trust Wallet • Coinbase Wallet • Rainbow
                    </p>
                  </div>

                  <div className="w-full p-2 sm:p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-[10px] sm:text-xs text-center">
                    <p className="text-blue-700 dark:text-blue-300 animate-pulse">
                      💡 Waiting for wallet connection...
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 sm:gap-4 py-4 sm:py-8">
                  <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary" />
                  <p className="text-xs sm:text-sm text-muted-foreground">Generating QR code...</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">This may take a few seconds</p>
                </div>
              )}
            </div>
          )}

          {status === 'approving' && (
            <div className="flex flex-col items-center gap-3 sm:gap-4 py-4 sm:py-8">
              <div className="relative">
                <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-base sm:text-lg mb-1">Step 1 of 2</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Approve USDC spending
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                  Check your wallet app for approval request
                </p>
              </div>
            </div>
          )}

          {status === 'funding' && (
            <div className="flex flex-col items-center gap-3 sm:gap-4 py-4 sm:py-8">
              <div className="relative">
                <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-base sm:text-lg mb-1">Step 2 of 2</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Confirm payment of ${amountUSDC} USDC
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                  Check your wallet app to confirm the transaction
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 sm:gap-4 py-4 sm:py-8">
              <div className="rounded-full bg-green-500/10 p-4 sm:p-6">
                <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-green-500" />
              </div>
              <div className="text-center">
                <h3 className="text-lg sm:text-2xl font-bold text-green-500 mb-2">Payment Complete!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Successfully paid ${amountUSDC} USDC
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 sm:gap-4 py-4 sm:py-8">
              <div className="rounded-full bg-red-500/10 p-4 sm:p-6">
                <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500" />
              </div>
              <div className="text-center">
                <h3 className="text-base sm:text-xl font-bold text-red-500 mb-2">Something Went Wrong</h3>
                <p className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-4 whitespace-pre-line">
                  {errorMessage}
                </p>
                {errorMessage.includes('⛽ Insufficient MATIC') && (
                  <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-[10px] sm:text-xs text-left space-y-2">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">💡 How to fix:</p>
                    <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-200">
                      <li>Get free test MATIC from <a href="https://www.alchemy.com/faucets/polygon-amoy" target="_blank" rel="noopener noreferrer" className="underline">Alchemy Faucet</a></li>
                      <li>Wait 1-2 minutes for MATIC to arrive</li>
                      <li>Try payment again</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Help Text */}
          {(status === 'connecting' || status === 'approving' || status === 'funding') && (
            <div className="p-2 sm:p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-[10px] sm:text-xs text-amber-900 dark:text-amber-100">
                <strong>📱 Need a wallet?</strong>
                <br />
                Download MetaMask, Trust Wallet, or any WalletConnect-compatible wallet from your app store.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (wcProvider) {
                wcProvider.disconnect();
              }
              onClose();
            }}
            className="flex-1 text-xs sm:text-sm"
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
              className="flex-1 text-xs sm:text-sm"
            >
              Try Again
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
