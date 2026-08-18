"use client";

import { useRouter } from "next/navigation";

type Props = {
  showQR?: boolean;
  onQRClick?: () => void;
};

export default function BottomNav({ showQR = true, onQRClick }: Props) {
  const router = useRouter();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      {/* Pruh se táhne přes celou šířku okna… */}
      <div className="bg-ink-soft/75 backdrop-blur-md border-t-2 border-paper/25 pointer-events-auto">
        {/* …ikonky ale zůstávají uprostřed jako obsah stránky. */}
        <div className="max-w-md mx-auto px-6 pt-3 pb-6 flex items-end justify-center gap-14">
          <NavButton label="Žebříček" onClick={() => router.push("/leaderboard")}>
            <path d="M5 21h4V11H5v10zM10 21h4V3h-4v18zM15 21h4V15h-4v6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M12 2.5l1.2 3.6h3.6l-2.9 2.1 1.1 3.4L12 9.6 8.9 11.6 10 8.2 7.1 6.1h3.6L12 2.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </NavButton>

          {showQR && (
            <button
              onClick={onQRClick}
              className="flex flex-col items-center gap-1.5 -mt-9 group"
            >
              <div className="w-[68px] h-[68px] rounded-[22px] bg-ink border-2 border-paper/40 flex items-center justify-center shadow-lg shadow-ink/60 transition-transform group-active:scale-95">
                <svg width="34" height="34" viewBox="0 0 38 38" fill="none">
                  <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="6" y="6" width="4" height="4" rx="0.5" fill="currentColor" />
                  <rect x="24" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="28" y="6" width="4" height="4" rx="0.5" fill="currentColor" />
                  <rect x="2" y="24" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2.5" />
                  <rect x="6" y="28" width="4" height="4" rx="0.5" fill="currentColor" />
                  <rect x="24" y="24" width="3" height="3" fill="currentColor" />
                  <rect x="30" y="24" width="3" height="3" fill="currentColor" />
                  <rect x="24" y="30" width="3" height="3" fill="currentColor" />
                  <rect x="30" y="30" width="3" height="3" fill="currentColor" />
                </svg>
              </div>
              <span className="text-[13px] font-bold text-paper/90">QR kód</span>
            </button>
          )}

          <NavButton label="Profil" onClick={() => router.push("/profile")}>
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
            <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </NavButton>
        </div>
      </div>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 text-paper/75 hover:text-paper transition-colors group"
    >
      <div className="w-12 h-12 flex items-center justify-center transition-transform group-active:scale-95">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          {children}
        </svg>
      </div>
      <span className="text-[13px] font-medium">{label}</span>
    </button>
  );
}
