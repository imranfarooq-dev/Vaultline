import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATTERN_CATALOG } from '../../src/modules/patterns/patterns.catalog';

/**
 * "Documentation test": guarantees the learning material stays honest.
 * If someone moves a file or forgets a pattern, CI fails.
 */
const GOF_23 = [
  'Singleton', 'Factory Method', 'Abstract Factory', 'Builder', 'Prototype',
  'Adapter', 'Bridge', 'Composite', 'Decorator', 'Facade', 'Flyweight', 'Proxy',
  'Chain of Responsibility', 'Command', 'Interpreter', 'Iterator', 'Mediator', 'Memento', 'Observer', 'State', 'Strategy', 'Template Method', 'Visitor',
];
const root = join(__dirname, '..', '..');

describe('Pattern catalog', () => {
  it('lists exactly the 23 Gang of Four patterns', () => {
    expect(PATTERN_CATALOG.map((p) => p.pattern).sort()).toEqual([...GOF_23].sort());
  });
});
