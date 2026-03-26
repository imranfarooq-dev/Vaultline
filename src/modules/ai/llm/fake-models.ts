import { Embeddings } from '@langchain/core/embeddings';
import { SimpleChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage } from '@langchain/core/messages';
import { EMBEDDING_DIMENSIONS } from './ai.tokens';

/**
 * Deterministic "hashing" embeddings: each word is hashed into one of 768
 * buckets. Texts that share words end up close together, so similarity search
 * behaves sensibly in tests and on machines without Ollama.
 * (Real embeddings understand MEANING; this only understands shared words.)
 */
export class HashingEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.vectorize(text));
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.vectorize(text);
  }
}
