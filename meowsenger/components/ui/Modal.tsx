import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface ModalContextValue {
  onClose: () => void;
}

const ModalContext = React.createContext<ModalContextValue>({
  onClose: () => {},
});

export function Modal({ isOpen, onOpenChange, children }: ModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);
  const previousIsOpen = React.useRef(isOpen);

  const onClose = React.useCallback(() => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsAnimatingOut(false);
      onOpenChange(false);
    }, 150); // Match exit animation duration
  }, [onOpenChange]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle escape key
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!mounted || (!isOpen && !isAnimatingOut)) return null;

  return createPortal(
    <ModalContext.Provider value={{ onClose }}>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop */}
        <div
          className={cn(
            "fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200",
            isAnimatingOut ? "opacity-0" : "opacity-100 animate-fadeIn",
          )}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Container */}
        <div
          className={cn(
            "relative w-full max-w-lg sm:max-w-2xl z-[101] my-auto",
            "transition-all duration-200 ease-out",
            isAnimatingOut
              ? "opacity-0 scale-95 translate-y-2"
              : "opacity-100 scale-100 translate-y-0 animate-scaleIn",
          )}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body,
  );
}

export interface ModalContentProps {
  children:
    | React.ReactNode
    | ((opts: { onClose: () => void }) => React.ReactNode);
  className?: string;
}

export function ModalContent({ children, className }: ModalContentProps) {
  const { onClose } = React.useContext(ModalContext);

  return (
    <div
      className={cn(
        "relative border bg-white dark:bg-zinc-950 p-6 shadow-2xl rounded-2xl w-full",
        "max-h-[90vh] overflow-y-auto custom-scrollbar",
        "border-zinc-200 dark:border-zinc-800",
        className,
      )}
    >
      <button
        onClick={onClose}
        className={cn(
          "absolute right-4 top-4 p-2 rounded-full z-50",
          "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800",
          "transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff82]",
        )}
        aria-label="Close modal"
      >
        <X className="w-5 h-5" />
      </button>
      {typeof children === "function" ? children({ onClose }) : children}
    </div>
  );
}

export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ModalHeader({
  children,
  className,
  ...props
}: ModalHeaderProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 mb-4", className)} {...props}>
      {children}
    </div>
  );
}

export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ModalBody({ children, className, ...props }: ModalBodyProps) {
  return (
    <div className={cn("py-2", className)} {...props}>
      {children}
    </div>
  );
}

export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ModalFooter({
  children,
  className,
  ...props
}: ModalFooterProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function useDisclosure(initialState = false) {
  const [isOpen, setIsOpen] = React.useState(initialState);

  const onOpen = React.useCallback(() => setIsOpen(true), []);
  const onClose = React.useCallback(() => setIsOpen(false), []);
  const onToggle = React.useCallback(() => setIsOpen((prev) => !prev), []);
  const onOpenChange = React.useCallback(
    (open: boolean) => setIsOpen(open),
    [],
  );

  return { isOpen, onOpen, onClose, onToggle, onOpenChange };
}
