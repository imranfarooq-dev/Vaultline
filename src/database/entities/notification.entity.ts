import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** Written by the Kafka worker when it consumes a domain event. */
@Entity('notifications')
export class NotificationEntity {
  /** The event id is the primary key, which makes consuming idempotent. */
  @PrimaryColumn('uuid', { name: 'event_id' })
  eventId: string;
}
