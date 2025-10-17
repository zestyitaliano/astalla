import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  ComparisonNode,
  ConditionNode,
  FunctionCallNode,
  IdentifierNode,
  LogicalNode,
  ProgramNode,
  RefNode,
  ValueNode,
  WhereNode,
} from './astTypes.js';
import { getSchemaGraphForUser } from '../schemaRegistry/registry.js';
import {
  executeReference,
  ExecutionPlanError,
  PermissionError,
  validateProgramAst,
} from './executeReference.js';

const createRef = (table: string, column: string): RefNode => ({
  type: 'Ref',
  path: [
    { type: 'Identifier', name: table },
    { type: 'Identifier', name: column },
  ],
});

const createValue = (value: ValueNode['value']): ValueNode => ({
  type: 'Value',
  value,
});

const createWhere = (left: RefNode, operator: string, right: ValueNode | RefNode | ValueNode[]): WhereNode => ({
  type: 'Where',
  condition: {
    type: 'Comparison',
    operator: operator as any,
    left,
    right: right as any,
  },
});

describe('executeReference', () => {
  const graph = getSchemaGraphForUser('dev-user');

  it('computes the sum of total rent', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'sum',
        argument: createRef('Leases', 'TotalRent'),
      },
    };

    const result = await executeReference({ ast, graph, userId: 'dev-user' });

    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0]?.value, 8550);
    assert.ok(/SELECT SUM\("leases"\."TotalRent"\)/.test(result.sqlText));
  });

  it('filters by status and computes the average', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'avg',
        argument: createRef('Leases', 'TotalRent'),
        where: createWhere(createRef('Leases', 'Status'), '=', createValue('Active')),
      },
    };

    const result = await executeReference({ ast, graph, userId: 'dev-user' });

    const value = Number(result.rows[0]?.value);
    assert.ok(Math.abs(value - 2133.3333333333335) < 1e-6);
    assert.ok(/WHERE "leases"\."Status" = \?/.test(result.sqlText));
  });

  it('automatically joins related tables when filters reference them', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'sum',
        argument: createRef('Leases', 'TotalRent'),
        where: createWhere(createRef('Units', 'Bedrooms'), '=', createValue(2)),
      },
    };

    const result = await executeReference({ ast, graph, userId: 'dev-user' });

    assert.equal(result.rows[0]?.value, 4250);
    assert.ok(/LEFT JOIN "units" ON "leases"\."UnitId" = "units"\."Id"/.test(result.sqlText));
  });

  it('supports logical conditions', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'count',
        argument: createRef('Leases', 'Id'),
        where: {
          type: 'Where',
          condition: {
            type: 'Logical',
            operator: 'or',
            left: {
              type: 'Comparison',
              operator: '=',
              left: createRef('Leases', 'Status'),
              right: createValue('Pending'),
            },
            right: {
              type: 'Comparison',
              operator: '=',
              left: createRef('Leases', 'Year'),
              right: createValue(2024),
            },
          },
        },
      },
    };

    const result = await executeReference({ ast, graph, userId: 'dev-user' });

    assert.equal(result.rows[0]?.value, 3);
  });

  it('throws when accessing a restricted column', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'sum',
        argument: createRef('Leases', 'ResidentEmail'),
      },
    };

    await assert.rejects(() => executeReference({ ast, graph, userId: 'dev-user' }), PermissionError);
  });

  it('throws when a join path cannot be resolved', async () => {
    const ast: ProgramNode = {
      type: 'Program',
      body: {
        type: 'FunctionCall',
        name: 'sum',
        argument: createRef('Leases', 'TotalRent'),
        where: createWhere(createRef('Properties', 'Name'), '=', createValue('River Place')),
      },
    };

    await assert.rejects(() => executeReference({ ast, graph, userId: 'dev-user' }), ExecutionPlanError);
  });
});

