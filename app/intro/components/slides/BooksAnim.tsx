type Props = {
  variant?: 1 | 2 | 3 | 4 | 5;
};

const CONFIGS = {
  1: {
    books: [
      { x: 60,  y: 110, w: 22, h: 56, color: "#60a5fa", delay: 0 },
      { x: 88,  y: 120, w: 16, h: 46, color: "#a78bfa", delay: 0.4 },
      { x: 110, y: 105, w: 24, h: 62, color: "#34d399", delay: 0.8 },
      { x: 140, y: 115, w: 18, h: 52, color: "#fbbf24", delay: 0.2 },
      { x: 164, y: 108, w: 20, h: 58, color: "#f472b6", delay: 1.0 },
      { x: 190, y: 118, w: 15, h: 48, color: "#60a5fa", delay: 0.6 },
      { x: 211, y: 102, w: 26, h: 65, color: "#a78bfa", delay: 1.2 },
    ],
    floorY: 168,
  },
  2: {
    books: [
      { x: 50,  y: 108, w: 20, h: 60, color: "#a78bfa", delay: 0.3 },
      { x: 76,  y: 118, w: 17, h: 50, color: "#34d399", delay: 0 },
      { x: 99,  y: 103, w: 25, h: 65, color: "#fbbf24", delay: 0.9 },
      { x: 130, y: 112, w: 19, h: 55, color: "#60a5fa", delay: 0.5 },
      { x: 155, y: 106, w: 22, h: 62, color: "#f472b6", delay: 1.1 },
      { x: 183, y: 115, w: 16, h: 53, color: "#34d399", delay: 0.2 },
      { x: 205, y: 100, w: 28, h: 68, color: "#fbbf24", delay: 0.7 },
    ],
    floorY: 168,
  },
  3: {
    books: [
      { x: 55,  y: 115, w: 18, h: 53, color: "#34d399", delay: 0.6 },
      { x: 79,  y: 104, w: 23, h: 64, color: "#60a5fa", delay: 0 },
      { x: 108, y: 118, w: 16, h: 50, color: "#f472b6", delay: 0.8 },
      { x: 130, y: 107, w: 21, h: 61, color: "#a78bfa", delay: 0.3 },
      { x: 157, y: 112, w: 19, h: 56, color: "#fbbf24", delay: 1.0 },
      { x: 182, y: 103, w: 24, h: 65, color: "#34d399", delay: 0.5 },
      { x: 212, y: 116, w: 17, h: 52, color: "#60a5fa", delay: 1.3 },
    ],
    floorY: 168,
  },
  4: {
    books: [
      { x: 45,  y: 106, w: 24, h: 62, color: "#fbbf24", delay: 0.2 },
      { x: 75,  y: 117, w: 17, h: 51, color: "#60a5fa", delay: 0.7 },
      { x: 98,  y: 109, w: 21, h: 59, color: "#a78bfa", delay: 0 },
      { x: 125, y: 114, w: 18, h: 54, color: "#34d399", delay: 1.1 },
      { x: 149, y: 103, w: 26, h: 65, color: "#f472b6", delay: 0.4 },
      { x: 181, y: 110, w: 20, h: 58, color: "#fbbf24", delay: 0.9 },
      { x: 207, y: 118, w: 15, h: 50, color: "#60a5fa", delay: 0.3 },
    ],
    floorY: 168,
  },
  5: {
    books: [
      { x: 58,  y: 112, w: 20, h: 56, color: "#f472b6", delay: 1.0 },
      { x: 84,  y: 103, w: 25, h: 65, color: "#34d399", delay: 0.3 },
      { x: 115, y: 116, w: 17, h: 52, color: "#fbbf24", delay: 0.8 },
      { x: 138, y: 106, w: 22, h: 62, color: "#60a5fa", delay: 0 },
      { x: 166, y: 113, w: 19, h: 55, color: "#a78bfa", delay: 0.5 },
      { x: 191, y: 104, w: 23, h: 64, color: "#f472b6", delay: 1.2 },
      { x: 220, y: 115, w: 16, h: 53, color: "#34d399", delay: 0.6 },
    ],
    floorY: 168,
  },
} as const;

export default function BooksAnim({ variant = 1 }: Props) {
  const { books, floorY } = CONFIGS[variant];

  return (
    <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <style>{`
          ${books.map((_, i) => `
            @keyframes float${i} {
              0%,100% { transform: translateY(0px); }
              50%      { transform: translateY(-10px); }
            }
            .fb${i} {
              animation: float${i} ${2.8 + (i % 3) * 0.5}s ease-in-out infinite;
              animation-delay: ${books[i].delay}s;
            }
          `).join("")}
        `}</style>
      </defs>

      {/* shelf line */}
      <line
        x1="30" y1={floorY} x2="290" y2={floorY}
        stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"
      />

      {/* books */}
      {books.map((b, i) => (
        <g key={i} className={`fb${i}`}>
          {/* spine highlight */}
          <rect
            x={b.x} y={b.y} width={b.w} height={b.h}
            rx="3" fill={b.color} opacity="0.92"
          />
          {/* inner stripe */}
          <rect
            x={b.x + 3} y={b.y + 6} width={2} height={b.h - 12}
            rx="1" fill="rgba(255,255,255,0.25)"
          />
          {/* top cap */}
          <rect
            x={b.x} y={b.y} width={b.w} height={4}
            rx="1" fill="rgba(255,255,255,0.18)"
          />
        </g>
      ))}
    </svg>
  );
}
