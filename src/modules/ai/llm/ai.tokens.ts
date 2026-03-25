/** Injection tokens so tests (and AI_PROVIDER=fake) can swap real models for fakes. */
export const CHAT_MODEL = Symbol('CHAT_MODEL');
export const EMBEDDINGS = Symbol('EMBEDDINGS');

/** Must match the vector(768) column in the migration. */
export const EMBEDDING_DIMENSIONS = 768;
