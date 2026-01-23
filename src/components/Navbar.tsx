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
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts.length === 0) return;

      const selected = accounts[0];
      if (walletAddress && walletAddress.toLowerCase() !== selected.toLowerCase()) {
        setConnectedWallet('');
        return;
      }

      setConnectedWallet(selected);
      if (user?.id) {
        localStorage.setItem(`wallet:connected:${user.id}`, selected);
        
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

      if (walletAddress && walletAddress.toLowerCase() !== current) {
        setConnectedWallet('');
        localStorage.removeItem(`wallet:connected:${user.id}`);
        return;
      }

      setConnectedWallet(current);
      localStorage.setItem(`wallet:connected:${user.id}`, current);
      
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

    window.ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (!isMounted) return;
        
        const current = accounts[0]?.toLowerCase();
        if (!current) {
          setConnectedWallet('');
          return;
        }

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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">D</span>
            </div>
            <span className="text-xl font-bold text-foreground">DeFiLance</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            <Link to="/marketplace" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Marketplace
            </Link>
            <Link to="/dashboard" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Dashboard
            </Link>
            <Link to="/profile" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Profile
            </Link>
            <Link to="/chat" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative">
              Chat
              {hasUnreadMessages && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-success rounded-full animate-pulse" />
              )}
            </Link>
            <Link to="/reviews" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Reviews
            </Link>
            <Link to="/escrow" className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Escrow
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {connectedWallet ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border">
                      <Wallet className="w-4 h-4 text-primary" />
                      <span className="text-sm font-mono font-medium text-foreground">
                        {truncateAddress(connectedWallet)}
                      </span>
                    </div>
                    <Button 
                      onClick={disconnectWallet}
                      variant="outline"
                      size="sm"
                      className="font-medium"
                    >
                      Connected
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={connectWallet}
                    variant="default"
                    size="sm"
                    className="gap-2 font-medium"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect
                  </Button>
                )}
                <Button 
                  onClick={signOut}
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => navigate("/auth")} 
                className="gap-2 font-medium"
              >
                <Wallet className="w-4 h-4" />
                Login / Sign Up
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-1 border-t border-border pt-4">
            <Link 
              to="/marketplace" 
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Marketplace
            </Link>
            <Link 
              to="/dashboard" 
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link 
              to="/profile" 
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Profile
            </Link>
            <Link 
              to="/chat" 
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors relative"
              onClick={() => setIsMenuOpen(false)}
            >
              Chat
              {hasUnreadMessages && (
                <span className="absolute top-3 left-12 w-2 h-2 bg-success rounded-full animate-pulse" />
              )}
            </Link>
            <Link 
              to="/reviews" 
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Reviews
            </Link>
            <Link 
              to="/escrow" 
              className="block py-2.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Escrow
            </Link>
            <div className="pt-3 space-y-2">
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
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
