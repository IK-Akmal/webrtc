import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Room } from './room.entity';

export enum ParticipantState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  MUTED_AUDIO = 'muted_audio',
  MUTED_VIDEO = 'muted_video',
  DISCONNECTED = 'disconnected',
}

@Entity('participants')
@Index('UQ_active_participant', ['roomId', 'userId'], {
  unique: true,
  where: '"left_at" IS NULL',
})
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  roomId!: string;

  @ManyToOne(() => Room, (room) => room.participants, { onDelete: 'CASCADE' })
  room!: Room;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.participations, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ length: 64 })
  socketId!: string;

  @Column({
    type: 'enum',
    enum: ParticipantState,
    default: ParticipantState.CONNECTING,
  })
  state!: ParticipantState;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt!: Date | null;
}
