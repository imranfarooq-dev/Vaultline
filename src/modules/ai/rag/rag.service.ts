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
}
