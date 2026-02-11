"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface Contact {
  id: string;
  username: string;
  publicKey?: string;
}

export interface ContactPickerProps {
  /** Array of available contacts */
  contacts: Contact[];
  /** Array of selected contact IDs */
  selectedIds: string[];
  /** Callback when selection changes */
  onSelectionChange: (selectedIds: string[]) => void;
  /** Whether to allow multiple selection */
  multiSelect?: boolean;
  /** Show loading state */
  loading?: boolean;
  /** Custom placeholder for search */
  searchPlaceholder?: string;
  /** Maximum height of the contacts list */
  maxHeight?: string;
  /** Custom className */
  className?: string;
}

interface ContactItemProps {
  contact: Contact;
  isSelected: boolean;
  onToggle: (id: string) => void;
  index: number;
}

const ContactItem = React.memo(({ contact, isSelected, onToggle, index }: ContactItemProps) => {
  return (
    <button
      onClick={() => onToggle(contact.id)}
      className={cn(
        "w-full flex items-center justify-between gap-3 p-3 rounded-lg",
        "transition-all duration-200 text-left group",
        "animate-fadeIn",
        isSelected
          ? "bg-[#00ff82]/10 border border-[#00ff82]/30"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-[1.01]",
      )}
      style={{
        animationDelay: `${Math.min(index * 30, 200)}ms`,
        opacity: 0,
        animationFillMode: "forwards",
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar
          name={contact.username}
          size="sm"
          showAnimation={false}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {contact.username}
          </p>
          {contact.publicKey && (
            <p className="text-[10px] text-zinc-500 truncate font-mono">
              Key: {contact.publicKey.slice(0, 16)}...
            </p>
          )}
        </div>
      </div>

      {/* Selection Indicator */}
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
          "transition-all duration-200 shrink-0",
          isSelected
            ? "bg-[#00ff82] border-[#00ff82] scale-100"
            : "border-zinc-300 dark:border-zinc-600 scale-90 group-hover:scale-100",
        )}
      >
        {isSelected && <Check className="w-3 h-3 text-black" />}
      </div>
    </button>
  );
});
ContactItem.displayName = "ContactItem";

export function ContactPicker({
  contacts,
  selectedIds,
  onSelectionChange,
  multiSelect = true,
  loading = false,
  searchPlaceholder = "Search contacts...",
  maxHeight = "300px",
  className,
}: ContactPickerProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredContacts = React.useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter((contact) =>
      contact.username.toLowerCase().includes(query),
    );
  }, [contacts, searchQuery]);

  // Use refs to store latest values for callbacks to avoid recreating handleToggle
  const selectedIdsRef = React.useRef(selectedIds);
  const onSelectionChangeRef = React.useRef(onSelectionChange);

  // Update refs on every render
  React.useEffect(() => {
    selectedIdsRef.current = selectedIds;
    onSelectionChangeRef.current = onSelectionChange;
  });

  const handleToggle = React.useCallback((contactId: string) => {
    const currentSelectedIds = selectedIdsRef.current;
    const currentOnSelectionChange = onSelectionChangeRef.current;

    if (multiSelect) {
      const newSelection = currentSelectedIds.includes(contactId)
        ? currentSelectedIds.filter((id) => id !== contactId)
        : [...currentSelectedIds, contactId];
      currentOnSelectionChange(newSelection);
    } else {
      currentOnSelectionChange([contactId]);
    }
  }, [multiSelect]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Search Input */}
      <Input
        placeholder={searchPlaceholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full"
      />

      {/* Contacts List */}
      <div
        className={cn(
          "overflow-y-auto overflow-x-hidden custom-scrollbar",
          "border border-zinc-200 dark:border-zinc-800 rounded-lg p-2",
          "space-y-1",
        )}
        style={{ maxHeight }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" color="primary" />
          </div>
        ) : filteredContacts.length > 0 ? (
          filteredContacts.map((contact, index) => (
            <ContactItem
              key={contact.id}
              contact={contact}
              isSelected={selectedIds.includes(contact.id)}
              onToggle={handleToggle}
              index={index}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
            <p className="text-sm">
              {searchQuery.trim()
                ? "No contacts match your search"
                : "No contacts available"}
            </p>
          </div>
        )}
      </div>

      {/* Selected Count */}
      {multiSelect && selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-[#00ff82]/5 border border-[#00ff82]/20 rounded-lg">
          <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {selectedIds.length} contact{selectedIds.length !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <button
            onClick={() => onSelectionChange([])}
            className="text-xs text-[#00ff82] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
