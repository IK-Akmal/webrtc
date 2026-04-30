import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { UseFilters } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { SignalingService } from './signaling.service';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { JwtPayload } from '../common/decorators/current-user.decorator';

interface OfferPayload {
  targetSocketId: string;
  offer: RTCSessionDescriptionInit;
}
interface AnswerPayload {
  targetSocketId: string;
  answer: RTCSessionDescriptionInit;
}
interface IcePayload {
  targetSocketId: string;
  candidate: RTCIceCandidateInit;
}
interface StatePayload {
  state: string;
}

@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  namespace: '/signaling',
  path: '/socket.io',
  cors: { origin: true, credentials: true },
  pingInterval: 25_000,
  pingTimeout: 60_000,
})
export class SignalingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly signalingService: SignalingService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit(server: Server): void {
    server.use((socket: Socket, next) => {
      const token =
        (socket.handshake.auth as Record<string, string>)['token'] ??
        (socket.handshake.query as Record<string, string>)['token'];

      if (!token) return next(new Error('Unauthorized'));

      try {
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.config.get<string>('jwt.accessSecret'),
        });
        socket.data['user'] = payload;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(socket: Socket): void {
    const user = socket.data['user'] as JwtPayload;
    console.log(`[WS] connect  ${socket.id}  user=${user?.sub}`);
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    console.log(`[WS] disconnect ${socket.id}`);
    await this.signalingService.handleDisconnect(socket, this.server);
  }

  // ─── join-room ───────────────────────────────────────────────────────────

  @SubscribeMessage('join-room')
  async handleJoinRoom(socket: Socket, payload: { roomId: string }) {
    const user = socket.data['user'] as JwtPayload;
    const { roomId } = payload;

    if (!roomId) throw new WsException('roomId required');

    const peers = await this.signalingService.joinRoom(roomId, socket, user);
    await socket.join(roomId);

    socket.emit('room-joined', { roomId, peers });

    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userId: user.sub,
      displayName: user.displayName,
    });
  }

  // ─── leave-room ──────────────────────────────────────────────────────────

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(socket: Socket, payload: { roomId: string }) {
    const user = socket.data['user'] as JwtPayload;
    const { roomId } = payload;

    await this.signalingService.leaveRoom(roomId, socket);
    await socket.leave(roomId);

    socket.to(roomId).emit('user-left', {
      socketId: socket.id,
      userId: user.sub,
    });
  }

  // ─── webrtc-offer (pure relay) ───────────────────────────────────────────

  @SubscribeMessage('webrtc-offer')
  handleOffer(socket: Socket, payload: OfferPayload): void {
    socket.to(payload.targetSocketId).emit('webrtc-offer', {
      fromSocketId: socket.id,
      offer: payload.offer,
    });
  }

  // ─── webrtc-answer (pure relay) ──────────────────────────────────────────

  @SubscribeMessage('webrtc-answer')
  handleAnswer(socket: Socket, payload: AnswerPayload): void {
    socket.to(payload.targetSocketId).emit('webrtc-answer', {
      fromSocketId: socket.id,
      answer: payload.answer,
    });
  }

  // ─── ice-candidate (pure relay) ──────────────────────────────────────────

  @SubscribeMessage('ice-candidate')
  handleIce(socket: Socket, payload: IcePayload): void {
    socket.to(payload.targetSocketId).emit('ice-candidate', {
      fromSocketId: socket.id,
      candidate: payload.candidate,
    });
  }

  // ─── participant-state-changed ───────────────────────────────────────────

  @SubscribeMessage('participant-state-changed')
  async handleStateChange(socket: Socket, payload: StatePayload): Promise<void> {
    await this.signalingService.updateState(socket.id, payload.state);

    const rooms = this.signalingService.getSocketRooms(socket.id);
    for (const roomId of rooms) {
      socket.to(roomId).emit('participant-state-changed', {
        socketId: socket.id,
        state: payload.state,
      });
    }
  }
}
