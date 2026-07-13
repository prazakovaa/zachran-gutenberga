"use client";

import { useRouter } from "next/navigation";

type Props = {
  // volitelně skrýt prostřední QR tlačítko, pokud by se to hodilo
  showQR?: boolean;
  onQRClick?: () => void;
};

export default function BottomNav({ showQR = true, onQRClick }: Props) {
  const router = useRouter();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-md mx-auto relative">
        {/* průhledné modré pozadí */}
        <div className="bg-blue-900/40 backdrop-blur-md border-t border-white/10 px-6 pt-4 pb-6 pointer-events-auto">
          <div className="flex items-end justify-between">
            {/* Žebříček */}
            <button
              onClick={() => router.push("/leaderboard")}
              className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors pb-1"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 21h4V11H5v10zM10 21h4V3h-4v18zM15 21h4V15h-4v6z" fill="currentColor" opacity="0.85"/>
                  <path d="M12 2.5l1.2 3.6h3.6l-2.9 2.1 1.1 3.4L12 9.6 8.9 11.6 10 8.2 7.1 6.1h3.6L12 2.5z" fill="currentColor" opacity="0.9"/>
                </svg>
              </div>
              <span className="text-xs font-medium">Žebříček</span>
            </button>

            {/* QR – prostřední, větší, vyčnívá */}
            {showQR && (
              <button
                onClick={onQRClick}
                className="flex flex-col items-center gap-1 -mt-10 pointer-events-auto"
              >
                <div className="w-20 h-20 rounded-3xl bg-blue-950 border-4 border-white/20 flex items-center justify-center shadow-2xl shadow-blue-500/40">
                  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="white" strokeWidth="2.5"/>
                    <rect x="6" y="6" width="4" height="4" rx="0.5" fill="white"/>
                    <rect x="24" y="2" width="12" height="12" rx="2" stroke="white" strokeWidth="2.5"/>
                    <rect x="28" y="6" width="4" height="4" rx="0.5" fill="white"/>
                    <rect x="2" y="24" width="12" height="12" rx="2" stroke="white" strokeWidth="2.5"/>
                    <rect x="6" y="28" width="4" height="4" rx="0.5" fill="white"/>
                    <rect x="24" y="24" width="3" height="3" fill="white"/>
                    <rect x="30" y="24" width="3" height="3" fill="white"/>
                    <rect x="24" y="30" width="3" height="3" fill="white"/>
                    <rect x="30" y="30" width="3" height="3" fill="white"/>
                  </svg>
                </div>
                <span className="text-xs font-bold text-white/90">QR kód</span>
              </button>
            )}

            <button
              onClick={() => router.push("/profile")}
              className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors pb-1"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M17 17l1 1 2.5-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-xs font-medium">Profil</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}