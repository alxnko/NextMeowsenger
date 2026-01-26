"use client";

import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalContent,
} from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Avatar } from "./ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { SecurityNote } from "./ui/SecurityNote";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.username || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [allowAutoGroupAdd, setAllowAutoGroupAdd] = useState(
    user?.allowAutoGroupAdd ?? true,
  );
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );

  // Check username availability with debounce
  useEffect(() => {
    if (!username || username === user?.username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/check-username?username=${encodeURIComponent(username)}`,
          {
            headers: { "x-user-id": user?.id || "" },
          },
        );
        const data = await res.json();
        setUsernameAvailable(data.available);
      } catch (e) {
        console.error(e);
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username, user?.username, user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ username, allowAutoGroupAdd }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      // Update local storage to persist changes across reload
      const storedUser = localStorage.getItem("meowsenger_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        const updated = { ...parsed, username, allowAutoGroupAdd };
        localStorage.setItem("meowsenger_user", JSON.stringify(updated));
      }

      setSuccess("Profile updated successfully!");
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    if (user?.publicKey) {
      navigator.clipboard.writeText(user.publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose}>
      <ModalContent>
        {({ onClose }: { onClose: () => void }) => (
          <>
            <ModalHeader className="border-b-0 pb-0">
              <div className="flex items-center gap-2">
                <Settings className="text-[#00ff82] w-5 h-5" />
                <span className="font-bold tracking-tight text-xl uppercase">
                  Settings
                </span>
              </div>
            </ModalHeader>

            <ModalBody>
              <form
                id="settings-form"
                onSubmit={handleSave}
                className="space-y-6"
              >
                <div className="flex flex-col items-center justify-center py-4 relative group">
                  <div className="absolute inset-0 bg-linear-to-b from-[#00ff82]/5 to-transparent rounded-full blur-3xl opacity-50" />
                  <Avatar
                    name={username || user?.username}
                    size="lg"
                    className="w-24 h-24 text-3xl border-4 border-[#00ff82]/20 shadow-[0_0_30px_rgba(0,255,130,0.1)] mb-4 animate-scaleIn"
                  />
                  <div
                    className="text-center animate-fadeIn"
                    style={{ animationDelay: "100ms" }}
                  >
                    <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest block mb-1">
                      Current Identity
                    </span>
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                      {user?.username}
                    </h3>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-[#00ff82] tracking-wider flex items-center gap-2">
                      <span>Display Name</span>
                      <span className="h-px bg-[#00ff82]/20 flex-1"></span>
                    </label>
                    <div className="relative">
                      <Input
                        value={username}
                        onChange={(e: any) => setUsername(e.target.value)}
                        placeholder="Enter new username"
                        minLength={3}
                        className="font-bold tracking-tight transition-all duration-200 pr-10"
                      />
                      {/* Availability Indicator */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {checkingUsername && (
                          <span className="text-xs text-zinc-400 animate-pulse">
                            ...
                          </span>
                        )}
                        {!checkingUsername && usernameAvailable === true && (
                          <span className="text-xs text-[#00ff82] font-bold">
                            ✓
                          </span>
                        )}
                        {!checkingUsername && usernameAvailable === false && (
                          <span className="text-xs text-red-500 font-bold">
                            ✗
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 pl-1">
                      {usernameAvailable === false && (
                        <span className="text-red-500">
                          Username already taken.{" "}
                        </span>
                      )}
                      {usernameAvailable === true &&
                        username !== user?.username && (
                          <span className="text-[#00ff82]">
                            Username available!{" "}
                          </span>
                        )}
                      Visible to all secured contacts.
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                          Auto Group Addition
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Allow others to add you to groups automatically
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAllowAutoGroupAdd(!allowAutoGroupAdd)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${allowAutoGroupAdd ? "bg-[#00ff82]" : "bg-zinc-300 dark:bg-zinc-700"}`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${allowAutoGroupAdd ? "left-5.5" : "left-0.5"}`}
                        ></div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>Public Identity Key</span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] border border-zinc-200 dark:border-zinc-700">
                          READ-ONLY
                        </span>
                      </div>
                      {copied ? (
                        <span className="text-[#00ff82] animate-pulse text-[10px]">
                          ✓ COPIED
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={copyKey}
                          className="hover:text-[#00ff82] transition-all duration-200 cursor-pointer text-[10px] hover:scale-105"
                        >
                          COPY
                        </button>
                      )}
                    </label>
                    <div
                      className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[10px] break-all text-zinc-400 select-all shadow-inner h-24 overflow-y-auto custom-scrollbar relative group cursor-pointer hover:border-zinc-700 transition-colors"
                      onClick={copyKey}
                    >
                      {user?.publicKey || "UNKNOWN_KEY"}
                      <div className="absolute inset-0 pointer-events-none bg-linear-to-b from-transparent via-transparent to-black/20" />
                    </div>
                  </div>
                </div>

                {error && (
                  <SecurityNote type="error" title="Profile Error">
                    {error}
                  </SecurityNote>
                )}

                {success && (
                  <SecurityNote type="success">{success}</SecurityNote>
                )}
              </form>
            </ModalBody>

            <ModalFooter className="border-zinc-100 dark:border-zinc-800">
              <Button
                variant="ghost"
                onPress={onClose}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                form="settings-form"
                color="primary"
                className="font-bold shadow-[0_0_15px_rgba(0,255,130,0.2)]"
                disabled={
                  loading ||
                  (username === user?.username &&
                    allowAutoGroupAdd === user?.allowAutoGroupAdd) ||
                  usernameAvailable === false ||
                  checkingUsername
                }
              >
                {loading ? (
                  <span className="animate-pulse">UPDATING...</span>
                ) : (
                  "SAVE"
                )}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
