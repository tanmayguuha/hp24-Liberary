// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  FormField,
  Input,
  Modal,
  Pagination,
  Stat,
  Switch,
  Table,
  Tabs,
  ThemeProvider,
  Tooltip,
} from '../src/index.js';

afterEach(cleanup);

describe('hp24-ui', () => {
  it('Button renders children and fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByText('Save'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('Button shows a spinner and blocks clicks while loading', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('Badge and Alert render content', () => {
    render(
      <>
        <Badge intent="success">Active</Badge>
        <Alert intent="danger" title="Failed">
          Something went wrong
        </Alert>
      </>,
    );
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.getByText('Failed')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('Avatar derives initials from the name', () => {
    render(<Avatar name="Harsh Patidar" />);
    expect(screen.getByText('HP')).toBeTruthy();
  });

  it('Stat renders label and value', () => {
    render(<Stat label="Revenue" value="$12,500" change="12%" trend="up" />);
    expect(screen.getByText('Revenue')).toBeTruthy();
    expect(screen.getByText('$12,500')).toBeTruthy();
  });

  it('Table renders rows and sorts on a sortable column', () => {
    const rows = [
      { name: 'Bravo', amount: 30 },
      { name: 'Alpha', amount: 10 },
    ];
    render(
      <Table
        columns={[
          { key: 'name', header: 'Name', sortable: true },
          { key: 'amount', header: 'Amount', align: 'right' },
        ]}
        rows={rows}
      />,
    );
    expect(screen.getByText('Bravo')).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
    // Sorting by name asc puts Alpha before Bravo.
    fireEvent.click(screen.getByText('Name'));
    const cells = screen.getAllByRole('cell').map((c) => c.textContent);
    expect(cells.indexOf('Alpha')).toBeLessThan(cells.indexOf('Bravo'));
  });

  it('Table shows an empty state when there are no rows', () => {
    render(<Table columns={[{ key: 'x', header: 'X' }]} rows={[]} />);
    expect(screen.getByText('No data')).toBeTruthy();
  });

  it('Tabs switches panels on click', () => {
    render(
      <Tabs
        items={[
          { id: 'a', label: 'Tab A', content: <div>Panel A</div> },
          { id: 'b', label: 'Tab B', content: <div>Panel B</div> },
        ]}
      />,
    );
    expect(screen.getByText('Panel A')).toBeTruthy();
    fireEvent.click(screen.getByText('Tab B'));
    expect(screen.getByText('Panel B')).toBeTruthy();
  });

  it('Modal renders only when open and closes via the close button', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open={false} onClose={onClose} title="Confirm">
        Body
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <Modal open onClose={onClose} title="Confirm">
        Body
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('FormField wires label + error to the input and marks it invalid', () => {
    render(
      <FormField label="Email" error="Required">
        <Input placeholder="you@example.com" />
      </FormField>,
    );
    const input = screen.getByPlaceholderText('you@example.com');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('Required')).toBeTruthy();
  });

  it('Switch toggles in uncontrolled mode', () => {
    render(<Switch label="Enable" />);
    const input = screen.getByRole('switch') as HTMLInputElement;
    expect(input.checked).toBe(false);
    fireEvent.click(input);
    expect(input.checked).toBe(true);
  });

  it('Pagination disables prev on the first page and fires onChange', () => {
    const onChange = vi.fn();
    render(<Pagination page={1} pageCount={5} onChange={onChange} />);
    fireEvent.click(screen.getByText('‹'));
    expect(onChange).not.toHaveBeenCalled(); // disabled on first page
    fireEvent.click(screen.getByText('2'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('Tooltip shows its label on hover', () => {
    render(
      <Tooltip label="More info">
        <button type="button">Hover me</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => {
      fireEvent.mouseEnter(screen.getByText('Hover me').parentElement as HTMLElement);
    });
    expect(screen.getByRole('tooltip').textContent).toBe('More info');
  });

  it('ThemeProvider overrides theme tokens without breaking children', () => {
    render(
      <ThemeProvider
        theme={{
          colors: {
            intent: { primary: { solid: '#000', soft: '#eee', text: '#111', onSolid: '#fff' } },
          },
        }}
      >
        <Button>Themed</Button>
      </ThemeProvider>,
    );
    expect(screen.getByText('Themed')).toBeTruthy();
  });
});
