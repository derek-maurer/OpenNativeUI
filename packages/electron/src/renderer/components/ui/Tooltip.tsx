import type { ReactNode } from "react";

interface TooltipProps {
  label: string;
  shortcut?: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

const positions = {
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
};

export function Tooltip({ label, shortcut, children, side = "bottom" }: TooltipProps) {
  return (
    <div className="relative group/tip inline-flex">
      {children}
      <span
        className={`absolute ${positions[side]} flex items-center gap-1.5 px-2 py-1 text-xs text-fg bg-surface border border-line rounded-md shadow-lg pointer-events-none whitespace-nowrap z-50 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-100 delay-300`}
      >
        {label}
        {shortcut && (
          <span className="font-mono text-[10px] text-secondary">{shortcut}</span>
        )}
      </span>
    </div>
  );
}
