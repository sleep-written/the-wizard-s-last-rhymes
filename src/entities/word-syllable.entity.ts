import type { Relation } from 'typeorm';

import { BaseEntity, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Syllable } from './syllable.entity.js';
import { Word } from './word.entity.js';

@Entity({ name: 'WordSyllable' })
export class WordSyllable extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'int' })
    id?: number;
    
    @Index()
    @ManyToOne(_ => Syllable, r => r.words)
    syllable?: Relation<Syllable>;
    
    @Index()
    @ManyToOne(_ => Word, r => r.syllables)
    word?: Relation<Word>;
}