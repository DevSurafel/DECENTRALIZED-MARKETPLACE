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
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)'
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

  const executeFunding = async (
    escrowContract: any,
    numericJobId: bigint,
    freelancerAddr: string,
    usdcAddr: string,
    amount: bigint,
    reqStake: boolean,
    revisions: number
  ) => {
    let fundTx;
    try {
      console.log('Requesting fund job transaction...');
      
      try {
        const gasEstimate = await escrowContract.fundJob.estimateGas(
          numericJobId,
          freelancerAddr,
          usdcAddr,
          amount,
          reqStake,
          revisions
        );
        console.log('Gas estimate successful:', gasEstimate.toString());
      } catch (estimateError: any) {
        if (estimateError?.code === 'NETWORK_ERROR') {
          throw new Error('🌐 Network connection unstable during funding check. Please try again.');
        }
        
        console.error('Gas estimation failed:', estimateError);
        
        let revertReason = '';
        if (estimateError?.reason) {
          revertReason = estimateError.reason;
        } else if (estimateError?.error?.message) {
          revertReason = estimateError.error.message;
        } else if (estimateError?.message) {
          revertReason = estimateError.message;
        }
        
        console.log('Contract revert reason:', revertReason);
        
        if (revertReason.toLowerCase().includes('insufficient allowance') || 
            revertReason.toLowerCase().includes('erc20: insufficient allowance')) {
          throw new Error('❌ USDC approval failed or insufficient. Please try again.');
        }
        
        if (revertReason.toLowerCase().includes('transfer amount exceeds balance')) {
          throw new Error('💵 Insufficient USDC balance. You need ' + ethers.formatUnits(amount, 6) + ' USDC.');
        }
        
        if (revertReason.toLowerCase().includes('job already exists') || 
            revertReason.toLowerCase().includes('already funded')) {
          throw new Error('Job already exists');
        }
        
        if (revertReason) {
          throw new Error('Contract Error: ' + revertReason);
        }
        
        throw estimateError;
      }
      
      fundTx = await escrowContract.fundJob(
        numericJobId,
        freelancerAddr,
        usdcAddr,
        amount,
        reqStake,
        revisions
      );
    } catch (fundError: any) {
      if (fundError?.code === 'NETWORK_ERROR') {
        throw new Error('🌐 Network connection unstable during funding. Please try again.');
      }
      
      if (fundError?.message?.startsWith('❌') || fundError?.message?.startsWith('💵') || 
          fundError?.message?.startsWith('Contract Error:') || fundError?.message?.startsWith('Job already exists')) {
        throw fundError;
      }
      
      console.error('Fund error details:', fundError);
      
      const errorMsg = fundError?.message || '';
      const errorData = fundError?.data?.message || fundError?.error?.message || '';
      
      if (errorMsg.toLowerCase().includes('insufficient funds') || 
          errorMsg.toLowerCase().includes('insufficient balance') ||
          errorData.toLowerCase().includes('insufficient funds')) {
        throw new Error('⛽ Insufficient MATIC (POL) for gas fees. Please ensure your wallet has MATIC on Polygon Amoy testnet.');
      }
      
      throw new Error(errorMsg || errorData || 'Transaction failed during funding');
    }

    toast({
      title: '⏳ Processing...',
      description: 'Waiting for payment confirmation',
    });

    console.log('Fund transaction sent:', fundTx.hash);
    const receipt = await fundTx.wait();

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
  };

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
        methods: ['eth_sendTransaction', 'eth_sign', 'personal_sign'],
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
        await executePayment(provider);
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
      setErrorMessage(error.message || 'Failed to initialize WalletConnect.');
    }
  };

  const executePayment = async (provider: any) => {
    try {
      const ethersProvider = new ethers.BrowserProvider(provider, 'any');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const signer = await ethersProvider.getSigner();
      const address = await signer.getAddress();

      console.log('Connected wallet:', address);

      const network = await ethersProvider.getNetwork();
      const currentChainId = Number(network.chainId);
      console.log('Detected network chain ID:', currentChainId);
      
      if (currentChainId !== 80002) {
        throw new Error(`🌐 Wrong Network! You're on Chain ID ${currentChainId}.\n\nPlease switch to Polygon Amoy (Chain ID: 80002) in your wallet.`);
      }

      console.log('✅ Correct network: Polygon Amoy (80002)');

      const numericJobId = uuidToNumericId(jobId);
      const amount = ethers.parseUnits(amountUSDC, 6);

      console.log('Payment details:', {
        chainId: currentChainId,
        jobId: numericJobId.toString(),
        freelancer: freelancerAddress,
        amount: amount.toString(),
        escrow: escrowContractAddress,
        usdc: usdcContractAddress
      });

      const usdcContract = new ethers.Contract(usdcContractAddress, USDC_ABI, signer);
      
      try {
        const balance = await usdcContract.balanceOf(address);
        const balanceFormatted = ethers.formatUnits(balance, 6);
        console.log('USDC Balance:', balanceFormatted, 'USDC');
        
        if (balance < amount) {
          throw new Error(`💵 Insufficient USDC balance. You have ${balanceFormatted} USDC but need ${amountUSDC} USDC.`);
        }
      } catch (balanceError: any) {
        if (balanceError?.code === 'NETWORK_ERROR') {
          throw new Error('🌐 Network connection unstable. Please try again.');
        }
        if (balanceError.message.includes('💵')) {
          throw balanceError;
        }
        console.warn('Could not check USDC balance:', balanceError);
      }

      setStatus('approving');
      toast({
        title: '📝 Step 1 of 2',
        description: 'Checking USDC approval...',
      });
      
      try {
        const currentAllowance = await usdcContract.allowance(address, escrowContractAddress);
        console.log('Current USDC allowance:', ethers.formatUnits(currentAllowance, 6), 'USDC');
        
        if (currentAllowance >= amount) {
          console.log('✅ Sufficient allowance exists');
          toast({
            title: '✅ Already Approved',
            description: 'USDC spending already approved',
          });
        } else {
          toast({
            title: '📝 Approve USDC',
            description: 'Confirm approval in your wallet',
          });

          const approveTx = await usdcContract.approve(escrowContractAddress, amount);
          
          toast({
            title: '⏳ Approving...',
            description: 'Waiting for confirmation',
          });

          console.log('Approval tx:', approveTx.hash);
          await approveTx.wait();

          toast({
            title: '✅ Approved!',
            description: 'USDC approval successful',
          });
        }
      } catch (approveError: any) {
        if (approveError?.code === 'NETWORK_ERROR') {
          throw new Error('🌐 Network error during approval. Please try again.');
        }
        console.error('Approve error:', approveError);
        throw approveError;
      }

      setStatus('funding');
      toast({
        title: '💰 Step 2 of 2',
        description: `Confirm payment of $${amountUSDC} USDC`,
      });

      const escrowContract = new ethers.Contract(escrowContractAddress, ESCROW_ABI, signer);
      await executeFunding(escrowContract, numericJobId, freelancerAddress, usdcContractAddress, amount, requiresStake, allowedRevisions);

    } catch (error: any) {
      console.error('Payment error:', error);

      const msg = (error?.reason || error?.shortMessage || error?.message || '').toString();
      
      if (error?.code === 'NETWORK_ERROR' || msg.includes('network changed')) {
        setStatus('error');
        setErrorMessage('🌐 Network changed during transaction. Please stay on Polygon Amoy and try again.');
        toast({
          title: '❌ Network Error',
          description: 'Network switched',
          variant: 'destructive'
        });
        return;
      }
      
      if (msg.includes('Job already exists') || msg.includes('already funded')) {
        setStatus('success');
        toast({
          title: '✅ Already Funded',
          description: 'Escrow already funded.',
        });
        setTimeout(() => {
          onSuccess('already-funded');
          if (wcProvider) wcProvider.disconnect();
          onClose();
        }, 1200);
        return;
      }

      setStatus('error');
      let errorMsg = 'Payment failed';
      
      if (error?.code === 'ACTION_REJECTED' || msg.includes('user rejected')) {
        errorMsg = 'Transaction rejected by user';
      } else if (msg.includes('⛽') || msg.includes('💵') || msg.includes('🌐') || msg.includes('❌')) {
        errorMsg = msg;
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
      if (!open && wcProvider) wcProvider.disconnect();
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
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">You're paying</p>
            <p className="text-5xl font-bold text-primary mb-1">${amountUSDC}</p>
            <p className="text-sm text-muted-foreground">USDC</p>
          </div>

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
                      MetaMask • Trust Wallet • Coinbase Wallet
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
                <p className="text-sm text-muted-foreground">Approve USDC spending</p>
                <p className="text-xs text-muted-foreground mt-2">Check your wallet app</p>
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
                <p className="text-sm text-muted-foreground">Confirm payment of ${amountUSDC} USDC</p>
                <p className="text-xs text-muted-foreground mt-2">Check your wallet app</p>
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
                <p className="text-muted-foreground">Successfully paid ${amountUSDC} USDC</p>
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
                <p className="text-sm text-muted-foreground px-4 whitespace-pre-line">{errorMessage}</p>
                {errorMessage.includes('⛽') && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-xs text-left space-y-2">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">💡 How to fix:</p>
                    <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-200">
                      <li>Get free MATIC from <a href="https://www.alchemy.com/faucets/polygon-amoy" target="_blank" rel="noopener noreferrer" className="underline">Alchemy Faucet</a></li>
                      <li>Wait 1-2 minutes</li>
                      <li>Try again</li>
                    </ol>
                  </div>
                )}
                {errorMessage.includes('💵') && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg text-xs text-left space-y-2">
                    <p className="font-semibold text-amber-900 dark:text-amber-100">💡 How to fix:</p>
                    <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-200">
                      <li>Get testnet USDC from a faucet</li>
                      <li>Ensure you're on Polygon Amoy</li>
                      <li>Try again</li>
                    </ol>
                  </div>
                )}
                {errorMessage.includes('🌐') && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-xs text-left space-y-2">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">💡 How to fix:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                      <li>Switch to Polygon Amoy in your wallet</li>
                      <li>Stay on Amoy during transaction</li>
                      <li>Try again</li>
                    </ol>
                    <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900 rounded">
                      <p className="font-semibold">Polygon Amoy:</p>
                      <p>Chain ID: 80002</p>
                      <p className="text-xs">RPC: https://rpc-amoy.polygon.technology</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {(status === 'connecting' || status === 'approving' || status === 'funding') && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-900 dark:text-amber-100">
                <strong>📱 Need a wallet?</strong>
                <br />
                Download MetaMask or Trust Wallet from your app store.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => {
            if (wcProvider) wcProvider.disconnect();
            onClose();
          }} className="flex-1">
            Cancel
          </Button>
          {status === 'error' && (
            <Button onClick={() => {
              setStatus('idle');
              setErrorMessage('');
              setWcUri('');
              initializeWalletConnect();
            }} className="flex-1">
              Try Again
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
