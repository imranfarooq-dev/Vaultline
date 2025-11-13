import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** Written by the Kafka worker when it consumes a domain event. */
@Entity('notifications')
export class NotificationEntity {
  /** The event id is the primary key, which makes consuming idempotent. */
  @PrimaryColumn('uuid', { name: 'event_id' })
  eventId: string;

  @Column({ name: 'event_type', length: 60 })
  eventType: string;

  @Column({ length: 255 })
  message: string;

  @Column({ type: 'jsonb' })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
