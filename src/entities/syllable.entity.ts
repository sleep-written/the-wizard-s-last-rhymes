import type { Relation } from 'typeorm';

import { BaseEntity, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { WordSyllable } from './word-syllable.entity.js';

@Entity({ name: 'Syllable' })
export class Syllable extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'int' })
    id?: number;

    @Index({ unique: true })
    @Column({ type: 'nvarchar' })
    value!: string;

    @OneToMany(_ => WordSyllable, r => r.syllable)
    words?: Relation<WordSyllable[]>;
}