import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className,
  size = "md",
  showText = true,
}) => {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-6xl",
  };

  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <div
        className={cn(
          "font-black italic tracking-tighter text-[#00ff82] transition-all hover:scale-105",
          sizeClasses[size],
        )}
      >
        MEOWSENGER
      </div>
    </div>
  );
};
