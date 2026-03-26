"use client";

import { useState, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Check, X, Search, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { encryptChatMessage, importPublicKey } from "@/utils/crypto";

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMessages: { id: string; content: string }[];
  currentChatId: string;
}

export function ForwardModal({
  isOpen,
  onClose,
  selectedMessages,
  currentChatId,
}: ForwardModalProps) {
  const { user, privateKey } = useAuth();
  const { socket } = useSocket();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchChats();
    }
  }, [isOpen, user]);

  const fetchChats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chats", {
        headers: { "x-user-id": user?.id || "" },
      });
      const data = await res.json();
      if (data.chats) {
        // Filter out the current chat and pre-calculate display names
        const processedChats = data.chats
          .filter((c: any) => c.id !== currentChatId)
          .map((c: any) => {
            const participantMap = new Map();
            if (c.participants) {
              for (const p of c.participants) {
                participantMap.set(p.userId, p);
              }
            }

            let displayName = c.name;
            if (c.type === "DIRECT" && c.participants) {
              for (const p of c.participants) {
                if (p.userId !== user?.id) {
                  displayName = p.user.username;
                  break;
                }
              }
            }
            return {
              ...c,
              _participantMap: participantMap,
              _displayName: displayName || "Direct Chat"
            };
          });
        setChats(processedChats);
      }
    } catch (err) {
      console.error("Failed to fetch chats for forwarding", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleChat = (chatId: string) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  };

  const handleForward = async () => {
    if (!socket || !privateKey || selectedChatIds.size === 0 || isSending)
      return;
    setIsSending(true);

    try {
      for (const chatId of Array.from(selectedChatIds)) {
        // 1. Fetch full chat details to get participants and keys
        const res = await fetch(`/api/chats/${chatId}`, {
          headers: { "x-user-id": user!.id },
        });
        const { chat } = await res.json();
        if (!chat) continue;

        const recipientKeys = await Promise.all(
          chat.participants.map(async (p: any) => ({
            userId: p.userId,
            key: await importPublicKey(p.user.publicKey),
          })),
        );

        // 2. Encrypt all messages for this chat in parallel
        const packets = await Promise.all(
          selectedMessages.map((msg) =>
            encryptChatMessage(msg.content, recipientKeys),
          ),
        );

        // 3. Send each encrypted message
        for (const packet of packets) {
          socket.emit("send_message", {
            chatId,
            senderId: user!.id,
            content: JSON.stringify(packet),
            isForwarded: true,
            timestamp: new Date().toISOString(),
          });
        }
      }
      onClose();
    } catch (err) {
      console.error("Forwarding failed", err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredChats = chats.filter((c) => {
    return c._displayName?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-modal-title"
        className="relative bg-white dark:bg-zinc-950 w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 id="forward-modal-title" className="text-lg font-bold">Forward Messages</h2>
          <Button aria-label="Close forward modal" size="icon" variant="ghost" onPress={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              aria-label="Search chats"
              placeholder="Search chats..."
              className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#00ff82]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Spinner color="primary" />
              </div>
            ) : filteredChats.length > 0 ? (
              filteredChats.map((chat) => {
                const isSelected = selectedChatIds.has(chat.id);

                return (
                  <button
                    key={chat.id}
                    aria-pressed={isSelected}
                    onClick={() => toggleChat(chat.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isSelected ? "bg-[#00ff82]/10 border border-[#00ff82]/30" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                  >
                    <Avatar name={chat._displayName} size="sm" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold">{chat._displayName}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                        {chat.type}
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "bg-[#00ff82] border-[#00ff82]" : "border-zinc-300 dark:border-zinc-700"}`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-black" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-center py-10 text-zinc-500 text-sm italic">
                No chats found.
              </p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <Button
            className="w-full font-bold shadow-lg shadow-[#00ff82]/20"
            color="primary"
            disabled={selectedChatIds.size === 0 || isSending}
            onPress={handleForward}
          >
            {isSending ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> FORWARD TO{" "}
                {selectedChatIds.size} CHATS
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
