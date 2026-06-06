# CommonTable Component

A flexible, zero-dependency React table component with sorting, selection, and custom rendering. Perfect for displaying structured data with minimal configuration.

## Features

✅ **Multi-column sorting** — Single or multi-column sort with visual indicators
✅ **Row selection** — Click rows to select them with visual highlight
✅ **Custom rendering** — Render any React element in table cells
✅ **Keyboard accessible** — Full keyboard navigation support (Enter, Space, Tab)
✅ **Loading & empty states** — Customizable fallback UI
✅ **Row sizes** — Small, medium, and large row heights
✅ **Footer rows** — Sticky footer rows for totals/summaries (pinned to bottom)
✅ **Responsive** — Horizontally scrollable for small screens
✅ **Type-safe** — Full TypeScript support with generics

## Basic Usage

```tsx
import { CommonTable, type Column } from 'hp24-ui';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

const products: Product[] = [
  { id: '1', name: 'Laptop', price: 999, stock: 5 },
  { id: '2', name: 'Mouse', price: 25, stock: 50 },
];

const columns: Column<Product>[] = [
  { key: 'name', title: 'Product Name', sortable: true },
  { key: 'price', title: 'Price', sortable: true },
  { key: 'stock', title: 'Stock', sortable: true },
];

export function ProductTable() {
  return <CommonTable data={products} columns={columns} />;
}
```

## API Reference

### CommonTable Props

```typescript
interface CommonTableProps<T> {
  // Required
  data: T[];
  columns: Column<T>[];

  // Optional
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
  onRowClick?: (row: T, rowIndex: number) => void;
  selectedRowIndex?: number;
  multiSort?: boolean;           // Default: false
  rowSize?: 'small' | 'medium' | 'large';  // Default: 'medium'
  className?: string;
}
```

### Column Type

```typescript
interface Column<T> {
  key: string;                  // Object key to access data
  title: React.ReactNode;       // Column header text
  width?: number | string;      // Column width (px or CSS value)
  sticky?: boolean;             // Sticky column (left side)
  sortable?: boolean;           // Default: true
  sortValue?: (row: T) => string | number | boolean | Date | null | undefined;
  render?: (row: T, rowIndex: number) => React.ReactNode;
}
```

## Examples

### With Custom Rendering

```tsx
const columns: Column<Product>[] = [
  { key: 'name', title: 'Product' },
  {
    key: 'price',
    title: 'Price',
    sortable: true,
    render: (row) => `$${row.price.toLocaleString()}`,
  },
  {
    key: 'stock',
    title: 'Status',
    render: (row) => (
      <span style={{ color: row.stock > 10 ? 'green' : 'red' }}>
        {row.stock > 10 ? '✓ In Stock' : '⚠ Low Stock'}
      </span>
    ),
  },
];
```

### With Row Selection

```tsx
const [selectedIdx, setSelectedIdx] = useState<number>();

<CommonTable
  data={products}
  columns={columns}
  selectedRowIndex={selectedIdx}
  onRowClick={(row, idx) => setSelectedIdx(idx)}
/>
```

### With Multi-Column Sorting

```tsx
<CommonTable
  data={products}
  columns={columns}
  multiSort={true}
/>
```

Click column headers to cycle through: no sort → ascending → descending → no sort.

### With Custom States

```tsx
<CommonTable
  data={items}
  columns={columns}
  isLoading={isLoading}
  emptyState={<div>No items found</div>}
  errorState={<div>Failed to load items</div>}
/>
```

### With Footer Row (Totals)

Mark rows with `isFooter: true` to pin them to the table bottom (after sorting).

```tsx
const data = [
  { id: '1', name: 'Product A', sales: 100 },
  { id: '2', name: 'Product B', sales: 200 },
  { id: 'footer', name: 'TOTAL', sales: 300, isFooter: true } as any,
];

<CommonTable data={data} columns={columns} />
```

### Different Row Sizes

```tsx
<CommonTable data={products} columns={columns} rowSize="small" />
<CommonTable data={products} columns={columns} rowSize="medium" /> {/* default */}
<CommonTable data={products} columns={columns} rowSize="large" />
```

## Sorting Behavior

### String Sorting
Alphabetical using `localeCompare()` — respects locale-specific character ordering.

### Numeric Sorting
Numerical comparison.

### Date Sorting
Compares timestamps.

### Boolean Sorting
Converts to 0/1 and compares.

### Null/Undefined Handling
- In ascending sort: nulls go to the end
- In descending sort: nulls go to the end
- When all values are null in a column, order is maintained

### Custom Sort Values
Use `sortValue` to transform data before sorting:

```tsx
{
  key: 'createdAt',
  title: 'Date',
  sortable: true,
  sortValue: (row) => row.createdAt.getTime(),
  render: (row) => row.createdAt.toLocaleDateString(),
}
```

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Click header | Toggle sort: none → asc → desc → none |
| Enter on header | Toggle sort |
| Space on header | Toggle sort |
| Click row | Trigger onRowClick (if provided) |
| Enter on row | Trigger onRowClick (if provided) |
| Space on row | Trigger onRowClick (if provided) |
| Tab | Navigate between headers and rows |

## Styling & Customization

The component uses inline styles for layout with semantic HTML. To customize:

1. **Apply a wrapper className:**
   ```tsx
   <CommonTable data={data} columns={cols} className="my-table-wrapper" />
   ```

2. **Target elements with CSS:**
   ```css
   /* Table rows */
   .my-table-wrapper table tbody tr { background: #f5f5f5; }

   /* Headers */
   .my-table-wrapper table thead th { color: #333; }

   /* Cells */
   .my-table-wrapper table td { padding: 12px; }
   ```

3. **Use render function for inline styles:**
   ```tsx
   {
     key: 'status',
     title: 'Status',
     render: (row) => (
       <span style={{ color: row.active ? 'green' : 'red' }}>
         {row.active ? 'Active' : 'Inactive'}
       </span>
     ),
   }
   ```

## Test Coverage

33 comprehensive tests covering:

- Basic rendering and columns
- Empty, error, and loading states
- Single and multi-column sorting
- All data types (string, number, date, boolean, null)
- Custom sort values and rendering
- Row selection and click handlers
- Keyboard navigation
- Accessibility (keyboard accessible headers and rows)
- Footer row pinning
- Row sizes
- Edge cases

Run tests:
```bash
npm test -- table.test.tsx
```

## Performance Notes

- Component uses `React.useMemo` for sorting and column state to avoid unnecessary recalculations
- Sorting is performed in-place on a cloned array
- No external dependencies — uses only React and standard DOM APIs

## Browser Support

Works in all modern browsers supporting:
- ES2015 (JavaScript)
- CSS Grid/Flexbox
- Sticky positioning
- IntersectionObserver (optional, for future sticky header support)

## Accessibility

- ✅ Semantic HTML (`<table>`, `<thead>`, `<tbody>`)
- ✅ Keyboard navigation for headers and rows
- ✅ ARIA role="button" on interactive elements
- ✅ Tab order support
- ✅ Proper heading hierarchy

## Known Limitations

- No built-in pagination (handle in parent component)
- No built-in filtering (handle in parent component)
- No column resizing (use fixed widths or CSS)
- No drag-and-drop (can be added via wrapper component)
- Single horizontal scroll (not per-column)

These can be added in wrapper components as needed without modifying CommonTable.

## Future Enhancements

- [ ] Sticky headers while scrolling
- [ ] Column grouping
- [ ] Expandable rows
- [ ] Column visibility toggle
- [ ] Export to CSV
- [ ] Dense/comfortable/spacious modes
