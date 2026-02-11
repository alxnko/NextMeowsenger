"use client";

import { useState, useLayoutEffect, useCallback, useMemo } from "react";
import MessageItem from "@/components/MessageItem";

// Mock data
const generateMessages = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    senderId: i % 2 === 0 ? "me" : "other",
    content: `This is message ${i} with some content to simulate rendering complexity. It might be long or short.`,
    createdAt: new Date(Date.now() - (count - i) * 60000), // Changed to Date object
    isDeleted: false,
    isEdited: i % 10 === 0,
    isForwarded: i % 20 === 0,
    replyToId: i > 5 && i % 5 === 0 ? `msg-${i - 5}` : undefined,
  }));
};

const initialMessages = generateMessages(2000);

// Stable objects
const user = { id: "me" };
const chatDetails = { participants: [{ userId: "other", user: { username: "Other User" } }] };

export default function BenchmarkPage() {
  const [messages, setMessages] = useState(initialMessages);
  const [inputVal, setInputVal] = useState("");
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);

  useLayoutEffect(() => {
    // Measure render time
    const end = performance.now();

    if ((window as any).lastInputTime) {
        const duration = end - (window as any).lastInputTime;
        (window as any).renderTimes = (window as any).renderTimes || [];
        (window as any).renderTimes.push(duration);
        console.log(`Render duration: ${duration}ms`);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    (window as any).lastInputTime = performance.now();
    setInputVal(e.target.value);
  };

  const handleToggleSelection = useCallback((msgId: string) => {
    setSelectedMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }, []);

  const handleReply = useCallback((msg: any) => {
    setReplyingTo(msg);
  }, []);

  const handleEdit = useCallback((msg: any) => {
    setEditingMsg(msg);
    setInputVal(msg.content);
  }, []);

  const handleDelete = useCallback((msg: any) => {
    console.log("Delete", msg.id);
  }, []);

  const handleJumpToMessage = useCallback((msgId: string) => {
    console.log("Jump to", msgId);
  }, []);

  const handleContextMenu = useCallback((msgId: string) => {
    setActiveMessageId(msgId);
  }, []);


  return (
    <div className="flex flex-col h-screen w-full bg-zinc-50 dark:bg-black overflow-hidden">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">Benchmark Page (Optimized)</h1>
        <input
          className="border p-2 rounded w-full"
          value={inputVal}
          onChange={handleInputChange}
          placeholder="Type here to trigger re-renders..."
        />
        <div className="mt-2 text-sm text-gray-500">
          Open console to see render times.
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
        {messages.map((msg, index) => {
          const isFirstInGroup =
            index === 0 || messages[index - 1].senderId !== msg.senderId;
          const isSelected = selectedMsgIds.has(msg.id);

          const replyMessage = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : undefined;
          const replySenderName = replyMessage ? (replyMessage.senderId === "me" ? "Me" : "Other User") : undefined;

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
        })}
      </div>
    </div>
  );
}
