export function XpCheckbox({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className="xp-checkbox"
      onClick={() => onChange(!checked)}
      disabled={disabled}
    >
      <span className="xp-check" aria-hidden />
      <span className="xp-checkbox__label">{label}</span>
    </button>
  );
}
