import { Command, Commander } from '@bleed-believer/commander';

export const commander = new Commander([
    await import('./search/command.js').then(x => x.searchCommand),
    new Command({
        positionals: ':any*',
        callback: ctx => ({
            async onInit() {
                const command = ctx.positionals.any.join(' ');
                throw new Error(`The command "${command}" doesn't exists`);
            }
        })
    })
]);