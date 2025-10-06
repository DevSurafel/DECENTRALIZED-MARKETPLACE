import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // When user logs in, disconnect wallet to force re-connection with correct address
        if (event === 'SIGNED_IN' && typeof window !== 'undefined' && (window as any).ethereum) {
          try {
            // Clear any cached wallet connections
            localStorage.removeItem('walletConnected');
            
            // If there's an active wallet connection, prompt user to verify it matches their profile
            if (session?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('wallet_address')
                .eq('id', session.user.id)
                .single();

              if (profile?.wallet_address) {
                // Check if current MetaMask account matches profile
                const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0 && accounts[0].toLowerCase() !== profile.wallet_address.toLowerCase()) {
                  toast({
                    title: "Wallet Mismatch",
                    description: `Please switch to wallet ${profile.wallet_address.substring(0, 6)}...${profile.wallet_address.substring(38)} in MetaMask`,
                    variant: "destructive",
                    duration: 8000
                  });
                }
              }
            }
          } catch (error) {
            console.log('Wallet check on login:', error);
          }
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clear wallet connection state on logout
    localStorage.removeItem('walletConnected');
    await supabase.auth.signOut();
    
    toast({
      title: "Signed Out",
      description: "Please reconnect your wallet when you log back in",
    });
    
    navigate("/");
  };

  return { user, session, loading, signOut };
};
