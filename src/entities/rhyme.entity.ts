import type { Relation } from 'typeorm';

import { BaseEntity, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Word } from './word.entity.js';

@Entity({ name: 'Rhyme' })
export class Rhyme extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'int' })
    id?: number;

    @Index({ unique: true })
    @Column({ type: 'nvarchar' })
    value!: string;

    @OneToMany(_ => Word, r => r.consonantRhyme)
    consonantWords?: Relation<Word[]>;

    @OneToMany(_ => Word, r => r.asonantRhyme)
    asonantWords?: Relation<Word[]>;
}