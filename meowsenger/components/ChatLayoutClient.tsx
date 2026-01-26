"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export function ChatLayoutClient({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isChatOpen = pathname?.includes("/chat/") && pathname !== "/chat";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar: Hidden on mobile if chat is open */}
      <div
        className={`
          w-full md:w-80 border-r border-default-100 bg-background/50 backdrop-blur-md flex-shrink-0
          ${isChatOpen ? "hidden md:flex" : "flex"}
          flex-col
        `}
      >
        {sidebar}
      </div>

      {/* Main Content: Hidden on mobile if chat is NOT open */}
      <div
        className={`
          flex-1 bg-content1/50 flex flex-col relative
          ${!isChatOpen ? "hidden md:flex" : "flex"}
        `}
      >
        {children}
      </div>
    </div>
  );
}
