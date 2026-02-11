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
  Copy,
  CornerDownRight,
  Edit3,
  Info,
  Lock,
  Reply,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import MessageItem from "./MessageItem";

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

  // Handlers for MessageItem
  const handleToggleSelection = useCallback((msgId: string) => {
    setSelectedMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }, []);

  const handleReply = useCallback((msg: Message) => {
    setReplyingTo(msg);
  }, []);

  const handleEdit = useCallback((msg: Message) => {
    setEditingMsg(msg);
    setInputVal(msg.content);
  }, []);

  const handleDelete = useCallback((msg: Message) => {
    if (socket && user) {
        console.log(`[ChatWindow] Emitting delete_message for msg: ${msg.id}`);
        socket.emit("delete_message", {
            messageId: msg.id,
            userId: user.id,
        });
    }
  }, [socket, user]);

  const handleJumpToMessage = useCallback((msgId: string) => {
    setJumpTarget(msgId);
    setIsSearching(true);
  }, []);

  const handleContextMenu = useCallback((msgId: string) => {
    setActiveMessageId(msgId);
  }, []);


  const jumpToMessage = handleJumpToMessage; // Alias for internal use if needed, but we use handleJumpToMessage

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

  const toggleSelection = handleToggleSelection; // Alias for internal use if needed

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

  const isChannel = chatDetails?.type === "CHANNEL";

  return (
    <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-black relative overflow-hidden">
      {/* Header */}
      <div
        className={`flex items-center gap-3 p-4 border-b border-zinc-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10 shrink-0 ${isChannel ? "absolute top-0 w-full !bg-transparent border-none" : ""}`}
      >
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
        className={`flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col custom-scrollbar ${isChannel ? "pt-20 pb-20" : ""}`}
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
                const isFirstInGroup =
                  index === 0 || messages[index - 1].senderId !== msg.senderId;
                const isSelected = selectedMsgIds.has(msg.id);

                const replyMessage = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : undefined;
                const replySenderName = replyMessage ? chatDetails?.participants?.find((p: any) => p.userId === replyMessage.senderId)?.user?.username : undefined;

                return (
                  <MessageItem
                    key={msg.id}
                    msg={msg}
                    user={user}
                    isFirstInGroup={isFirstInGroup}
                    isSelected={isSelected}
                    selectionMode={selectionMode}
                    activeMessageId={activeMessageId}
                    chatDetails={chatDetails}
                    replyMessage={replyMessage}
                    replySenderName={replySenderName}
                    onToggleSelection={handleToggleSelection}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onJumpToMessage={handleJumpToMessage}
                    onContextMenu={handleContextMenu}
                  />
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

      <div
        className={`p-4 bg-white dark:bg-black border-t border-zinc-100 dark:border-zinc-800 shrink-0 ${isChannel ? "absolute bottom-0 w-full !bg-transparent border-none z-20" : ""}`}
      >
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
                  ? chatDetails.visibility === "PUBLIC"
                    ? "SUBSCRIBE"
                    : "REQUEST ACCESS"
                  : chatDetails.visibility === "PUBLIC"
                    ? "JOIN TRANSMISSION"
                    : "REQUEST ACCESS"}
              </Button>
            )}
          </div>
        ) : chatDetails?.type === "CHANNEL" ? (
          // Channel: Check if user is admin
          (() => {
            const myParticipant = chatDetails.participants?.find(
              (p: any) => p.userId === user?.id,
            );
            const isAdmin =
              myParticipant?.role === "ADMIN" ||
              myParticipant?.role === "OWNER";

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
                      privateKey
                        ? "Broadcast message..."
                        : "Unlocking station..."
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
                    {chatDetails.visibility === "PUBLIC"
                      ? "Subscribed to channel"
                      : "Member of private channel"}
                  </span>
                  <Button
                    color="danger"
                    variant="ghost"
                    size="sm"
                    onPress={async () => {
                      if (
                        confirm("Are you sure you want to leave this channel?")
                      ) {
                        try {
                          const res = await fetch(
                            `/api/chats/${chatId}/participants`,
                            {
                              method: "DELETE",
                              headers: {
                                "x-user-id": user?.id || "",
                              },
                            },
                          );
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
