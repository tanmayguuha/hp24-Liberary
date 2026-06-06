import { useState } from 'react';
import { createRoot } from 'react-dom/client';
// Imports straight from source — edit ../src/Dropdown.tsx and the page hot-reloads.
import { Dropdown, ThemeProvider } from '../src/index.js';

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

function Demo() {
  const [single, setSingle] = useState<string | number | null>(null);
  const [multi, setMulti] = useState<Array<string | number>>(['us', 'in']);
  const [search, setSearch] = useState<Array<string | number>>([]);

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
    </div>
  );
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<Demo />);
