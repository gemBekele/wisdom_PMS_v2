import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export interface TopPerformer {
  name: string;
  value: number;
}

interface ChartProps {
  title: string;
  data: TopPerformer[];
  barColor?: string;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const TopBranchesBarChart: React.FC<ChartProps> = ({
  title,
  data = [],
  barColor = '#f97316',
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-xs bg-orange-500 inline-block"></span>
          <span>Today</span>
        </div>
      </div>

      <div className="p-4 w-full flex-1 min-h-[300px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 10, left: -20, bottom: 55 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                interval={0}
                tick={{ fontSize: 10, fill: '#64748b' }}
                angle={-40}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={formatNumber}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(val: number) => [val.toLocaleString(), 'Value']}
                labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            No ranking data available
          </div>
        )}
      </div>
    </div>
  );
};
