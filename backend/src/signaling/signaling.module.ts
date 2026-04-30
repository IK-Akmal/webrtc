import { Module } from '@nestjs/common';
import { RoomsModule } from '../rooms/rooms.module';
import { AuthModule } from '../auth/auth.module';
import { SignalingGateway } from './signaling.gateway';
import { SignalingService } from './signaling.service';

@Module({
  imports: [RoomsModule, AuthModule],
  providers: [SignalingGateway, SignalingService],
})
export class SignalingModule {}
