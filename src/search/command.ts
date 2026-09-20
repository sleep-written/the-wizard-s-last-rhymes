import type { CommandTarget } from '@bleed-believer/commander';

import { Command } from '@bleed-believer/commander';

export const searchCommand = new Command({
    positionals: 'search :word',
    callback: ctx => new class implements CommandTarget {
        async onInit(): Promise<void> {
            throw new Error('Not implemented yet')
        }
    }
});