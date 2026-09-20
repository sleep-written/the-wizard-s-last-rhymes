import type { Relation } from 'typeorm';

import { BaseEntity, Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SenseTag } from './sense-tag.entity.js';

@Entity({ name: 'Tag' })
export class Tag extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'int' })
    id?: number;

    @Index({ unique: true })
    @Column({ type: 'nvarchar' })
    name!: string;

    @OneToMany(_ => SenseTag, r => r.tag)
    senses?: Relation<SenseTag[]>;
}