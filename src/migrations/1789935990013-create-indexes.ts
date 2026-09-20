import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIndexes1789935990013 implements MigrationInterface {
    name = 'CreateIndexes1789935990013'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_36bd0560f64f73f05a30bb2c76" ON "Syllable" ("value")`);
        await queryRunner.query(`CREATE INDEX "IDX_8c50a1e8f8e660820922793db9" ON "WordSyllable" ("syllableId")`);
        await queryRunner.query(`CREATE INDEX "IDX_810f84a0e292d1fdc5fc2cb97d" ON "WordSyllable" ("wordId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_794bb436bb9a23e3fc2d6aa97c" ON "WordType" ("name")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ced96b925beb1cc0c09c1b7d5c" ON "Tag" ("name")`);
        await queryRunner.query(`CREATE INDEX "IDX_c96a7133b665c846ed792aca66" ON "SenseTag" ("senseId")`);
        await queryRunner.query(`CREATE INDEX "IDX_8205f0c01fc5ad19f39f502748" ON "SenseTag" ("tagId")`);
        await queryRunner.query(`CREATE INDEX "IDX_6a917953cff0fda2466457ffe1" ON "Sense" ("wordId")`);
        await queryRunner.query(`CREATE INDEX "IDX_03d4650f19c50784fc3b587711" ON "Word" ("consonantRhymeId")`);
        await queryRunner.query(`CREATE INDEX "IDX_919b590a298d56d69fa6e264e5" ON "Word" ("asonantRhymeId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_7e6e2d5d4b827b6e3623138fe5" ON "Word" ("name", "wordTypeId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_88f6528a1bfc6da697966ff25f" ON "Rhyme" ("value")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_88f6528a1bfc6da697966ff25f"`);
        await queryRunner.query(`DROP INDEX "IDX_7e6e2d5d4b827b6e3623138fe5"`);
        await queryRunner.query(`DROP INDEX "IDX_919b590a298d56d69fa6e264e5"`);
        await queryRunner.query(`DROP INDEX "IDX_03d4650f19c50784fc3b587711"`);
        await queryRunner.query(`DROP INDEX "IDX_6a917953cff0fda2466457ffe1"`);
        await queryRunner.query(`DROP INDEX "IDX_8205f0c01fc5ad19f39f502748"`);
        await queryRunner.query(`DROP INDEX "IDX_c96a7133b665c846ed792aca66"`);
        await queryRunner.query(`DROP INDEX "IDX_ced96b925beb1cc0c09c1b7d5c"`);
        await queryRunner.query(`DROP INDEX "IDX_794bb436bb9a23e3fc2d6aa97c"`);
        await queryRunner.query(`DROP INDEX "IDX_810f84a0e292d1fdc5fc2cb97d"`);
        await queryRunner.query(`DROP INDEX "IDX_8c50a1e8f8e660820922793db9"`);
        await queryRunner.query(`DROP INDEX "IDX_36bd0560f64f73f05a30bb2c76"`);
    }

}
