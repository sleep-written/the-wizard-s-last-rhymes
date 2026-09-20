import { asonantRhyme, consonantRhyme } from './rhyme.js';
import { stressedIndex } from './stress.js';
import { syllabify } from './syllabify.js';

export interface WordAnalysis {
    /** Sílabas de la entrada completa, en orden. */
    syllables: string[];

    /** Clave de rima consonante, o `null` si la entrada no rima. */
    consonantRhyme: string | null;

    /** Clave de rima asonante, o `null` si la entrada no rima. */
    asonantRhyme: string | null;
}

/** Letras que el silabeo sabe leer; cifras, signos y emoji quedan fuera. */
const SPELLED = /^[a-záéíóúüïñç]+$/;

/**
 * Descompone una entrada del diccionario en sílabas y claves de rima.
 * Devuelve `null` cuando no es pronunciable (símbolos, cifras, abreviaturas).
 *
 * En las locuciones la rima la pone la última palabra, que es donde cae el
 * acento del sintagma; las sílabas, en cambio, son las de la locución entera.
 */
export function analyze(entry: string): WordAnalysis | null {
    const words = entry
        .normalize('NFC')
        .toLowerCase()
        .split(/[\s ·-]+/)
        .map(word => word.replace(/^[.'’]+|[.'’]+$/g, ''))
        .filter(word => word.length > 0);

    if (!words.length || !words.every(word => SPELLED.test(word))) return null;

    const last = syllabify(words.at(-1)!);
    const stressed = stressedIndex(last);

    return {
        syllables: words.flatMap(syllabify),
        consonantRhyme: consonantRhyme(last, stressed) || null,
        asonantRhyme: asonantRhyme(last, stressed) || null,
    };
}
