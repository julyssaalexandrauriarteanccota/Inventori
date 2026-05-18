import { Controller, Get, OnModuleDestroy } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../../database/prisma.service';
import { Public } from '../../common/decorators';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller('health')
export class HealthController implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly aiServiceUrl: string;

  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.aiServiceUrl = configService.get<string>(
      'AI_SERVICE_URL',
      'http://ai-service:8000',
    );
    this.redis = new Redis(
      configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
      { maxRetriesPerRequest: 1, lazyConnect: true, enableOfflineQueue: false },
    );
  }

  async onModuleDestroy() {
    if (this.redis.status === 'ready' || this.redis.status === 'connect') {
      await this.redis.quit().catch(() => {});
      return;
    }

    this.redis.disconnect();
  }

  @Get()
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Health check de todos los servicios' })
  @HealthCheck()
  async check() {
    return this.health.check([
      async () => {
        try {
          await this.prisma.$queryRawUnsafe('SELECT 1');
          return { database: { status: 'up' as const } };
        } catch {
          return { database: { status: 'down' as const } };
        }
      },
      async () => {
        try {
          await this.redis.ping();
          return { redis: { status: 'up' as const } };
        } catch {
          return { redis: { status: 'down' as const } };
        }
      },
      async () => {
        try {
          const response = await fetch(
            `${this.aiServiceUrl.replace(/\/$/, '')}/health`,
          );
          if (!response.ok) {
            throw new Error(`AI health returned ${response.status}`);
          }
          return { 'ai-service': { status: 'up' as const } };
        } catch {
          return { 'ai-service': { status: 'down' as const } };
        }
      },
    ]);
  }
}
