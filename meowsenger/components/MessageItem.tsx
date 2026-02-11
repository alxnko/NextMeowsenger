import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Check, Edit3, Forward, Reply, Trash2 } from "lucide-react";
import { memo } from "react";

// Define minimal interfaces to avoid circular dependencies or complex types
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

interface User {
  id: string;
}

interface ChatDetails {
  participants?: {
    userId: string;
    role?: string;
    user: {
      username: string;
    };
  }[];
  membershipStatus?: string;
  visibility?: string;
  type?: string;
}

interface MessageItemProps {
  msg: Message;
  user: User | null;
  isFirstInGroup: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  activeMessageId: string | null;
  chatDetails: ChatDetails | null;
  replyMessage?: Message;
  replySenderName?: string;
  onToggleSelection: (id: string) => void;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onJumpToMessage: (id: string) => void;
  onContextMenu: (id: string) => void;
}

const MessageItem = memo(
  ({
    msg,
    user,
    isFirstInGroup,
    isSelected,
    selectionMode,
    activeMessageId,
    chatDetails,
    replyMessage,
    replySenderName,
    onToggleSelection,
    onReply,
    onEdit,
    onDelete,
    onJumpToMessage,
    onContextMenu,
  }: MessageItemProps) => {
    const isMe = msg.senderId === user?.id;

    // msg.createdAt is Date
    const createdAtDate = new Date(msg.createdAt);

    return (
      <div
        className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2 group/msg relative animate-slideInUp select-none ${
          !isFirstInGroup ? "mt-0.5" : "mt-4"
        }`}
        style={{
          animationFillMode: "forwards",
        }}
      >
        {selectionMode && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "right-full mr-4" : "left-full ml-4"} z-20`}
          >
            <div
              onClick={() => onToggleSelection(msg.id)}
              className={`w-5 h-5 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all ${isSelected ? "bg-[#00ff82] border-[#00ff82]" : "border-zinc-300 dark:border-zinc-700 hover:border-[#00ff82]"}`}
            >
              {isSelected && <Check className="w-3 h-3 text-black" />}
            </div>
          </div>
        )}

        {!isMe && isFirstInGroup ? (
          <Avatar
            name={
              chatDetails?.participants?.find((p: any) => p.userId === msg.senderId)
                ?.user?.username || "?"
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
                onToggleSelection(msg.id);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (selectionMode) return;
              onContextMenu(msg.id);
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
                  if (msg.replyToId) onJumpToMessage(msg.replyToId);
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
                  <span className={isMe ? "text-black/90" : "opacity-70"}>
                    {replySenderName || "Unknown"}
                  </span>
                </div>
                <p
                  className={`truncate text-xs ${isMe ? "text-black/80 font-medium" : "opacity-60"}`}
                >
                  {replyMessage?.content || "TRANSMISSION_DATA"}
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
                  {createdAtDate.toLocaleTimeString([], {
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
                  onPress={() => onReply(msg)}
                >
                  <Reply className="w-3.5 h-3.5" />
                </Button>
                {isMe && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-[#00ff82]"
                    onPress={() => onEdit(msg)}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                )}
                {(isMe ||
                  chatDetails?.participants?.find((p: any) => p.userId === user?.id)
                    ?.role !== "MEMBER") && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                    onPress={() => onDelete(msg)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-[#00ff82]"
                  onPress={() => onToggleSelection(msg.id)}
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

MessageItem.displayName = "MessageItem";

export default MessageItem;
