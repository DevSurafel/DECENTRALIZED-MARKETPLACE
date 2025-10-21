import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Wallet } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [showTelegramInstructions, setShowTelegramInstructions] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      toast({
        title: "Welcome back!",
        description: "You've been successfully logged in.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletAddress) {
      toast({
        title: "Wallet required",
        description: "Please enter your wallet address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            wallet_address: walletAddress,
            display_name: displayName || signupEmail.split("@")[0],
            telegram_username: telegramUsername || null,
          }
        }
      });

      if (authError) throw authError;

      // Show email confirmation message
      setShowEmailConfirmation(true);
      
      if (telegramUsername) {
        setShowTelegramInstructions(true);
      }

      // If auto-confirm is enabled, user will be immediately confirmed
      // Redirect to dashboard after showing the message
      if (authData?.user?.confirmed_at) {
        setTimeout(() => {
          navigate("/dashboard");
        }, 2000);
      }

    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectMetaMask = async () => {
    const ethereum = (window as any).ethereum;
    if (typeof ethereum !== "undefined") {
      try {
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletAddress(accounts[0]);
        toast({
          title: "Wallet connected",
          description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
      } catch (error: any) {
        toast({
          title: "Connection failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to continue",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Welcome to DeFiLance
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Connect your wallet and create an account
          </p>
        </div>

        <Card className="p-6 glass-card shadow-glow border-primary/20">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              {!showEmailConfirmation ? (
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="wallet">Wallet Address</Label>
                    <div className="flex gap-2">
                      <Input
                        id="wallet"
                        type="text"
                        placeholder="0x..."
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={connectMetaMask}
                      >
                        <Wallet className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input
                      id="display-name"
                      type="text"
                      placeholder="Your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <Label htmlFor="telegram-username">Telegram Username (Optional)</Label>
                    <Input
                      id="telegram-username"
                      type="text"
                      placeholder="@yourusername"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get real-time notifications in Telegram
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Sign Up"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-6 border rounded-lg bg-primary/5 border-primary/20">
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Check Your Email!</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        We've sent a confirmation email to
                      </p>
                      <p className="font-medium text-primary">{signupEmail}</p>
                    </div>
                    
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">1.</span>
                        <span>Check your inbox (and spam folder just in case)</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">2.</span>
                        <span>Click the confirmation link in the email</span>
                      </p>
                      <p className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">3.</span>
                        <span>You'll be redirected back and can start using DeFiLance</span>
                      </p>
                    </div>
                  </div>

                  {showTelegramInstructions && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h3 className="font-semibold mb-2">🤖 Setup Telegram Bot</h3>
                      <ol className="text-sm space-y-2">
                        <li>1. Open Telegram and search for your bot</li>
                        <li>2. Click "Start" or send /start message</li>
                        <li>3. You'll receive notifications instantly!</li>
                      </ol>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowEmailConfirmation(false)}
                  >
                    Back to Sign Up
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
