"use client";

import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ScrollShadow } from "@/components/ui/ScrollShadow";
import { Spinner } from "@/components/ui/Spinner";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { NewChatModal } from "./NewChatModal";
import { SettingsModal } from "./SettingsModal";
import { decryptChatMessage } from "@/utils/crypto";
import { useSocket } from "@/hooks/useSocket";
import { siteConfig } from "@/lib/site-config";
import { ChatListSkeleton } from "./ChatListSkeleton";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useRef } from "react";

export function Sidebar() {
  const { user, logout, privateKey } = useAuth();
  const { socket, isConnected } = useSocket();
  const router = useRouter();
  const params = useParams(); // Get current route params
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const onOpen = () => setIsOpen(true);
  const onOpenChange = (val: boolean) => setIsOpen(val);

  const fetchChats = useCallback(async (signal?: AbortSignal) => {
    if (!user || !privateKey) return;
    try {
      console.log("[Sidebar] Fetching chats...");
      const res = await fetch("/api/chats", {
        headers: { "x-user-id": user?.id || "" },
        signal,
      });
      const data = await res.json();

      if (!data.chats) return;

      // Decrypted last messages if possible
      const decryptedChats = await Promise.all(
        (data.chats || []).map(async (chat: any) => {
          const participantMap = new Map();
          if (chat.participants) {
            for (const p of chat.participants) {
              participantMap.set(p.user.id, p);
            }
          }

          // Pre-calculate display name
          let displayName = chat.name;
          if (chat.type === "DIRECT" && chat.participants) {
            for (const p of chat.participants) {
              if (p.user.id !== user?.id) {
                displayName = p.user.username;
                break;
              }
            }
          }

          const baseChat = {
            ...chat,
            _participantMap: participantMap,
            _displayName: displayName || "Direct Chat",
          };

          if (chat.lastMessage && privateKey) {
            try {
              const packet = JSON.parse(chat.lastMessage.encryptedContent);
              const decrypted = await decryptChatMessage(
                packet,
                privateKey,
                user!.id,
              );
              return { ...baseChat, lastMessageText: decrypted };
            } catch (e) {
              return { ...baseChat, lastMessageText: "[Encrypted]" };
            }
          }
          return {
            ...baseChat,
            lastMessageText: chat.lastMessage
              ? "[Encrypted]"
              : "No messages yet",
          };
        }),
      );

      console.log(`[Sidebar] Fetched ${decryptedChats.length} chats`);
      setChats(decryptedChats);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Failed to fetch chats", err);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [user, privateKey]);

  useEffect(() => {
    const controller = new AbortController();
    fetchChats(controller.signal);
    return () => controller.abort();
  }, [fetchChats]);

  // Use a ref to always have access to the latest fetchChats and state without re-attaching listeners
  const handlersRef = useRef({ fetchChats, setChats });
  handlersRef.current = { fetchChats, setChats };

  useEffect(() => {
    if (socket && isConnected && user) {
      console.log("[Sidebar] Setting up socket listeners");
      socket.emit("join_room", `user_${user.id}`);

      const handleNewChat = (data: any) => {
        console.log("[Sidebar] Received new_chat or message event", data);
        // Simple debounce: wait 500ms, if called again, reset timer
        if ((window as any).refreshTimeout) {
          clearTimeout((window as any).refreshTimeout);
        }
        (window as any).refreshTimeout = setTimeout(() => {
          handlersRef.current.fetchChats();
        }, 500);
      };

      const handleRefreshChats = (data: any) => {
        console.log("[Sidebar] Received refresh_chats event", data);
        if (data.chatId && data.lastReadAt) {
          handlersRef.current.setChats((prev) =>
            prev.map((c) =>
              c.id === data.chatId ? { ...c, lastReadAt: data.lastReadAt } : c,
            ),
          );
        } else {
          handleNewChat(data);
        }
      };

      socket.on("new_chat", handleNewChat);
      socket.on("refresh_chats", handleRefreshChats);
      socket.on("receive_message", handleNewChat);

      return () => {
        console.log("[Sidebar] Cleaning up socket listeners");
        socket.off("new_chat", handleNewChat);
        socket.off("refresh_chats", handleRefreshChats);
        socket.off("receive_message", handleNewChat);
        if ((window as any).refreshTimeout) {
          clearTimeout((window as any).refreshTimeout);
        }
      };
    }
  }, [socket, isConnected, user?.id]); // Only re-run if socket or user.id changes

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black">
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setIsSettingsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsSettingsOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
        >
          <Avatar
            name={user?.username}
            size="md"
            className="border border-[#00ff82]/20"
          />
          <div className="flex flex-col">
            <span className="font-bold text-sm block max-w-[100px] truncate">
              {user?.username}
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff82] animate-pulse"></span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                SECURED
              </span>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          color="danger"
          variant="light"
          onPress={logout}
          className="text-tiny px-2"
        >
          Logout
        </Button>
      </div>
      {/* New Chat Button */}
      <div className="p-4 pb-2">
        <Button
          className="w-full font-bold shadow-lg shadow-[#00ff82]/5 border border-[#00ff82]/20 group"
          color="primary"
          variant="shadow"
          onPress={onOpen}
        >
          <span className="group-hover:scale-110 transition-transform tracking-wider">
            + NEW TRANSMISSION
          </span>
        </Button>
      </div>
      {/* Chat List */}
      <ScrollShadow className="flex-1 p-2">
        {loading ? (
          <ChatListSkeleton />
        ) : (
          <AnimatePresence initial={false}>
            <ul className="flex flex-col gap-1">
              {chats.map((chat) => {
                const isUnread =
                  chat.lastMessage &&
                  chat.lastMessage.senderId !== user?.id &&
                  (!chat.lastReadAt ||
                    new Date(chat.lastMessage.createdAt) >
                      new Date(chat.lastReadAt));

                const isMe = chat.lastMessage?.senderId === user?.id;
                const isActive = params?.id === chat.id;

                return (
                  <motion.li
                    key={chat.id}
                    layout="position"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      layout: { type: "spring", stiffness: 300, damping: 30 },
                      opacity: { duration: 0.2 },
                    }}
                    className="relative"
                  >
                    <button
                      onClick={() => {
                        if (chat.type === "CHANNEL") {
                          router.push(`/c/${chat.slug || chat.id}`);
                        } else {
                          router.push(`/chat/${chat.id}`);
                        }
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group
                          ${isActive ? "bg-zinc-100 dark:bg-zinc-800 shadow-sm" : "hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:scale-[1.01]"}
                      `}
                    >
                      <div className="relative">
                        <Avatar
                          size="md"
                          name={chat._displayName}
                          showAnimation={false}
                        />
                        {isUnread && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-black animate-pulseGlow" />
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden flex-1">
                        <div className="flex justify-between items-center">
                          <span
                            className={`text-sm truncate transition-colors ${isActive || isUnread ? "font-bold text-black dark:text-white" : "font-semibold text-zinc-700 dark:text-zinc-300"}`}
                          >
                            {chat._displayName}
                          </span>
                          {chat.lastMessage && (
                            <span
                              className={`text-[10px] ${isUnread ? "text-red-500 font-bold" : "text-zinc-500"}`}
                            >
                              {new Date(
                                chat.lastMessage.createdAt,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs truncate mt-0.5 ${isUnread ? "text-zinc-900 dark:text-zinc-100 font-medium" : "text-zinc-400"}`}
                        >
                          {isMe && chat.lastMessageText && (
                            <span className="text-zinc-500 mr-1">You:</span>
                          )}
                          {!isMe &&
                            chat.type === "GROUP" &&
                            chat.lastMessage?.senderId &&
                            chat._participantMap?.get(chat.lastMessage.senderId)?.user?.username &&
                            chat.lastMessageText && (
                              <span className="text-zinc-500 mr-1">
                                {chat._participantMap.get(chat.lastMessage.senderId).user.username}:
                              </span>
                            )}
                          {chat.lastMessageText}
                        </span>
                      </div>
                    </button>
                  </motion.li>
                );
              })}
              {!loading && chats.length === 0 && (
                <div className="text-center py-10 px-4">
                  <p className="text-zinc-500 text-xs">
                    No active identities found. Start a new secure transmission.
                  </p>
                </div>
              )}
            </ul>
          </AnimatePresence>
        )}
      </ScrollShadow>
      <NewChatModal isOpen={isOpen} onOpenChange={onOpenChange} />
      <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span className="flex items-center gap-1">
            <span className="animate-pulse w-1 h-1 bg-[#00ff82] rounded-full"></span>
            STATION_READY
          </span>
          <span>{siteConfig.version}</span>
        </div>
      </div>
    </div>
  );
}
