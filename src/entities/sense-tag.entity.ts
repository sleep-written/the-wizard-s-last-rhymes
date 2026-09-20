import type { Relation } from 'typeorm';

import { BaseEntity, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sense } from './sense.entity.js';
import { Tag } from './tag.entity.js';

@Entity({ name: 'SenseTag' })
export class SenseTag extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'int' })
    id?: number;

    @Index()
    @ManyToOne(_ => Sense, r => r.tags)
    sense?: Relation<Sense>;

    @Index()
    @ManyToOne(_ => Tag, r => r.senses)
    tag?: Relation<Tag>;
}