import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "premium";
  animate?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", animate = true, ...props }, ref) => {
    const variants: Record<NonNullable<CardProps["variant"]>, string> = {
      default: cn(
        "rounded-lg border border-zinc-200 bg-white text-zinc-950 shadow-sm",
        "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50",
        "transition-all duration-300",
        "hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700",
      ),
      premium: cn(
        "rounded-2xl border border-[#00ff82]/10 bg-zinc-900/40 text-white backdrop-blur-xl",
        "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        "transition-all duration-500 group overflow-hidden",
        "hover:border-[#00ff82]/30 hover:shadow-[0_0_30px_rgba(0,255,130,0.1)]",
        "hover:-translate-y-1",
      ),
    };

    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
          animate && "animate-fadeIn",
          className,
        )}
        {...props}
      />
    );
  },
);

Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));

CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));

CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)}
    {...props}
  />
));

CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props} />
));

CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));

CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent as CardBody,
};
