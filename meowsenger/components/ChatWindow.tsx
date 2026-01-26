"use client";

import { ChatSettingsDrawer } from "@/components/ChatSettingsDrawer";
import { ForwardModal } from "@/components/ForwardModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import {
  decryptChatMessage,
  encryptChatMessage,
  importPublicKey,
} from "@/utils/crypto";
import {
  Check,
  Copy,
  CornerDownRight,
  Edit3,
  Forward,
  Info,
  Lock,
  MoreVertical,
  Reply,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date;
  isError?: boolean;
  isDeleted?: boolean;
  isEdited?: boolean;
  isForwarded?: boolean;
  replyToId?: string;
}

export function ChatWindow({ chatId }: { chatId: string }) {
  const { user, privateKey } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatDetails, setChatDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Advanced Features State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null); // For mobile/context menu actions

  // 1. Fetch Chat Metadata
  useEffect(() => {
    const controller = new AbortController();
    if (user && chatId) {
      setMessages([]);
      setChatDetails(null);
      setChatDetails(null);
      fetchChatDetails(controller.signal);
    }

    // click-outside listener to clear active actions
    const handleClickOutside = () => setActiveMessageId(null);
    window.addEventListener("click", handleClickOutside);
    return () => {
      controller.abort();
      window.removeEventListener("click", handleClickOutside);
    };
  }, [chatId, user]);

  // Smart Mark Read: Only emit if actually unread
  useEffect(() => {
    if (socket && isConnected && user && chatId && chatDetails) {
      const myParticipant = chatDetails.participants?.find(
        (p: any) => p.userId === user.id,
      );

      let lastMessageTime = null;
      let isByType = false;

      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        lastMessageTime = new Date(lastMsg.createdAt);
        if (lastMsg.senderId === user.id) isByType = true;
      } else if (chatDetails.messages && chatDetails.messages.length > 0) {
        const lastMsg = chatDetails.messages[0];
        lastMessageTime = new Date(lastMsg.createdAt);
        if (lastMsg.senderId === user.id) isByType = true;
      }

      if (isByType) return;

      const lastReadAt = myParticipant?.lastReadAt
        ? new Date(myParticipant.lastReadAt)
        : null;

      if (lastMessageTime && (!lastReadAt || lastMessageTime > lastReadAt)) {
        socket.emit("mark_read", { userId: user.id, chatId });

        setChatDetails((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            participants: prev.participants.map((p: any) =>
              p.userId === user.id ? { ...p, lastReadAt: new Date() } : p,
            ),
          };
        });
      }
    }
  }, [socket, isConnected, user, chatId, messages.length, chatDetails]);

  const fetchChatDetails = async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        headers: { "x-user-id": user?.id || "" },
        signal,
      });
      const data = await res.json();
      if (data.chat) {
        setChatDetails(data.chat);

        if (data.chat.messages && privateKey) {
          const reversed = [...data.chat.messages].reverse();
          const decryptedMessages = await Promise.all(
            reversed.map((m: any) =>
              decryptMessageItem(m, privateKey, user!.id),
            ),
          );
          setMessages(decryptedMessages);
          setTimeout(scrollToBottom, 50);
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Failed to fetch chat details", err);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  // Helper for decryption
  const decryptMessageItem = async (m: any, key: CryptoKey, userId: string) => {
    try {
      if (m.isDeleted) {
        return {
          id: m.id,
          senderId: m.senderId,
          content: "[Message Deleted]",
          createdAt: new Date(m.createdAt),
          isDeleted: true,
          replyToId: m.replyToId,
          isForwarded: m.isForwarded,
        };
      }
      const packet = JSON.parse(m.encryptedContent);
      const content = await decryptChatMessage(packet, key, userId);
      return {
        id: m.id,
        senderId: m.senderId,
        content,
        createdAt: new Date(m.createdAt),
        replyToId: m.replyToId,
        isForwarded: m.isForwarded,
        isEdited: m.isEdited,
      };
    } catch (e) {
      return {
        id: m.id,
        senderId: m.senderId,
        content: "[Message Deleted]", // Fallback for decryption fail often means deleted content
        createdAt: new Date(m.createdAt),
        isError: !m.isDeleted,
        isDeleted: m.isDeleted,
        replyToId: m.replyToId,
        isForwarded: m.isForwarded,
      };
    }
  };

  const loadMoreMessages = async () => {
    if (!messages.length || loadingMore) return 0;

    setLoadingMore(true);
    const oldestMessage = messages[0];
    const before = oldestMessage.createdAt.toISOString();

    try {
      const res = await fetch(
        `/api/chats/${chatId}/messages?before=${before}`,
        {
          headers: { "x-user-id": user?.id || "" },
        },
      );
      const data = await res.json();

      if (data.messages && data.messages.length > 0 && privateKey) {
        const decryptedNew = await Promise.all(
          data.messages.map((m: any) =>
            decryptMessageItem(m, privateKey, user!.id),
          ),
        );

        const currentScrollHeight = scrollRef.current?.scrollHeight || 0;
        setMessages((prev) => [...decryptedNew, ...prev]);

        requestAnimationFrame(() => {
          if (scrollRef.current) {
            const newScrollHeight = scrollRef.current.scrollHeight;
            scrollRef.current.scrollTop = newScrollHeight - currentScrollHeight;
          }
        });
        return decryptedNew.length;
      }
      return 0;
    } catch (err) {
      console.error("Failed to load more messages", err);
      return 0;
    } finally {
      setLoadingMore(false);
    }
  };

  // Deep Navigation Effect
  useEffect(() => {
    if (!jumpTarget) return;

    const target = document.getElementById(`msg-${jumpTarget}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add(
        "ring-2",
        "ring-[#00ff82]",
        "ring-offset-2",
        "dark:ring-offset-black",
      );
      setTimeout(() => {
        target.classList.remove(
          "ring-2",
          "ring-[#00ff82]",
          "ring-offset-2",
          "dark:ring-offset-black",
        );
        setJumpTarget(null);
        setIsSearching(false);
      }, 2000);
      return;
    }

    if (!loadingMore) {
      loadMoreMessages().then((count) => {
        if (count === 0) {
          setJumpTarget(null);
          setIsSearching(false);
        }
      });
    }
  }, [jumpTarget, messages, loadingMore]);

  const jumpToMessage = (msgId: string) => {
    setJumpTarget(msgId);
    setIsSearching(true);
  };

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !loading &&
          !loadingMore &&
          messages.length >= 50
        ) {
          loadMoreMessages();
        }
      },
      { root: scrollRef.current, threshold: 0.1 },
    );
    const trigger = document.getElementById("msg-top-trigger");
    if (trigger) observer.observe(trigger);
    return () => observer.disconnect();
  }, [messages.length, loading, loadingMore]);

  // Socket Listeners
  useEffect(() => {
    if (socket && isConnected && privateKey && user) {
      socket.emit("join_room", chatId);

      const handleReceive = async (data: any) => {
        if (data.chatId === chatId && data.senderId !== user?.id) {
          try {
            const packet = JSON.parse(data.content);
            const content = await decryptChatMessage(
              packet,
              privateKey,
              user!.id,
            );
            setMessages((prev) => [
              ...prev,
              {
                id: data.id || Date.now().toString() + Math.random(),
                senderId: data.senderId,
                content,
                createdAt: data.createdAt
                  ? new Date(data.createdAt)
                  : new Date(),
                replyToId: data.replyToId,
                isForwarded: data.isForwarded,
              },
            ]);
            setTimeout(scrollToBottom, 50);
            socket.emit("mark_read", { userId: user.id, chatId });
          } catch (e) {
            console.error(e);
          }
        }
      };
      socket.on("receive_message", handleReceive);

      socket.on(
        "message_sent",
        ({ tempId, message }: { tempId: string; message: any }) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    id: message.id,
                    createdAt: new Date(message.createdAt),
                  }
                : m,
            ),
          );
        },
      );

      socket.on("message_deleted", ({ id }: { id: string }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, isDeleted: true, content: "[Message Deleted]" }
              : m,
          ),
        );
      });

      socket.on(
        "message_updated",
        async ({
          id,
          content: encryptedContent,
        }: {
          id: string;
          content: string;
        }) => {
          try {
            const m = messages.find((msg) => msg.id === id);
            if (!m || !privateKey) return;

            const packet = JSON.parse(encryptedContent);
            const content = await decryptChatMessage(
              packet,
              privateKey,
              user!.id,
            );

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === id ? { ...msg, content, isEdited: true } : msg,
              ),
            );
          } catch (e) {
            console.error("Failed to decrypt updated message", e);
          }
        },
      );

      return () => {
        socket.off("receive_message", handleReceive);
        socket.off("message_deleted");
        socket.off("message_updated");
        socket.off("message_sent");
        socket.emit("leave_room", chatId);
      };
    }
  }, [socket, isConnected, chatId, user, privateKey, messages]);

  const scrollToBottom = () => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  const handleSend = async () => {
    if (!inputVal.trim() || !socket || !privateKey || !chatDetails) return;
    const plainText = inputVal;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setInputVal("");
    try {
      const recipientKeys = await Promise.all(
        chatDetails.participants.map(async (p: any) => ({
          userId: p.userId,
          key: await importPublicKey(p.user.publicKey),
        })),
      );
      const packet = await encryptChatMessage(plainText, recipientKeys);
      const encryptedContent = JSON.stringify(packet);
      if (editingMsg) {
        socket.emit("edit_message", {
          messageId: editingMsg.id,
          content: encryptedContent,
          userId: user?.id,
        });
        setEditingMsg(null);
      } else {
        // If replying to a tempId, we might need to wait, but usually the UI prevents this
        // or the message is already confirmed by the time user types and hits send.
        // However, we should ensure we NEVER send a tempId to the server as replyToId.
        const actualReplyToId = replyingTo?.id.startsWith("temp-")
          ? null
          : replyingTo?.id;

        socket.emit("send_message", {
          chatId,
          senderId: user?.id,
          content: encryptedContent,
          replyToId: actualReplyToId,
          tempId,
          isForwarded: false,
        });
        setReplyingTo(null);
      }
      // Optimistic update
      if (editingMsg) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMsg.id
              ? { ...m, content: plainText, isEdited: true }
              : m,
          ),
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            senderId: user?.id || "me",
            content: plainText,
            createdAt: new Date(),
            replyToId: replyingTo?.id,
          },
        ]);
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      setInputVal(plainText);
    }
  };

  const toggleSelection = (msgId: string) => {
    setSelectedMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const handleDeleteMessages = () => {
    if (!socket || !user) return;
    console.log("[ChatWindow] Starting batch delete:", selectedMsgIds);
    Array.from(selectedMsgIds).forEach((id) => {
      console.log(`[ChatWindow] Emitting delete_message for ${id}`);
      socket.emit("delete_message", { messageId: id, userId: user.id });
    });
    setSelectionMode(false);
    setSelectedMsgIds(new Set());
  };

  const getChatName = () => {
    if (!chatDetails) return "Secured Line";
    if (chatDetails.type === "DIRECT") {
      return (
        chatDetails.participants.find((p: any) => p.userId !== user?.id)?.user
          .username || "Direct Chat"
      );
    }
    return chatDetails.name;
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-black relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="md:hidden"
          onPress={() => router.push("/chat")}
        >
          ←
        </Button>
        <Avatar
          name={getChatName()}
          size="md"
          className="border border-[#00ff82]/20"
        />
        <div className="flex flex-col flex-1">
          <span className="font-bold text-sm tracking-tight">
            {getChatName()}
          </span>
          <div className="flex items-center gap-1">
            <span
              className={`w-1 h-1 rounded-full ${chatDetails?.visibility === "PUBLIC" ? "bg-blue-400" : "bg-[#00ff82]"} animate-pulse`}
            ></span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">
              {chatDetails?.visibility || chatDetails?.type || "IDENTITY"}
              _SECURED
            </span>
          </div>
        </div>
        {chatDetails?.type === "GROUP" && (
          <Button
            size="sm"
            variant="ghost"
            className="text-zinc-500"
            onPress={() => setIsSettingsOpen(true)}
          >
            <Info className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col custom-scrollbar"
        ref={scrollRef}
      >
        {loading && messages.length === 0 ? (
          <div className="flex flex-col gap-4 p-4 h-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => {
              const isOwn = i % 2 === 0;
              return (
                <div
                  key={i}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"} items-end gap-2`}
                >
                  {!isOwn && (
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  )}
                  <Skeleton
                    className={`h-8 rounded-full
                               ${
                                 isOwn
                                   ? "rounded-tr-none bg-[#00ff82]/30 dark:bg-[#00ff82]/10"
                                   : "rounded-tl-none bg-zinc-200 dark:bg-zinc-800"
                               }
                           `}
                    style={{ width: `${Math.max(100, Math.random() * 300)}px` }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div id="msg-top-trigger" className="h-1 w-full" />
            {loadingMore && (
              <div className="flex justify-center p-2">
                <Spinner size="sm" />
              </div>
            )}

            {(chatDetails?.membershipStatus === "NON_MEMBER" ||
              chatDetails?.membershipStatus === "PENDING") &&
            chatDetails.visibility === "PRIVATE" ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-zinc-400" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                    Private Transmission
                  </h3>
                  <p className="text-sm opacity-70">
                    Access to this channel is restricted.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.senderId === user?.id;
                const isFirstInGroup =
                  index === 0 || messages[index - 1].senderId !== msg.senderId;
                const isSelected = selectedMsgIds.has(msg.id);

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2 group/msg relative animate-slideInUp select-none ${
                      index > 0 && messages[index - 1].senderId === msg.senderId
                        ? "mt-0.5"
                        : "mt-4"
                    }`}
                    style={{
                      animationDelay: `${Math.min(index * 15, 150)}ms`,
                      opacity: 0,
                      animationFillMode: "forwards",
                    }}
                  >
                    {selectionMode && (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "right-full mr-4" : "left-full ml-4"} z-20`}
                      >
                        <div
                          onClick={() => toggleSelection(msg.id)}
                          className={`w-5 h-5 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all ${isSelected ? "bg-[#00ff82] border-[#00ff82]" : "border-zinc-300 dark:border-zinc-700 hover:border-[#00ff82]"}`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-black" />
                          )}
                        </div>
                      </div>
                    )}

                    {!isMe && isFirstInGroup ? (
                      <Avatar
                        name={
                          chatDetails?.participants?.find(
                            (p: any) => p.userId === msg.senderId,
                          )?.user?.username || "?"
                        }
                        size="sm"
                        className="mb-1"
                        showAnimation={false}
                      />
                    ) : (
                      !isMe && <div className="w-8 shrink-0" />
                    )}

                    <div
                      className={`flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        id={`msg-${msg.id}`}
                        onClick={(e) => {
                          if (selectionMode) {
                            toggleSelection(msg.id);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (selectionMode) return;
                          setActiveMessageId(msg.id);
                        }}
                        className={`
                          px-3 py-1.5 rounded-2xl shadow-sm relative group transition-all duration-200
                          ${isMe ? `bg-[#00ff82] text-black ${isFirstInGroup && !msg.replyToId ? "rounded-tr-none" : ""}` : `bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 ${isFirstInGroup && !msg.replyToId ? "rounded-tl-none" : ""}`}
                          ${msg.isError ? "opacity-70 italic border-red-500/50" : ""}
                          ${selectionMode ? "cursor-pointer" : ""}
                          ${selectionMode && !isSelected ? "opacity-40 grayscale scale-95" : ""}
                          ${isSelected ? `ring-2 ring-inset ${isMe ? "ring-black/20" : "ring-[#00ff82]"} z-10 shadow-xl` : ""}
                        `}
                      >
                        {/* Forwarded Indicator */}
                        {msg.isForwarded && (
                          <div className="flex items-center gap-1 text-[9px] opacity-40 mb-1 italic font-bold uppercase tracking-widest">
                            <Forward className="w-2.5 h-2.5" />
                            Forwarded
                          </div>
                        )}

                        {/* Reply Reference */}
                        {msg.replyToId && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (msg.replyToId) jumpToMessage(msg.replyToId);
                            }}
                            className={`mb-2 px-2 py-1.5 rounded-xl border-l-4 cursor-pointer transition-colors
                              ${
                                isMe
                                  ? "border-black/20 bg-black/10 hover:bg-black/20"
                                  : "border-black/10 dark:border-[#00ff82]/40 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
                              }
                            `}
                          >
                            <div className="flex items-center gap-1.5 font-bold uppercase tracking-tight mb-0.5 text-[10px] text-opacity-100">
                              <Reply className="w-2.5 h-2.5" />
                              <span
                                className={
                                  isMe ? "text-black/90" : "opacity-70"
                                }
                              >
                                {messages.find((m) => m.id === msg.replyToId)
                                  ? chatDetails?.participants?.find(
                                      (p: any) =>
                                        p.userId ===
                                        messages.find(
                                          (m) => m.id === msg.replyToId,
                                        )?.senderId,
                                    )?.user?.username || "Unknown"
                                  : "Unknown"}
                              </span>
                            </div>
                            <p
                              className={`truncate text-xs ${isMe ? "text-black/80 font-medium" : "opacity-60"}`}
                            >
                              {messages.find((m) => m.id === msg.replyToId)
                                ?.content || "TRANSMISSION_DATA"}
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap items-end gap-x-4 gap-y-1 min-w-[60px]">
                          <p className="text-[13.5px] whitespace-pre-wrap break-all flex-1 leading-relaxed">
                            {msg.content}
                          </p>
                          <div className="flex items-center gap-1 shrink-0 mb-0.5">
                            {msg.isEdited && (
                              <span className="text-[8px] opacity-80 uppercase font-bold">
                                Edited
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-mono ${isMe ? "text-black/80 font-medium" : "text-zinc-500"}`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Hover/Context Actions */}
                        {!selectionMode && !msg.isDeleted && (
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "right-full mr-2" : "left-full ml-2"} flex gap-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-xl p-1 z-20 scale-95 transition-all
                            ${activeMessageId === msg.id ? "opacity-100 scale-100" : "opacity-0 scale-95"} 
                            md:opacity-0 md:group-hover/msg:opacity-100 md:group-hover/msg:scale-100
                            `}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-[#00ff82]"
                              onPress={() => setReplyingTo(msg)}
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </Button>
                            {isMe && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-[#00ff82]"
                                onPress={() => {
                                  setEditingMsg(msg);
                                  setInputVal(msg.content);
                                }}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {(isMe ||
                              chatDetails?.participants?.find(
                                (p: any) => p.userId === user?.id,
                              )?.role !== "MEMBER") && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                                onPress={() => {
                                  if (socket && user) {
                                    console.log(
                                      `[ChatWindow] Emitting delete_message for msg: ${msg.id}`,
                                    );
                                    socket.emit("delete_message", {
                                      messageId: msg.id,
                                      userId: user.id,
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-[#00ff82]"
                              onPress={() => {
                                setSelectionMode(true);
                                toggleSelection(msg.id);
                              }}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {!loading &&
              messages.length === 0 &&
              (chatDetails?.membershipStatus === "MEMBER" ||
                chatDetails?.visibility === "PUBLIC") && (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                  <div className="w-12 h-12 rounded-full border border-dashed border-zinc-400 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-xs font-mono tracking-tighter uppercase">
                    IDENTITY_VERIFIED // SESSION_ESTABLISHED
                  </p>
                </div>
              )}
          </>
        )}
      </div>

      {selectionMode && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl p-3 flex items-center justify-between z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onPress={() => {
                setSelectionMode(false);
                setSelectedMsgIds(new Set());
              }}
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#00ff82] uppercase tracking-widest">
                Transmission Selection
              </span>
              <span className="text-sm font-bold">
                {selectedMsgIds.size} COMMANDS_QUEUED
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-200 dark:border-zinc-800 font-bold tracking-tight"
              onPress={() => {
                navigator.clipboard.writeText(
                  Array.from(selectedMsgIds)
                    .map((id) => messages.find((m) => m.id === id)?.content)
                    .join("\n"),
                );
                setSelectionMode(false);
                setSelectedMsgIds(new Set());
              }}
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" /> COPY_DATA
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-zinc-200 dark:border-zinc-800 font-bold tracking-tight"
              onPress={() => setIsForwardModalOpen(true)}
            >
              <CornerDownRight className="w-3.5 h-3.5 mr-1.5" /> FORWARD
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="font-bold tracking-tight shadow-lg shadow-red-500/20"
              onPress={handleDeleteMessages}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> PURGE_LOGS
            </Button>
          </div>
        </div>
      )}

      {(editingMsg || replyingTo) && (
        <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-1 h-8 bg-[#00ff82] rounded-full shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-[#00ff82] uppercase tracking-wider flex items-center gap-1">
                {editingMsg ? (
                  <Edit3 className="w-3 h-3" />
                ) : (
                  <Reply className="w-3 h-3" />
                )}
                {editingMsg ? "Editing" : "Replying"}
              </span>
              <p className="text-xs truncate opacity-60">
                {editingMsg?.content || replyingTo?.content}
              </p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onPress={() => {
              setEditingMsg(null);
              setReplyingTo(null);
              if (editingMsg) setInputVal("");
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="p-4 bg-white dark:bg-black border-t border-zinc-100 dark:border-zinc-800 shrink-0">
        {chatDetails?.membershipStatus === "NON_MEMBER" ||
        chatDetails?.membershipStatus === "PENDING" ? (
          <div className="flex justify-center">
            {chatDetails.membershipStatus === "PENDING" ? (
              <Button disabled className="w-full opacity-70" variant="bordered">
                Request Pending...
              </Button>
            ) : (
              <Button
                color="primary"
                className="w-full font-bold shadow-[0_0_20px_rgba(0,255,130,0.3)] animate-pulse"
                onPress={async () => {
                  try {
                    const res = await fetch(`/api/chats/${chatId}/join`, {
                      method: "POST",
                      headers: { "x-user-id": user?.id || "" },
                    });
                    const data = await res.json();
                    if (data.status === "MEMBER" || data.status === "PENDING") {
                      fetchChatDetails(); // Refresh
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                {chatDetails.type === "CHANNEL" 
                  ? (chatDetails.visibility === "PUBLIC" ? "SUBSCRIBE" : "REQUEST ACCESS")
                  : (chatDetails.visibility === "PUBLIC" ? "JOIN TRANSMISSION" : "REQUEST ACCESS")}
              </Button>
            )}
          </div>
        ) : chatDetails?.type === "CHANNEL" ? (
          // Channel: Check if user is admin
          (() => {
            const myParticipant = chatDetails.participants?.find(
              (p: any) => p.userId === user?.id
            );
            const isAdmin = myParticipant?.role === "ADMIN" || myParticipant?.role === "OWNER";
            
            if (isAdmin) {
              // Show message input for admins
              return (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2 max-w-4xl mx-auto"
                >
                  <Input
                    placeholder={
                      privateKey ? "Broadcast message..." : "Unlocking station..."
                    }
                    value={inputVal}
                    onChange={(e: any) => setInputVal(e.target.value)}
                    className="flex-1"
                    autoComplete="off"
                    disabled={!privateKey}
                  />
                  <Button
                    color="primary"
                    type="submit"
                    className="font-bold shadow-lg shadow-[#00ff82]/20"
                    disabled={!privateKey || loading}
                  >
                    BROADCAST
                  </Button>
                </form>
              );
            } else {
              // Show subscribe/unsubscribe button for non-admins
              return (
                <div className="flex items-center justify-center gap-3 py-2">
                  <span className="text-sm text-zinc-500">
                    {chatDetails.visibility === "PUBLIC" ? "Subscribed to channel" : "Member of private channel"}
                  </span>
                  <Button
                    color="danger"
                    variant="ghost"
                    size="sm"
                    onPress={async () => {
                      if (confirm("Are you sure you want to leave this channel?")) {
                        try {
                          const res = await fetch(`/api/chats/${chatId}/participants`, {
                            method: "DELETE",
                            headers: { 
                              "x-user-id": user?.id || "",
                              "Content-Type": "application/json"
                            },
                            body: JSON.stringify({})
                          });
                          if (res.ok) {
                            window.location.href = "/";
                          }
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }}
                  >
                    Unsubscribe
                  </Button>
                </div>
              );
            }
          })()
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 max-w-4xl mx-auto"
          >
            <Input
              placeholder={
                privateKey ? "Secure transmission..." : "Unlocking station..."
              }
              value={inputVal}
              onChange={(e: any) => setInputVal(e.target.value)}
              className="flex-1"
              autoComplete="off"
              disabled={!privateKey}
            />
            <Button
              color="primary"
              type="submit"
              className="font-bold shadow-lg shadow-[#00ff82]/20"
              disabled={!privateKey || loading}
            >
              SEND
            </Button>
          </form>
        )}
      </div>

      <ForwardModal
        isOpen={isForwardModalOpen}
        onClose={() => {
          setIsForwardModalOpen(false);
          setSelectionMode(false);
          setSelectedMsgIds(new Set());
        }}
        selectedMessages={Array.from(selectedMsgIds).map((id) => ({
          id,
          content: messages.find((m) => m.id === id)?.content || "",
        }))}
        currentChatId={chatId}
      />

      <ChatSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        chatId={chatId}
        chatDetails={chatDetails}
      />
    </div>
  );
}
