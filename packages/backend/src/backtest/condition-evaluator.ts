export interface ConditionVariables {
  [key: string]: number;
}

type Operator = '>' | '<' | '>=' | '<=' | '==' | '!=';

const OPERATORS: Operator[] = ['>=', '<=', '!=', '==', '>', '<'];

function findOperator(expression: string): { operator: Operator; left: string; right: string } | null {
  for (const op of OPERATORS) {
    const idx = expression.indexOf(op);
    if (idx !== -1) {
      return {
        operator: op,
        left: expression.slice(0, idx).trim(),
        right: expression.slice(idx + op.length).trim(),
      };
    }
  }
  return null;
}

function evaluateMathExpression(expr: string, variables: ConditionVariables): number {
  const tokens = tokenize(expr);
  return parseAddSub(tokens, variables);
}

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let current = '';

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === ' ') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '(' || ch === ')') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(ch);
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

let pos = 0;

function parseAddSub(tokens: string[], variables: ConditionVariables): number {
  let result = parseMulDiv(tokens, variables);
  while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
    const op = tokens[pos++];
    const right = parseMulDiv(tokens, variables);
    result = op === '+' ? result + right : result - right;
  }
  return result;
}

function parseMulDiv(tokens: string[], variables: ConditionVariables): number {
  let result = parsePrimary(tokens, variables);
  while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
    const op = tokens[pos++];
    const right = parsePrimary(tokens, variables);
    result = op === '*' ? result * right : result / right;
  }
  return result;
}

function parsePrimary(tokens: string[], variables: ConditionVariables): number {
  if (pos >= tokens.length) {
    throw new Error('Unexpected end of expression');
  }

  const token = tokens[pos];

  if (token === '(') {
    pos++;
    const result = parseAddSub(tokens, variables);
    if (tokens[pos] !== ')') {
      throw new Error('Missing closing parenthesis');
    }
    pos++;
    return result;
  }

  pos++;
  const num = Number(token);
  if (!isNaN(num)) {
    return num;
  }

  if (token in variables) {
    return variables[token];
  }

  throw new Error(`Unknown variable: ${token}`);
}

function evaluateSide(expr: string, variables: ConditionVariables): number {
  pos = 0;
  return evaluateMathExpression(expr, variables);
}

function compare(left: number, operator: Operator, right: number): boolean {
  switch (operator) {
    case '>': return left > right;
    case '<': return left < right;
    case '>=': return left >= right;
    case '<=': return left <= right;
    case '==': return left === right;
    case '!=': return left !== right;
  }
}

function evaluateSingleCondition(condition: string, variables: ConditionVariables): boolean {
  const parsed = findOperator(condition);
  if (!parsed) {
    throw new Error(`Invalid condition: no comparison operator found in "${condition}"`);
  }

  const leftVal = evaluateSide(parsed.left, variables);
  const rightVal = evaluateSide(parsed.right, variables);

  return compare(leftVal, parsed.operator, rightVal);
}

export function evaluateCondition(condition: string, variables: ConditionVariables): boolean {
  const trimmed = condition.trim();
  if (!trimmed) {
    throw new Error('Empty condition');
  }

  // Split by " or " first (lower precedence)
  const orParts = trimmed.split(/\s+or\s+/i);
  if (orParts.length > 1) {
    return orParts.some((part) => evaluateCondition(part, variables));
  }

  // Split by " and " (higher precedence)
  const andParts = trimmed.split(/\s+and\s+/i);
  if (andParts.length > 1) {
    return andParts.every((part) => evaluateSingleCondition(part, variables));
  }

  return evaluateSingleCondition(trimmed, variables);
}
