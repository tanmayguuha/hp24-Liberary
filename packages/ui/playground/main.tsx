import { useState } from 'react';
import { createRoot } from 'react-dom/client';
// Imports straight from source — edit and the page hot-reloads.
import { Dropdown, ThemeProvider, CommonTable, type Column } from '../src/index.js';

const COLORS = [
  { label: 'Red', value: 'r' },
  { label: 'Green', value: 'g' },
  { label: 'Blue', value: 'b' },
  { label: 'Yellow (disabled)', value: 'y', disabled: true },
  { label: 'Purple', value: 'p' },
];

const COUNTRIES = [
  { label: '🇺🇸 United States', value: 'us', keywords: 'united states usa america' },
  { label: '🇬🇧 United Kingdom', value: 'uk', keywords: 'united kingdom britain england' },
  { label: '🇮🇳 India', value: 'in', keywords: 'india bharat' },
  { label: '🇩🇪 Germany', value: 'de', keywords: 'germany deutschland' },
  { label: '🇯🇵 Japan', value: 'jp', keywords: 'japan nippon' },
  { label: '🇧🇷 Brazil', value: 'br', keywords: 'brazil brasil' },
  { label: '🇫🇷 France', value: 'fr', keywords: 'france' },
  { label: '🇨🇦 Canada', value: 'ca', keywords: 'canada' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        boxShadow: '0 1px 2px rgba(15,23,42,0.06)',
      }}
    >
      <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#0f172a' }}>{title}</h3>
      {children}
    </div>
  );
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  rating: number;
}

const PRODUCTS: Product[] = [
  { id: '1', name: 'Laptop Pro', category: 'Electronics', price: 1299, stock: 15, rating: 4.8 },
  { id: '2', name: 'Wireless Mouse', category: 'Accessories', price: 29, stock: 124, rating: 4.3 },
  { id: '3', name: 'USB-C Cable', category: 'Accessories', price: 12, stock: 350, rating: 4.5 },
  { id: '4', name: '4K Monitor', category: 'Electronics', price: 399, stock: 32, rating: 4.7 },
  { id: '5', name: 'Mechanical Keyboard', category: 'Accessories', price: 149, stock: 67, rating: 4.6 },
  { id: '6', name: 'Webcam HD', category: 'Electronics', price: 79, stock: 43, rating: 4.4 },
];

