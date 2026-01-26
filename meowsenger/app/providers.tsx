"use client";

import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { useRouter } from "next/navigation";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <AuthProvider>
      <SocketProvider>
        <div className="text-foreground bg-background min-h-screen">
          {children}
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}
