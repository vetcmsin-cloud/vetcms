import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LogIn, Eye, EyeOff } from "lucide-react";
import logoImg from "@assets/Untitled_design_(2)_-_Copy_1770707768689.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      {
        onError: (err: Error) => {
          toast({ title: "Login Failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="page-login">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center mb-4">
            <img src={logoImg} alt="PetPoint Pro" className="w-12 h-12 rounded-md object-cover" />
          </div>
          <CardTitle className="text-xl font-bold">PetPoint Pro</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your clinic account
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-login-email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                  data-testid="input-login-password"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={login.isPending || !email || !password}
              data-testid="button-login"
            >
              {login.isPending ? (
                "Signing in..."
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-1" />
                  Sign In
                </>
              )}
            </Button>
          </form>
          <div className="mt-6 pt-4 border-t">
            <p className="text-[11px] text-muted-foreground text-center mb-2">Demo Credentials</p>
            <div className="grid grid-cols-1 gap-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-center justify-between px-2 py-1 rounded bg-muted/40">
                <span>Admin</span>
                <span>admin@petpointvet.in / admin123</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-muted/40">
                <span>Doctor</span>
                <span>varsha@petpointvet.in / doctor123</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1 rounded bg-muted/40">
                <span>Receptionist</span>
                <span>rec@petpointvet.in / reception123</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
