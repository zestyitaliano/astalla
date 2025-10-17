import {
  ProgramNode,
  FunctionCallNode,
  RefNode,
  IdentifierNode,
  ValueNode,
  ComparisonNode,
  LogicalNode,
  ConditionNode,
} from "@shared/ast";

export class ParseError extends Error {
  public readonly index: number;

  constructor(message: string, index: number) {
    super(message);
    this.name = "ParseError";
    this.index = index;
  }
}

type TokenType =
  | "FUNCTION"
  | "WHERE"
  | "AND"
  | "OR"
  | "IN"
  | "BETWEEN"
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "NULL"
  | "IDENTIFIER"
  | "AT"
  | "DOT"
  | "COMMA"
  | "LPAREN"
  | "RPAREN"
  | "EQ"
  | "NEQ"
  | "GT"
  | "LT"
  | "EOF";

type Token = {
  type: TokenType;
  value: string;
  start: number;
  end: number;
};

type ComparisonOperator = ComparisonNode["operator"];

const KEYWORDS: Record<string, TokenType> = {
  sum: "FUNCTION",
  count: "FUNCTION",
  avg: "FUNCTION",
  min: "FUNCTION",
  max: "FUNCTION",
  where: "WHERE",
  and: "AND",
  or: "OR",
  in: "IN",
  between: "BETWEEN",
  true: "BOOLEAN",
  false: "BOOLEAN",
  null: "NULL",
};

class Tokenizer {
  private readonly input: string;
  private readonly length: number;
  private position = 0;

  constructor(input: string) {
    this.input = input;
    this.length = input.length;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.position < this.length) {
      const current = this.input[this.position];

      if (/\s/.test(current)) {
        this.consumeWhitespace();
        continue;
      }

      if (current === "@") {
        tokens.push(this.createToken("AT", "@", 1));
        continue;
      }

      if (current === ".") {
        tokens.push(this.createToken("DOT", ".", 1));
        continue;
      }

      if (current === ",") {
        tokens.push(this.createToken("COMMA", ",", 1));
        continue;
      }

      if (current === "(") {
        tokens.push(this.createToken("LPAREN", "(", 1));
        continue;
      }

      if (current === ")") {
        tokens.push(this.createToken("RPAREN", ")", 1));
        continue;
      }

      if (current === "=") {
        tokens.push(this.createToken("EQ", "=", 1));
        continue;
      }

      if (current === "!" && this.peek(1) === "=") {
        tokens.push(this.createToken("NEQ", "!=", 2));
        continue;
      }

      if (current === ">") {
        tokens.push(this.createToken("GT", ">", 1));
        continue;
      }

      if (current === "<") {
        tokens.push(this.createToken("LT", "<", 1));
        continue;
      }

      if (current === "'" || current === "\"") {
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

      throw new ParseError(`Unexpected character \"${current}\"`, this.position);
    }

    tokens.push({ type: "EOF", value: "", start: this.length, end: this.length });
    return tokens;
  }

  private consumeWhitespace() {
    while (this.position < this.length && /\s/.test(this.input[this.position]!)) {
      this.position += 1;
    }
  }

  private consumeWord(): Token {
    const start = this.position;
    while (this.position < this.length && /[A-Za-z0-9_]/.test(this.input[this.position]!)) {
      this.position += 1;
    }

    const value = this.input.slice(start, this.position);
    const lowered = value.toLowerCase();
    const keywordType = KEYWORDS[lowered];

    if (keywordType) {
      return { type: keywordType, value: lowered, start, end: this.position };
    }

    return { type: "IDENTIFIER", value, start, end: this.position };
  }

  private consumeNumber(): Token {
    const start = this.position;
    if (this.input[this.position] === "-") {
      this.position += 1;
    }

    while (this.position < this.length && /[0-9]/.test(this.input[this.position]!)) {
      this.position += 1;
    }

    if (this.input[this.position] === ".") {
      this.position += 1;
      while (this.position < this.length && /[0-9]/.test(this.input[this.position]!)) {
        this.position += 1;
      }
    }

    const value = this.input.slice(start, this.position);
    return { type: "NUMBER", value, start, end: this.position };
  }

  private consumeString(): Token {
    const quote = this.input[this.position]!;
    const start = this.position;
    this.position += 1;
    let escaped = false;
    let value = "";

    while (this.position < this.length) {
      const char = this.input[this.position]!;
      this.position += 1;

      if (escaped) {
        value += char;
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        return { type: "STRING", value, start, end: this.position };
      }

      value += char;
    }

    throw new ParseError("Unterminated string literal", start);
  }

  private createToken(type: TokenType, value: string, length: number): Token {
    const start = this.position;
    this.position += length;
    return { type, value, start, end: this.position };
  }

  private peek(offset: number): string | undefined {
    return this.input[this.position + offset];
  }
}

class ReferenceParser {
  private tokens: Token[] = [];
  private current = 0;

