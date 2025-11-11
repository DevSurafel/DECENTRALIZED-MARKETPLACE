import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet, Menu, X, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const truncateAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};


const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [connectedWallet, setConnectedWallet] = useState<string>('');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWalletAddress = async () => {
      if (!user?.id) {
        setWalletAddress('');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('id', user.id)
        .single();
      
      if (data?.wallet_address) {
        setWalletAddress(data.wallet_address);
      }
    };

    fetchWalletAddress();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const checkUnreadMessages = async () => {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`);

      if (!conversations || conversations.length === 0) return;

      const conversationIds = conversations.map(c => c.id);
      
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .eq('is_read', false)
        .limit(1);

      setHasUnreadMessages(unreadMessages && unreadMessages.length > 0);
    };

    checkUnreadMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => checkUnreadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);


  const connectWallet = async () => {
    if (!window.ethereum) {
      // Silently return without showing notification
      return;
    }

    try {
      // Force MetaMask account selection
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) return;

      const selected = accounts[0];
      // Silently handle wrong wallet without showing notification
      if (walletAddress && walletAddress.toLowerCase() !== selected.toLowerCase()) {
        setConnectedWallet('');
        return;
      }

      setConnectedWallet(selected);
      if (user?.id) {
        localStorage.setItem(`wallet:connected:${user.id}`, selected);
        
        // Save wallet address to database if not already set
        if (!walletAddress) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ wallet_address: selected })
            .eq('id', user.id);
          
          if (updateError) {
            console.error('Failed to save wallet address:', updateError);
          } else {
            setWalletAddress(selected);
          }
        }
      }
      toast.success('Wallet connected successfully', {
        description: `Connected to ${truncateAddress(selected)}`
      });
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      if (error?.code === 4001) {
        toast.error('Connection cancelled', { description: 'You rejected the connection request' });
      } else {
        toast.error('Failed to connect wallet');
      }
    }
  };

  const disconnectWallet = () => {
    setConnectedWallet('');
    if (user?.id) {
      localStorage.removeItem(`wallet:connected:${user.id}`);
    }
    toast.success('Wallet disconnected');
  };

  // Manage wallet connection per authenticated user
  useEffect(() => {
    if (!window.ethereum || !user?.id) {
      setConnectedWallet('');
      return;
    }

    let isMounted = true;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (!isMounted) return;
      
      const current = accounts[0]?.toLowerCase();
      
      if (!current) {
        setConnectedWallet('');
        localStorage.removeItem(`wallet:connected:${user.id}`);
        return;
      }

      // Silently handle wrong wallet without showing notification
      if (walletAddress && walletAddress.toLowerCase() !== current) {
        setConnectedWallet('');
        localStorage.removeItem(`wallet:connected:${user.id}`);
        return;
      }

      // Auto-connect if matches profile or no profile wallet set
      setConnectedWallet(current);
      localStorage.setItem(`wallet:connected:${user.id}`, current);
      
      // Save wallet address to database if not already set
      if (!walletAddress) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ wallet_address: current })
          .eq('id', user.id);
        
        if (!updateError) {
          setWalletAddress(current);
        }
      }
    };

    // Initial sync: auto-connect if current MetaMask account matches profile
    window.ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (!isMounted) return;
        
        const current = accounts[0]?.toLowerCase();
        if (!current) {
          setConnectedWallet('');
          return;
        }

        // Auto-connect if matches profile wallet or no profile wallet set
        if (!walletAddress || walletAddress.toLowerCase() === current) {
          setConnectedWallet(current);
          localStorage.setItem(`wallet:connected:${user.id}`, current);
        } else {
          setConnectedWallet('');
        }
      })
      .catch(() => {
        if (isMounted) setConnectedWallet('');
      });

    // Listen for account switches in MetaMask
    if (window.ethereum.on) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      isMounted = false;
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [user?.id, walletAddress]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-glow">
              <span className="text-xl font-bold">D</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">DeFiLance</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/marketplace" className="transition-smooth hover:text-primary">
              Marketplace
            </Link>
            <Link to="/dashboard" className="transition-smooth hover:text-primary">
              Dashboard
            </Link>
            <Link to="/profile" className="transition-smooth hover:text-primary">
              Profile
            </Link>
            <Link to="/chat" className="transition-smooth hover:text-primary relative">
              Chat
              {hasUnreadMessages && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </Link>
            <Link to="/reviews" className="transition-smooth hover:text-primary">
              Reviews
            </Link>
            <Link to="/escrow" className="transition-smooth hover:text-primary">
              Escrow
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {connectedWallet ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                      <Wallet className="w-4 h-4 text-primary" />
                      <span className="text-sm font-mono font-medium">
                        {truncateAddress(connectedWallet)}
                      </span>
                    </div>
                    <Button 
                      onClick={disconnectWallet}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      Connected
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={connectWallet}
                    variant="default"
                    size="sm"
                    className="gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect
                  </Button>
                )}
                <Button 
                  onClick={signOut}
                  variant="outline"
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")} className="gap-2">
                <Wallet className="w-4 h-4" />
                Login / Sign Up
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4">
            <Link 
              to="/marketplace" 
              className="block py-2 transition-smooth hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Marketplace
            </Link>
            <Link 
              to="/dashboard" 
              className="block py-2 transition-smooth hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              to="/profile" 
              className="block py-2 transition-smooth hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Profile
            </Link>
            <Link 
              to="/chat" 
              className="block py-2 transition-smooth hover:text-primary relative"
              onClick={() => setIsMenuOpen(false)}
            >
              Chat
              {hasUnreadMessages && (
                <span className="absolute top-2 left-12 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </Link>
            <Link 
              to="/reviews" 
              className="block py-2 transition-smooth hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Reviews
            </Link>
            <Link 
              to="/escrow" 
              className="block py-2 transition-smooth hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Escrow
            </Link>
            {user ? (
              <Button 
                onClick={signOut}
                variant="outline"
                className="w-full gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            ) : (
              <Button 
                onClick={() => {
                  navigate("/auth");
                  setIsMenuOpen(false);
                }}
                className="w-full gap-2"
              >
                <Wallet className="w-4 h-4" />
                Login / Sign Up
              </Button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
