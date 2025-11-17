import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { AppConfigService } from '../../config/app-config.service';
import { EVENT_PUBLISHER, EventPublisher } from '../messaging/event-publisher.port';
import { KafkaEventPublisherAdapter } from '../messaging/kafka-event-publisher.adapter';

/**
 * Kubernetes uses two different questions:
 *   liveness  "is the process stuck?"          -> restart the pod if it fails
 *   readiness "can it serve traffic right now?" -> remove from Service if it fails
 * Never put slow external dependencies (Ollama) in liveness, or a model
 * download would make Kubernetes restart healthy pods in a loop.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly config: AppConfigService,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  @Get('live')
  live() {
    return { status: 'ok', mode: this.config.appMode, uptimeSeconds: Math.round(process.uptime()) };
  }
}
