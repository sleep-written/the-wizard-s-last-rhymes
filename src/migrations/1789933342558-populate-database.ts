import type { MigrationInterface, QueryRunner } from 'typeorm';

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

import { ensureDump } from '../dump/download.js';
import { analyze } from '../phonology/index.js';

/** Los campos del volcado de Wiktextract que nos interesan. */
interface Entry {
    word: string;
    pos: string;
    senses?: {
        glosses?: string[];
        tags?: string[];
    }[];
}

/** El driver de SQLite corta en 2000 parámetros por sentencia. */
const MAX_PARAMETERS = 1_800;

/** Cada cuántas entradas se informa del avance. */
const PROGRESS_EVERY = 50_000;

/**
 * Inserta por lotes. Los ids se reparten aquí en vez de leerlos del
 * autoincremento: así una fila puede referenciar a otra que todavía está en el
 * búfer, y no hace falta una ida y vuelta a la base por cada registro.
 */
class Bulk {
    readonly #queryRunner: QueryRunner;
    readonly #parents: Bulk[];
    readonly #header: string;
    readonly #placeholders: string;
    readonly #limit: number;

    #rows: unknown[][] = [];
    #nextId = 1;

    /** `columns` empieza siempre por la clave primaria. */
    constructor(queryRunner: QueryRunner, table: string, columns: string[], parents: Bulk[] = []) {
        this.#queryRunner = queryRunner;
        this.#parents = parents;
        this.#limit = Math.floor(MAX_PARAMETERS / columns.length);
        this.#header = `INSERT INTO "${table}" (${columns.map(name => `"${name}"`).join(', ')}) VALUES `;
        this.#placeholders = `(${Array(columns.length).fill('?').join(', ')})`;
    }

    /** Encola una fila y devuelve el id que le ha tocado. */
    async add(...values: unknown[]): Promise<number> {
        const id = this.#nextId++;
        this.#rows.push([ id, ...values ]);
        if (this.#rows.length >= this.#limit) await this.flush();
        return id;
    }

    async flush(): Promise<void> {
        // primero las tablas de las que colgamos, o la clave foránea falla
        for (const parent of this.#parents) await parent.flush();
        if (!this.#rows.length) return;

        const rows = this.#rows;
        this.#rows = [];
        await this.#queryRunner.query(
            this.#header + Array(rows.length).fill(this.#placeholders).join(', '),
            rows.flat());
    }
}

/** Tabla de catálogo: un id por valor distinto, sin filas repetidas. */
class Catalog {
    readonly #bulk: Bulk;
    readonly #ids = new Map<string, number>();

    constructor(bulk: Bulk) {
        this.#bulk = bulk;
    }

    async id(value: string): Promise<number> {
        const known = this.#ids.get(value);
        if (known !== undefined) return known;

        const id = await this.#bulk.add(value);
        this.#ids.set(value, id);
        return id;
    }
}

export class PopulateDatabase1789933342558 implements MigrationInterface {
    name = 'PopulateDatabase1789933342558';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const jsonlPath = resolve(import.meta.dirname, '../../rae.jsonl');
        await ensureDump(jsonlPath);

        const types     = new Bulk(queryRunner, 'WordType', [ 'id', 'name' ]);
        const tags      = new Bulk(queryRunner, 'Tag',      [ 'id', 'name' ]);
        const rhymes    = new Bulk(queryRunner, 'Rhyme',    [ 'id', 'value' ]);
        const syllables = new Bulk(queryRunner, 'Syllable', [ 'id', 'value' ]);

        const words = new Bulk(queryRunner, 'Word',
            [ 'id', 'name', 'wordTypeId', 'consonantRhymeId', 'asonantRhymeId' ], [ types, rhymes ]);
        const senses = new Bulk(queryRunner, 'Sense',
            [ 'id', 'description', 'wordId' ], [ words ]);
        const senseTags = new Bulk(queryRunner, 'SenseTag',
            [ 'id', 'senseId', 'tagId' ], [ senses, tags ]);
        const wordSyllables = new Bulk(queryRunner, 'WordSyllable',
            [ 'id', 'syllableId', 'wordId' ], [ syllables, words ]);

        const typeOf     = new Catalog(types);
        const tagOf      = new Catalog(tags);
        const rhymeOf    = new Catalog(rhymes);
        const syllableOf = new Catalog(syllables);

        // una misma palabra aparece varias veces en el volcado (una entrada por
        // etimología): sus acepciones se acumulan en la misma fila
        const wordIds = new Map<string, number>();
        let read = 0;

        const lines = createInterface({
            input: createReadStream(jsonlPath),
            crlfDelay: Infinity,
        });

        for await (const line of lines) {
            if (!line.trim()) continue;
            const entry = JSON.parse(line) as Entry;

            // el tipo nunca lleva ":", así que el par no puede ser ambiguo
            const key = `${entry.pos}:${entry.word}`;
            let wordId = wordIds.get(key);

            if (wordId === undefined) {
                const sound = analyze(entry.word);

                wordId = await words.add(
                    entry.word,
                    await typeOf.id(entry.pos),
                    sound?.consonantRhyme ? await rhymeOf.id(sound.consonantRhyme) : null,
                    sound?.asonantRhyme   ? await rhymeOf.id(sound.asonantRhyme)   : null);

                wordIds.set(key, wordId);

                // WordSyllable no lleva columna de posición: el orden de las
                // sílabas queda en su id, que se reparte de forma creciente
                for (const syllable of sound?.syllables ?? []) {
                    await wordSyllables.add(await syllableOf.id(syllable), wordId);
                }
            }

            for (const sense of entry.senses ?? []) {
                const senseId = await senses.add(sense.glosses?.join('; ') || null, wordId);
                for (const tag of sense.tags ?? []) {
                    await senseTags.add(senseId, await tagOf.id(tag));
                }
            }

            if (++read % PROGRESS_EVERY === 0) {
                console.log(`  ${read.toLocaleString('es')} entradas leídas`);
            }
        }

        for (const bulk of [ words, senses, senseTags, wordSyllables ]) await bulk.flush();
        console.log(`  ${read.toLocaleString('es')} entradas cargadas`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tables = [
            'WordSyllable', 'SenseTag', 'Sense', 'Word',
            'Syllable', 'Rhyme', 'Tag', 'WordType',
        ];

        for (const table of tables) {
            await queryRunner.query(`DELETE FROM "${table}"`);
            await queryRunner.query(`DELETE FROM "sqlite_sequence" WHERE "name" = ?`, [ table ]);
        }
    }
}
