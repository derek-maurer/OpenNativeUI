import { Modal } from "../ui/Modal";

interface RenameConversationDialogProps {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function RenameConversationDialog({
  visible,
  value,
  onChange,
  onSubmit,
  onClose,
}: RenameConversationDialogProps) {
  return (
    <Modal visible={visible} onClose={onClose}>
      <div className="px-4 py-3 border-b border-line-strong">
        <h3 className="text-sm font-semibold text-fg">Rename Chat</h3>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          autoFocus
          className="w-full rounded-xl bg-surface border border-line-strong px-3 py-2.5 text-sm text-fg focus:outline-none focus:border-muted"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-secondary hover:text-fg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
          >
            Rename
          </button>
        </div>
      </div>
    </Modal>
  );
}
