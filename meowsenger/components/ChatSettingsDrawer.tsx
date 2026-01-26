import { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  Settings,
  Shield,
  Eye,
  EyeOff,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
// import {
//   Sheet,
//   SheetContent,
//   SheetHeader,
//   SheetBody,
//   SheetFooter,
// } from "@/components/ui/Sheet"; // Assuming we have such components or using Modal
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { ContactPicker, type Contact } from "@/components/ContactPicker";

// Note: Reusing Modal components if Sheet is not available, or custom Drawer
// For this quick implementation, let's use a fixed overlay drawer using standard HTML/CSS if UI components missing
// Or better, stick to the design system. I'll use a standard absolute positioned div for the drawer if Sheet doesn't exist.
// Checking previous files, I see "components/ui/Modal" but no Sheet. I'll use a custom slide-over.

export function ChatSettingsDrawer({
  isOpen,
  onClose,
  chatId,
  chatDetails,
}: {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatDetails: any;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "members" | "requests" | "settings"
  >("members");
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const [members, setMembers] = useState<any[]>([]); // To manage locally if needed
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  useEffect(() => {
    if (isOpen && activeTab === "requests") {
      fetchRequests();
    }
    if (isOpen && activeTab === "settings" && !inviteCode) {
      fetchInvite();
    }
    if (
      isOpen &&
      activeTab === "members" &&
      showAddMembers &&
      contacts.length === 0
    ) {
      fetchContacts();
    }
  }, [isOpen, activeTab, showAddMembers, inviteCode]);

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/requests`, {
        headers: { "x-user-id": user?.id || "" },
      });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const res = await fetch("/api/contacts", {
        headers: { "x-user-id": user?.id || "" },
      });
      const data = await res.json();
      // Filter out users already in the chat
      const existingMemberIds =
        chatDetails?.participants?.map((p: any) => p.userId) || [];
      const availableContacts = (data.contacts || [])
        .filter((c: any) => !existingMemberIds.includes(c.id))
        .map((c: any) => ({
          id: c.id,
          username: c.username,
          publicKey: c.publicKey,
        }));
      setContacts(availableContacts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedContacts.length === 0) return;
    setAddingMembers(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/participants`, {
        method: "POST",
        headers: {
          "x-user-id": user?.id || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ participantIds: selectedContacts }),
      });
      const data = await res.json();
      if (res.ok) {
        // Reset state
        setSelectedContacts([]);
        setShowAddMembers(false);

        // Notify about skipped users
        if (data.skippedUsers && data.skippedUsers.length > 0) {
          const skippedNames = data.skippedUsers
            .map((u: any) => u.username)
            .join(", ");
          alert(
            `Added ${data.addedCount} members. Some users were skipped (either already in chat or have disabled auto-add): ${skippedNames}`,
          );
        }

        // Reload the page to show new members
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingMembers(false);
    }
  };

  const handleRequestAction = async (
    requestId: string,
    action: "APPROVE" | "REJECT",
  ) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/requests`, {
        method: "PUT",
        headers: {
          "x-user-id": user?.id || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInvite = async () => {
    setLoadingInvite(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/invite`, {
        headers: { "x-user-id": user?.id || "" },
      });
      const data = await res.json();
      setInviteCode(data.inviteCode);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleGenerateInvite = async () => {
    setLoadingInvite(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/invite`, {
        method: "POST",
        headers: { "x-user-id": user?.id || "" },
      });
      const data = await res.json();
      setInviteCode(data.inviteCode);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInvite(false);
    }
  };

  const copyInviteLink = () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    alert("Invite link copied to clipboard!");
  };

  // derived admin status
  const myRole = chatDetails?.participants?.find(
    (p: any) => p.userId === user?.id,
  )?.role;
  const isAdmin = myRole === "ADMIN" || myRole === "OWNER";
  const isOwner = myRole === "OWNER";

  if (!isOpen) return null;

  const handlePromote = async (targetUserId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/participants`, {
        method: "PUT",
        headers: {
          "x-user-id": user?.id || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUserId, role: "ADMIN" }),
      });
      if (res.ok) {
        alert("Member promoted to Admin");
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDemote = async (targetUserId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/participants`, {
        method: "PUT",
        headers: {
          "x-user-id": user?.id || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetUserId, role: "MEMBER" }),
      });
      if (res.ok) {
        alert("Admin demoted to Member");
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      const res = await fetch(`/api/chats/${chatId}/participants`, {
        method: "DELETE",
        headers: {
          "x-user-id": user?.id || "",
        },
      });
      if (res.ok) {
        window.location.href = "/chat";
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVisibilityToggle = async () => {
    const newVisibility =
      chatDetails.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    try {
      const res = await fetch(`/api/chats/${chatId}/settings`, {
        method: "PUT",
        headers: {
          "x-user-id": user?.id || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ visibility: newVisibility }),
      });
      if (res.ok) {
        // Notify parent or trigger refresh
        // For now, let's assume parent re-fetches or we force a reload
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <h2 className="font-bold text-lg">Transmission Data</h2>
        <button onClick={onClose} className="text-zinc-500 hover:text-red-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === "members" ? "text-[#00ff82] border-b-2 border-[#00ff82]" : "text-zinc-500"}`}
        >
          Members
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === "requests" ? "text-[#00ff82] border-b-2 border-[#00ff82]" : "text-zinc-500"}`}
          >
            Requests
          </button>
        )}
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === "settings" ? "text-[#00ff82] border-b-2 border-[#00ff82]" : "text-zinc-500"}`}
        >
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "members" && (
          <div className="space-y-3">
            {/* Add Members Button */}
            {isAdmin && !showAddMembers && (
              <Button
                variant="bordered"
                color="primary"
                size="sm"
                className="w-full mb-3"
                onPress={() => setShowAddMembers(true)}
              >
                <UserPlus className="w-4 h-4" />
                Add Members
              </Button>
            )}

            {/* Add Members Section */}
            {showAddMembers && (
              <div className="mb-4 p-3 border border-[#00ff82]/20 rounded-lg bg-[#00ff82]/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#00ff82]">
                    Add Members
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddMembers(false);
                      setSelectedContacts([]);
                    }}
                    className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <ContactPicker
                  contacts={contacts}
                  selectedIds={selectedContacts}
                  onSelectionChange={setSelectedContacts}
                  multiSelect={true}
                  loading={loadingContacts}
                  maxHeight="200px"
                />

                <Button
                  color="primary"
                  size="sm"
                  className="w-full"
                  onPress={handleAddMembers}
                  isLoading={addingMembers}
                  disabled={selectedContacts.length === 0}
                >
                  Add {selectedContacts.length} Member
                  {selectedContacts.length !== 1 ? "s" : ""}
                </Button>
              </div>
            )}

            {/* Existing Members */}
            {chatDetails?.participants?.map((p: any) => (
              <div key={p.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar
                    name={p.user.username}
                    size="sm"
                    showAnimation={false}
                  />
                  <div>
                    <p className="text-sm font-bold">{p.user.username}</p>
                    <p className="text-[10px] text-zinc-500">{p.role}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {/* Promote to Admin (for members, admin can do this) */}
                  {isAdmin && p.role === "MEMBER" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[10px] h-6 px-2 text-[#00ff82]"
                      onPress={() => handlePromote(p.userId)}
                    >
                      <ChevronDown className="w-3 h-3 rotate-180" />
                      Promote
                    </Button>
                  )}
                  {/* Demote to Member (for admins, only owner can do this) */}
                  {isOwner && p.role === "ADMIN" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[10px] h-6 px-2 text-orange-500"
                      onPress={() => handleDemote(p.userId)}
                    >
                      <ChevronDown className="w-3 h-3" />
                      Demote
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="space-y-3">
            {loadingRequests && <Spinner size="sm" />}
            {!loadingRequests && requests.length === 0 && (
              <p className="text-zinc-500 text-xs text-center">
                No pending requests.
              </p>
            )}
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <Avatar name={req.user.username} size="sm" />
                  <span className="text-sm font-bold">{req.user.username}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    className="flex-1 h-7 text-xs"
                    onPress={() => handleRequestAction(req.id, "APPROVE")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="light"
                    className="flex-1 h-7 text-xs"
                    onPress={() => handleRequestAction(req.id, "REJECT")}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg flex justify-between items-center">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase">
                  Visibility
                </label>
                <p className="font-mono text-sm mt-1 text-[#00ff82]">
                  {chatDetails?.visibility}
                </p>
              </div>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="bordered"
                  onPress={handleVisibilityToggle}
                >
                  Switch to{" "}
                  {chatDetails?.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC"}
                </Button>
              )}
            </div>
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <label className="text-xs font-bold text-zinc-500 uppercase">
                Encryption
              </label>
              <p className="font-mono text-sm mt-1">E2EE_ACTIVE</p>
            </div>

            {/* Invite Section */}
            <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-500 uppercase">
                  Invite Link
                </label>
                {isAdmin && (
                  <button
                    onClick={handleGenerateInvite}
                    disabled={loadingInvite}
                    className="text-[10px] text-[#00ff82] hover:underline disabled:opacity-50"
                  >
                    {inviteCode ? "Refresh" : "Generate"}
                  </button>
                )}
              </div>

              {loadingInvite ? (
                <div className="flex justify-center py-2">
                  <Spinner size="sm" />
                </div>
              ) : inviteCode ? (
                <div className="space-y-2">
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-900 rounded font-mono text-[10px] break-all border border-zinc-200 dark:border-zinc-800">
                    {window.location.origin}/join/{inviteCode}
                  </div>
                  <Button
                    size="sm"
                    className="w-full text-[10px] h-8"
                    onPress={copyInviteLink}
                  >
                    Copy Link
                  </Button>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500 italic">
                  No invite link generated yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 space-y-2">
        <Button
          color="danger"
          variant="bordered"
          className="w-full"
          onPress={handleLeaveGroup}
        >
          <LogOut className="w-4 h-4" />
          Leave Group
        </Button>
        <Button
          color="danger"
          variant="light"
          className="w-full"
          onPress={onClose}
        >
          Close Panel
        </Button>
      </div>
    </div>
  );
}
