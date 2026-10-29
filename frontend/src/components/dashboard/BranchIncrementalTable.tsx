import React, { useState } from 'react';
import { Search } from 'lucide-react';

export interface BreakdownRow {
  id?: string;
  name: string;
  yesterday: number;
  today: number;
  incremental: number;
}

interface TableProps {
  title: string;
  nameHeader?: string;
  rows: BreakdownRow[];
}

export const BranchIncrementalTable: React.FC<TableProps> = ({
  title,
  nameHeader = 'BranchName',
  rows = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = rows.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 pr-3 py-1 bg-slate-50 text-xs text-slate-600 placeholder-slate-400 rounded-md border border-slate-200 focus:outline-none focus:border-slate-400 w-36"
          />
        </div>
      </div>

      <div className="overflow-y-auto max-h-[460px] flex-1">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 font-medium">
            <tr>
              <th className="py-2.5 px-4">{nameHeader}</th>
              <th className="py-2.5 px-4 text-right">Yesterday</th>
              <th className="py-2.5 px-4 text-right">Today</th>
              <th className="py-2.5 px-4 text-center">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length > 0 ? (
              filteredRows.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-2.5 px-4 font-medium text-slate-800 truncate max-w-[160px]" title={row.name}>
                    {row.name}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-500 font-mono">
                    {row.yesterday.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-800 font-semibold font-mono">
                    {row.today.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`inline-block min-w-[40px] px-2 py-0.5 rounded text-[11px] font-bold ${
                        row.incremental > 0
                          ? 'bg-emerald-50 text-emerald-700'
                          : row.incremental < 0
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {row.incremental > 0 ? `+${row.incremental}` : row.incremental}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                  No records available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
