import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LogIn, Eye, EyeOff } from "lucide-react";

type ClinicSettings = Record<string, string>;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [name, setName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const { data: settings } = useQuery<ClinicSettings>({ queryKey: ["/api/clinic-settings"] });

  const bgUrl = settings?.loginBackgroundUrl || "";
  const bgColor = settings?.loginBackgroundColor || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registering) {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ clinicName, name, email, password }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Could not create clinic");
        toast({ title: "Clinic created", description: "Your clinic account is ready. Sign in to continue." });
        setRegistering(false);
      } catch (error) {
        toast({ title: "Registration failed", description: error instanceof Error ? error.message : "Could not create clinic", variant: "destructive" });
      }
      return;
    }
    login.mutate(
      { email, password },
      {
        onSuccess: () => {
          window.location.href = "/";
        },
        onError: (err: Error) => {
          toast({ title: "Login Failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const containerStyle: React.CSSProperties = {};
  if (bgUrl) {
    containerStyle.backgroundImage = `url(${bgUrl})`;
    containerStyle.backgroundSize = "cover";
    containerStyle.backgroundPosition = "center";
    containerStyle.backgroundRepeat = "no-repeat";
  } else if (bgColor) {
    containerStyle.backgroundColor = bgColor;
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 relative ${!bgUrl && !bgColor ? "bg-background" : ""}`}
      style={containerStyle}
      data-testid="page-login"
    >
      {bgUrl && <div className="absolute inset-0 bg-black/40" />}
      <Card className="w-full max-w-sm relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center mb-4">
            <img src="/vetcms-logo.png" alt="VETCMS veterinary logo" className="h-24 w-36 rounded-lg object-contain" />
          </div>
          <CardTitle className="text-xl font-bold">VETCMS</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {registering ? "Create a clinic account with a 14-day demo" : "Sign in to your clinic account"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {registering && <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="register-clinic">Clinic name</Label>
                <Input id="register-clinic" value={clinicName} onChange={(event) => setClinicName(event.target.value)} required minLength={2} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="register-name">Your name</Label>
                <Input id="register-name" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
              </div>
            </>}
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
                  placeholder={registering ? "At least 8 characters" : "Enter password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={registering ? 8 : undefined}
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
              disabled={login.isPending || !email || !password || (registering && (!clinicName || !name))}
              data-testid="button-login"
            >
              {registering ? "Create clinic account" : login.isPending ? (
                "Signing in..."
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-1" />
                  Sign In
                </>
              )}
            </Button>
            <button type="button" className="text-sm text-primary hover:underline" onClick={() => setRegistering(!registering)}>
              {registering ? "Already have an account? Sign in" : "Create a new clinic account"}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
