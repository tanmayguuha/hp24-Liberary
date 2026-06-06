import { Fragment, type ReactNode } from 'react';
import { useTheme } from './theme.js';

export interface PaginationProps {
  /** Current page (1-based). */
  page: number;
  /** Total number of pages. */
  pageCount: number;
  onChange: (page: number) => void;
  /** How many page buttons to show around the current page. Default 1. */
  siblings?: number;
  style?: React.CSSProperties;
}

/** Page navigation with prev/next and truncated page numbers. */
export function Pagination({ page, pageCount, onChange, siblings = 1, style }: PaginationProps) {
  const t = useTheme();
  const pages = pageRange(page, pageCount, siblings);

  const btn = (
    label: ReactNode,
    target: number,
    opts: { disabled?: boolean; active?: boolean } = {},
  ) => (
    <button
      type="button"
      disabled={opts.disabled}
      aria-current={opts.active ? 'page' : undefined}
      onClick={() => onChange(target)}
      style={{
        minWidth: 34,
        height: 34,
        padding: '0 8px',
        border: `1px solid ${opts.active ? t.colors.intent.primary.solid : t.colors.border}`,
        background: opts.active ? t.colors.intent.primary.solid : t.colors.surface,
        color: opts.active ? t.colors.intent.primary.onSolid : t.colors.text,
        borderRadius: t.radii.sm,
        cursor: opts.disabled ? 'not-allowed' : 'pointer',
        opacity: opts.disabled ? 0.45 : 1,
        fontFamily: t.fontFamily,
        fontSize: t.fontSizes.sm,
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );

  return (
    <nav
      aria-label="Pagination"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}
    >
      {btn('‹', page - 1, { disabled: page <= 1 })}
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} style={{ color: t.colors.textMuted, padding: '0 4px' }}>
            …
          </span>
        ) : (
          <Fragment key={p}>{btn(p, p, { active: p === page })}</Fragment>
        ),
      )}
      {btn('›', page + 1, { disabled: page >= pageCount })}
    </nav>
  );
}

function pageRange(page: number, total: number, siblings: number): (number | '…')[] {
  const range: (number | '…')[] = [];
  const left = Math.max(2, page - siblings);
  const right = Math.min(total - 1, page + siblings);
  range.push(1);
  if (left > 2) range.push('…');
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 1) range.push('…');
  if (total > 1) range.push(total);
  return range;
}

export interface Crumb {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  separator?: ReactNode;
  style?: React.CSSProperties;
}

/** A breadcrumb trail; the last item is rendered as the current page. */
export function Breadcrumbs({ items, separator = '/', style }: BreadcrumbsProps) {
  const t = useTheme();
  return (
    <nav
      aria-label="Breadcrumb"
      style={{ fontFamily: t.fontFamily, fontSize: t.fontSizes.sm, ...style }}
    >
      <ol
        style={{
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: t.space(2),
          margin: 0,
          padding: 0,
          flexWrap: 'wrap',
        }}
      >
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: t.space(2) }}>
              {last || (!item.href && !item.onClick) ? (
                <span
                  aria-current={last ? 'page' : undefined}
                  style={{
                    color: last ? t.colors.text : t.colors.textMuted,
                    fontWeight: last ? 600 : 400,
                  }}
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href ?? '#'}
                  onClick={
                    item.onClick
                      ? (e) => {
                          e.preventDefault();
                          item.onClick?.();
                        }
                      : undefined
                  }
                  style={{ color: t.colors.intent.primary.text, textDecoration: 'none' }}
                >
                  {item.label}
                </a>
              )}
              {!last && (
                <span aria-hidden style={{ color: t.colors.textMuted }}>
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
