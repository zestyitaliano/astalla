export interface TableRow {
  [column: string]: any;
}

interface TableData {
  rows: TableRow[];
  columns: string[];
}

const unitsRows: TableRow[] = [
  { Id: 'unit-1', Name: 'Unit 1A', Bedrooms: 1, Bathrooms: 1 },
  { Id: 'unit-2', Name: 'Unit 2B', Bedrooms: 2, Bathrooms: 1 },
  { Id: 'unit-3', Name: 'Unit 3C', Bedrooms: 3, Bathrooms: 2 },
];

const leasesRows: TableRow[] = [
  { Id: 'lease-1', UnitId: 'unit-1', TotalRent: 1200, Status: 'Active', Year: 2024, ResidentEmail: 'alice@example.com' },
  { Id: 'lease-2', UnitId: 'unit-2', TotalRent: 2100, Status: 'Active', Year: 2024, ResidentEmail: 'bob@example.com' },
  { Id: 'lease-3', UnitId: 'unit-2', TotalRent: 2150, Status: 'Pending', Year: 2025, ResidentEmail: 'carol@example.com' },
  { Id: 'lease-4', UnitId: 'unit-3', TotalRent: 3100, Status: 'Active', Year: 2025, ResidentEmail: 'dave@example.com' },
];

const tables: Record<string, TableData> = {
  units: {
    rows: unitsRows,
    columns: ['Id', 'Name', 'Bedrooms', 'Bathrooms'],
  },
  leases: {
    rows: leasesRows,
    columns: ['Id', 'UnitId', 'TotalRent', 'Status', 'Year', 'ResidentEmail'],
  },
};

export const getTableRows = (tableName: string): TableRow[] => tables[tableName]?.rows ?? [];

export const hasColumn = (tableName: string, columnName: string): boolean =>
  Boolean(tables[tableName]?.columns.includes(columnName));

export const listTables = (): string[] => Object.keys(tables);
