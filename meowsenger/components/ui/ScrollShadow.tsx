import * as React from "react";
import { cn } from "@/lib/utils";

const ScrollShadow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("overflow-auto custom-scrollbar", className)}
      {...props}
    >
      {children}
    </div>
  );
});
ScrollShadow.displayName = "ScrollShadow";

export { ScrollShadow };
