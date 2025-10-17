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

const hgdgfsRows: TableRow[] = [
  { Id: 'hgdgfs-1', Name: 'Sample HG 1', Value: 12 },
  { Id: 'hgdgfs-2', Name: 'Sample HG 2', Value: 24 },
];

const lteoiruh9Rows: TableRow[] = [
  { Id: 'lteoiruh9-1', Name: 'LTE 1', Amount: 5 },
  { Id: 'lteoiruh9-2', Name: 'LTE 2', Amount: 10 },
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
  hgdgfs: {
    rows: hgdgfsRows,
    columns: ['Id', 'Name', 'Value'],
  },
  lteoiruh9: {
    rows: lteoiruh9Rows,
    columns: ['Id', 'Name', 'Amount'],
  },
};

export const getTableRows = (tableName: string): TableRow[] => tables[tableName]?.rows ?? [];

export const hasColumn = (tableName: string, columnName: string): boolean =>
  Boolean(tables[tableName]?.columns.includes(columnName));

export const listTables = (): string[] => Object.keys(tables);
