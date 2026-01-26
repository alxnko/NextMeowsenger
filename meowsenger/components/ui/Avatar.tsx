import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  showAnimation?: boolean;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    { className, name, src, size = "md", showAnimation = true, ...props },
    ref,
  ) => {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const [hasError, setHasError] = React.useState(false);

    const sizeMap = {
      sm: "h-8 w-8 text-xs",
      md: "h-10 w-10 text-sm",
      lg: "h-12 w-12 text-base",
    };

    const showFallback = !src || hasError;

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center font-bold",
          "transition-all duration-200 hover:ring-2 hover:ring-[#00ff82]/30",
          showAnimation && "animate-scaleIn",
          sizeMap[size],
          className,
        )}
        {...props}
      >
        {!showFallback && (
          <>
            {/* Shimmer loading state */}
            {!isLoaded && (
              <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-700 animate-shimmer" />
            )}
            <img
              src={src}
              className={cn(
                "aspect-square h-full w-full object-cover transition-opacity duration-300",
                isLoaded ? "opacity-100" : "opacity-0",
              )}
              alt={name || "Avatar"}
              onLoad={() => setIsLoaded(true)}
              onError={() => setHasError(true)}
            />
          </>
        )}
        {showFallback && (
          <span className="text-zinc-500 select-none">
            {name?.slice(0, 2).toUpperCase() || "?"}
          </span>
        )}
      </div>
    );
  },
);

Avatar.displayName = "Avatar";

export { Avatar };
