import { Provider } from '@nestjs/common';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { AppConfigService } from '../../../config/app-config.service';
import { CHAT_MODEL, EMBEDDINGS } from './ai.tokens';
import { ExtractiveFakeChatModel, HashingEmbeddings } from './fake-models';

/**
 * LangChain gives every chat model the same interface (BaseChatModel) and every
 * embedding model the same interface (Embeddings). That is the STRATEGY pattern
 * again: Ollama today, OpenAI or Bedrock tomorrow, same RAG code.
 */
export const llmProviders: Provider[] = [
  {
    provide: CHAT_MODEL,
    inject: [AppConfigService],
    useFactory: (config: AppConfigService) =>
      config.ai.provider === 'ollama'
        ? new ChatOllama({ baseUrl: config.ai.baseUrl, model: config.ai.chatModel, temperature: 0.1 })
        : new ExtractiveFakeChatModel(),
  },
  {
    provide: EMBEDDINGS,
    inject: [AppConfigService],
    useFactory: (config: AppConfigService) =>
      config.ai.provider === 'ollama'
        ? new OllamaEmbeddings({ baseUrl: config.ai.baseUrl, model: config.ai.embeddingModel })
        : new HashingEmbeddings(),
  },
];
