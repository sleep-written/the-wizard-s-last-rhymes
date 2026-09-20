/** Vocales abiertas (fuertes), con y sin tilde. */
const OPEN = new Set('aeoáéó');

/** Vocales cerradas (débiles) átonas. */
const CLOSED = new Set('iuüï');

/** Vocales cerradas tónicas: rompen el diptongo ("pa-ís", "rí-o"). */
const CLOSED_STRESSED = new Set('íú');

/** Vocales con tilde, las que marcan por escrito la sílaba tónica. */
const STRESSED = new Set('áéíóú');

const PLAIN: Record<string, string> = {
    á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u',
    à: 'a', è: 'e', ì: 'i', ò: 'o', ù: 'u',
    â: 'a', ê: 'e', î: 'i', ô: 'o', û: 'u',
    ä: 'a', ë: 'e', ï: 'i', ö: 'o', ü: 'u',
    y: 'i',
};

/** Cómo se comporta una vocal al formar núcleo silábico. */
export type VowelKind = 'open' | 'closed' | 'closed-stressed';

export function isVowel(char: string): boolean {
    return OPEN.has(char) || CLOSED.has(char) || CLOSED_STRESSED.has(char);
}

/** La "y" vocálica ("rey", "muy") se comporta como una "i". */
export function vowelKind(char: string): VowelKind {
    if (CLOSED_STRESSED.has(char)) return 'closed-stressed';
    if (OPEN.has(char)) return 'open';
    return 'closed';
}

export function isStressedVowel(char: string): boolean {
    return STRESSED.has(char);
}

export function stripAccent(char: string): string {
    return PLAIN[char] ?? char;
}
