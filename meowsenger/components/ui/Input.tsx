import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  variant?: "default" | "bordered";
  description?: string;
  error?: string;
  endContent?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      variant = "default",
      description,
      error,
      endContent,
      ...props
    },
    ref,
  ) => {
    const inputId = React.useId();

    return (
      <div className="flex flex-col gap-1.5 w-full relative">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1 transition-colors duration-200"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm",
            "ring-offset-white dark:ring-offset-black",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-zinc-500 dark:placeholder:text-zinc-400",
            "text-zinc-900 dark:text-zinc-100",
            "transition-all duration-200 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff82] focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Default state
            !error && "border-zinc-200 dark:border-zinc-800 dark:bg-black",
            !error && "hover:border-zinc-300 dark:hover:border-zinc-700",
            // Error state
            error && "border-red-500 focus-visible:ring-red-500 animate-shake",
            // Variant
            variant === "bordered" && "border-2",
          )}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${inputId}-error`
              : description
                ? `${inputId}-desc`
                : undefined
          }
          {...props}
        />
        {endContent && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            {endContent}
          </div>
        )}
        {description && !error && (
          <p
            id={`${inputId}-desc`}
            className="text-[13px] text-zinc-500 dark:text-zinc-400 px-1 italic"
          >
            {description}
          </p>
        )}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-[13px] text-red-500 px-1 font-medium animate-fadeIn"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
