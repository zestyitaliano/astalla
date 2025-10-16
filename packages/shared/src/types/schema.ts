export interface SchemaColumn {
  id: string;
  name: string;
  type: string;
  isPII?: boolean;
}

export interface SchemaForeignKey {
  fromTable: string;
  fromCol: string;
  toTable: string;
  toCol: string;
}

export interface SchemaTable {
  id: string;
  name: string;
  label?: string;
  columns: SchemaColumn[];
  fks: SchemaForeignKey[];
}

export interface SchemaGraph {
  tables: SchemaTable[];
}
