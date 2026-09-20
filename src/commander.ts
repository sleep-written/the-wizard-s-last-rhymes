import { styleText } from 'node:util';
import { Command, Commander } from '@bleed-believer/commander';
import { searchCommand } from './search/command.js';
import { helpCommand, printCommand, printOverview } from './help/command.js';
import { matches, toHelp } from './help/docs.js';

export const commander = new Commander([
    searchCommand,
    helpCommand,
    
    // For not found command
    new Command({
        positionals: ':any*',
        callback: ctx => ({
            async onInit() {
                const words = ctx.positionals.any;
                const command = words.join(' ');

                // sin nada que interpretar no hay nada que reprochar: la
                // portada dice mejor que un error lo que se puede hacer aquí
                if (!command) {
                    printOverview(commander.docs());
                    return;
                }

                // el nombre existe, y lo que le sigue es lo que no cuadra:
                // su ficha explica qué esperaba mejor que cualquier mensaje
                const commands = commander.docs().map(toHelp).filter(help => help !== null);
                const found = commands.find(help => matches(help, words));
                if (found) {
                    console.log(`\n  ${styleText('red', 'Faltan argumentos:')} ${styleText('bold', command)}`);
                    printCommand(found);
                    return;
                }

                throw new Error(`The command "${command}" doesn't exists, type the command "help" the show the docs...`);
            }
        })
    })
]);
