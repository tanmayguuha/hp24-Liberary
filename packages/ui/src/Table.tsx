import { type ReactNode, useMemo, useState } from 'react';
import { EmptyState, Spinner } from './feedback.js';
import { useTheme } from './theme.js';

export interface Column<Row> {
  /** Key into the row, or a unique id when using `render`. */
  key: string;
  header: ReactNode;
  /** Custom cell renderer. Defaults to `String(row[key])`. */
  render?: (row: Row, rowIndex: number) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: number | string;
  /** Enable click-to-sort on this column (uses `row[key]` for comparison). */
  sortable?: boolean;
}

export interface TableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  /** Stable row key. Defaults to the row index. */
  rowKey?: (row: Row, index: number) => string | number;
  onRowClick?: (row: Row, index: number) => void;
  /** Show a centered spinner instead of rows. */
  loading?: boolean;
  /** Shown when there are no rows. */
  empty?: ReactNode;
  /** Zebra striping. */
  striped?: boolean;
  /** Sticky header (set a max-height on the wrapper to scroll). */
  stickyHeader?: boolean;
  style?: React.CSSProperties;
}

/**
 * A data-driven table: pass `columns` and `rows`, get a sortable, styled table.
 * Nothing about rendering is your concern — describe the data shape and go.
 *
 * ```tsx
 * <Table
 *   columns={[
 *     { key: 'name', header: 'Name', sortable: true },
 *     { key: 'amount', header: 'Amount', align: 'right', render: (r) => `$${r.amount}` },
 *   ]}
 *   rows={charges}
 * />
 * ```
 */
export function Table<Row extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  onRowClick,
  loading = false,
  empty,
  striped = false,
  stickyHeader = false,
  style,
}: TableProps<Row>) {
  const t = useTheme();
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => compare(a[sort.key], b[sort.key]) * factor);
  }, [rows, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );

  const cellPad = `${t.space(2.5)}px ${t.space(3)}px`;

  return (
    <div
      style={{
        border: `1px solid ${t.colors.border}`,
        borderRadius: t.radii.lg,
        overflow: 'auto',
        background: t.colors.surface,
        ...style,
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: t.fontFamily,
          fontSize: t.fontSizes.md,
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  style={{
                    position: stickyHeader ? 'sticky' : undefined,
                    top: stickyHeader ? 0 : undefined,
                    textAlign: col.align ?? 'left',
                    width: col.width,
                    padding: cellPad,
                    background: t.colors.intent.neutral.soft,
                    color: t.colors.textMuted,
                    fontWeight: 600,
                    fontSize: t.fontSizes.sm,
                    whiteSpace: 'nowrap',
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    borderBottom: `1px solid ${t.colors.border}`,
                  }}
                  aria-sort={
                    active ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {col.header}
                  {col.sortable && (
                    <span style={{ opacity: active ? 1 : 0.3, marginLeft: 6 }}>
                      {active && sort?.dir === 'desc' ? '▼' : '▲'}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: t.space(8), textAlign: 'center' }}>
                <Spinner />
              </td>
            </tr>
          ) : sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 0 }}>
                {empty ?? <EmptyState title="No data" description="There's nothing to show yet." />}
              </td>
            </tr>
          ) : (
            sortedRows.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row, i) : i}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                style={{
                  cursor: onRowClick ? 'pointer' : undefined,
                  background: striped && i % 2 === 1 ? t.colors.intent.neutral.soft : undefined,
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      textAlign: col.align ?? 'left',
                      padding: cellPad,
                      color: t.colors.text,
                      borderBottom:
                        i < sortedRows.length - 1 ? `1px solid ${t.colors.border}` : undefined,
                    }}
                  >
                    {col.render ? col.render(row, i) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function compare(a: unknown, b: unknown): number {
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}