describe('executeReference from canonical DSL', () => {
  const graph = getSchemaGraphForUser('dev-user');

  it('evaluates aggregations without filters', async () => {
    const ast = validateProgramAst(parseCanonicalDsl('sum(@Leases.TotalRent)'));
    const result = await executeReference({ ast, graph, userId: 'dev-user' });

    assert.equal(result.rowCount, 1);
    assert.equal(result.rows[0]?.value, 8550);
  });

  it('handles equality filters', async () => {
    const ast = validateProgramAst(
      parseCanonicalDsl("avg(@Leases.TotalRent where @Leases.Status = 'Active')"),
    );
    const result = await executeReference({ ast, graph, userId: 'dev-user' });

    const value = Number(result.rows[0]?.value);
    assert.ok(Math.abs(value - 2133.3333333333335) < 1e-6);
  });

  it('supports joins and range comparisons', async () => {
    const ast = validateProgramAst(
      parseCanonicalDsl(
        'sum(@Leases.TotalRent where @Units.Bedrooms = 2 and @Leases.Year between 2024 and 2025)',
      ),
    );
    const result = await executeReference({ ast, graph, userId: 'dev-user' });

    assert.equal(result.rows[0]?.value, 4250);
  });
});

type CanonicalTokenType =
  | 'FUNCTION'
  | 'WHERE'
  | 'AND'
  | 'OR'
  | 'IN'
  | 'BETWEEN'
  | 'NUMBER'
  | 'STRING'
  | 'BOOLEAN'
  | 'NULL'
  | 'IDENTIFIER'
  | 'AT'
  | 'DOT'
  | 'COMMA'
  | 'LPAREN'
  | 'RPAREN'
  | 'EQ'
  | 'NEQ'
  | 'GT'
  | 'LT'
  | 'EOF';

interface CanonicalToken {
  type: CanonicalTokenType;
  value: string;
  start: number;
  end: number;
}

class CanonicalParseError extends Error {
  constructor(message: string, public readonly index: number) {
    super(message);
    this.name = 'CanonicalParseError';
  }
}

const CANONICAL_KEYWORDS: Record<string, CanonicalTokenType> = {
  sum: 'FUNCTION',
  count: 'FUNCTION',
  avg: 'FUNCTION',
  min: 'FUNCTION',
  max: 'FUNCTION',
  where: 'WHERE',
  and: 'AND',
  or: 'OR',
  in: 'IN',
  between: 'BETWEEN',
  true: 'BOOLEAN',
  false: 'BOOLEAN',
  null: 'NULL',
};

class CanonicalTokenizer {
  private position = 0;

  constructor(private readonly input: string, private readonly length = input.length) {}

  tokenize(): CanonicalToken[] {
    const tokens: CanonicalToken[] = [];

    while (this.position < this.length) {
      const current = this.input[this.position]!;

      if (/\s/.test(current)) {
        this.consumeWhitespace();
        continue;
      }

      if (current === '@') {
        tokens.push(this.createToken('AT', '@', 1));
        continue;
      }

      if (current === '.') {
        tokens.push(this.createToken('DOT', '.', 1));
        continue;
      }

      if (current === ',') {
        tokens.push(this.createToken('COMMA', ',', 1));
        continue;
      }

      if (current === '(') {
        tokens.push(this.createToken('LPAREN', '(', 1));
        continue;
      }

      if (current === ')') {
        tokens.push(this.createToken('RPAREN', ')', 1));
        continue;
      }

      if (current === '=') {
        tokens.push(this.createToken('EQ', '=', 1));
        continue;
      }

      if (current === '!' && this.peek(1) === '=') {
        tokens.push(this.createToken('NEQ', '!=', 2));
        continue;
      }

      if (current === '>') {
        tokens.push(this.createToken('GT', '>', 1));
        continue;
      }

      if (current === '<') {
        tokens.push(this.createToken('LT', '<', 1));
        continue;
      }

      if (current === "'" || current === '"') {
        tokens.push(this.consumeString());
        continue;
      }

      if (/[-0-9]/.test(current)) {
        tokens.push(this.consumeNumber());
        continue;
      }

      if (/[A-Za-z_]/.test(current)) {
        tokens.push(this.consumeWord());
        continue;
      }

      throw new CanonicalParseError(`Unexpected character "${current}"`, this.position);
    }

    tokens.push({ type: 'EOF', value: '', start: this.length, end: this.length });
    return tokens;
  }

