import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimeFieldToReservation1762617561373 implements MigrationInterface {
    name = 'AddTimeFieldToReservation1762617561373'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" ADD "time" character varying(5) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reservations" DROP COLUMN "time"`);
    }

}
