import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityNoteProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  type?: "warning" | "error" | "success";
}

export const SecurityNote: React.FC<SecurityNoteProps> = ({
  children,
  title,
  className,
  type = "warning",
}) => {
  const configs = {
    warning: {
      icon: AlertCircle,
      color: "text-yellow-500",
      bg: "from-yellow-500/10",
      defaultTitle: "Security Protocol",
    },
    error: {
      icon: XCircle,
      color: "text-red-500",
      bg: "from-red-500/10",
      defaultTitle: "System Error",
    },
    success: {
      icon: CheckCircle2,
      color: "text-[#00ff82]",
      bg: "from-[#00ff82]/10",
      defaultTitle: "Operation Success",
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex gap-3 bg-zinc-900/50 border border-zinc-800 p-4 my-2 rounded-xl relative overflow-hidden group/note",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-r to-transparent opacity-0 group-hover/note:opacity-100 transition-opacity duration-500",
          config.bg,
        )}
      />
      <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.color)} />
      <div className="flex flex-col gap-1 relative z-10">
        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            config.color,
          )}
        >
          {title || config.defaultTitle}
        </span>
        <div className="text-[11px] text-zinc-400 leading-relaxed font-medium">
          {children}
        </div>
      </div>
    </div>
  );
};
