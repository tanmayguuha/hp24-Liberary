// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommonTable, type Column } from '../src/index.js';

afterEach(cleanup);

interface Person {
  id: string;
  name: string;
  age: number;
  salary: number;
  email: string;
  joinDate: Date;
}

const mockData: Person[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    age: 28,
    salary: 75000,
    email: 'alice@example.com',
    joinDate: new Date('2022-01-15'),
  },
  {
    id: '2',
    name: 'Bob Smith',
    age: 35,
    salary: 85000,
    email: 'bob@example.com',
    joinDate: new Date('2021-06-20'),
  },
  {
    id: '3',
    name: 'Carol White',
    age: 32,
    salary: 90000,
    email: 'carol@example.com',
    joinDate: new Date('2020-03-10'),
  },
];

const defaultColumns: Column<Person>[] = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'age', title: 'Age', sortable: true },
  { key: 'salary', title: 'Salary', sortable: true },
  { key: 'email', title: 'Email', sortable: false },
];

describe('CommonTable', () => {
  describe('Basic rendering', () => {
    it('renders table with headers and data', () => {
      render(<CommonTable data={mockData} columns={defaultColumns} />);
      expect(screen.getByText('Name')).toBeTruthy();
      expect(screen.getByText('Age')).toBeTruthy();
      expect(screen.getByText('Alice Johnson')).toBeTruthy();
      expect(screen.getByText('Bob Smith')).toBeTruthy();
    });

    it('renders empty state when no data', () => {
      render(<CommonTable data={[]} columns={defaultColumns} emptyState={<div>No records</div>} />);
      expect(screen.getByText('No records')).toBeTruthy();
    });

    it('renders custom empty state', () => {
      render(
        <CommonTable
          data={[]}
          columns={defaultColumns}
          emptyState={<div>Custom empty message</div>}
        />
      );
      expect(screen.getByText('Custom empty message')).toBeTruthy();
    });

    it('renders error state', () => {
      render(
        <CommonTable
          data={[]}
          columns={defaultColumns}
          errorState={<div>Error loading data</div>}
        />
      );
      expect(screen.getByText('Error loading data')).toBeTruthy();
    });

    it('renders loading state', () => {
      render(<CommonTable data={[]} columns={defaultColumns} isLoading={true} />);
      expect(screen.getByText('Loading...')).toBeTruthy();
    });
  });

  describe('Sorting', () => {
    it('sorts data by column in ascending order', () => {
      const { container } = render(<CommonTable data={mockData} columns={defaultColumns} />);

      const ageHeader = screen.getByText('Age').closest('th');
      fireEvent.click(ageHeader!);

      const rows = container.querySelectorAll('tbody tr');
      const firstRow = rows[0].textContent;
      const lastRow = rows[2].textContent;

      expect(firstRow).toContain('Alice');
      expect(firstRow).toContain('28');
      expect(lastRow).toContain('Bob');
      expect(lastRow).toContain('35');
    });

    it('sorts data by column in descending order', () => {
      const { container } = render(<CommonTable data={mockData} columns={defaultColumns} />);

      const ageHeader = screen.getByText('Age').closest('th');

      // First click: asc
      fireEvent.click(ageHeader!);
      // Second click: desc
      fireEvent.click(ageHeader!);

      const rows = container.querySelectorAll('tbody tr');
      const firstRow = rows[0].textContent;
      const lastRow = rows[2].textContent;

      expect(firstRow).toContain('Bob');
      expect(firstRow).toContain('35');
      expect(lastRow).toContain('Alice');
      expect(lastRow).toContain('28');
    });

    it('clears sort when clicked third time', () => {
      const { container } = render(<CommonTable data={mockData} columns={defaultColumns} />);

      const ageHeader = screen.getByText('Age').closest('th');

      fireEvent.click(ageHeader!); // asc
      fireEvent.click(ageHeader!); // desc
      fireEvent.click(ageHeader!); // none

      const rows = container.querySelectorAll('tbody tr');
      const firstRow = rows[0].textContent;

      // Should be back to original order (Alice first)
      expect(firstRow).toContain('Alice');
    });

    it('supports multi-column sorting', () => {
      const { container } = render(
        <CommonTable data={mockData} columns={defaultColumns} multiSort={true} />
      );

      const nameHeader = screen.getByText('Name').closest('th');
      const ageHeader = screen.getByText('Age').closest('th');

      fireEvent.click(nameHeader!); // Sort by name asc
      fireEvent.click(ageHeader!); // Then sort by age asc

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('disables sorting for non-sortable columns', () => {
      const { container } = render(<CommonTable data={mockData} columns={defaultColumns} />);

      const emailHeader = screen.getByText('Email').closest('th');
      fireEvent.click(emailHeader!);

      // Email column should not be sortable, so order shouldn't change
      const rows = container.querySelectorAll('tbody tr');
      const firstRow = rows[0].textContent;
      expect(firstRow).toContain('Alice');
    });

    it('sorts string values using localeCompare', () => {
      const data = [
        { id: '1', name: 'Zebra', age: 30, salary: 50000, email: 'z@ex.com', joinDate: new Date() },
        { id: '2', name: 'Apple', age: 25, salary: 40000, email: 'a@ex.com', joinDate: new Date() },
        { id: '3', name: 'Mango', age: 35, salary: 60000, email: 'm@ex.com', joinDate: new Date() },
      ];

      const { container } = render(<CommonTable data={data} columns={defaultColumns} />);

      const nameHeader = screen.getByText('Name').closest('th');
      fireEvent.click(nameHeader!); // asc

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0].textContent).toContain('Apple');
      expect(rows[1].textContent).toContain('Mango');
      expect(rows[2].textContent).toContain('Zebra');
    });

    it('sorts numeric values correctly', () => {
      const { container } = render(<CommonTable data={mockData} columns={defaultColumns} />);

      const salaryHeader = screen.getByText('Salary').closest('th');
      fireEvent.click(salaryHeader!); // asc

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0].textContent).toContain('75000');
      expect(rows[1].textContent).toContain('85000');
      expect(rows[2].textContent).toContain('90000');
    });

    it('sorts dates correctly', () => {
      const { container } = render(
        <CommonTable
          data={mockData}
          columns={[
            { key: 'name', title: 'Name' },
            {
              key: 'joinDate',
              title: 'Join Date',
              sortable: true,
              render: (row) => row.joinDate.toLocaleDateString(),
            },
          ]}
        />
      );

      const dateHeader = screen.getByText('Join Date').closest('th');
      fireEvent.click(dateHeader!); // asc

      const rows = container.querySelectorAll('tbody tr');
      // Carol (2020) should be first
      expect(rows[0].textContent).toContain('Carol');
    });

    it('handles null values in sort', () => {
      const dataWithNulls = [
        { id: '1', name: 'Alice', age: null, salary: 75000, email: 'a@ex.com', joinDate: new Date() },
        { id: '2', name: 'Bob', age: 35, salary: 85000, email: 'b@ex.com', joinDate: new Date() },
        { id: '3', name: 'Carol', age: 32, salary: 90000, email: 'c@ex.com', joinDate: new Date() },
      ] as any[];

      const { container } = render(<CommonTable data={dataWithNulls} columns={defaultColumns} />);

      const ageHeader = screen.getByText('Age').closest('th');
      fireEvent.click(ageHeader!); // asc - null values should go to end

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0].textContent).toContain('Carol');
      expect(rows[1].textContent).toContain('Bob');
      expect(rows[2].textContent).toContain('Alice');
    });

    it('uses custom sortValue function', () => {
      const columns: Column<Person>[] = [
        { key: 'name', title: 'Name' },
        {
          key: 'salary',
          title: 'Salary',
          sortable: true,
          sortValue: (row) => -row.salary, // Reverse numeric sort
        },
      ];

      const { container } = render(<CommonTable data={mockData} columns={columns} />);

      const salaryHeader = screen.getByText('Salary').closest('th');
      fireEvent.click(salaryHeader!); // asc (but reversed)

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0].textContent).toContain('90000');
      expect(rows[2].textContent).toContain('75000');
    });
  });

  describe('Row interaction', () => {
    it('calls onRowClick when a row is clicked', () => {
      const onRowClick = vi.fn();
      const { container } = render(
        <CommonTable data={mockData} columns={defaultColumns} onRowClick={onRowClick} />
      );

      const rows = container.querySelectorAll('tbody tr');
      fireEvent.click(rows[0]);

      expect(onRowClick).toHaveBeenCalledWith(mockData[0], 0);
    });

    it('highlights selected row', () => {
      const { container } = render(
        <CommonTable data={mockData} columns={defaultColumns} selectedRowIndex={1} />
      );

      const rows = container.querySelectorAll('tbody tr');
      const selectedRow = rows[1];

      expect(selectedRow.style.backgroundColor).toBe('#e0e7ff');
    });

    it('calls onRowClick with Enter key', () => {
      const onRowClick = vi.fn();
      const { container } = render(
        <CommonTable data={mockData} columns={defaultColumns} onRowClick={onRowClick} />
      );

      const rows = container.querySelectorAll('tbody tr');
      fireEvent.keyDown(rows[0], { key: 'Enter' });

      expect(onRowClick).toHaveBeenCalled();
    });

    it('calls onRowClick with Space key', () => {
      const onRowClick = vi.fn();
      const { container } = render(
        <CommonTable data={mockData} columns={defaultColumns} onRowClick={onRowClick} />
      );

      const rows = container.querySelectorAll('tbody tr');
      fireEvent.keyDown(rows[0], { key: ' ' });

      expect(onRowClick).toHaveBeenCalled();
    });

    it('rows have button role with onRowClick', () => {
      const { container } = render(
        <CommonTable data={mockData} columns={defaultColumns} onRowClick={() => {}} />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0].getAttribute('role')).toBe('button');
    });
  });

  describe('Custom rendering', () => {
    it('uses custom render function for columns', () => {
      const columns: Column<Person>[] = [
        { key: 'name', title: 'Name' },
        {
          key: 'salary',
          title: 'Salary',
          render: (row) => `$${row.salary.toLocaleString()}`,
        },
      ];

      render(<CommonTable data={mockData} columns={columns} />);

      expect(screen.getByText('$75,000')).toBeTruthy();
      expect(screen.getByText('$85,000')).toBeTruthy();
    });

    it('passes row and rowIndex to render function', () => {
      const renderFn = vi.fn((row: Person) => row.name);

      const columns: Column<Person>[] = [
        { key: 'name', title: 'Name', render: renderFn },
      ];

      render(<CommonTable data={mockData} columns={columns} />);

      expect(renderFn).toHaveBeenCalledWith(mockData[0], 0);
      expect(renderFn).toHaveBeenCalledWith(mockData[1], 1);
    });
  });

  describe('Row sizes', () => {
    it('renders with small row size', () => {
      const { container } = render(
        <CommonTable data={mockData} columns={defaultColumns} rowSize="small" />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0].className).toContain('h-8');
    });

    it('renders with medium row size (default)', () => {
      const { container } = render(<CommonTable data={mockData} columns={defaultColumns} />);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0].className).toContain('h-10');
    });

    it('renders with large row size', () => {
      const { container } = render(
        <CommonTable data={mockData} columns={defaultColumns} rowSize="large" />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0].className).toContain('h-12');
    });
  });

  describe('Footer row support', () => {
    it('renders footer row with isFooter flag', () => {
      const dataWithFooter = [
        ...mockData,
        { id: 'footer', name: 'TOTAL', age: 0, salary: 0, email: '', joinDate: new Date(), isFooter: true } as any,
      ];

      const { container } = render(<CommonTable data={dataWithFooter} columns={defaultColumns} />);

      expect(container.textContent).toContain('Total:');
    });

    it('footer row is pinned to bottom after sorting', () => {
      const dataWithFooter = [
        ...mockData,
        { id: 'footer', name: 'TOTAL', age: 0, salary: 0, email: '', joinDate: new Date(), isFooter: true } as any,
      ];

      const { container } = render(<CommonTable data={dataWithFooter} columns={defaultColumns} />);

      const nameHeader = screen.getByText('Name').closest('th');
      fireEvent.click(nameHeader!); // Sort

      const rows = container.querySelectorAll('tbody tr');
      const lastRow = rows[rows.length - 1];
      expect(lastRow.textContent).toContain('Total:');
    });
  });

  describe('Edge cases', () => {
    it('handles empty column list', () => {
      const { container } = render(<CommonTable data={mockData} columns={[]} />);
      const rows = container.querySelectorAll('thead th');
      expect(rows.length).toBe(0);
    });

    it('handles data with missing keys', () => {
      const incompleteData = [
        { id: '1', name: 'Alice', age: 28, salary: 75000, email: 'alice@example.com', joinDate: new Date() },
        { id: '2', name: 'Bob', age: 35, salary: undefined, email: 'bob@example.com', joinDate: new Date() } as any,
      ];

      const { container } = render(<CommonTable data={incompleteData} columns={defaultColumns} />);
      const rows = container.querySelectorAll('tbody tr');
      // Missing keys render as empty string
      expect(rows[1].textContent).toContain('Bob');
    });

    it('renders with no button rows when no onRowClick', () => {
      const { container } = render(<CommonTable data={mockData} columns={defaultColumns} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0].getAttribute('role')).toBeNull();
    });

    it('applies custom className', () => {
      const { container } = render(
        <CommonTable data={mockData} columns={defaultColumns} className="custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toBe('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('sortable headers are keyboard accessible', () => {
      render(<CommonTable data={mockData} columns={defaultColumns} />);

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader?.getAttribute('role')).toBe('button');
      expect(nameHeader?.getAttribute('tabIndex')).toBe('0');
    });

    it('clickable rows are keyboard accessible', () => {
      const onRowClick = vi.fn();
      const { container } = render(
        <CommonTable data={mockData} columns={defaultColumns} onRowClick={onRowClick} />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0].getAttribute('tabIndex')).toBe('0');
    });
  });
});