function Demo() {
  const [single, setSingle] = useState<string | number | null>(null);
  const [multi, setMulti] = useState<Array<string | number>>(['us', 'in']);
  const [search, setSearch] = useState<Array<string | number>>([]);
  const [selectedRow, setSelectedRow] = useState<number | undefined>(undefined);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 32 }}>
      <h1 style={{ fontSize: 22, color: '#0f172a' }}>Dropdown playground</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>
        Live-bound to <code>../src/Dropdown.tsx</code>. Edit the component and this page reloads.
      </p>

      <Section title="Single select (clearable)">
        <Dropdown options={COLORS} placeholder="Pick a color" value={single} onChange={setSingle} />
        <pre style={{ margin: '8px 0 0', color: '#64748b' }}>value: {JSON.stringify(single)}</pre>
      </Section>

      <Section title="Multi select (chips)">
        <Dropdown
          multiple
          options={COUNTRIES}
          value={multi}
          onChange={setMulti}
          placeholder="Pick countries"
        />
        <pre style={{ margin: '8px 0 0', color: '#64748b' }}>value: {JSON.stringify(multi)}</pre>
      </Section>

      <Section title="Multi select + searchable">
        <Dropdown
          multiple
          searchable
          options={COUNTRIES}
          value={search}
          onChange={setSearch}
          placeholder="Search and pick…"
        />
        <pre style={{ margin: '8px 0 0', color: '#64748b' }}>value: {JSON.stringify(search)}</pre>
      </Section>

      <Section title="Sizes & states">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Dropdown size="sm" options={COLORS} placeholder="Small" />
          <Dropdown size="lg" options={COLORS} placeholder="Large" />
          <Dropdown options={COLORS} placeholder="Disabled" disabled defaultValue="r" />
          <Dropdown options={COLORS} placeholder="Invalid" invalid />
        </div>
      </Section>

      <Section title="Themed (custom primary color)">
        <ThemeProvider
          theme={{
            colors: {
              intent: {
                primary: { solid: '#db2777', soft: '#fce7f3', text: '#9d174d', onSolid: '#fff' },
              },
            },
          }}
        >
          <Dropdown
            multiple
            searchable
            options={COLORS}
            defaultValue={['g']}
            placeholder="Pink theme"
          />
        </ThemeProvider>
      </Section>

      <h2 style={{ fontSize: 22, color: '#0f172a', marginTop: 32 }}>CommonTable playground</h2>

      <Section title="Basic table with sorting">
        <CommonTable
          data={PRODUCTS}
          columns={[
            { key: 'name', title: 'Product Name', sortable: true },
            { key: 'category', title: 'Category', sortable: true },
            { key: 'price', title: 'Price', sortable: true, render: (row) => `$${row.price}` },
            { key: 'stock', title: 'Stock', sortable: true },
            { key: 'rating', title: 'Rating', sortable: true, render: (row) => `⭐ ${row.rating}` },
          ]}
        />
      </Section>

      <Section title="Table with row selection">
        <CommonTable
          data={PRODUCTS}
          columns={[
            { key: 'name', title: 'Product Name' },
            { key: 'category', title: 'Category' },
            { key: 'price', title: 'Price', render: (row) => `$${row.price}` },
          ]}
          selectedRowIndex={selectedRow}
          onRowClick={(row, idx) => {
            setSelectedRow(idx);
          }}
        />
        <pre style={{ margin: '8px 0 0', color: '#64748b' }}>
          selected: {selectedRow !== undefined ? JSON.stringify(PRODUCTS[selectedRow]) : 'none'}
        </pre>
      </Section>

      <Section title="Table with custom rendering">
        <CommonTable
          data={PRODUCTS}
          columns={[
            { key: 'name', title: 'Product Name', sortable: true },
            {
              key: 'price',
              title: 'Price',
              sortable: true,
              render: (row) => (
                <span style={{ color: row.price > 100 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                  ${row.price}
                </span>
              ),
            },
            {
              key: 'stock',
              title: 'Stock Status',
              sortable: true,
              render: (row) => (
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: row.stock > 50 ? '#dcfce7' : '#fee2e2',
                    color: row.stock > 50 ? '#166534' : '#991b1b',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {row.stock > 50 ? '✓ In Stock' : '⚠ Low Stock'}
                </span>
              ),
            },
          ]}
        />
      </Section>

      <Section title="Table with different row sizes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b' }}>Small rows</h4>
            <CommonTable
              data={PRODUCTS.slice(0, 3)}
              columns={[
                { key: 'name', title: 'Product Name' },
                { key: 'price', title: 'Price', render: (row) => `$${row.price}` },
              ]}
              rowSize="small"
            />
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b' }}>Medium rows (default)</h4>
            <CommonTable
              data={PRODUCTS.slice(0, 3)}
              columns={[
                { key: 'name', title: 'Product Name' },
                { key: 'price', title: 'Price', render: (row) => `$${row.price}` },
              ]}
              rowSize="medium"
            />
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b' }}>Large rows</h4>
            <CommonTable
              data={PRODUCTS.slice(0, 3)}
              columns={[
                { key: 'name', title: 'Product Name' },
                { key: 'price', title: 'Price', render: (row) => `$${row.price}` },
              ]}
              rowSize="large"
            />
          </div>
        </div>
      </Section>

      <Section title="Empty state">
        <CommonTable
          data={[]}
          columns={[
            { key: 'name', title: 'Product Name' },
            { key: 'price', title: 'Price' },
          ]}
          emptyState={
            <div style={{ color: '#64748b', padding: '20px' }}>
              📦 No products available
            </div>
          }
        />
      </Section>

      <Section title="Loading state">
        <CommonTable
          data={[]}
          columns={[
            { key: 'name', title: 'Product Name' },
            { key: 'price', title: 'Price' },
          ]}
          isLoading={true}
        />
      </Section>

      <Section title="Non-sortable columns">
        <CommonTable
          data={PRODUCTS}
          columns={[
            { key: 'name', title: 'Product Name', sortable: true },
            { key: 'category', title: 'Category', sortable: false },
            { key: 'price', title: 'Price', sortable: true, render: (row) => `$${row.price}` },
          ]}
        />
      </Section>
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Demo />);
