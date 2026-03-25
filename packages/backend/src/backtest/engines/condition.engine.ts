import { Injectable, Logger } from '@nestjs/common';
import jsep = require('jsep');
import { IndicatorsService } from '../../indicators/indicators.service';

// Register 'and' / 'or' as binary operators
jsep.addBinaryOp('and', 1);
jsep.addBinaryOp('or', 1);

export type IndicatorValues = Record<string, number[]>;

type ASTNode = jsep.Expression;

@Injectable()
export class ConditionEngine {
  private readonly logger = new Logger(ConditionEngine.name);

  constructor(private readonly indicators: IndicatorsService) {}

  evaluateAll(
    conditions: string[],
    values: IndicatorValues,
    index: number,
  ): boolean {
    return conditions.every((cond) => this.evaluate(cond, values, index));
  }

  evaluate(
    condition: string,
    values: IndicatorValues,
    index: number,
  ): boolean {
    try {
      // Handle crossover/crossunder before jsep parsing
      const crossMatch = condition.match(
        /cross(over|under)\((\w+),\s*(\w+)\)/i,
      );
      if (crossMatch) {
        const type = crossMatch[1].toLowerCase();
        const a = values[crossMatch[2]];
        const b = values[crossMatch[3]];
        if (!a || !b) return false;
        return type === 'over'
          ? this.indicators.isCrossover(a, b, index)
          : this.indicators.isCrossunder(a, b, index);
      }

      const ast = jsep(condition);
      const result = this.evalNode(ast, values, index);
      return Boolean(result);
    } catch (err) {
      this.logger.warn(
        `Failed to evaluate condition "${condition}": ${err}`,
      );
      return false;
    }
  }

  private evalNode(
    node: ASTNode,
    values: IndicatorValues,
    index: number,
  ): boolean | number {
    switch (node.type) {
      case 'BinaryExpression': {
        const n = node as jsep.BinaryExpression;
        const left = this.evalNode(n.left, values, index);
        const right = this.evalNode(n.right, values, index);
        switch (n.operator) {
          case '<':
            return Number(left) < Number(right);
          case '>':
            return Number(left) > Number(right);
          case '<=':
            return Number(left) <= Number(right);
          case '>=':
            return Number(left) >= Number(right);
          case '==':
          case '===':
            return left === right;
          case '!=':
          case '!==':
            return left !== right;
          case '&&':
          case 'and':
            return Boolean(left) && Boolean(right);
          case '||':
          case 'or':
            return Boolean(left) || Boolean(right);
          case '+':
            return Number(left) + Number(right);
          case '-':
            return Number(left) - Number(right);
          case '*':
            return Number(left) * Number(right);
          case '/':
            return Number(left) / Number(right);
          default:
            this.logger.warn(`Unknown operator: ${n.operator}`);
            return false;
        }
      }
      case 'LogicalExpression': {
        const n = node as jsep.BinaryExpression;
        const left = this.evalNode(n.left, values, index);
        const right = this.evalNode(n.right, values, index);
        if (n.operator === '&&') return Boolean(left) && Boolean(right);
        if (n.operator === '||') return Boolean(left) || Boolean(right);
        return false;
      }
      case 'UnaryExpression': {
        const n = node as jsep.UnaryExpression;
        const arg = this.evalNode(n.argument, values, index);
        if (n.operator === '!') return !arg;
        if (n.operator === '-') return -Number(arg);
        return arg;
      }
      case 'Identifier': {
        const n = node as jsep.Identifier;
        const varName = n.name.toLowerCase();
        if (values[varName] !== undefined) {
          const val = values[varName][index];
          if (val === undefined || isNaN(val)) return 0;
          return val;
        }
        this.logger.warn(`Unknown variable "${varName}" in condition`);
        return 0;
      }
      case 'Literal': {
        const n = node as jsep.Literal;
        return Number(n.value);
      }
      default:
        this.logger.warn(`Unknown AST node type: ${node.type}`);
        return false;
    }
  }
}
