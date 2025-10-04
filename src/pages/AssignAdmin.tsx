import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const AssignAdmin = () => {
  const [email, setEmail] = useState("admin@gmail.com");
  const [loading, setLoading] = useState(false);

  const handleAssignAdmin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('assign_admin_role', {
        user_email: email
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Admin role assigned to ${email}`,
      });
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md p-8 space-y-6">
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
