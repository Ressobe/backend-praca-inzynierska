import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRatingImageCuisineToRestaurant1762086454987 implements MigrationInterface {
    name = 'AddRatingImageCuisineToRestaurant1762086454987'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "restaurants" ADD "rating" double precision NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "restaurants" ADD "image" character varying`);
        await queryRunner.query(`ALTER TABLE "restaurants" ADD "cuisine" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "cuisine"`);
        await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "image"`);
        await queryRunner.query(`ALTER TABLE "restaurants" DROP COLUMN "rating"`);
    }

}
