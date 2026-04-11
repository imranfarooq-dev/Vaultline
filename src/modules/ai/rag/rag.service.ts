import { Inject, Injectable } from '@nestjs/common';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { DependencyUnavailableError } from '../../../common/errors/domain.errors';
import { CHAT_MODEL, EMBEDDINGS } from '../llm/ai.tokens';
import { PgVectorStore, ScoredChunk } from './pgvector.store';

const SYSTEM_PROMPT = `You are NestBank's helpful assistant.
Answer ONLY using the CONTEXT below. If the answer is not in the context, say
"I don't have that information, please contact NestBank support." Never invent
fees, limits or rates. Keep answers short and mention amounts exactly as written.`;

/**
 * RAG step 2 - RETRIEVAL + GENERATION (on every question):
 *
 *   question --embed--> vector --pgvector search--> top-k chunks
 *        \                                              |
 *         +-----------> prompt(context + question) <----+
 *                              |
 *                         chat model (Ollama llama3.2)
 *                              |
 *                        StringOutputParser -> answer
 *
 * The prompt -> model -> parser part is a LangChain "runnable sequence" (LCEL).
 */
@Injectable()
export class RagService {
  private readonly prompt = ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    ['human', 'CONTEXT:\n{context}\n\nQUESTION: {question}'],
  ]);

  constructor(
    @Inject(EMBEDDINGS) private readonly embeddings: Embeddings,
    @Inject(CHAT_MODEL) private readonly chatModel: BaseChatModel,
    private readonly store: PgVectorStore,
  ) {}

  private get chain() {
    return RunnableSequence.from([this.prompt, this.chatModel, new StringOutputParser()]);
  }

  async retrieve(question: string, k = 4): Promise<ScoredChunk[]> {
    try {
      const queryVector = await this.embeddings.embedQuery(question);
      return await this.store.similaritySearch(queryVector, k, 0.05);
    } catch (error) {
      if (error instanceof DependencyUnavailableError) throw error;
      throw new DependencyUnavailableError(`Retrieval failed: ${(error as Error).message}`);
    }
  }

  async ask(question: string, k = 4) {
    const started = Date.now();
    const chunks = await this.retrieve(question, k);
    if (chunks.length === 0) {
      return { answer: "I don't have that information yet. Try POST /api/ai/ingest first.", sources: [], tookMs: Date.now() - started };
    }

    let answer: string;
    try {
      answer = await this.chain.invoke({ context: this.formatContext(chunks), question });
    } catch (error) {
      throw new DependencyUnavailableError(`Chat model failed: ${(error as Error).message}. Has the model finished downloading?`);
    }

    return {
      answer: answer.trim(),
      sources: chunks.map((c) => ({ source: c.source, chunk: c.chunkIndex, score: c.score, excerpt: `${c.content.slice(0, 160)}...` })),
      tookMs: Date.now() - started,
    };
  }

  /** Token-by-token streaming, used by the Server-Sent Events endpoint. */
  async *stream(question: string, k = 4): AsyncGenerator<string> {
    const chunks = await this.retrieve(question, k);
    const stream = await this.chain.stream({ context: this.formatContext(chunks), question });
    for await (const token of stream) yield token;
  }
}
