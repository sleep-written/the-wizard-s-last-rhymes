import type { Relation } from 'typeorm';

import { BaseEntity, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { WordSyllable } from './word-syllable.entity.js';
import { WordType } from './word-type.entity.js';
import { Rhyme } from './rhyme.entity.js';
import { Sense } from './sense.entity.js';

@Entity({ name: 'Word' })
// el volcado trae una entrada por palabra y categoría: el par no se repite
@Index([ 'name', 'type' ], { unique: true })
export class Word extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'int' })
    id?: number;

    @Column({ type: 'nvarchar' })
    name!: string;

    @ManyToOne(_ => WordType, r => r.words)
    @JoinColumn({ name: 'wordTypeId' })
    type?: Relation<WordType>;

    @OneToMany(_ => Sense, r => r.word)
    senses?: Relation<Sense[]>;

    @Index()
    @ManyToOne(_ => Rhyme, r => r.consonantWords)
    consonantRhyme?: Relation<Rhyme>;

    @Index()
    @ManyToOne(_ => Rhyme, r => r.asonantWords)
    asonantRhyme?: Relation<Rhyme>;

    @OneToMany(_ => WordSyllable, r => r.word)
    syllables?: Relation<WordSyllable[]>;
}