import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ResponsiveColumn<T = any> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** Hide this field entirely on phone card layout */
  hideOnMobile?: boolean;
  /** Cell shows raw value instead of label:value on mobile cards */
  primary?: boolean;
}

interface ResponsiveTableProps<T = any> {
  columns: ResponsiveColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  emptyMessage?: React.ReactNode;
  className?: string;
  /** Extra actions shown full-width on mobile cards */
  mobileActions?: (row: T) => React.ReactNode;
  /** Make the whole row (table) / card (phone) clickable */
  onRowClick?: (row: T) => void;
}

export function ResponsiveTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'No records found',
  className,
  mobileActions,
  onRowClick,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm">{emptyMessage}</div>
    );
  }

  return (
    <>
      {/* Desktop / tablet: regular table with horizontal scroll */}
      <div className={cn('hidden sm:block overflow-x-auto', className)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3',
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'hover:bg-slate-50/60',
                  onRowClick && 'cursor-pointer transition-colors'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-3 align-middle', col.className)}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: stacked cards */}
      <div className={cn('sm:hidden space-y-3', className)}>
        {data.map((row) => {
          const primaryCol = columns.find((c) => c.primary) || columns[0];
          const rest = columns.filter((c) => c.key !== primaryCol?.key && !c.hideOnMobile);
          return (
            <div
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden',
                onRowClick && 'cursor-pointer active:bg-slate-50 transition-colors'
              )}
            >
              {primaryCol && (
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                  {primaryCol.render(row)}
                </div>
              )}
              <div className="px-4 py-3 space-y-2">
                {rest.map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 shrink-0 pt-0.5">
                      {col.header}
                    </span>
                    <span className={cn('text-sm text-slate-800 text-right min-w-0 break-words', col.className)}>
                      {col.render(row)}
                    </span>
                  </div>
                ))}
              </div>
              {mobileActions && (
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/40">
                  {mobileActions(row)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export default ResponsiveTable;
