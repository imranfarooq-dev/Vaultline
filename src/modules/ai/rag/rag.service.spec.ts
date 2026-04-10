import { DependencyUnavailableError } from '../../../common/errors/domain.errors';
import { EMBEDDING_DIMENSIONS } from '../llm/ai.tokens';
import { ExtractiveFakeChatModel, HashingEmbeddings } from '../llm/fake-models';
import { PgVectorStore } from './pgvector.store';
import { RagService } from './rag.service';

const cosine = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);

describe('RAG building blocks (no database, no Ollama)', () => {
  it('fake embeddings are 768-dimensional unit vectors', async () => {
    const [vector] = await new HashingEmbeddings().embedDocuments(['SWIFT transfer fee']);
    expect(vector).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(cosine(vector, vector)).toBeCloseTo(1, 5);
  });

  it('texts sharing words are closer than unrelated texts', async () => {
    const e = new HashingEmbeddings();
    const query = await e.embedQuery('international swift transfer fee');
    const related = await e.embedQuery('SWIFT international transfers have a fee of Rs 2,500');
    const unrelated = await e.embedQuery('student saver accounts have no minimum balance');
    expect(cosine(query, related)).toBeGreaterThan(cosine(query, unrelated));
  });

  it('runs the full LangChain chain: retrieve -> prompt -> model -> parser', async () => {
    const store = {
      similaritySearch: jest.fn().mockResolvedValue([{ source: 'fees.md', chunkIndex: 0, content: 'SWIFT fee is Rs 2,500 plus 0.1%.', score: 0.91 }]),
    } as unknown as PgVectorStore;
    const rag = new RagService(new HashingEmbeddings(), new ExtractiveFakeChatModel(), store);

    const result = await rag.ask('What is the SWIFT fee?');
    expect(result.answer).toContain('SWIFT fee is Rs 2,500');
    expect(result.sources).toEqual([expect.objectContaining({ source: 'fees.md', score: 0.91 })]);
  });

  it('streams tokens through the same chain', async () => {
    const store = { similaritySearch: jest.fn().mockResolvedValue([{ source: 'a.md', chunkIndex: 0, content: 'Limit is Rs 50,000.', score: 0.8 }]) } as unknown as PgVectorStore;
    const rag = new RagService(new HashingEmbeddings(), new ExtractiveFakeChatModel(), store);
    let text = '';
    for await (const token of rag.stream('limit?')) text += token;
    expect(text).toContain('Limit is Rs 50,000.');
  });

  it('answers honestly when nothing relevant is indexed', async () => {
    const store = { similaritySearch: jest.fn().mockResolvedValue([]) } as unknown as PgVectorStore;
    const rag = new RagService(new HashingEmbeddings(), new ExtractiveFakeChatModel(), store);
    expect((await rag.ask('anything')).answer).toContain("don't have that information");
  });
});
