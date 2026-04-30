import { DataSource } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Room } from './rooms/entities/room.entity';
import { Participant } from './rooms/entities/participant.entity';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'webrtc',
  password: process.env.DB_PASS ?? 'password',
  database: process.env.DB_NAME ?? 'webrtc_conf',
  entities: [User, Room, Participant],
  migrations: ['src/migrations/*.ts'],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
