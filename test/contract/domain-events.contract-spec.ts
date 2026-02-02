import { formatNotification } from '../../src/modules/messaging/consumers/notification-message.formatter';
import { ALL_TOPICS, createEvent, DEAD_LETTER_TOPIC, EventType, EventTypes, payloadSchemas, topicFor, validateEvent } from '../../src/modules/messaging/domain-events';

/**
 * CONTRACT TESTS
 * The API (producer) and the worker (consumer) are deployed separately and may
 * run different versions during a rolling update. These tests freeze the shape
 * of what travels over Kafka. If one fails, you are about to break a consumer:
 * add a new schemaVersion instead of silently changing the payload.
 */
const ID = '3f9c2a4e-8d1b-4c7a-9e2f-1a2b3c4d5e6f';
