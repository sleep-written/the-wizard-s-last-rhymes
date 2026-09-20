import { isStressedVowel, isVowel } from './vowels.js';

/** Índice de la sílaba tónica, por las reglas de acentuación del español. */
export function stressedIndex(syllables: string[]): number {
    const marked = syllables.findIndex(syllable => [ ...syllable ].some(isStressedVowel));
    if (marked >= 0) return marked;
    if (syllables.length < 2) return 0;

    // sin tilde: llana si acaba en vocal, "n" o "s"; aguda en cualquier otro caso
    const last = syllables.at(-1)!.at(-1)!;
    return isVowel(last) || last === 'n' || last === 's'
        ?   syllables.length - 2
        :   syllables.length - 1;
}
