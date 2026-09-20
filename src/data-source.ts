import { resolve } from 'node:path';
import { DataSource, SimpleConsoleLogger } from 'typeorm';

export const dataSource = new DataSource({
    type:       'better-sqlite3',
    // logger:     new SimpleConsoleLogger('all'),
    database:   resolve(import.meta.dirname, '../rae.db'),
    entities:   [ resolve(import.meta.dirname, './entities/*.entity.{ts,js}') ],
    migrations: [ resolve(import.meta.dirname, './migrations/*.{ts,js}') ],
});