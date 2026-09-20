import { styleText } from 'node:util';
import { Command } from '@bleed-believer/commander';

export const helpCommand = new Command({
    positionals: 'help :command*',
    callback: ctx => ({
        async onInit() {
            // Todo: implement a beautiful help command viewer
            // import perezoso: commander.ts carga este módulo con await de
            // nivel superior, y pedirlo arriba dejaría el ciclo bloqueado
            const { commander } = await import('@commander.js');
            const docs = commander.docs();
        }
    })
})