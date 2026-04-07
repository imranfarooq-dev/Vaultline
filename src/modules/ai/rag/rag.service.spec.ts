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
});
