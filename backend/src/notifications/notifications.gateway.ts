import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  namespace: '/notifications',
  path: '/socket.io',
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway {
  @WebSocketServer()
  server!: Server;

  emitRoomCountUpdated(roomId: string, count: number): void {
    this.server.emit('room-count-updated', { roomId, count });
  }
}
