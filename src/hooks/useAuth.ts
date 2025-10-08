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
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Defer any wallet/profile checks to avoid deadlocks in auth callback
        if (event === 'SIGNED_IN' && typeof window !== 'undefined' && (window as any).ethereum && session?.user) {
          setTimeout(async () => {
            try {
              // Clear any cached wallet connections (legacy key)
              localStorage.removeItem('walletConnected');

              const stored = localStorage.getItem(`wallet:connected:${session.user!.id}`);
              if (!stored) return;

              const { data: profile } = await supabase
                .from('profiles')
                .select('wallet_address')
                .eq('id', session.user!.id)
                .single();

              if (profile?.wallet_address) {
                try {
                  const accounts: string[] = await (window as any).ethereum.request({ method: 'eth_accounts' });
                  const current = accounts && accounts.length > 0 ? accounts[0].toLowerCase() : '';
                  if (current && current !== profile.wallet_address.toLowerCase()) {
                    toast({
                      title: "Wrong wallet connected",
                      description: `Please switch to ${profile.wallet_address.substring(0, 6)}...${profile.wallet_address.substring(38)} in MetaMask`,
                      variant: "destructive",
                      duration: 6000
                    });
                  }
                } catch {}
              }
            } catch (error) {
              console.log('Wallet check on login:', error);
            }
          }, 0);
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
    // Clear wallet connection state on logout (per-user key)
    try {
      const currentUserId = user?.id;
      if (currentUserId) {
        localStorage.removeItem(`wallet:connected:${currentUserId}`);
      }
      localStorage.removeItem('walletConnected');
    } catch {}

    await supabase.auth.signOut();
    
    toast({
      title: "Signed Out",
      description: "Please reconnect your wallet when you log back in",
    });
    
    navigate("/");
  };

  return { user, session, loading, signOut };
};