  parse(input: string): ProgramNode {
    const tokenizer = new Tokenizer(input);
    this.tokens = tokenizer.tokenize();
    this.current = 0;

    const body = this.parseFunctionCall();
    this.expect("EOF");

    return {
      type: "Program",
      body,
    };
  }

  private parseFunctionCall(): FunctionCallNode {
    const fnToken = this.expect("FUNCTION");
    this.expect("LPAREN");
    const argument = this.parseFunctionArgument();
    let whereClause: FunctionCallNode["where"];
    if (this.check("WHERE")) {
      whereClause = this.parseWhereClause();
    }
    this.expect("RPAREN");

    return {
      type: "FunctionCall",
      name: fnToken.value as FunctionCallNode["name"],
      argument,
      where: whereClause,
    };
  }

  private parseFunctionArgument(): FunctionCallNode["argument"] {
    if (this.check("AT")) {
      return this.parseRef();
    }

    return this.parseValue();
  }

  private parseWhereClause(): FunctionCallNode["where"] {
    this.expect("WHERE");
    const condition = this.parseOrExpression();
    return { type: "Where", condition };
  }

  private parseOrExpression(): ConditionNode {
    let left = this.parseAndExpression();

    while (this.match("OR")) {
      const right = this.parseAndExpression();
      left = {
        type: "Logical",
        operator: "or",
        left,
        right,
      } satisfies LogicalNode;
    }

    return left;
  }

  private parseAndExpression(): ConditionNode {
    let left = this.parseCondition();

    while (this.match("AND")) {
      const right = this.parseCondition();
      left = {
        type: "Logical",
        operator: "and",
        left,
        right,
      } satisfies LogicalNode;
    }

    return left;
  }

  private parseCondition(): ConditionNode {
    if (this.match("LPAREN")) {
      const expression = this.parseOrExpression();
      this.expect("RPAREN");
      return expression;
    }

    return this.parseComparison();
  }

  private parseComparison(): ComparisonNode {
    const left = this.parseOperand();

    if (this.match("IN")) {
      this.expect("LPAREN");
      const values = this.parseValueList();
      this.expect("RPAREN");
      return {
        type: "Comparison",
        operator: "in",
        left,
        right: values,
      };
    }

    if (this.match("BETWEEN")) {
      const start = this.parseValue();
      this.expect("AND");
      const end = this.parseValue();
      return {
        type: "Comparison",
        operator: "between",
        left,
        right: [start, end],
      };
    }

    const operatorToken = this.expectAny("EQ", "NEQ", "GT", "LT");
    const operator = this.mapOperator(operatorToken.type);
    const right = this.parseOperand();

    return {
      type: "Comparison",
      operator,
      left,
      right,
    };
  }

  private parseOperand(): RefNode | ValueNode {
    if (this.check("AT")) {
      return this.parseRef();
    }

    return this.parseValue();
  }

  private parseRef(): RefNode {
    this.expect("AT");
    const identifiers: IdentifierNode[] = [];
    identifiers.push(this.parseIdentifier());

    while (this.match("DOT")) {
      identifiers.push(this.parseIdentifier());
    }

    return {
      type: "Ref",
      path: identifiers,
    };
  }

  private parseIdentifier(): IdentifierNode {
    const token = this.expect("IDENTIFIER");
    return {
      type: "Identifier",
      name: token.value,
    };
  }

  private parseValue(): ValueNode {
    const token = this.advance();

    switch (token.type) {
      case "STRING":
        return { type: "Value", value: token.value };
      case "NUMBER":
        return { type: "Value", value: Number(token.value) };
      case "BOOLEAN":
        return { type: "Value", value: token.value === "true" };
      case "NULL":
        return { type: "Value", value: null };
      case "IDENTIFIER":
        return { type: "Value", value: token.value };
      default:
        throw this.error(token, "Expected a value");
    }
  }

  private parseValueList(): ValueNode[] {
    const values: ValueNode[] = [];
    values.push(this.parseValue());

    while (this.match("COMMA")) {
      values.push(this.parseValue());
    }

    return values;
  }

  private mapOperator(tokenType: TokenType): ComparisonOperator {
    switch (tokenType) {
      case "EQ":
        return "=";
      case "NEQ":
        return "!=";
      case "GT":
        return ">";
      case "LT":
        return "<";
      default:
        throw new ParseError(`Unsupported operator token: ${tokenType}`, this.previous().start);
    }
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }

    return false;
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw this.error(token, `Expected ${type} but found ${token.type}`);
    }
    return this.advance();
  }

  private expectAny(...types: TokenType[]): Token {
    const token = this.peek();
    if (!types.includes(token.type)) {
      throw this.error(token, `Expected one of ${types.join(", ")} but found ${token.type}`);
    }
    return this.advance();
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current += 1;
    }
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private peek(): Token {
    return this.tokens[this.current]!;
  }

  private previous(): Token {
    return this.tokens[this.current - 1]!;
  }

  private error(token: Token, message: string): ParseError {
    return new ParseError(message, token.start);
  }
}

export function parseExpression(input: string): ProgramNode {
  const parser = new ReferenceParser();
  return parser.parse(input);
}
