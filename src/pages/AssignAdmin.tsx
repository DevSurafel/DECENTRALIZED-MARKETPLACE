import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const AssignAdmin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@gmail.com");
  const [loading, setLoading] = useState(false);

  const handleAssignAdmin = async () => {
    setLoading(true);
    try {
      // Call the database function with email
      const { error } = await supabase.rpc('assign_admin_role', {
        user_email: email
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Admin role assigned successfully. Redirecting to admin login...`,
      });
      
      // Redirect to admin login page after a short delay
      setTimeout(() => {
        navigate('/admin');
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign admin role. Make sure the user has signed up first.",
        variant: "destructive"
      });
    } finally {
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
          <h1 className="text-3xl font-bold">Assign Admin Role</h1>
          <p className="text-muted-foreground">
            This page assigns admin privileges to a user. The user must sign up first.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">User Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button
            onClick={handleAssignAdmin}
            className="w-full"
            disabled={loading || !email}
          >
            {loading ? "Assigning..." : "Assign Admin Role"}
          </Button>

          <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
            <p className="font-semibold">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>First, create an account using the email above through the regular signup flow</li>
              <li>Then come back to this page and click "Assign Admin Role"</li>
              <li>After that, you can login at /admin using the credentials</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AssignAdmin;
