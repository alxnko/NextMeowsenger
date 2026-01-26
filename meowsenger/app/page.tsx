"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Link } from "@/components/ui/Link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { Fingerprint, Lock, ShieldOff, Zap, UserPlus } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push("/chat");
    }
  }, [user, loading, router]);

  const features = [
    {
      title: "RSA-2048 IDENTITY",
      desc: "Your cryptographic identity is generated locally. We never see your private keys.",
      icon: <Fingerprint className="w-8 h-8 text-[#00ff82]" />,
    },
    {
      title: "AES-GCM WRAPPING",
      desc: "Every message is sealed with high-performance hybrid encryption.",
      icon: <Lock className="w-8 h-8 text-[#00ff82]" />,
    },
    {
      title: "ZERO SURVEILLANCE",
      desc: "Our server only sees encrypted packets. Privacy isn't a feature, it's the foundation.",
      icon: <ShieldOff className="w-8 h-8 text-[#00ff82]" />,
    },
    {
      title: "P2P PROTOCOL",
      desc: "Sub-millisecond transmission via our optimized socket mesh infrastructure.",
      icon: <Zap className="w-8 h-8 text-[#00ff82]" />,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#00ff82] selection:text-black overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,130,0.05),transparent_70%)]"></div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(#00ff82 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>
      </div>
      <nav className="relative z-10 flex items-center justify-between p-4 sm:p-6 max-w-7xl mx-auto">
        <Logo size="sm" className="sm:hidden" />
        <Logo size="md" className="hidden sm:flex" />
        <div className="flex gap-1 sm:gap-4">
          <Button
            variant="light"
            color="primary"
            size="sm"
            className="sm:text-base"
            onPress={() => router.push("/login")}
          >
            LOGIN
          </Button>
          <Button
            color="primary"
            variant="bordered"
            size="sm"
            className="hidden md:flex"
            onPress={() => router.push("/signup")}
          >
            CREATE IDENTITY
          </Button>
        </div>
      </nav>

      <main className="relative z-10 pt-12 sm:pt-20 pb-32">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center px-4 max-w-4xl mx-auto">
          <div className="inline-block px-3 py-1 rounded-full border border-[#00ff82]/30 bg-[#00ff82]/10 text-[#00ff82] text-[10px] font-bold tracking-[0.2em] mb-6 animate-pulse">
            IDENTITY PROTOCOL v1.0 ACTIVE
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 leading-none">
            SECURE YOUR <br />
            <span className="text-transparent text-4xl md:text-8xl bg-clip-text bg-linear-to-r from-[#00ff82] to-[#00ccff] drop-shadow-[0_0_15px_rgba(0,255,130,0.3)]">
              COMMUNICATIONS
            </span>
          </h1>
          <p className="text-zinc-500 text-lg md:text-xl max-w-2xl mb-12 font-medium">
            Meowsenger is a modern end-to-end encrypted messaging service.{" "}
            <br />
            No surveillance. No leaks. Just chats.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button
              variant="shadow"
              color="primary"
              size="lg"
              className="hidden sm:flex sm:px-12 font-bold text-lg"
              onPress={() => router.push("/signup")}
            >
              INITIALIZE IDENTITY
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="sm:px-12 border-zinc-800 text-zinc-400 hover:text-white"
              onPress={() => router.push("/login")}
            >
              UNLOCK STATION
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="mt-20 sm:mt-40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 max-w-7xl mx-auto px-4 sm:px-6">
          {features.map((f, i) => (
            <Card key={i} variant="premium">
              <CardBody className="p-6 sm:p-10 h-full flex flex-col items-center text-center">
                <div className="text-4xl text-[#00ff82] drop-shadow-[0_0_12px_rgba(0,255,130,0.6)] mb-8 transform group-hover:scale-110 transition-transform duration-500">
                  {f.icon}
                </div>
                <h3 className="font-black text-white tracking-[0.2em] mb-4 text-xs uppercase opacity-90 group-hover:text-[#00ff82] group-hover:opacity-100 transition-all duration-500">
                  {f.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-[200px] group-hover:text-zinc-300 transition-colors duration-500">
                  {f.desc}
                </p>
                <div className="mt-8 opacity-0 group-hover:opacity-100 transition-all duration-700 transform translate-y-2 group-hover:translate-y-0">
                  <div className="h-[2px] w-12 bg-[#00ff82] rounded-full shadow-[0_0_10px_rgba(0,255,130,0.5)]" />
                </div>
              </CardBody>
            </Card>
          ))}
        </section>

        {/* Status Line */}
        <section className="mt-20 sm:mt-40 flex flex-col items-center px-4">
          <div className="p-6 sm:p-10 rounded-3xl border border-dashed border-zinc-800 flex flex-col items-center gap-4 text-center bg-zinc-900/20 max-w-xl w-full">
            <p className="text-sm text-zinc-400">
              Join the resistant network. Your identity is your own.
            </p>
            <Link
              href="/signup"
              className="text-xs font-bold uppercase tracking-widest no-underline"
            >
              ESTABLISH_LINK →
            </Link>
          </div>
        </section>
      </main>
      {/* Footer */}
      <footer className="border-t border-zinc-900 py-10 text-center">
        <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
          ALEX_NEKO // MEOWVERSE_X // MEOWSENGER_CORE_ENGINE
        </p>
      </footer>
    </div>
  );
}
