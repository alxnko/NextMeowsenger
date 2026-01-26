import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "white" | "muted";
  glow?: boolean;
}

export function Spinner({
  className,
  size = "md",
  color = "primary",
  glow = false,
  ...props
}: SpinnerProps) {
  const sizeMap: Record<NonNullable<SpinnerProps["size"]>, string> = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  const colorMap: Record<NonNullable<SpinnerProps["color"]>, string> = {
    primary: "border-[#00ff82] border-t-transparent",
    white: "border-white border-t-transparent",
    muted: "border-zinc-400 border-t-transparent dark:border-zinc-500",
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block rounded-full animate-spin",
        sizeMap[size],
        colorMap[color],
        glow && "shadow-[0_0_15px_rgba(0,255,130,0.5)]",
        className,
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
