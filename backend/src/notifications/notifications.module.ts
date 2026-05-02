import { Global, Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { LivekitWebhookController } from './livekit-webhook.controller';

@Global()
@Module({
  providers: [NotificationsGateway],
  controllers: [LivekitWebhookController],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
