import { CurrencyRegistry } from '../core/currency.flyweight';
import { CsvStatementRenderer, DetailedStatement, JsonStatementRenderer, MiniStatement, PlainTextStatementRenderer, RENDERERS, STATEMENTS, StatementData } from './statement.bridge';

describe('Bridge: statements x renderers', () => {
  const data: StatementData = {
    accountNumber: 'PK00TEST',
  };
});
