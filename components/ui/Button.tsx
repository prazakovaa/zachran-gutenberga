type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

export default function Button({ children, onClick, variant = "primary", disabled }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full rounded-3xl font-black text-2xl py-5 shadow-xl
        active:scale-[0.98] transition-transform
        ${variant === "primary"
          ? "bg-white text-[#0B5ED7]"
          : "bg-transparent border-2 border-white text-white"}
      `}
    >
      {children}
    </button>
  );
}