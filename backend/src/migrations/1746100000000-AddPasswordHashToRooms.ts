import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordHashToRooms1746100000000 implements MigrationInterface {
  name = 'AddPasswordHashToRooms1746100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rooms" ADD COLUMN "passwordHash" varchar
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rooms" DROP COLUMN "passwordHash"
    `);
  }
}
