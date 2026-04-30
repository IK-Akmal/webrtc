import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Room, RoomStatus } from './entities/room.entity';
import { Participant, ParticipantState } from './entities/participant.entity';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    @InjectRepository(Participant) private readonly participantRepo: Repository<Participant>,
    private readonly config: ConfigService,
  ) {}

  async create(ownerId: string, dto: CreateRoomDto): Promise<Room> {
    const room = this.roomRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      maxParticipants: dto.maxParticipants ?? 10,
      ownerId,
      status: RoomStatus.WAITING,
    });
    return this.roomRepo.save(room);
  }

  private static readonly OWNER_SELECT = {
    owner: { id: true, email: true, displayName: true, createdAt: true, updatedAt: true },
  };

  async findAll(): Promise<(Room & { activeParticipantCount: number })[]> {
    const rooms = await this.roomRepo.find({
      relations: ['owner'],
      select: { ...RoomsService.OWNER_SELECT },
      order: { createdAt: 'DESC' },
    });
    const counts = await Promise.all(
      rooms.map((r) => this.participantRepo.countBy({ roomId: r.id, leftAt: IsNull() })),
    );
    return rooms.map((r, i) => Object.assign(r, { activeParticipantCount: counts[i] ?? 0 }));
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomRepo.findOne({
      where: { id },
      relations: ['owner', 'participants', 'participants.user'],
    });
    if (!room) throw new NotFoundException('Room not found');
    // strip sensitive fields from owner
    if (room.owner) {
      const o = room.owner as unknown as Record<string, unknown>;
      delete o['passwordHash'];
      delete o['refreshTokenHash'];
    }
    return room;
  }

  async update(id: string, requesterId: string, patch: Partial<Room>): Promise<Room> {
    const room = await this.findOne(id);
    if (room.ownerId !== requesterId) throw new ForbiddenException('Only owner can update room');
    Object.assign(room, patch);
    return this.roomRepo.save(room);
  }

  async remove(id: string, requesterId: string): Promise<void> {
    const room = await this.findOne(id);
    if (room.ownerId !== requesterId) throw new ForbiddenException('Only owner can delete room');
    await this.roomRepo.remove(room);
  }

  async addParticipant(roomId: string, userId: string, socketId: string): Promise<Participant> {
    const p = this.participantRepo.create({
      roomId,
      userId,
      socketId,
      state: ParticipantState.CONNECTING,
      leftAt: null,
    });
    return this.participantRepo.save(p);
  }

  async removeParticipant(socketId: string): Promise<void> {
    await this.participantRepo.update(
      { socketId, leftAt: IsNull() },
      { leftAt: new Date(), state: ParticipantState.DISCONNECTED },
    );
  }

  async updateParticipantState(socketId: string, state: ParticipantState): Promise<void> {
    await this.participantRepo.update({ socketId, leftAt: IsNull() }, { state });
  }

  async cleanupStaleParticipants(): Promise<void> {
    await this.participantRepo.update(
      { leftAt: IsNull() },
      { leftAt: new Date(), state: ParticipantState.DISCONNECTED },
    );
  }

  getIceConfig(userId: string): { iceServers: object[] } {
    const stun = this.config.get<string>('turn.stun') ?? 'stun:stun.l.google.com:19302';
    const turnUrl = this.config.get<string>('turn.url') ?? '';
    const turnSecret = this.config.get<string>('turn.secret') ?? '';

    const iceServers: object[] = [{ urls: stun }];

    if (turnUrl && turnSecret) {
      const ttl = Math.floor(Date.now() / 1000) + 86_400;
      const username = `${ttl}:${userId}`;
      const credential = crypto
        .createHmac('sha1', turnSecret)
        .update(username)
        .digest('base64');
      iceServers.push({ urls: turnUrl, username, credential });
    }

    return { iceServers };
  }
}
