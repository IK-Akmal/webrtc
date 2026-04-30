import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { User } from './users/entities/user.entity';
import { Room } from './rooms/entities/room.entity';
import { Participant } from './rooms/entities/participant.entity';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { SignalingModule } from './signaling/signaling.module';
import { HealthController } from './health/health.controller';
import { RoomsService } from './rooms/rooms.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('db.host'),
        port: cfg.get<number>('db.port'),
        username: cfg.get<string>('db.user'),
        password: cfg.get<string>('db.pass'),
        database: cfg.get<string>('db.name'),
        entities: [User, Room, Participant],
        migrations: ['dist/migrations/*.js'],
        migrationsRun: true,
        synchronize: false,
        ssl: cfg.get<boolean>('db.ssl')
          ? { rejectUnauthorized: false }
          : false,
        logging: cfg.get<string>('nodeEnv') !== 'production',
      }),
    }),
    UsersModule,
    AuthModule,
    RoomsModule,
    SignalingModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly roomsService: RoomsService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.roomsService.cleanupStaleParticipants();
    console.log('[Boot] Stale participants cleaned up');
  }
}
