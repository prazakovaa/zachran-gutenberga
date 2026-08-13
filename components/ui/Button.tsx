type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
};

const VARIANTS = {
  primary:
    "bg-paper text-ink shadow-[0_10px_30px_-8px_rgb(0_0_0/0.7)] hover:bg-white",
  secondary:
    "bg-ink/40 backdrop-blur-md border-2 border-paper/70 text-paper hover:bg-ink/60",
  ghost:
    "bg-transparent text-paper/80 border border-paper/25 hover:text-paper hover:border-paper/50",
} as const;

export default function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full rounded-[var(--radius-btn)] py-4 px-6
        font-body font-bold text-xl tracking-wide uppercase
        transition-all duration-200
        active:scale-[0.97]
        focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-gold
        disabled:opacity-40 disabled:pointer-events-none
        ${VARIANTS[variant]}
      `}
    >
      {children}
    </button>
  );
}