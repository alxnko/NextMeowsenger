"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Link } from "@/components/ui/Link";
import { Logo } from "@/components/ui/Logo";
import { SecurityNote } from "@/components/ui/SecurityNote";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black relative overflow-hidden p-4">
      {/* Ambient Lighting Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00ff82]/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#00ccff]/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(#00ff82 0.5px, transparent 0.5px)",
          backgroundSize: "30px 30px",
        }}
      />

      <Card
        variant="premium"
        className="w-full max-w-md p-2 shadow-2xl border-[#00ff82]/20"
      >
        <CardHeader className="flex flex-col items-center pb-2">
          <Logo size="lg" className="mb-2" />
          <p className="text-sm text-zinc-500 font-mono tracking-widest">
            STATION_AUTH_REQUIRED
          </p>
        </CardHeader>
        <CardBody className="gap-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              variant="bordered"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              variant="bordered"
            />
            {error && (
              <SecurityNote type="error" title="Auth Failure">
                {error}
              </SecurityNote>
            )}
            <Button
              color="primary"
              type="submit"
              className="w-full font-black tracking-widest shadow-[0_0_20px_rgba(0,255,130,0.2)] h-12"
              isLoading={loading}
            >
              AUTHENTICATE_SESSION
            </Button>
          </form>
          <div className="text-center text-sm mt-4 text-default-500">
            Don't have an account?{" "}
            <Link href="/signup" underline="hover">
              Sign up
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
