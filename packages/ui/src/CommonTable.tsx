'use client';

import React from 'react';

type SortDirection = 'asc' | 'desc';

type SortDescriptor = {
  key: string;
  dir: SortDirection;
};

export interface Column<T> {
  key: string;
  title: React.ReactNode;
  width?: number | string;
  sticky?: boolean;
  render?: (row: T, rowIndex: number) => React.ReactNode;
  sortValue?: (row: T) => string | number | boolean | Date | null | undefined;
  sortable?: boolean;
}

interface CommonTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  onRowClick?: (row: T, rowIndex: number) => void;
  selectedRowIndex?: number;
  multiSort?: boolean;
  rowSize?: 'small' | 'medium' | 'large';
  className?: string;
}

export function CommonTable<T>({
  data,
  columns,
  isLoading = false,
  emptyState,
  errorState,
  onRowClick,
  selectedRowIndex,
  multiSort = false,
  rowSize = 'medium',
  className = '',
}: CommonTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortDescriptor[]>([]);

  const sortingByColumn = React.useMemo(() => {
    return sorting.reduce<Record<string, SortDirection>>((acc, sd) => {
      acc[sd.key] = sd.dir;
      return acc;
    }, {});
  }, [sorting]);

  const sortedData = React.useMemo(() => {
    const isPinnedBottomRow = (row: T & Record<string, unknown>) =>
      Boolean(row?.isFooter || row?.isTotal);

    const normalRows = data.filter((row) => !isPinnedBottomRow(row as T & Record<string, unknown>));
    const pinnedBottomRows = data.filter((row) =>
      isPinnedBottomRow(row as T & Record<string, unknown>)
    );
    const activeSorting = sorting.filter(
      (sd) => columns.some((col) => col.key === sd.key && col.sortable !== false)
    );

    if (activeSorting.length === 0) {
      return data;
    }

    const sorted = [...normalRows].sort((rowA, rowB) => {
      for (const sortDescriptor of activeSorting) {
        const column = columns.find((col) => col.key === sortDescriptor.key);
        const getValue = (row: T) =>
          column?.sortValue
            ? column.sortValue(row)
            : (row as Record<string, unknown>)[sortDescriptor.key];

        const valueA = getValue(rowA);
        const valueB = getValue(rowB);

        if (valueA == null && valueB == null) continue;
        if (valueA == null) return sortDescriptor.dir === 'asc' ? 1 : -1;
        if (valueB == null) return sortDescriptor.dir === 'asc' ? -1 : 1;

        let comparison = 0;
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          comparison = valueA - valueB;
        } else if (typeof valueA === 'boolean' && typeof valueB === 'boolean') {
          comparison = Number(valueA) - Number(valueB);
        } else if (valueA instanceof Date && valueB instanceof Date) {
          comparison = valueA.getTime() - valueB.getTime();
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
          comparison = valueA.localeCompare(valueB);
        } else {
          comparison = String(valueA).localeCompare(String(valueB));
        }

        if (comparison !== 0) {
          return sortDescriptor.dir === 'asc' ? comparison : -comparison;
        }
      }

      return 0;
    });

    return pinnedBottomRows.length > 0 ? [...sorted, ...pinnedBottomRows] : sorted;
  }, [columns, data, sorting]);

  const handleSort = (key: string, sortState: 'asc' | 'desc' | 'none') => {
    setSorting((currentSorting) => {
      if (!multiSort) {
        return sortState === 'none' ? [] : [{ key, dir: sortState }];
      }

      const nextSorting = currentSorting.filter((sd) => sd.key !== key);

      if (sortState === 'none') {
        return nextSorting;
      }

      return [...nextSorting, { key, dir: sortState }];
    });
  };

  const getNextSortState = (currentState: SortDirection | undefined): 'asc' | 'desc' | 'none' => {
    if (!currentState) return 'asc';
    if (currentState === 'asc') return 'desc';
    return 'none';
  };

  const rowHeightClass = {
    small: 'h-8',
    medium: 'h-10',
    large: 'h-12',
  }[rowSize];

  const defaultEmptyState = (
    <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
      No data available
    </div>
  );

  const defaultErrorState = (
    <div style={{ textAlign: 'center', padding: '20px', color: '#ef4444' }}>
      An error occurred while loading data
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={columns.length} style={{ textAlign: 'center', padding: '20px' }}>
            Loading...
          </td>
        </tr>
      );
    }

    if (errorState) {
      return (
        <tr>
          <td colSpan={columns.length}>{errorState}</td>
        </tr>
      );
    }

    if (data.length === 0) {
      return (
        <tr>
          <td colSpan={columns.length}>{emptyState || defaultEmptyState}</td>
        </tr>
      );
    }

    return sortedData.map((row, rowIndex) => {
      const rowRecord = row as Record<string, unknown>;

      if (rowRecord.isFooter) {
        return (
          <tr key="footer-row" style={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>
            <td style={{ padding: '12px', fontWeight: 600 }}>Total:</td>
            {columns.slice(1).map((col) => (
              <td key={col.key} style={{ padding: '12px', textAlign: 'right' }}>
                {col.render ? col.render(row, rowIndex) : ''}
              </td>
            ))}
          </tr>
        );
      }

      const isSelected = selectedRowIndex === rowIndex;

      return (
        <tr
          key={(rowRecord.id as string) || rowIndex}
          className={rowHeightClass}
          style={{
            backgroundColor: isSelected ? '#e0e7ff' : rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
            cursor: onRowClick ? 'pointer' : 'default',
            transition: 'background-color 0.15s ease',
          }}
          onClick={() => onRowClick?.(row, rowIndex)}
          onKeyDown={(e) => {
            if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onRowClick(row, rowIndex);
            }
          }}
          role={onRowClick ? 'button' : undefined}
          tabIndex={onRowClick ? 0 : undefined}
        >
          {columns.map((col) => (
            <td
              key={col.key}
              style={{
                padding: '8px 12px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                position: col.sticky ? 'sticky' : 'relative',
                left: col.sticky ? 0 : 'auto',
                backgroundColor: 'inherit',
                zIndex: col.sticky ? 10 : 'auto',
              }}
            >
              {col.render ? col.render(row, rowIndex) : String((rowRecord[col.key] as unknown) ?? '')}
            </td>
          ))}
        </tr>
      );
    });
  };

  return (
    <div style={{ overflowX: 'auto' }} className={className}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', backgroundColor: '#f1f5f9' }}>
            {columns.map((col) => {
              const isSortable = col.sortable !== false;
              const sortState = sortingByColumn[col.key];
              const nextState = getNextSortState(sortState);

              return (
                <th
                  key={col.key}
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#0f172a',
                    cursor: isSortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    position: col.sticky ? 'sticky' : 'relative',
                    left: col.sticky ? 0 : 'auto',
                    width: typeof col.width === 'number' ? `${col.width}px` : col.width,
                    zIndex: col.sticky ? 11 : 'auto',
                  }}
                  onClick={() => {
                    if (isSortable) {
                      handleSort(col.key, nextState);
                    }
                  }}
                  role={isSortable ? 'button' : undefined}
                  tabIndex={isSortable ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (isSortable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSort(col.key, nextState);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {col.title}
                    {isSortable && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '12px',
                          color: sortState ? '#3b82f6' : '#cbd5e1',
                          marginLeft: '4px',
                        }}
                      >
                        {sortState === 'asc' && '↑'}
                        {sortState === 'desc' && '↓'}
                        {!sortState && '⇅'}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{renderContent()}</tbody>
      </table>
    </div>
  );
}
