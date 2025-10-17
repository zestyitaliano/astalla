export type FunctionName = "sum" | "count" | "avg" | "min" | "max";

export interface SourceRange {
  start: number;
  end: number;
}

export interface IdentifierNode {
  type: "Identifier";
  name: string;
  range?: SourceRange;
}

export interface RefNode {
  type: "Ref";
  path: IdentifierNode[];
  range?: SourceRange;
}

export type ValuePrimitive = string | number | boolean | null;

export interface ValueNode {
  type: "Value";
  value: ValuePrimitive | ValuePrimitive[];
  range?: SourceRange;
}

export type ComparisonOperator = "=" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "between";

export type ComparisonRight = RefNode | ValueNode | Array<RefNode | ValueNode>;

export interface ComparisonNode {
  type: "Comparison";
  operator: ComparisonOperator;
  left: RefNode | ValueNode;
  right: ComparisonRight;
  range?: SourceRange;
}

export interface LogicalNode {
  type: "Logical";
  operator: "and" | "or";
  left: ConditionNode;
  right: ConditionNode;
  range?: SourceRange;
}

export interface WhereNode {
  type: "Where";
  condition: ConditionNode;
  range?: SourceRange;
}

export interface FunctionCallNode {
  type: "FunctionCall";
  name: FunctionName;
  argument: RefNode | ValueNode;
  where?: WhereNode;
  range?: SourceRange;
  nameRange?: SourceRange;
  closeRange?: SourceRange;
}

export interface ProgramNode {
  type: "Program";
  body: FunctionCallNode;
  range?: SourceRange;
}

export type ConditionNode = ComparisonNode | LogicalNode;

export type ExpressionNode = FunctionCallNode | RefNode | ValueNode | ComparisonNode | LogicalNode;
