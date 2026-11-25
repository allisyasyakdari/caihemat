import React from "react";

export function CaihematLogo({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-2 shadow-lg shadow-emerald-500/25 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-white drop-shadow"
      >
        {/* Drop shape representing 'Cai' (Air mengalir) + Dompet */}
        <path
          d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"
          fill="currentColor"
          fillOpacity="0.25"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Currency / Growth Wave Inside */}
        <path
          d="M9.5 13.5c.5-1 1.5-1.5 2.5-1.5s2 .5 2.5 1.5c.5 1-.5 2-2.5 2.5s-3 1-2.5 2.5c.5 1 1.5 1.5 2.5 1.5s2-.5 2.5-1.5"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Sparkle of Financial Freedom */}
        <circle cx="17.5" cy="5.5" r="1.5" fill="#fef08a" />
      </svg>
    </div>
  );
}
