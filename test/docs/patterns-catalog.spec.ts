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

  it.each(PATTERN_CATALOG.map((p) => [p.pattern, p.file]))('%s: file exists and carries its teaching header', (pattern, file) => {
    const path = join(root, file);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, 'utf8').toUpperCase()).toContain(`PATTERN: ${pattern.toUpperCase()}`);
  });

  it('docs/PATTERNS.md mentions every pattern', () => {
    const doc = readFileSync(join(root, 'docs', 'PATTERNS.md'), 'utf8');
    for (const pattern of GOF_23) expect(doc).toContain(pattern);
  });
});
