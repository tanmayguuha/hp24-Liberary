// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dropdown, ThemeProvider } from '../src/index.js';

afterEach(cleanup);

const COLORS = [
  { label: 'Red', value: 'r' },
  { label: 'Green', value: 'g' },
  { label: 'Blue', value: 'b' },
];

describe('Dropdown', () => {
  it('opens, selects a value, and closes (single)', () => {
    const onChange = vi.fn();
    render(<Dropdown options={COLORS} placeholder="Pick a color" onChange={onChange} />);
    expect(screen.getByText('Pick a color')).toBeTruthy();
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.click(screen.getByText('Green'));
    expect(onChange).toHaveBeenCalledWith('g');
    // Single-select closes after picking.
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('accumulates values and stays open (multi)', () => {
    const onChange = vi.fn();
    render(<Dropdown multiple options={COLORS} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Red'));
    expect(onChange).toHaveBeenLastCalledWith(['r']);
    fireEvent.click(screen.getByText('Blue'));
    expect(onChange).toHaveBeenLastCalledWith(['r', 'b']);
    // Menu remains open in multi mode.
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('toggles a selected value off (multi)', () => {
    const onChange = vi.fn();
    render(<Dropdown multiple options={COLORS} defaultValue={['r']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: /Red/ }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('clears the selection via the clear button', () => {
    const onChange = vi.fn();
    render(<Dropdown options={COLORS} defaultValue="g" onChange={onChange} />);
    expect(screen.getByText('Green')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Clear selection'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('filters options when searchable', () => {
    render(<Dropdown searchable options={COLORS} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByLabelText('Search options'), { target: { value: 'bl' } });
    expect(screen.getByText('Blue')).toBeTruthy();
    expect(screen.queryByText('Red')).toBeNull();
  });

  it('shows the empty message when search matches nothing', () => {
    render(<Dropdown searchable options={COLORS} emptyMessage="Nothing here" />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByLabelText('Search options'), { target: { value: 'zzz' } });
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });

  it('opens with ArrowDown and selects with Enter (keyboard)', () => {
    const onChange = vi.fn();
    render(<Dropdown options={COLORS} onChange={onChange} />);
    const combo = screen.getByRole('combobox');
    fireEvent.keyDown(combo, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.keyDown(combo, { key: 'ArrowDown' }); // move to second option
    fireEvent.keyDown(combo, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('g');
  });

  it('renders inside a ThemeProvider without breaking', () => {
    render(
      <ThemeProvider
        theme={{
          colors: {
            intent: { primary: { solid: '#000', soft: '#eee', text: '#111', onSolid: '#fff' } },
          },
        }}
      >
        <Dropdown options={COLORS} placeholder="Themed" />
      </ThemeProvider>,
    );
    expect(screen.getByText('Themed')).toBeTruthy();
  });
});
