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

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.db.pingCheck('database', { timeout: 3000 })]);
  }

  /** Informational: shows every dependency, never used by probes. */
  @Get('dependencies')
  async dependencies() {
    const kafka = this.publisher instanceof KafkaEventPublisherAdapter ? (this.publisher.isConnected ? 'connected' : 'connecting') : 'disabled (in-memory)';
    let ollama = 'not used (fake provider)';
    if (this.config.ai.provider === 'ollama') {
      try {
        const res = await fetch(`${this.config.ai.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
        const body = (await res.json()) as { models?: { name: string }[] };
        ollama = `up, models: ${(body.models ?? []).map((m) => m.name).join(', ') || 'none pulled yet'}`;
      } catch {
        ollama = 'unreachable';
      }
    }
    return { kafka, ollama };
  }
}
