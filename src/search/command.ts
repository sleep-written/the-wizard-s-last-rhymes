import type { CommandTarget } from '@bleed-believer/commander';

import { emitKeypressEvents } from 'node:readline';
import { styleText } from 'node:util';
import { Command } from '@bleed-believer/commander';

import { dataSource } from '../data-source.js';
import type { WordDetail } from './pager.js';

import { Pager } from './pager.js';
import { capitalize, plural } from './text.js';

/** Cuántas palabras se muestran de cada grupo de rima. */
const RHYME_SAMPLE = 30;

/** Cuántas acepciones se listan por entrada. */
const SENSE_LIMIT = 12;

/** Categorías que no sirven para rimar: no son palabras que uno pueda usar. */
const NOT_RHYMABLE = [ 'prefix', 'suffix', 'infix', 'interfix', 'character', 'punct', 'symbol' ];

/** Nombres legibles para las categorías, que el volcado trae en inglés. */
const TYPE_NAMES: Record<string, string> = {
    adj: 'adjetivo',
    adv: 'adverbio',
    adv_phrase: 'locución adverbial',
    article: 'artículo',
    character: 'carácter',
    conj: 'conjunción',
    contraction: 'contracción',
    det: 'determinante',
    infix: 'infijo',
    interfix: 'interfijo',
    intj: 'interjección',
    name: 'nombre propio',
    noun: 'sustantivo',
    num: 'numeral',
    particle: 'partícula',
    phrase: 'locución',
    prefix: 'prefijo',
    prep: 'preposición',
    prep_phrase: 'locución preposicional',
    pron: 'pronombre',
    proverb: 'refrán',
    punct: 'signo',
    suffix: 'sufijo',
    symbol: 'símbolo',
    verb: 'verbo',
};

interface Entry {
    id: number;
    type: string;
    consonantRhymeId: number | null;
    asonantRhymeId: number | null;
}

interface Sense {
    description: string | null;
    tags: string | null;
}

/** Espera una sola tecla y devuelve su nombre. */
function readKey(): Promise<string> {
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    return new Promise(resolve => {
        process.stdin.once('keypress', (_, key) => {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            resolve(key?.ctrl && key.name === 'c' ? 'q' : key?.name ?? '');
        });
    });
}

/** Reparte las palabras en columnas que quepan en el ancho de la terminal. */
function inColumns(words: string[], indent: string): string[] {
    const available = Math.max(40, (process.stdout.columns ?? 80) - indent.length);
    const cell = Math.max(...words.map(word => word.length)) + 2;
    const perRow = Math.max(1, Math.floor(available / cell));

    const rows: string[] = [];
    for (let i = 0; i < words.length; i += perRow) {
        const row = words.slice(i, i + perRow).map(word => word.padEnd(cell)).join('');
        rows.push(indent + styleText('green', row.trimEnd()));
    }

    return rows;
}