  private consumeWhitespace() {
    while (this.position < this.length && /\s/.test(this.input[this.position]!)) {
      this.position += 1;
    }
  }

  private consumeWord(): CanonicalToken {
    const start = this.position;
    while (this.position < this.length && /[A-Za-z0-9_]/.test(this.input[this.position]!)) {
      this.position += 1;
    }

    const value = this.input.slice(start, this.position);
    const lowered = value.toLowerCase();
    const keyword = CANONICAL_KEYWORDS[lowered];
    if (keyword) {
      return { type: keyword, value: keyword === 'FUNCTION' ? lowered : lowered, start, end: this.position };
    }

    return { type: 'IDENTIFIER', value, start, end: this.position };
  }

  private consumeNumber(): CanonicalToken {
    const start = this.position;
    if (this.input[this.position] === '-') {
      this.position += 1;
    }

    while (this.position < this.length && /[0-9]/.test(this.input[this.position]!)) {
      this.position += 1;
    }

    if (this.input[this.position] === '.') {
      this.position += 1;
      while (this.position < this.length && /[0-9]/.test(this.input[this.position]!)) {
        this.position += 1;
      }
    }

    const value = this.input.slice(start, this.position);
    return { type: 'NUMBER', value, start, end: this.position };
  }

  private consumeString(): CanonicalToken {
    const quote = this.input[this.position]!;
    const start = this.position;
    this.position += 1;
    let escaped = false;
    let value = '';

    while (this.position < this.length) {
      const char = this.input[this.position]!;
      this.position += 1;

      if (escaped) {
        value += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === quote) {
        return { type: 'STRING', value, start, end: this.position };
      }

      value += char;
    }

    throw new CanonicalParseError('Unterminated string literal', start);
  }

  private createToken(type: CanonicalTokenType, value: string, length: number): CanonicalToken {
    const start = this.position;
    this.position += length;
    return { type, value, start, end: this.position };
  }

  private peek(offset: number): string | undefined {
    return this.input[this.position + offset];
  }
}

class CanonicalParser {
  private tokens: CanonicalToken[] = [];
  private current = 0;

  parse(input: string): ProgramNode {
    const tokenizer = new CanonicalTokenizer(input);
    this.tokens = tokenizer.tokenize();
    this.current = 0;

    const body = this.parseFunctionCall();
    this.expect('EOF');
    return { type: 'Program', body } satisfies ProgramNode;
  }

  private parseFunctionCall(): FunctionCallNode {
    const fnToken = this.expect('FUNCTION');
    this.expect('LPAREN');
    const argument = this.parseFunctionArgument();
    let whereClause: FunctionCallNode['where'];
    if (this.check('WHERE')) {
      whereClause = this.parseWhereClause();
    }
    this.expect('RPAREN');

    return {
      type: 'FunctionCall',
      name: fnToken.value as FunctionCallNode['name'],
      argument,
      where: whereClause,
    } satisfies FunctionCallNode;
  }

  private parseFunctionArgument(): FunctionCallNode['argument'] {
    if (this.check('AT')) {
      return this.parseRef();
    }
    return this.parseValue();
  }

  private parseWhereClause(): FunctionCallNode['where'] {
    this.expect('WHERE');
    const condition = this.parseOrExpression();
    return { type: 'Where', condition } satisfies WhereNode;
  }

  private parseOrExpression(): ConditionNode {
    let left = this.parseAndExpression();

    while (this.match('OR')) {
      const right = this.parseAndExpression();
      left = { type: 'Logical', operator: 'or', left, right } satisfies LogicalNode;
    }

    return left;
  }

  private parseAndExpression(): ConditionNode {
    let left = this.parseCondition();

    while (this.match('AND')) {
      const right = this.parseCondition();
      left = { type: 'Logical', operator: 'and', left, right } satisfies LogicalNode;
    }

    return left;
  }

