import type { CommandDoc, CommandDocFlag } from '@bleed-believer/commander';

import { styleText } from 'node:util';
import { Command } from '@bleed-believer/commander';

import type { CommandHelp } from './docs.js';
import { cardinality, matches, toHelp, usage } from './docs.js';

/** El nombre con el que se invoca el programa una vez instalado. */
const PROGRAM = 'rhymes';

/** La portada: cómo se llama esto y de qué va. */
const TITLE = 'The Wizard\'s Last Rhymes';
const TAGLINE = 'Rimas, sílabas y acepciones del español, desde la terminal';

/** Nombres legibles para los tipos de las opciones, que vienen en inglés. */
const FLAG_TYPES: Record<CommandDocFlag['type'], string> = {
    boolean: 'booleana',
    string: 'texto',
    number: 'número',
};

/** Separación entre una columna y la siguiente. */
const GAP = 2;

function heading(text: string): string {
    return `  ${styleText([ 'bold', 'magenta' ], text)}`;
}

/**
 * El nombre del comando con sus posicionales. Devuelve también el largo sin
 * colorear, porque los códigos de color cuentan para `length` pero no ocupan
 * sitio en pantalla, y las columnas se cuadran con el largo de verdad.
 */
function signature(help: CommandHelp): { text: string; width: number } {
    const args = help.args.map(usage).join(' ');
    return {
        text: styleText('green', help.name) + (args ? ` ${styleText('dim', args)}` : ''),
        width: help.name.length + (args ? args.length + 1 : 0),
    };
}

/** Rellena hasta `width` contando solo lo que se ve. */
function pad(width: number, used: number): string {
    return ' '.repeat(Math.max(0, width - used) + GAP);
}

/** Qué comandos hay, uno por línea, con lo que hace cada uno. */
export function printOverview(docs: CommandDoc[]): void {
    const commands = docs.map(toHelp).filter(help => help !== null);

    console.log(`\n${styleText([ 'bold', 'underline' ], TITLE)}`);
    console.log(`${styleText('dim', TAGLINE)}\n`);

    console.log(heading('Uso'));
    console.log(`    ${styleText('green', PROGRAM)} ${styleText('dim', '<comando> [argumentos]')}\n`);

    console.log(heading('Comandos'));
    const rows = commands.map(help => ({ ...signature(help), description: help.description }));
    const column = Math.max(0, ...rows.map(row => row.width));

    for (const { text, width, description } of rows) {
        console.log(`    ${text}${pad(column, width)}${description ?? ''}`);
    }

    console.log(`\n  ${styleText('dim', `Escribe «${PROGRAM} help <comando>» para ver uno en detalle.`)}\n`);
}

/** Un comando por dentro: cómo se escribe, qué recibe y qué admite. */
export function printCommand(help: CommandHelp): void {
    const { text } = signature(help);
    console.log(`\n  ${text}`);
    if (help.description) console.log(`  ${styleText('dim', help.description)}`);

    const aliases = help.literals.flatMap(literal => literal.names.slice(1));
    if (aliases.length) {
        console.log(`  ${styleText('dim', `alias: ${aliases.join(', ')}`)}`);
    }

    console.log(`\n${heading('Uso')}`);
    const args = help.args.map(usage).join(' ');
    console.log(`    ${styleText('green', `${PROGRAM} ${help.name}`)}`
        + (args ? ` ${styleText('dim', args)}` : ''));

    if (help.args.length) {
        console.log(`\n${heading('Argumentos')}`);
        const column = Math.max(...help.args.map(arg => arg.name.length));

        for (const arg of help.args) {
            console.log(`    ${styleText('green', arg.name)}${pad(column, arg.name.length)}`
                + styleText('dim', cardinality(arg)));
        }
    }

    if (help.flags.length) {
        console.log(`\n${heading('Opciones')}`);
        const flags = help.flags.map(flag => ({ ...flag, name: `--${flag.name}` }));
        const column = Math.max(...flags.map(flag => flag.name.length));

        for (const flag of flags) {
            const kind = `${FLAG_TYPES[flag.type]}, ${flag.required ? 'obligatoria' : 'opcional'}`;
            console.log(`    ${styleText('yellow', flag.name)}${pad(column, flag.name.length)}`
                + `${styleText('dim', kind)}${flag.description ? `  ${flag.description}` : ''}`);
        }
    }

    console.log();
}

/** Lo que se teclea no es ningún comando: se dice, y se recuerda cuáles hay. */
function printUnknown(words: string[], commands: CommandHelp[]): void {
    console.log(`\n  ${styleText('red', 'No hay ningún comando:')} ${styleText('bold', words.join(' '))}`);
    console.log(`  ${styleText('dim', `Los que hay: ${commands.map(help => help.name).join(', ')}.`)}\n`);
}

export const helpCommand = new Command({
    description: 'Muestra esta ayuda, o el detalle de un comando',
    positionals: 'help :command*',
    callback: ctx => ({
        async onInit() {
            // import perezoso: commander.ts carga este módulo con await de
            // nivel superior, y pedirlo arriba dejaría el ciclo bloqueado
            const { commander } = await import('@commander.js');
            const docs = commander.docs();

            const words = ctx.positionals.command;
            if (!words.length) {
                printOverview(docs);
                return;
            }

            const commands = docs.map(toHelp).filter(help => help !== null);
            const found = commands.filter(help => matches(help, words));

            if (!found.length) {
                printUnknown(words, commands);
                return;
            }

            for (const help of found) printCommand(help);
        }
    })
})
