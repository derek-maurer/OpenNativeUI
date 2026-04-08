import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export function Modal({ visible, onClose, children, width = "max-w-sm" }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [visible, onClose]);

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`relative w-full ${width} rounded-2xl bg-[#1a1a1a] border border-neutral-800 shadow-2xl overflow-hidden`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
