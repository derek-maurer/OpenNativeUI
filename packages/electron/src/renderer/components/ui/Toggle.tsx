interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

export function Toggle({ value, onChange, label }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        value ? "bg-primary" : "bg-neutral-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ${
          value ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
