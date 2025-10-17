export type FunctionName = 'sum' | 'count' | 'avg' | 'min' | 'max';

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface RefNode {
  type: 'Ref';
  path: IdentifierNode[];
}

export type ValuePrimitive = string | number | boolean | null;

export interface ValueNode {
  type: 'Value';
  value: ValuePrimitive | ValuePrimitive[];
}

export type ComparisonOperator = '=' | '!=' | '>' | '<' | 'in' | 'between';

export type ComparisonRight = RefNode | ValueNode | ValueNode[];

export interface ComparisonNode {
  type: 'Comparison';
  operator: ComparisonOperator;
  left: RefNode | ValueNode;
  right: ComparisonRight;
}

export interface LogicalNode {
  type: 'Logical';
  operator: 'and' | 'or';
  left: ConditionNode;
  right: ConditionNode;
}

export interface WhereNode {
  type: 'Where';
  condition: ConditionNode;
}

export interface FunctionCallNode {
  type: 'FunctionCall';
  name: FunctionName;
  argument: RefNode | ValueNode;
  where?: WhereNode;
}

export interface ProgramNode {
  type: 'Program';
  body: FunctionCallNode;
}

export type ConditionNode = ComparisonNode | LogicalNode;
