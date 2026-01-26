"use client";

import React from "react";

export function MessageListSkeleton() {
  // Mock grouping: [items count, isMe]
  const groups = [
    { count: 2, isMe: true },
    { count: 1, isMe: false },
    { count: 3, isMe: true },
    { count: 2, isMe: false },
  ];

  return (
    <div className="flex flex-col p-4 w-full h-full overflow-hidden">
      {groups.map((group, groupIdx) => (
        <div key={groupIdx} className="flex flex-col mb-4">
          {Array.from({ length: group.count }).map((_, i) => {
            const isFirst = i === 0;
            const isLast = i === group.count - 1;
            // Realistic randomized width between 40% and 80%
            const width = 40 + (Math.sin(groupIdx * 10 + i) * 20 + 20);

            return (
              <div
                key={i}
                className={`flex items-start gap-2 animate-pulse ${
                  group.isMe ? "justify-end" : "justify-start"
                } ${isLast ? "mb-0" : "mb-1"}`}
              >
                {/* Avatar: Only for first message in 'Other' group */}
                {!group.isMe && (
                  <div className="w-8 shrink-0">
                    {isFirst ? (
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    ) : null}
                  </div>
                )}

                <div
                  className={`flex flex-col max-w-[85%] ${
                    group.isMe ? "items-end" : "items-start"
                  }`}
                  style={{ width: `${width}%` }}
                >
                  <div
                    className={`h-9 w-full rounded-2xl ${
                      group.isMe
                        ? "bg-[#00ff82]/20 dark:bg-[#00ff82]/10"
                        : "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
                    } ${
                      isFirst
                        ? group.isMe
                          ? "rounded-tr-none"
                          : "rounded-tl-none"
                        : ""
                    }`}
                  />
                  {/* Timestamp Placeholder */}
                  <div
                    className={`h-2 w-8 mt-1 rounded bg-zinc-200/50 dark:bg-zinc-800/50 ${
                      group.isMe ? "self-end" : "self-start"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
