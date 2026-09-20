import { resolve } from 'node:path';
import { DataSource, SimpleConsoleLogger } from 'typeorm';

/** Dónde vive la base: junto a `src` o a `dist`, según desde dónde se corra. */
export const databasePath = resolve(import.meta.dirname, '../rae.db');

export const dataSource = new DataSource({
    type:       'better-sqlite3',
    // logger:     new SimpleConsoleLogger('all'),
    database:   databasePath,
    entities:   [ resolve(import.meta.dirname, './entities/*.entity.{ts,js}') ],
    migrations: [ resolve(import.meta.dirname, './migrations/*.{ts,js}') ],
});