  private parseCondition(): ConditionNode {
    if (this.match('LPAREN')) {
      const expression = this.parseOrExpression();
      this.expect('RPAREN');
      return expression;
    }

    return this.parseComparison();
  }

  private parseComparison(): ComparisonNode {
    const left = this.parseOperand();

    if (this.match('IN')) {
      this.expect('LPAREN');
      const values = this.parseValueList();
      this.expect('RPAREN');
      return { type: 'Comparison', operator: 'in', left, right: values } satisfies ComparisonNode;
    }

    if (this.match('BETWEEN')) {
      const start = this.parseValue();
      this.expect('AND');
      const end = this.parseValue();
      return { type: 'Comparison', operator: 'between', left, right: [start, end] } satisfies ComparisonNode;
    }

    const operatorToken = this.expectAny('EQ', 'NEQ', 'GT', 'LT');
    const operator = this.mapOperator(operatorToken.type);
    const right = this.parseOperand();
    return { type: 'Comparison', operator, left, right } satisfies ComparisonNode;
  }

  private parseOperand(): RefNode | ValueNode {
    if (this.check('AT')) {
      return this.parseRef();
    }
    return this.parseValue();
  }

  private parseRef(): RefNode {
    this.expect('AT');
    const path: IdentifierNode[] = [];
    path.push(this.parseIdentifier());
    while (this.match('DOT')) {
      path.push(this.parseIdentifier());
    }
    return { type: 'Ref', path } satisfies RefNode;
  }

  private parseIdentifier(): IdentifierNode {
    const token = this.expect('IDENTIFIER');
    return { type: 'Identifier', name: token.value } satisfies IdentifierNode;
  }

  private parseValue(): ValueNode {
    const token = this.advance();
    switch (token.type) {
      case 'STRING':
        return { type: 'Value', value: token.value } satisfies ValueNode;
      case 'NUMBER':
        return { type: 'Value', value: Number(token.value) } satisfies ValueNode;
      case 'BOOLEAN':
        return { type: 'Value', value: token.value === 'true' } satisfies ValueNode;
      case 'NULL':
        return { type: 'Value', value: null } satisfies ValueNode;
      case 'IDENTIFIER':
        return { type: 'Value', value: token.value } satisfies ValueNode;
      default:
        throw new CanonicalParseError('Expected value', token.start);
    }
  }

  private parseValueList(): ValueNode[] {
    const values: ValueNode[] = [];
    values.push(this.parseValue());
    while (this.match('COMMA')) {
      values.push(this.parseValue());
    }
    return values;
  }

  private mapOperator(tokenType: CanonicalTokenType): ComparisonNode['operator'] {
    switch (tokenType) {
      case 'EQ':
        return '=';
      case 'NEQ':
        return '!=';
      case 'GT':
        return '>';
      case 'LT':
        return '<';
      default:
        throw new CanonicalParseError(`Unsupported operator token: ${tokenType}`, this.previous().start);
    }
  }

  private match(type: CanonicalTokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: CanonicalTokenType): CanonicalToken {
    const token = this.peek();
    if (token.type !== type) {
      throw new CanonicalParseError(`Expected ${type} but found ${token.type}`, token.start);
    }
    return this.advance();
  }

  private expectAny(...types: CanonicalTokenType[]): CanonicalToken {
    const token = this.peek();
    if (!types.includes(token.type)) {
      throw new CanonicalParseError(
        `Expected one of ${types.join(', ')} but found ${token.type}`,
        token.start,
      );
    }
    return this.advance();
  }

  private check(type: CanonicalTokenType): boolean {
    return this.peek().type === type;
  }

  private advance(): CanonicalToken {
    if (!this.isAtEnd()) {
      this.current += 1;
    }
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): CanonicalToken {
    return this.tokens[this.current]!;
  }

  private previous(): CanonicalToken {
    return this.tokens[this.current - 1]!;
  }
}

const parseCanonicalDsl = (input: string): ProgramNode => {
  const parser = new CanonicalParser();
  return parser.parse(input);
};
