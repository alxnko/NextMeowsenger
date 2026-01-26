"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";

export default function ChannelSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [slug, setSlug] = useState<string>("");
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  useEffect(() => {
    if (slug) {
      fetchChannel();
    }
  }, [slug, user]);

  const fetchChannel = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/channels/slug/${slug}`, {
        headers: user?.id ? { "x-user-id": user.id } : {},
      });
      const data = await res.json();
      
      if (res.ok) {
        setChannel(data.chat);
        setIsMember(data.isMember);
      } else {
        setError(data.error || "Failed to load channel");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load channel");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      router.push(`/login?redirect=/c/${slug}`);
      return;
    }

    setSubscribing(true);
    try {
      const res = await fetch(`/api/chats/${channel.id}/join`, {
        method: "POST",
        headers: { "x-user-id": user.id },
      });
      const data = await res.json();
      
      if (data.status === "MEMBER") {
        // Successfully subscribed, redirect to chat
        router.push(`/chat/${channel.id}`);
      } else {
        setError("Failed to subscribe");
      }
    } catch (err: any) {
      setError(err.message || "Failed to subscribe");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-red-500 text-lg">{error}</p>
        <Button onPress={() => router.push("/")}>Go Home</Button>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-zinc-500 text-lg">Channel not found</p>
        <Button onPress={() => router.push("/")}>Go Home</Button>
      </div>
    );
  }

  if (isMember) {
    // Redirect to chat if already a member
    router.push(`/chat/${channel.id}`);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#00ff82] to-[#00cc66] p-8 text-center">
          <div className="flex justify-center mb-4">
            <Avatar 
              name={channel.name || "Channel"} 
              size="lg"
              src={channel.avatar}
            />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">
            {channel.name}
          </h1>
          <p className="text-sm text-zinc-700 mt-1">
            @{slug}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {channel.description && (
            <div>
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Description
              </h3>
              <p className="text-zinc-700 dark:text-zinc-300">
                {channel.description}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Channel Info
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Type</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  Public Channel
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subscribers</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  {channel.participants?.length || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              color="primary"
              className="w-full font-bold shadow-lg shadow-[#00ff82]/20"
              onPress={handleSubscribe}
              isLoading={subscribing}
              disabled={subscribing}
            >
              {user ? "Subscribe to Channel" : "Login to Subscribe"}
            </Button>
          </div>

          <p className="text-xs text-zinc-400 text-center">
            By subscribing, you'll receive all broadcasts from this channel.
            Only admins can send messages.
          </p>
        </div>
      </div>
    </div>
  );
}
