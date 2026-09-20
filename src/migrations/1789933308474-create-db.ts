import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDb1789933308474 implements MigrationInterface {
    name = 'CreateDb1789933308474'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "Syllable" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "value" nvarchar NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "WordSyllable" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "syllableId" integer, "wordId" integer)`);
        await queryRunner.query(`CREATE TABLE "WordType" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" nvarchar NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "Tag" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" nvarchar NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "SenseTag" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "senseId" integer, "tagId" integer)`);
        await queryRunner.query(`CREATE TABLE "Sense" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "description" nvarchar, "wordId" integer)`);
        await queryRunner.query(`CREATE TABLE "Word" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" nvarchar NOT NULL, "wordTypeId" integer, "consonantRhymeId" integer, "asonantRhymeId" integer)`);
        await queryRunner.query(`CREATE TABLE "Rhyme" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "value" nvarchar NOT NULL)`);
        await queryRunner.query(`CREATE TABLE "temporary_WordSyllable" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "syllableId" integer, "wordId" integer, CONSTRAINT "FK_8c50a1e8f8e660820922793db9d" FOREIGN KEY ("syllableId") REFERENCES "Syllable" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_810f84a0e292d1fdc5fc2cb97d3" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_WordSyllable"("id", "syllableId", "wordId") SELECT "id", "syllableId", "wordId" FROM "WordSyllable"`);
        await queryRunner.query(`DROP TABLE "WordSyllable"`);
        await queryRunner.query(`ALTER TABLE "temporary_WordSyllable" RENAME TO "WordSyllable"`);
        await queryRunner.query(`CREATE TABLE "temporary_SenseTag" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "senseId" integer, "tagId" integer, CONSTRAINT "FK_c96a7133b665c846ed792aca666" FOREIGN KEY ("senseId") REFERENCES "Sense" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_8205f0c01fc5ad19f39f5027487" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_SenseTag"("id", "senseId", "tagId") SELECT "id", "senseId", "tagId" FROM "SenseTag"`);
        await queryRunner.query(`DROP TABLE "SenseTag"`);
        await queryRunner.query(`ALTER TABLE "temporary_SenseTag" RENAME TO "SenseTag"`);
        await queryRunner.query(`CREATE TABLE "temporary_Sense" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "description" nvarchar, "wordId" integer, CONSTRAINT "FK_6a917953cff0fda2466457ffe1b" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_Sense"("id", "description", "wordId") SELECT "id", "description", "wordId" FROM "Sense"`);
        await queryRunner.query(`DROP TABLE "Sense"`);
        await queryRunner.query(`ALTER TABLE "temporary_Sense" RENAME TO "Sense"`);
        await queryRunner.query(`CREATE TABLE "temporary_Word" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" nvarchar NOT NULL, "wordTypeId" integer, "consonantRhymeId" integer, "asonantRhymeId" integer, CONSTRAINT "FK_af8a7a04658aa1d24e16c97db1c" FOREIGN KEY ("wordTypeId") REFERENCES "WordType" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_03d4650f19c50784fc3b587711c" FOREIGN KEY ("consonantRhymeId") REFERENCES "Rhyme" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_919b590a298d56d69fa6e264e5c" FOREIGN KEY ("asonantRhymeId") REFERENCES "Rhyme" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_Word"("id", "name", "wordTypeId", "consonantRhymeId", "asonantRhymeId") SELECT "id", "name", "wordTypeId", "consonantRhymeId", "asonantRhymeId" FROM "Word"`);
        await queryRunner.query(`DROP TABLE "Word"`);
        await queryRunner.query(`ALTER TABLE "temporary_Word" RENAME TO "Word"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Word" RENAME TO "temporary_Word"`);
        await queryRunner.query(`CREATE TABLE "Word" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" nvarchar NOT NULL, "wordTypeId" integer, "consonantRhymeId" integer, "asonantRhymeId" integer)`);
        await queryRunner.query(`INSERT INTO "Word"("id", "name", "wordTypeId", "consonantRhymeId", "asonantRhymeId") SELECT "id", "name", "wordTypeId", "consonantRhymeId", "asonantRhymeId" FROM "temporary_Word"`);
        await queryRunner.query(`DROP TABLE "temporary_Word"`);
        await queryRunner.query(`ALTER TABLE "Sense" RENAME TO "temporary_Sense"`);
        await queryRunner.query(`CREATE TABLE "Sense" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "description" nvarchar, "wordId" integer)`);
        await queryRunner.query(`INSERT INTO "Sense"("id", "description", "wordId") SELECT "id", "description", "wordId" FROM "temporary_Sense"`);
        await queryRunner.query(`DROP TABLE "temporary_Sense"`);
        await queryRunner.query(`ALTER TABLE "SenseTag" RENAME TO "temporary_SenseTag"`);
        await queryRunner.query(`CREATE TABLE "SenseTag" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "senseId" integer, "tagId" integer)`);
        await queryRunner.query(`INSERT INTO "SenseTag"("id", "senseId", "tagId") SELECT "id", "senseId", "tagId" FROM "temporary_SenseTag"`);
        await queryRunner.query(`DROP TABLE "temporary_SenseTag"`);
        await queryRunner.query(`ALTER TABLE "WordSyllable" RENAME TO "temporary_WordSyllable"`);
        await queryRunner.query(`CREATE TABLE "WordSyllable" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "syllableId" integer, "wordId" integer)`);
        await queryRunner.query(`INSERT INTO "WordSyllable"("id", "syllableId", "wordId") SELECT "id", "syllableId", "wordId" FROM "temporary_WordSyllable"`);
        await queryRunner.query(`DROP TABLE "temporary_WordSyllable"`);
        await queryRunner.query(`DROP TABLE "Rhyme"`);
        await queryRunner.query(`DROP TABLE "Word"`);
        await queryRunner.query(`DROP TABLE "Sense"`);
        await queryRunner.query(`DROP TABLE "SenseTag"`);
        await queryRunner.query(`DROP TABLE "Tag"`);
        await queryRunner.query(`DROP TABLE "WordType"`);
        await queryRunner.query(`DROP TABLE "WordSyllable"`);
        await queryRunner.query(`DROP TABLE "Syllable"`);
    }

}