export const searchCommand = new Command({
    description: 'Busca una palabra: su categoría, sus acepciones y sus rimas',
    positionals: 'search :word',
    callback: ctx => new class implements CommandTarget {
        #excluded: number[] = [];

        async onInit(): Promise<void> {
            const word = ctx.positionals.word;
            await dataSource.initialize();

            const entries: Entry[] = await dataSource.query(`
                select w.id, t.name as type, w.consonantRhymeId, w.asonantRhymeId
                  from "Word" w
                  join "WordType" t on t.id = w.wordTypeId
                 where w.name = ?
                 order by t.name`, [ word ]);

            if (!entries.length) {
                console.log(`\n  ${styleText('red', 'No está en el diccionario:')} ${styleText('bold', word)}\n`);
                return;
            }

            const excluded = await dataSource.query(
                `select id from "WordType" where name in (${NOT_RHYMABLE.map(() => '?').join(', ')})`,
                NOT_RHYMABLE);
            this.#excluded = excluded.map((row: { id: number }) => row.id);

            const [ { syllables } ] = await dataSource.query(
                `select count(*) as syllables from "WordSyllable" where wordId = ?`, [ entries[0]!.id ]);

            console.log(`\n${styleText([ 'bold', 'underline' ], word)}`);
            console.log(styleText('dim', `${plural(syllables, 'sílaba', 'sílabas')}\n`));

            for (const entry of entries) await this.#printSenses(entry);

            // la rima solo depende de cómo se escribe, así que todas las
            // entradas de una misma palabra comparten clave
            const [ first ] = entries;

            // la consonante da listas cortas y se muestran enteras; en la
            // asonante hay decenas de miles, y solo sirven las que además
            // encajan en el verso, así que se piden de la misma medida
            const consonant = await this.#printRhyme('Rima consonante', 'consonantRhymeId', first!.consonantRhymeId, word, null);
            const asonant = await this.#printRhyme('Rima asonante', 'asonantRhymeId', first!.asonantRhymeId, word, syllables);

            await this.#browse(word, syllables, first!, consonant, asonant);
        }

        async #printSenses(entry: Entry): Promise<void> {
            const senses: Sense[] = await dataSource.query(`
                select s.description, group_concat(g.name, ', ') as tags
                  from "Sense" s
                  left join "SenseTag" st on st.senseId = s.id
                  left join "Tag" g on g.id = st.tagId
                 where s.wordId = ?
                 group by s.id
                 order by s.id`, [ entry.id ]);

            const type = capitalize(TYPE_NAMES[entry.type] ?? entry.type);
            console.log(`  ${styleText([ 'bold', 'cyan' ], type)} ${styleText('dim', `(${entry.type})`)}`);

            for (const sense of senses.slice(0, SENSE_LIMIT)) {
                const tags = sense.tags ? `  ${styleText([ 'dim', 'italic' ], sense.tags)}` : '';
                const text = sense.description ? capitalize(sense.description) : '—';
                console.log(`    ${styleText('dim', '·')} ${text}${tags}`);
            }

            const hidden = senses.length - SENSE_LIMIT;
            if (hidden > 0) console.log(`    ${styleText('dim', `y ${hidden} acepciones más`)}`);
            console.log();
        }

        async #printRhyme(
            title: string,
            column: string,
            rhymeId: number | null,
            word: string,
            syllables: number | null,
        ): Promise<string | null> {
            const heading = styleText([ 'bold', 'magenta' ], title);
            if (rhymeId == null) {
                console.log(`  ${heading}  ${styleText('dim', 'no aplica')}\n`);
                return null;
            }

            const [ { value } ] = await dataSource.query(
                `select value from "Rhyme" where id = ?`, [ rhymeId ]);

            // fuera los afijos, que comparten clave pero no son palabras, y las
            // siglas, que en el volcado son las entradas en mayúscula
            const filters = [
                `w."${column}" = ?`,
                `w.name <> ?`,
                `w.name <> upper(w.name)`,
                `w.wordTypeId not in (${this.#excluded.map(() => '?').join(', ')})`,
            ];
            const params: unknown[] = [ rhymeId, word, ...this.#excluded ];

            if (syllables) {
                filters.push(`(select count(*) from "WordSyllable" ws where ws.wordId = w.id) = ?`);
                params.push(syllables);
            }

            const where = filters.join(' and ');
            const [ { total } ] = await dataSource.query(
                `select count(distinct w.name) as total from "Word" w where ${where}`, params);

            const measure = syllables
    ?   ` ${styleText('dim', `de ${plural(syllables, 'sílaba', 'sílabas')}`)}`
    :   '';
            console.log(`  ${heading}  ${styleText('yellow', value)}`
                + `  ${styleText('dim', plural(total, 'palabra', 'palabras'))}${measure}`);

            if (!total) {
                console.log(`    ${styleText('dim', 'ninguna otra palabra la comparte')}\n`);
                return null;
            }

            // las cortas primero cuando la lista es abarcable; cuando son
            // decenas de miles, al azar, que da variedad entre una y otra vez
            const order = syllables ? 'random()' : 'length(w.name), w.name';
            const rows: { name: string }[] = await dataSource.query(
                `select distinct w.name from "Word" w where ${where} order by ${order} limit ?`,
                [ ...params, RHYME_SAMPLE ]);

            for (const line of inColumns(rows.map(row => row.name), '    ')) console.log(line);

            const rest = total - rows.length;
            if (rest > 0) console.log(`    ${styleText('dim', `y ${rest.toLocaleString('es')} más`)}`);
            console.log();
            return value;
        }

        /** Trae el grupo entero, ya ordenado en español. */
        async #allWords(column: string, rhymeId: number, word: string, syllables: number | null): Promise<string[]> {
            const filters = [
                `w."${column}" = ?`,
                `w.name <> ?`,
                `w.name <> upper(w.name)`,
                `w.wordTypeId not in (${this.#excluded.map(() => '?').join(', ')})`,
            ];
            const params: unknown[] = [ rhymeId, word, ...this.#excluded ];

            if (syllables) {
                filters.push(`(select count(*) from "WordSyllable" ws where ws.wordId = w.id) = ?`);
                params.push(syllables);
            }

            const rows: { name: string }[] = await dataSource.query(
                `select distinct w.name from "Word" w where ${filters.join(' and ')}`, params);

            // ordenar aquí y no en SQL: SQLite compara byte a byte y dejaría
            // las mayúsculas y los acentos fuera de su sitio
            const collator = new Intl.Collator('es');
            return rows.map(row => row.name).sort((a, b) => collator.compare(a, b));
        }

        /** Trae categorías y acepciones de un puñado de palabras: solo las que se ven. */
        async #detailsOf(names: string[]): Promise<Map<string, WordDetail>> {
            const found = new Map<string, WordDetail>();
            if (!names.length) return found;

            const rows: { name: string; type: string; description: string | null }[] =
                await dataSource.query(`
                    select w.name, t.name as type, s.description
                      from "Word" w
                      join "WordType" t on t.id = w.wordTypeId
                      left join "Sense" s on s.wordId = w.id
                     where w.name in (${names.map(() => '?').join(', ')})
                     order by w.name, w.id, s.id`, names);

            for (const row of rows) {
                let detail = found.get(row.name);
                if (!detail) {
                    detail = { types: [], definitions: [] };
                    found.set(row.name, detail);
                }

                const type = TYPE_NAMES[row.type] ?? row.type;
                if (!detail.types.includes(type)) detail.types.push(type);
                if (row.description && !detail.definitions.includes(row.description)) {
                    detail.definitions.push(row.description);
                }
            }

            // las que no devolvieron fila igual deben existir en el mapa, o el
            // paginador las volvería a pedir en cada repintado
            for (const name of names) {
                if (!found.has(name)) found.set(name, { types: [], definitions: [] });
            }

            return found;
        }

        /** Ofrece abrir el paginador con el grupo completo. */
        async #browse(
            word: string,
            syllables: number,
            entry: Entry,
            consonant: string | null,
            asonant: string | null,
        ): Promise<void> {
            if (!consonant && !asonant) return;
            if (!process.stdin.isTTY || !process.stdout.isTTY) return;

            const options = [
                consonant ? `${styleText('bold', 'c')} todas las consonantes` : '',
                asonant ? `${styleText('bold', 'a')} todas las asonantes` : '',
                `${styleText('bold', 'q')} salir`,
            ].filter(Boolean);

            process.stdout.write(`  ${styleText('dim', options.join('  ·  '))}  `);
            const key = await readKey();
            process.stdout.write('\r\x1b[K');

            const wanted = key === 'c' && consonant ? 'c' : key === 'a' && asonant ? 'a' : null;
            if (!wanted) return;

            process.stdout.write(`  ${styleText('dim', 'cargando…')}`);
            const lists = [];

            if (consonant) {
                lists.push({
                    key: 'c',
                    label: 'Rima consonante',
                    value: consonant,
                    words: await this.#allWords('consonantRhymeId', entry.consonantRhymeId!, word, null),
                });
            }

            if (asonant) {
                const words = await this.#allWords('asonantRhymeId', entry.asonantRhymeId!, word, null);
                const sameMeasure = await this.#allWords('asonantRhymeId', entry.asonantRhymeId!, word, syllables);
                lists.push({
                    key: 'a',
                    label: 'Rima asonante',
                    value: asonant,
                    words,
                    subset: { label: `de ${plural(syllables, 'sílaba', 'sílabas')}`, words: sameMeasure },
                });
            }

            process.stdout.write('\r\x1b[K');
            const start = lists.findIndex(list => list.key === wanted);
            await new Pager({
                title: word,
                lists,
                load: this.#detailsOf.bind(this),
            }).run(Math.max(0, start));
        }

        async onDestroy(): Promise<void> {
            if (dataSource.isInitialized) await dataSource.destroy();
        }
    }
});
