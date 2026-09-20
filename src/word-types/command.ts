import type { CommandTarget } from '@bleed-believer/commander';

import { existsSync } from 'node:fs';
import { styleText } from 'node:util';
import { Command } from '@bleed-believer/commander';

import { databasePath, dataSource } from '../data-source.js';
import { NOT_RHYMABLE, TYPE_NAMES } from './names.js';

/** El nombre con el que se invoca el programa una vez instalado. */
const PROGRAM = 'rhymes';

/** Separación entre una columna y la siguiente. */
const GAP = 2;

/** Cuántas palabras hay de cada categoría, si la base ya está construida. */
async function counts(): Promise<Map<string, number>> {
    if (!existsSync(databasePath)) return new Map();

    await dataSource.initialize();
    const rows: { name: string; total: number }[] = await dataSource.query(`
        select t.name, count(*) as total
          from "Word" w
          join "WordType" t on t.id = w.wordTypeId
         group by t.name`);

    return new Map(rows.map(row => [ row.name, row.total ]));
}

export const typesCommand = new Command({
    description: 'Lista las categorías gramaticales que admite «search --type»',
    positionals: 'types(categorias)',
    callback: _ => new class implements CommandTarget {
        async onInit(): Promise<void> {
            const totals = await counts();

            // por nombre y en español: esta lista se lee para buscar en ella,
            // no para saber qué categoría es la más nutrida
            const collator = new Intl.Collator('es');
            const rows = Object.entries(TYPE_NAMES)
                .map(([ code, name ]) => ({
                    code,
                    name,
                    total: totals.get(code),
                    rhymable: !NOT_RHYMABLE.includes(code),
                }))
                .sort((a, b) => collator.compare(a.name, b.name));

            const nameWidth = Math.max(...rows.map(row => row.name.length)) + GAP;
            const codeWidth = Math.max(...rows.map(row => row.code.length)) + GAP;
            const counted = rows.map(row => row.total?.toLocaleString('es') ?? '');
            const totalWidth = Math.max(...counted.map(text => text.length));

            console.log(`\n${styleText([ 'bold', 'underline' ], 'Categorías')}`);
            console.log(styleText('dim', 'Lo que se puede pedir en «search --type»\n'));

            for (const [ index, row ] of rows.entries()) {
                const aside = row.rhymable ? '' : `  ${styleText('dim', 'fuera de las rimas')}`;
                console.log(`  ${styleText('green', row.name.padEnd(nameWidth))}`
                    + `${styleText('dim', row.code.padEnd(codeWidth))}`
                    + `${styleText('yellow', counted[index]!.padStart(totalWidth))}${aside}`);
            }

            // las categorías que no son palabras solo salen si se piden: el
            // filtro manda sobre el apartado que hace «search» por su cuenta
            console.log(`\n  ${styleText('dim', 'Vale el nombre o el código, con tildes o sin ellas:')}`);
            console.log(`    ${styleText('green', `${PROGRAM} search cielo --type sustantivo`)}`);
            console.log(`    ${styleText('green', `${PROGRAM} search cielo -t noun,adj`)}\n`);
        }

        async onDestroy(): Promise<void> {
            if (dataSource.isInitialized) await dataSource.destroy();
        }
    }
});
