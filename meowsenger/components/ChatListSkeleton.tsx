"use client";

import React from "react";

export function ChatListSkeleton() {
  return (
    <div className="flex flex-col gap-1 w-full p-2">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 animate-pulse"
        >
          {/* Avatar Skeleton */}
          <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />

          {/* Content Skeleton */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              {/* Name */}
              <div
                className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded"
                style={{ width: `${Math.random() * 30 + 30}%` }}
              />
              {/* Timestamp */}
              <div className="h-3 w-8 bg-zinc-200/50 dark:bg-zinc-800/50 rounded" />
            </div>

            {/* Last Message Preview */}
            <div
              className="h-3 bg-zinc-200/50 dark:bg-zinc-800/30 rounded"
              style={{ width: `${Math.random() * 40 + 40}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
