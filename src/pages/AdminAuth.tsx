import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const AdminAuth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in and has admin role
    if (user && !loading) {
      const timer = setTimeout(() => {
        checkAdminRole();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const checkAdminRole = async () => {
    try {
      if (!user?.id) return;
      const { data: hasAdmin, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin' as any
      });

      if (error) throw error;

      if (hasAdmin) {
        navigate('/arbitrator');
      } else {
        // Not an admin; keep the form visible so they can switch accounts
        console.info("User lacks admin role; showing admin login form");
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has admin role
      const { data: hasAdmin, error: roleError } = await supabase.rpc('has_role', {
        _user_id: data.user.id,
        _role: 'admin' as any
      });

      if (roleError) throw roleError;

      if (!hasAdmin) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Welcome Admin",
        description: "Login successful"
      });

      navigate('/arbitrator');
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <Card className="w-full max-w-md p-8 space-y-6 glass-card shadow-glow border-primary/20 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">Admin Portal</h1>
          <p className="text-muted-foreground">
            Restricted access for administrators only
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
          >
            Back to Home
          </Button>
            {user && !loading && (
              <div className="text-sm text-muted-foreground">
                Signed in as {user.email}. Not an admin?{" "}
                <Button variant="link" className="px-1" onClick={() => supabase.auth.signOut()}>
                  Sign out
                </Button>
                and log in with an admin account.
              </div>
            )}
        </div>
      </Card>
    </div>
  );
};

export default AdminAuth;
