import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RoomsService } from '../rooms/rooms.service';
import { JwtPayload } from '../common/decorators/current-user.decorator';

interface PeerInfo {
  socketId: string;
  userId: string;
  displayName: string;
}

@Injectable()
export class SignalingService {
  // roomId → Map<socketId, PeerInfo>
  private readonly rooms = new Map<string, Map<string, PeerInfo>>();
  // socketId → Set<roomId>
  private readonly socketRooms = new Map<string, Set<string>>();

  constructor(private readonly roomsService: RoomsService) {}

  async joinRoom(
    roomId: string,
    socket: Socket,
    user: JwtPayload,
  ): Promise<PeerInfo[]> {
    if (!this.rooms.has(roomId)) this.rooms.set(roomId, new Map());

    const room = this.rooms.get(roomId)!;
    const peer: PeerInfo = {
      socketId: socket.id,
      userId: user.sub,
      displayName: user.displayName,
    };
    room.set(socket.id, peer);

    if (!this.socketRooms.has(socket.id)) this.socketRooms.set(socket.id, new Set());
    this.socketRooms.get(socket.id)!.add(roomId);

    await this.roomsService.addParticipant(roomId, user.sub, socket.id);

    return [...room.values()].filter((p) => p.socketId !== socket.id);
  }

  async leaveRoom(roomId: string, socket: Socket): Promise<void> {
    this.rooms.get(roomId)?.delete(socket.id);
    if (this.rooms.get(roomId)?.size === 0) this.rooms.delete(roomId);

    this.socketRooms.get(socket.id)?.delete(roomId);

    await this.roomsService.removeParticipant(socket.id);
  }

  async handleDisconnect(socket: Socket, server: Server): Promise<void> {
    const rooms = this.socketRooms.get(socket.id) ?? new Set<string>();
    const user = socket.data.user as JwtPayload | undefined;

    for (const roomId of rooms) {
      this.rooms.get(roomId)?.delete(socket.id);
      if (this.rooms.get(roomId)?.size === 0) this.rooms.delete(roomId);

      server.to(roomId).emit('user-left', {
        socketId: socket.id,
        userId: user?.sub ?? '',
      });
    }

    this.socketRooms.delete(socket.id);
    await this.roomsService.removeParticipant(socket.id);
  }

  getSocketRooms(socketId: string): string[] {
    return [...(this.socketRooms.get(socketId) ?? [])];
  }

  async updateState(socketId: string, state: string): Promise<void> {
    const { ParticipantState } = await import('../rooms/entities/participant.entity');
    const validStates = Object.values(ParticipantState) as string[];
    if (validStates.includes(state)) {
      await this.roomsService.updateParticipantState(
        socketId,
        state as import('../rooms/entities/participant.entity').ParticipantState,
      );
    }
  }
}
