"use client";

import {
  ReactNode,
  forwardRef,
  createContext,
  useContext,
  HTMLAttributes,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import Icon from "@/components/icons/Icon";

// Context for modal state
const ModalContext = createContext<{ onClose?: () => void }>({});

interface ModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

function Modal({ open, onOpenChange, children }: ModalProps) {
  return (
    <ModalContext.Provider value={{ onClose: () => onOpenChange?.(false) }}>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </DialogPrimitive.Root>
    </ModalContext.Provider>
  );
}

// Trigger
const ModalTrigger = DialogPrimitive.Trigger;

// Portal + Overlay + Content wrapper
interface ModalContentProps {
  className?: string;
  children?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  preventClose?: boolean;
}

const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  (
    {
      className,
      children,
      size = "md",
      showCloseButton = true,
      preventClose = false,
    },
    ref,
  ) => {
    const { onClose } = useContext(ModalContext);

    const sizeStyles = {
      sm: "max-w-sm",
      md: "max-w-lg",
      lg: "max-w-2xl",
      xl: "max-w-4xl",
      full: "max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]",
    };

    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-soil/40 backdrop-blur-sm"
            onClick={preventClose ? undefined : onClose}
          />
        </DialogPrimitive.Overlay>
        <DialogPrimitive.Content asChild>
          <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
            className={cn(
              "fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2",
              "bg-surface rounded-3xl shadow-2xl border border-border",
              "focus:outline-none",
              sizeStyles[size],
              className,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {showCloseButton && (
              <DialogPrimitive.Close asChild>
                <button
                  className={cn(
                    "absolute right-4 top-4 p-2 rounded-xl",
                    "text-text-secondary hover:text-foreground",
                    "hover:bg-sand transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  )}
                  aria-label="Close"
                >
                  <Icon name="close" size={20} />
                </button>
              </DialogPrimitive.Close>
            )}
            {children}
          </motion.div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  },
);

ModalContent.displayName = "ModalContent";

// Header
const ModalHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 pt-6 pb-4", className)} {...props} />
  ),
);
ModalHeader.displayName = "ModalHeader";

// Title
const ModalTitle = forwardRef<
  HTMLHeadingElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-2xl font-display font-bold text-foreground", className)}
    {...props}
  />
));
ModalTitle.displayName = "ModalTitle";

// Description
const ModalDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-text-secondary mt-2", className)}
    {...props}
  />
));
ModalDescription.displayName = "ModalDescription";

// Body
const ModalBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 py-4", className)} {...props} />
  ),
);
ModalBody.displayName = "ModalBody";

// Footer
const ModalFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "px-6 py-4 border-t border-border flex items-center justify-end gap-3",
        className,
      )}
      {...props}
    />
  ),
);
ModalFooter.displayName = "ModalFooter";

// Convenience wrapper for simple confirmation dialogs
interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "danger";
  isLoading?: boolean;
}

function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
  isLoading = false,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <ModalContent size="sm" showCloseButton={false}>
            <ModalHeader>
              <ModalTitle>{title}</ModalTitle>
              {description && (
                <ModalDescription>{description}</ModalDescription>
              )}
            </ModalHeader>
            <ModalFooter>
              <button
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className={cn(
                  "px-4 py-2 rounded-xl font-medium",
                  "text-text-secondary hover:text-foreground hover:bg-sand",
                  "transition-colors disabled:opacity-50",
                )}
              >
                {cancelLabel}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={cn(
                  "px-4 py-2 rounded-xl font-medium text-white",
                  "transition-all disabled:opacity-50",
                  variant === "danger"
                    ? "bg-danger hover:bg-danger/90"
                    : "bg-primary hover:bg-primary-dark",
                )}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
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
                    Processing...
                  </span>
                ) : (
                  confirmLabel
                )}
              </button>
            </ModalFooter>
          </ModalContent>
        )}
      </AnimatePresence>
    </Modal>
  );
}

export {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ConfirmModal,
};
