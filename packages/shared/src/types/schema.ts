export type ReferenceCardinality = 'single' | 'multi';

export interface ReferenceConfig {
  targetTableId: string;
  displayColumnId: string | null;
  cardinality: ReferenceCardinality;
  enforceForeignKey: boolean;
}

export interface SchemaColumn {
  id: string;
  name: string;
  type: 'reference' | string;
  isPII?: boolean;
  referenceConfig?: ReferenceConfig;
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
