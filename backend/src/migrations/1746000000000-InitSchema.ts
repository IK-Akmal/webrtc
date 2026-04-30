import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1746000000000 implements MigrationInterface {
  name = 'InitSchema1746000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      CREATE TYPE "public"."rooms_status_enum" AS ENUM('waiting', 'active', 'closed')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."participants_state_enum"
      AS ENUM('connecting', 'connected', 'muted_audio', 'muted_video', 'disconnected')
    `);

    // users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"               uuid NOT NULL DEFAULT gen_random_uuid(),
        "email"            character varying NOT NULL,
        "displayName"      character varying NOT NULL,
        "passwordHash"     character varying NOT NULL,
        "refreshTokenHash" text,
        "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // rooms
    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id"              uuid NOT NULL DEFAULT gen_random_uuid(),
        "name"            character varying(120) NOT NULL,
        "description"     text,
        "maxParticipants" integer NOT NULL DEFAULT 10,
        "status"          "public"."rooms_status_enum" NOT NULL DEFAULT 'waiting',
        "ownerId"         uuid NOT NULL,
        "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rooms" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "rooms"
        ADD CONSTRAINT "FK_rooms_owner"
        FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // participants
    await queryRunner.query(`
      CREATE TABLE "participants" (
        "id"       uuid NOT NULL DEFAULT gen_random_uuid(),
        "roomId"   uuid NOT NULL,
        "userId"   uuid NOT NULL,
        "socketId" character varying(64) NOT NULL,
        "state"    "public"."participants_state_enum" NOT NULL DEFAULT 'connecting',
        "joinedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "leftAt"   TIMESTAMPTZ,
        CONSTRAINT "PK_participants" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "participants"
        ADD CONSTRAINT "FK_participants_room"
        FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "participants"
        ADD CONSTRAINT "FK_participants_user"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
    // Partial unique index — prevents same user joining the same room twice simultaneously
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_active_participant"
      ON "participants"("roomId", "userId")
      WHERE "leftAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_active_participant"`);
    await queryRunner.query(`DROP TABLE "participants"`);
    await queryRunner.query(`DROP TABLE "rooms"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."participants_state_enum"`);
    await queryRunner.query(`DROP TYPE "public"."rooms_status_enum"`);
  }
}
