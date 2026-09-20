import { Command, Commander } from '@bleed-believer/commander';
import { searchCommand } from './search/command.js';
import { helpCommand } from './help/command.js';

export const commander = new Commander([
    searchCommand,
    helpCommand,
    
    // For not found command
    new Command({
        positionals: ':any*',
        callback: ctx => ({
            async onInit() {
                const command = ctx.positionals.any.join(' ');
                throw new Error(`The command "${command}" doesn't exists, type the command "help" the show the docs...`);
            }
        })
    })
]);