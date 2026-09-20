import type { Relation } from 'typeorm';

import { BaseEntity, Column, Entity, Index, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Word } from './word.entity.js';
import { SenseTag } from './sense-tag.entity.js';

@Entity({ name: 'Sense' })
export class Sense extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'int' })
    id?: number;

    @Column({ type: 'nvarchar', nullable: true })
    description!: string | null;

    @Index()
    @ManyToOne(_ => Word, r => r.senses)
    word?: Relation<Word>;

    @OneToMany(_ => SenseTag, r => r.sense)
    tags?: Relation<SenseTag[]>;
}