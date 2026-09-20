import type { Relation } from 'typeorm';

import { BaseEntity, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Word } from './word.entity.js';

@Entity({ name: 'WordType' })
export class WordType extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'int' })
    id?: number;

    @Index({ unique: true })
    @Column({ type: 'nvarchar' })
    name!: string;

    @OneToMany(_ => Word, r => r.type)
    words?: Relation<Word[]>;
}