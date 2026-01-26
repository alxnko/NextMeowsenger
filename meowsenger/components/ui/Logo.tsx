```typescript
import React from "react";
import { Zap } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
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
      <span
        className={cn(
          "font-bold text-xl tracking-tighter text-black dark:text-white uppercase",
          sizeClasses[size],
        )}
      >
        {siteConfig.name}
      </span>
    </div>
  );
};
