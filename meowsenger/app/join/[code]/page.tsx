"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/ui/Logo";

export default function JoinChatPage() {
  const params = useParams();
  const code = typeof params?.code === "string" ? params.code : "";
  const router = useRouter();
  const { user } = useAuth();
  const [chat, setChat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (code) {
      fetchChatInfo();
    }
  }, [code]);

  const fetchChatInfo = async () => {
    try {
      const res = await fetch(`/api/chats/join/${code}`);
      const data = await res.json();
      if (res.ok) {
        setChat(data.chat);
      } else {
        setError(data.error || "Invalid invite link");
      }
    } catch (e) {
      setError("Failed to load chat info");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      router.push(`/login?redirect=/join/${code}`);
      return;
    }

    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/chats/join/${code}`, {
        method: "POST",
        headers: {
          "x-user-id": user.id,
        },
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/chat/${data.chatId}`);
      } else {
        setError(data.error || "Failed to join chat");
        if (data.chatId) {
          // If already a member, just go there
          router.push(`/chat/${data.chatId}`);
        }
      }
    } catch (e) {
      setError("Failed to join chat");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-4">
        <Spinner size="lg" />
        <p className="mt-4 text-zinc-500 font-mono text-sm animate-pulse">
          FETCHING TRANSMISSION DATA...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-black p-4">
      <div className="mb-8">
        <Logo className="w-12 h-12" />
      </div>

      <Card className="w-full max-w-md p-8 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl relative overflow-hidden">
        {/* Cyberpunk accent lines */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[#00ff82]/20" />
        <div className="absolute top-0 left-0 w-1 h-full bg-[#00ff82]/10" />

        {error ? (
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-500 uppercase tracking-tighter">
              Access Denied
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed">{error}</p>
            <Button
              variant="bordered"
              className="w-full mt-4"
              onPress={() => router.push("/chat")}
            >
              Back to Safety
            </Button>
          </div>
        ) : chat ? (
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-[10px] font-bold text-[#00ff82] uppercase tracking-[0.2em] mb-2 block">
                Incoming Connection
              </span>
              <h1 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter mb-2">
                {chat.name || "Unnamed Group"}
              </h1>
              <div className="flex items-center justify-center gap-2">
                <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[9px] font-bold uppercase text-zinc-500">
                  {chat.type}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {chat._count.participants} MEMBERS
                </span>
              </div>
            </div>

            {chat.description && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 italic leading-relaxed">
                  "{chat.description}"
                </p>
              </div>
            )}

            <div className="space-y-3 pt-4">
              <Button
                color="primary"
                className="w-full font-bold h-12 text-lg shadow-[0_0_20px_rgba(0,255,130,0.2)]"
                onPress={handleJoin}
                isLoading={joining}
              >
                JOIN FREQUENCY
              </Button>
              <Button
                variant="ghost"
                className="w-full text-zinc-500"
                onPress={() => router.push("/chat")}
              >
                DECLINE
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="mt-8 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff82] animate-pulse" />
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          Secured Protocol Active
        </span>
      </div>
    </div>
  );
}
