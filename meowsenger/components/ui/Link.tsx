import NextLink from "next/link";
import { cn } from "@/lib/utils";
import React from "react";

export const Link = ({ href, children, className, ...props }: any) => {
  return (
    <NextLink
      href={href}
      className={cn("text-[#00ff82] hover:underline", className)}
      {...props}
    >
      {children}
    </NextLink>
  );
};
