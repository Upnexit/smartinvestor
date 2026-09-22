import React from "react";

interface IllustratedAvatarProps {
  className?: string;
  seed?: number;
}

export function IllustratedAvatar({ className, seed }: IllustratedAvatarProps) {
  // Seed can subtly adjust tie color or skin tone, but preserves the exact iconic reference look
  const tieColors = ["#E85626", "#DC2626", "#EA580C", "#F59E0B"];
  const tieKnotColors = ["#C93D17", "#B91C1C", "#C2410C", "#D97706"];
  const colorIndex = typeof seed === "number" ? Math.abs(seed) % tieColors.length : 0;

  const tieColor = tieColors[colorIndex];
  const tieKnotColor = tieKnotColors[colorIndex];

  return (
    <div
      className={`relative rounded-full overflow-hidden p-[2px] sm:p-[2.5px] bg-[#E0852B] shadow-xs flex items-center justify-center shrink-0 ${
        className || "w-11 h-11 sm:w-12 sm:h-12"
      }`}
    >
      <div className="w-full h-full rounded-full overflow-hidden bg-[#D3EEFB] flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full select-none" fill="none">
          {/* Base background circle */}
          <circle cx="50" cy="50" r="50" fill="#D3EEFB" />

          {/* Blue Suit Jacket - Shoulders */}
          <path
            d="M 12 100 C 13 75 32 64 50 64 C 68 64 87 75 88 100 Z"
            fill="#2970BF"
          />

          {/* Darker lapel shadows on jacket sides */}
          <path
            d="M 18 100 C 20 80 32 68 44 65 L 37 84 L 26 100 Z"
            fill="#1E5799"
          />
          <path
            d="M 82 100 C 80 80 68 68 56 65 L 63 84 L 74 100 Z"
            fill="#1E5799"
          />

          {/* Crisp White Shirt Collar (V shape) */}
          <polygon points="41,64 50,88 59,64" fill="#FFFFFF" />
          <polygon points="36,65 44,65 41,74" fill="#FFFFFF" />
          <polygon points="64,65 56,65 59,74" fill="#FFFFFF" />

          {/* Red/Orange Tie Knot */}
          <polygon points="46,67 54,67 53,74 47,74" fill={tieKnotColor} />

          {/* Red/Orange Tie Blade */}
          <polygon points="47,74 53,74 55,95 50,100 45,95" fill={tieColor} />

          {/* Neck */}
          <rect x="44" y="54" width="12" height="13" rx="1" fill="#F8D3B7" />

          {/* Ears */}
          <circle cx="33" cy="46" r="4" fill="#F8D3B7" />
          <circle cx="67" cy="46" r="4" fill="#F8D3B7" />

          {/* Head / Face */}
          <ellipse cx="50" cy="45" rx="17" ry="19" fill="#FFDFC6" />

          {/* Hair - exact smooth side-parted hairstyle from reference image */}
          <path
            d="M 31 43 C 30 24 43 17 53 17 C 66 17 71 24 69 43 C 65 31 56 28 47 28 C 37 28 33 34 31 43 Z"
            fill="#2E373F"
          />
          {/* Clean sideburns */}
          <path d="M 31 41 L 33 46 L 35 44" fill="#2E373F" />
          <path d="M 69 41 L 67 46 L 65 44" fill="#2E373F" />

          {/* Eyes */}
          <circle cx="43.5" cy="44.5" r="1.8" fill="#262F36" />
          <circle cx="56.5" cy="44.5" r="1.8" fill="#262F36" />

          {/* Eyebrows */}
          <path d="M 40.5 41 Q 43.5 39 46.5 41" stroke="#262F36" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M 53.5 41 Q 56.5 39 59.5 41" stroke="#262F36" strokeWidth="1.4" strokeLinecap="round" />

          {/* Nose */}
          <path d="M 50 47.5 L 49 51 L 51 51" stroke="#E2A684" strokeWidth="1.2" strokeLinecap="round" />

          {/* Friendly Smile */}
          <path d="M 46 55 Q 50 57.5 54 55" stroke="#262F36" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
