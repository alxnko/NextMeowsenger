import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "light"
    | "shadow"
    | "bordered";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
  onPress?: () => void;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      isLoading,
      onPress,
      children,
      ...props
    },
    ref,
  ) => {
    const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
      default:
        "bg-[#00ff82] text-black hover:bg-[#00e676] hover:shadow-lg hover:shadow-[#00ff82]/25",
      destructive:
        "bg-red-500 text-white hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/25",
      outline:
        "border border-zinc-200 bg-transparent hover:bg-zinc-100 hover:border-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:border-zinc-700",
      secondary:
        "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
      ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:scale-105",
      link: "text-[#00ff82] underline-offset-4 hover:underline",
      light: "hover:bg-zinc-100 dark:hover:bg-zinc-800 bg-transparent",
      shadow:
        "bg-[#00ff82] text-black shadow-lg shadow-[#00ff82]/20 hover:bg-[#00e676] hover:shadow-xl hover:shadow-[#00ff82]/30",
      bordered:
        "border-2 border-[#00ff82] bg-transparent text-[#00ff82] hover:bg-[#00ff82]/10 hover:shadow-lg hover:shadow-[#00ff82]/20",
    };

    const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    };

    const baseStyles = cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
      "transition-all duration-200 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff82] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black",
      "disabled:pointer-events-none disabled:opacity-50",
      "active:scale-[0.97]",
    );

    return (
      <button
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          isLoading && "cursor-wait",
          className,
        )}
        ref={ref}
        disabled={isLoading || props.disabled}
        onClick={(e) => {
          if (onPress) onPress();
          if (props.onClick) props.onClick(e);
        }}
        {...props}
      >
        {isLoading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button };
