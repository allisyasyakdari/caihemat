import React from "react";

export interface ChartSegment {
  name: string;
  amount: number;
  color: string;
  percentage: number;
}

interface DonutChartProps {
  segments: ChartSegment[];
  totalAmount: number;
  title?: string;
  formatIDR: (val: number | string) => string;
}

export function DonutChart({ segments, totalAmount, title = "Total Pengeluaran", formatIDR }: DonutChartProps) {
  if (totalAmount <= 0 || segments.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        Belum ada data pengeluaran untuk divisualisasikan.
      </div>
    );
  }

  const radius = 58;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
      {/* SVG Donut */}
      <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 transform">
          {/* Background circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Segments */}
          {segments.map((seg, i) => {
            const strokeDasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativeAngle;
            cumulativeAngle += (seg.percentage / 100) * circumference;

            return (
              <circle
                key={i}
                cx="80"
                cy="80"
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out hover:opacity-80 cursor-pointer"
              />
            );
          })}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">{title}</span>
          <span className="text-xs font-black text-slate-800 leading-tight mt-0.5 max-w-[100px] truncate">
            {formatIDR(totalAmount)}
          </span>
        </div>
      </div>

      {/* Legends & Percentages */}
      <div className="flex-1 w-full space-y-2">
        {segments.map((seg, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="font-medium text-slate-700 truncate">{seg.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-slate-500 font-semibold">{formatIDR(seg.amount)}</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: seg.color }}
              >
                {seg.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
