import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

/**
 * Health check nyata: cek koneksi database & ketersediaan ai-service.
 * Dipakai oleh Docker/K8s readiness & liveness probe.
 */
@Controller('health')
export class HealthController {
  private readonly aiUrl: string;

  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly http: HttpHealthIndicator,
    config: ConfigService,
  ) {
    this.aiUrl = config.get<string>('AI_SERVICE_URL', 'http://ai-service:5000');
  }

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 3000 }),
      () => this.http.pingCheck('ai-service', `${this.aiUrl}/health`),
    ]);
  }
}
