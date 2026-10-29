import React from 'react';

interface GaugeProps {
  label: string;
  yesterday: number;
  today: number;
  difference: number;
  unit?: string;
  activeYesterday?: number;
  activeToday?: number;
  activeDifference?: number;
  activeLabel?: string;
}

const SemiGauge: React.FC<{ value: number; label: string; max?: number; color?: string }> = ({
  value,
  label,
  max = 100,
  color = '#f97316',
}) => {
  const normalizedMax = max > 0 ? max : 1;
  const pct = Math.min(Math.max(value / normalizedMax, 0), 1);

  const strokeWidth = 12;
  const radius = 55;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - pct * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-[120px] h-[70px] flex items-end justify-center">
        <svg viewBox="0 0 140 80" className="w-full h-full">
          <path
            d="M 15 75 A 55 55 0 0 1 125 75"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d="M 15 75 A 55 55 0 0 1 125 75"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute bottom-0 text-center">
          <span className="text-base font-bold text-slate-800 tracking-tight">
            {value.toLocaleString()}
          </span>
        </div>
      </div>
      <span className="text-[11px] font-medium text-slate-400 mt-0.5">{label}</span>
    </div>
  );
};

export const RegionalGaugeCard: React.FC<GaugeProps> = ({
  label,
  yesterday,
  today,
  difference,
  unit = '',
  activeYesterday,
  activeToday,
  activeDifference,
  activeLabel,
}) => {
  const maxVal = Math.max(yesterday, today, 1) * 1.2;
  const activeMaxVal = activeYesterday && activeToday ? Math.max(activeYesterday, activeToday, 1) * 1.2 : 1;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">{label}</h3>

        <div className="flex items-center justify-around">
          <SemiGauge value={yesterday} label="Yesterday" max={maxVal} color="#94a3b8" />
          <SemiGauge value={today} label="Today" max={maxVal} color="#f97316" />
        </div>

        <div className="mt-3 flex flex-col items-center pt-3 border-t border-slate-100">
          <div className="flex flex-col items-center justify-center py-1.5 px-6 bg-slate-50 rounded-xl w-full max-w-[160px]">
            <span className={`text-xl font-bold ${difference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {difference >= 0 ? '+' : ''}{difference.toLocaleString()}
              {unit && <span className="text-xs font-normal ml-1">{unit}</span>}
            </span>
            <span className="text-[11px] font-medium text-slate-400">vs yesterday</span>
          </div>
        </div>
      </div>

      {activeLabel && activeYesterday !== undefined && activeToday !== undefined && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{activeLabel}</h3>

          <div className="flex items-center justify-around">
            <SemiGauge value={activeYesterday} label="Yesterday" max={activeMaxVal} color="#94a3b8" />
            <SemiGauge value={activeToday} label="Today" max={activeMaxVal} color="#f97316" />
          </div>

          <div className="mt-3 flex flex-col items-center pt-3 border-t border-slate-100">
            <div className="flex flex-col items-center justify-center py-1.5 px-6 bg-slate-50 rounded-xl w-full max-w-[160px]">
              <span className={`text-xl font-bold ${(activeDifference ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {(activeDifference ?? 0) >= 0 ? '+' : ''}{(activeDifference ?? 0).toLocaleString()}
              </span>
              <span className="text-[11px] font-medium text-slate-400">vs yesterday</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
