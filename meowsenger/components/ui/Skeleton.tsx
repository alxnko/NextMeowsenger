"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-zinc-200 dark:bg-zinc-800 animate-pulseGlow rounded-md",
        className,
      )}
      {...props}
    />
  );
}
