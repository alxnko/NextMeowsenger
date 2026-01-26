"use client";

import { ChatSettingsDrawer } from "@/components/ChatSettingsDrawer";
import { ForwardModal } from "@/components/ForwardModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
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
  Edit3,
  Forward,
  Info,
  Lock,
  Reply,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageListSkeleton } from "./MessageListSkeleton";

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: Date;
  isError?: boolean;
  isEdited?: boolean;
  isForwarded?: boolean;
  isDeleted?: boolean;
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

  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (user && chatId) {
      setMessages([]);
      setChatDetails(null);
      fetchChatDetails(controller.signal);
    }
    return () => controller.abort();
  }, [chatId, user]);

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
  }, [socket, isConnected, user, chatId, messages, chatDetails]);

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
      if (err.name !== "AbortError") console.error(err);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const decryptMessageItem = async (m: any, key: CryptoKey, userId: string) => {
    try {
      const packet = JSON.parse(m.encryptedContent);
      const content = await decryptChatMessage(packet, key, userId);
      return {
        id: m.id,
        senderId: m.senderId,
        content,
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        replyToId: m.replyToId,
        isForwarded: m.isForwarded,
        isEdited: m.isEdited,
        isDeleted: m.isDeleted,
      };
    } catch (e) {
      return {
        id: m.id,
        senderId: m.senderId,
        content: m.isDeleted ? "[Message Deleted]" : "[Decryption Failed]",
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        isError: !m.isDeleted,
        replyToId: m.replyToId,
        isForwarded: m.isForwarded,
        isDeleted: m.isDeleted,
      };
    }
  };

  const loadMoreMessages = async () => {
    if (!messages.length || loadingMore) return;
    setLoadingMore(true);
    const before = messages[0].createdAt.toISOString();
    try {
      const res = await fetch(
        `/api/chats/${chatId}/messages?before=${before}`,
        {
          headers: { "x-user-id": user?.id || "" },
        },
      );
      const data = await res.json();
      if (data.messages?.length > 0 && privateKey) {
        const decryptedNew = await Promise.all(
          data.messages.map((m: any) =>
            decryptMessageItem(m, privateKey, user!.id),
          ),
        );
        const currentScrollHeight = scrollRef.current?.scrollHeight || 0;
        setMessages((prev) => [...decryptedNew, ...prev]);
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop =
              scrollRef.current.scrollHeight - currentScrollHeight;
          }
        });
      }
    } finally {
      setLoadingMore(false);
    }
  };

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
        socket.emit("leave_room", chatId);
      };
    }
  }, [socket, isConnected, chatId, user, privateKey]);

  const scrollToBottom = () => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  const handleSend = async () => {
    if (!inputVal.trim() || !socket || !privateKey || !chatDetails) return;
    const plainText = inputVal;
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
        socket.emit("send_message", {
          chatId,
          senderId: user?.id,
          content: encryptedContent,
          replyToId: replyingTo?.id,
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
            id: Date.now().toString(),
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
    Array.from(selectedMsgIds).forEach((id) =>
      socket.emit("delete_message", { messageId: id, userId: user.id }),
    );
    setSelectionMode(false);
    setSelectedMsgIds(new Set());
  };

  const getChatName = () => {
    if (!chatDetails) return "Secured Line";
    return chatDetails.type === "DIRECT"
      ? chatDetails.participants.find((p: any) => p.userId !== user?.id)?.user
          .username || "Direct Chat"
      : chatDetails.name;
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-black relative overflow-hidden">
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

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
        ref={scrollRef}
      >
        {loading && messages.length === 0 ? (
          <MessageListSkeleton />
        ) : (
          <>
            <div id="msg-top-trigger" className="h-1 w-full" />
            {loadingMore && (
              <div className="flex justify-center p-2">
                <div className="animate-spin h-6 w-6 border-4 border-[#00ff82] border-t-transparent rounded-full" />
              </div>
            )}

            {(chatDetails?.membershipStatus === "NON_MEMBER" ||
              chatDetails?.membershipStatus === "PENDING") &&
            chatDetails.visibility === "PRIVATE" ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
                <Lock className="w-8 h-8 opacity-20" />
                <div className="text-center">
                  <h3 className="font-bold">Private Transmission</h3>
                  <p className="text-xs opacity-60">Access restricted.</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const isMe = msg.senderId === user?.id;
                  const nextMsg = messages[index + 1];
                  const prevMsg = messages[index - 1];
                  const isLastInGroup =
                    !nextMsg ||
                    nextMsg.senderId !== msg.senderId ||
                    new Date(nextMsg.createdAt).getTime() -
                      new Date(msg.createdAt).getTime() >
                      300000;
                  const isFirstInGroup =
                    !prevMsg ||
                    prevMsg.senderId !== msg.senderId ||
                    new Date(msg.createdAt).getTime() -
                      new Date(prevMsg.createdAt).getTime() >
                      300000;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} items-start gap-2 animate-slideInUp ${!isLastInGroup ? "mb-1" : "mb-4"} group/msg relative`}
                    >
                      {selectionMode && (
                        <div
                          onClick={() => toggleSelection(msg.id)}
                          className={`mt-3 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer ${selectedMsgIds.has(msg.id) ? "bg-[#00ff82] border-[#00ff82]" : "border-zinc-300"}`}
                        >
                          {selectedMsgIds.has(msg.id) && (
                            <Check className="w-3 h-3 text-black" />
                          )}
                        </div>
                      )}
                      {!isMe && isFirstInGroup && (
                        <div className="w-8 shrink-0">
                          <Avatar
                            size="sm"
                            className="mt-1"
                            name={
                              chatDetails?.participants?.find(
                                (p: any) => p.userId === msg.senderId,
                              )?.user?.username || "?"
                            }
                          />
                        </div>
                      )}
                      {!isMe && !isFirstInGroup && (
                        <div className="w-8 shrink-0" />
                      )}

                      <div
                        className={`flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          id={`msg-${msg.id}`}
                          className={`
                          px-3 py-1.5 rounded-2xl shadow-sm relative group transition-all
                          ${isMe ? `bg-[#00ff82] text-black ${isFirstInGroup && !msg.replyToId ? "rounded-tr-none" : ""}` : `bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 ${isFirstInGroup && !msg.replyToId ? "rounded-tl-none" : ""}`}
                          ${msg.isError ? "opacity-70 italic border-red-500/50" : ""}
                          ${msg.replyToId ? "rounded-t-none" : ""}
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
                                  .getElementById(`msg-${msg.replyToId}`)
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                  })
                              }
                              className={`mb-2 px-2 py-1.5 rounded-xl border-l-4 border-black/10 dark:border-[#00ff82]/40 bg-black/5 dark:bg-white/5 text-[10px] cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${isMe ? "bg-black/10" : "bg-zinc-100"}`}
                            >
                              <div className="flex items-center gap-1.5 font-bold uppercase tracking-tight mb-0.5 opacity-70">
                                <Reply className="w-2.5 h-2.5" />
                                <span>REPLY_REF</span>
                              </div>
                              <p className="opacity-60 truncate">
                                {messages.find((m) => m.id === msg.replyToId)
                                  ?.content || "TRANSMISSION_DATA"}
                              </p>
                            </div>
                          )}
                          <div className="flex flex-wrap items-end gap-x-4 gap-y-1 min-w-[60px]">
                            <p className="text-[13.5px] whitespace-pre-wrap break-words flex-1 leading-relaxed">
                              {msg.content}
                            </p>
                            <div className="flex items-center gap-1 shrink-0 mb-0.5">
                              {msg.isEdited && (
                                <span className="text-[8px] opacity-70 uppercase font-bold">
                                  Edited
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-mono ${isMe ? "text-black/60" : "text-zinc-500"}`}
                              >
                                {new Date(msg.createdAt).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Hover Actions */}
                          {!selectionMode && !msg.isDeleted && (
                            <div
                              className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "right-full mr-2" : "left-full ml-2"} opacity-0 group-hover/msg:opacity-100 transition-all flex gap-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-xl p-1 z-20 scale-95 group-hover/msg:scale-100`}
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
                                    if (socket && user)
                                      socket.emit("delete_message", {
                                        messageId: msg.id,
                                        userId: user.id,
                                      });
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
                })}
                {!loading && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500 opacity-30 mt-10">
                    <ShieldCheck className="w-10 h-10 mb-2" />
                    <p className="text-[10px] font-mono tracking-widest">
                      IDENTITY_VERIFIED // SECURE_LINE
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {selectionMode && (
        <div className="p-3 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setSelectionMode(false);
                setSelectedMsgIds(new Set());
              }}
            >
              <X className="w-4 h-4" />
            </Button>
            <span className="text-xs font-bold">
              {selectedMsgIds.size} SELECTED
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
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
              <Copy className="w-4 h-4 mr-1" /> Copy
            </Button>
            <Button
              size="sm"
              variant="ghost"
              color="danger"
              onPress={handleDeleteMessages}
            >
              <Trash2 className="w-4 h-4" /> Delete
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
