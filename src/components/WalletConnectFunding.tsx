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
  'function approve(address spender, uint256 amount) external returns (bool)'
];

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
          width: 300,
          height: 300,
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
        await executePayment(provider);
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
        approveTx = await usdcContractWithSigner.approve(escrowContractAddress, amount);
        console.log('Approval transaction sent:', approveTx.hash);
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

      toast({
        title: '⏳ Approving...',
        description: 'Waiting for blockchain confirmation',
      });

      await approveTx.wait();

      toast({
        title: '✅ Approved!',
        description: 'USDC approval successful',
      });

      // Step 2: Fund Job
      setStatus('funding');
      toast({
        title: '💰 Step 2 of 2',
        description: `Confirm payment of $${amountUSDC} USDC`,
      });

      const escrowContract = new ethers.Contract(escrowContractAddress, ESCROW_ABI, signer);
      
      let fundTx;
      try {
        fundTx = await escrowContract.fundJob(
          numericJobId,
          freelancerAddress,
          usdcContractAddress,
          amount,
          requiresStake,
          allowedRevisions
        );
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
      } else if (msg.toLowerCase().includes('could not coalesce error')) {
        errorMsg = '🔌 RPC Connection Error\n\nThere was a network communication issue with your wallet. This usually happens due to unstable RPC connection.\n\nPlease try again or switch to a different wallet.';
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Scan to Pay
          </DialogTitle>
          <DialogDescription>
            Scan QR code with your mobile wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Display */}
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">You're paying</p>
            <p className="text-5xl font-bold text-primary mb-1">${amountUSDC}</p>
            <p className="text-sm text-muted-foreground">USDC</p>
          </div>

          {/* Status Display */}
          {status === 'connecting' && (
            <div className="flex flex-col items-center gap-4">
              {wcUri ? (
                <>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border-4 border-primary shadow-lg">
                    <div ref={qrCodeRef} className="flex items-center justify-center" />
                  </div>

                  <div className="text-center space-y-2">
                    <p className="text-sm font-semibold flex items-center justify-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary animate-pulse" />
                      Scan with your wallet app
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MetaMask • Trust Wallet • Coinbase Wallet • Rainbow
                    </p>
                  </div>

                  <div className="w-full p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs text-center">
                    <p className="text-blue-700 dark:text-blue-300 animate-pulse">
                      💡 Waiting for wallet connection...
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generating QR code...</p>
                  <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                </div>
              )}
            </div>
          )}

          {status === 'approving' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg mb-1">Step 1 of 2</p>
                <p className="text-sm text-muted-foreground">
                  Approve USDC spending
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Check your wallet app for approval request
                </p>
              </div>
            </div>
          )}

          {status === 'funding' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg mb-1">Step 2 of 2</p>
                <p className="text-sm text-muted-foreground">
                  Confirm payment of ${amountUSDC} USDC
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Check your wallet app to confirm the transaction
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-green-500/10 p-6">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-green-500 mb-2">Payment Complete!</h3>
                <p className="text-muted-foreground">
                  Successfully paid ${amountUSDC} USDC
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-red-500/10 p-6">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-red-500 mb-2">Something Went Wrong</h3>
                <p className="text-sm text-muted-foreground px-4 whitespace-pre-line">
                  {errorMessage}
                </p>
                {errorMessage.includes('⛽ Insufficient MATIC') && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-xs text-left space-y-2">
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
            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-900 dark:text-amber-100">
                <strong>📱 Need a wallet?</strong>
                <br />
                Download MetaMask, Trust Wallet, or any WalletConnect-compatible wallet from your app store.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (wcProvider) {
                wcProvider.disconnect();
              }
              onClose();
            }}
            className="flex-1"
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
              className="flex-1"
            >
              Try Again
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};