"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/hooks/useSocket";
import { ContactPicker, type Contact } from "@/components/ContactPicker";
import { sendAutoInvite } from "@/utils/inviteActions";

export function NewChatModal({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const [selected, setSelected] = useState<string>("private");
  const [targetUsername, setTargetUsername] = useState<string | string[]>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [groupName, setGroupName] = useState("");
  const [channelDescription, setChannelDescription] = useState("");
  const [channelSlug, setChannelSlug] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isPublic, setIsPublic] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (
      selected === "private" &&
      targetUsername.length > 2 &&
      typeof targetUsername === "string"
    ) {
      const timeout = setTimeout(async () => {
        try {
          const res = await fetch(`/api/users?username=${targetUsername}`);
          const data = await res.json();
          setSearchResults(data.users || []);
        } catch (err) {
          console.error(err);
        }
      }, 300);
      return () => clearTimeout(timeout);
    } else if (selected === "group") {
      // Fetch contacts for group selection
      // Check if already fetched to avoid loop, or simple fetch once
      if (searchResults.length === 0) {
        if (currentUser?.id) {
          fetch("/api/contacts", {
            headers: { "x-user-id": currentUser.id },
          })
            .then((res) => res.json())
            .then((data) => {
              const contactList = (data.contacts || []).map((c: any) => ({
                id: c.id,
                username: c.username,
                publicKey: c.publicKey,
              }));
              setSearchResults(contactList);
              setContacts(contactList);
            })
            .catch(console.error);
        }
      }
    } else {
      setSearchResults([]);
    }
  }, [targetUsername, selected, searchResults.length]);

  const handleCreatePrivate = async (targetId: string) => {
    setError("");
    setLoading(true);
    try {
      const participantIds = [currentUser?.id, targetId];
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          type: "DIRECT",
          participantIds,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Notify participants via socket
      if (socket) {
        socket.emit("notify_new_chat", {
          participantIds,
          chat: data.chat,
        });
      }

      onOpenChange(false);
      router.push(`/chat/${data.chat.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setLoading(true);
    try {
      const participantIds = [
        currentUser?.id,
        ...(Array.isArray(targetUsername) ? targetUsername : []),
      ];
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          type: "GROUP",
          name: groupName,
          participantIds,
          isPublic,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Notify via socket
      if (socket) {
        socket.emit("notify_new_chat", {
          participantIds,
          chat: data.chat,
        });
      }

      onOpenChange(false);

      if (data.skippedUsers && data.skippedUsers.length > 0) {
        const skippedNames = data.skippedUsers
          .map((u: any) => u.username)
          .join(", ");

        let msg = `Group created! Note: ${skippedNames} could not be added automatically due to privacy settings.`;

        if (data.inviteCode) {
          // Auto-send invites
          let sentCount = 0;
          for (const skippedUser of data.skippedUsers) {
            const sent = await sendAutoInvite(
              socket,
              currentUser,
              skippedUser,
              groupName,
              data.inviteCode,
            );
            if (sent) sentCount++;
          }
          if (sentCount > 0) {
            msg += `\n\n✅ Automatically sent invite links to ${sentCount} user(s) via Direct Message.`;
            alert(msg);
          } else {
            // Fallback if auto-send fails
            msg += `\n\nHere is an invite link you can send them manually:`;
            const link = `${window.location.origin}/join/${data.inviteCode}`;
            setTimeout(() => window.prompt(msg, link), 500);
          }
        } else {
          alert(msg);
        }
      }

      router.push(`/chat/${data.chat.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!groupName.trim()) {
      setError("Channel name is required");
      return;
    }
    if (isPublic && !channelSlug.trim()) {
      setError("Slug is required for public channels");
      return;
    }
    
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": currentUser?.id || "",
        },
        body: JSON.stringify({
          type: "CHANNEL",
          name: groupName,
          description: channelDescription,
          isPublic,
          slug: isPublic ? channelSlug : null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      onOpenChange(false);
      router.push(`/chat/${data.chat.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {({ onClose }: { onClose: () => void }) => (
          <>
            <ModalHeader>Start New Conversation</ModalHeader>
            <ModalBody>
              <div className="flex w-full mb-4 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                {["private", "group", "channel"].map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelected(key);
                      setTargetUsername(key === "private" ? "" : []);
                      setGroupName("");
                      setChannelDescription("");
                      setChannelSlug("");
                      setError("");
                    }}
                    className={`
                            flex-1 text-sm font-medium py-1 px-2 rounded-md transition-all
                            ${selected === key ? "bg-[#00ff82] text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"}
                        `}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </button>
                ))}
              </div>

              {selected === "private" && (
                <div className="flex flex-col gap-4 py-2">
                  <Input
                    label="Search Username"
                    placeholder="Enter 3+ characters"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    variant="bordered"
                  />

                  <div className="max-h-[200px] overflow-y-auto space-y-2">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleCreatePrivate(u.id)}
                        className="w-full flex items-center gap-3 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all text-left group"
                      >
                        <Avatar name={u.username} size="sm" />
                        <div className="flex-1">
                          <p className="text-sm font-bold">{u.username}</p>
                          <p className="text-[10px] text-zinc-500">
                            Public Key: {u.publicKey.slice(0, 16)}...
                          </p>
                        </div>
                        <span className="text-[#00ff82] opacity-0 group-hover:opacity-100 transition-opacity">
                          Start →
                        </span>
                      </button>
                    ))}
                    {targetUsername.length > 2 &&
                      searchResults.length === 0 &&
                      !loading && (
                        <p className="text-center text-zinc-500 text-xs py-4">
                          No users found.
                        </p>
                      )}
                  </div>

                  <p className="text-[10px] text-zinc-400">
                    Start a secure, end-to-end encrypted chat with any user.
                  </p>
                </div>
              )}

              {selected === "group" && (
                <div className="flex flex-col gap-4 py-2">
                  <Input
                    label="Group Name"
                    placeholder="e.g. Project Alpha"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    variant="bordered"
                  />

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-zinc-500">
                      Select Members
                    </label>

                    <ContactPicker
                      contacts={contacts}
                      selectedIds={
                        Array.isArray(targetUsername) ? targetUsername : []
                      }
                      onSelectionChange={(ids) => setTargetUsername(ids as any)}
                      multiSelect={true}
                      loading={loading && contacts.length === 0}
                      maxHeight="200px"
                    />
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 border rounded-lg border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-medium">
                      Public Status (Visible to All)
                    </span>
                    <button
                      onClick={() => {
                        setIsPublic(!isPublic);
                      }}
                      className={`w-10 h-5 rounded-full relative transition-colors ${isPublic ? "bg-[#00ff82]" : "bg-zinc-300 dark:bg-zinc-700"}`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isPublic ? "left-5.5" : "left-0.5"}`}
                      ></div>
                    </button>
                  </div>
                </div>
              )}

              {selected === "channel" && (
                <div className="flex flex-col gap-4 py-2">
                  <Input
                    label="Channel Name"
                    placeholder="e.g. Tech News"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    variant="bordered"
                  />

                  <Input
                    label="Description (Optional)"
                    placeholder="What is this channel about?"
                    value={channelDescription}
                    onChange={(e) => setChannelDescription(e.target.value)}
                    variant="bordered"
                  />

                  <div className="flex items-center justify-between px-3 py-2 border rounded-lg border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-medium">
                      Public Channel
                    </span>
                    <button
                      onClick={() => {
                        setIsPublic(!isPublic);
                      }}
                      className={`w-10 h-5 rounded-full relative transition-colors ${isPublic ? "bg-[#00ff82]" : "bg-zinc-300 dark:bg-zinc-700"}`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${isPublic ? "left-5.5" : "left-0.5"}`}
                      ></div>
                    </button>
                  </div>

                  {isPublic && (
                    <Input
                      label="Channel Slug"
                      placeholder="e.g. tech-news"
                      value={channelSlug}
                      onChange={(e) => {
                        // Clean and format slug: lowercase, alphanumeric and hyphens only, no consecutive hyphens
                        let slug = e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '')
                          .replace(/--+/g, '-')
                          .replace(/^-+|-+$/g, '');
                        setChannelSlug(slug);
                      }}
                      variant="bordered"
                      description="Used in the channel URL: /c/your-slug"
                    />
                  )}

                  <p className="text-[10px] text-zinc-400">
                    {isPublic 
                      ? "Public channels can be discovered and subscribed to by anyone via the slug."
                      : "Private channels require approval from admins to join."}
                  </p>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="ghost" onPress={onClose}>
                Cancel
              </Button>
              {selected === "group" && (
                <Button isLoading={loading} onPress={handleCreateGroup}>
                  Create Group
                </Button>
              )}
              {selected === "channel" && (
                <Button isLoading={loading} onPress={handleCreateChannel}>
                  Create Channel
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
