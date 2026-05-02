import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Capture raw body for LiveKit webhook (Content-Type: application/webhook+json)
  app.use('/api/rooms/livekit-webhook', express.raw({ type: '*/*' }));

  app.use(cookieParser());

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS_ORIGIN=* → reflect request origin (dev-friendly, works from any IP/hostname)
  // CORS_ORIGIN=https://example.com,https://app.example.com → allowlist
  const rawOrigin = process.env.CORS_ORIGIN ?? 'http://localhost';
  const corsOrigin =
    rawOrigin === '*'
      ? true // Express reflects the incoming Origin header
      : rawOrigin.split(',').map((o) => o.trim());

  app.enableCors({ origin: corsOrigin, credentials: true });

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
  console.log(`Backend running on port ${port}`);
}

bootstrap().catch(console.error);
