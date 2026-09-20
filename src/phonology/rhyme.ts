import { stripAccent, vowelKind } from './vowels.js';
import { tokenize } from './syllabify.js';

/**
 * Reduce la ortografía a una clave de sonido. La rima consonante es de oído y
 * no de letra: "vaca" rima con "baca", y "haya" con "halla". Se asume seseo y
 * yeísmo, que es como pronuncia la mayoría de los hablantes; distinguir s/z o
 * ll/y aquí dejaría fuera rimas que cualquier poeta da por buenas.
 *
 * El texto entra siempre en minúscula, así que las mayúsculas quedan libres
 * para marcar los sonidos que no se pueden escribir con una sola letra.
 */
export function phonemize(text: string): string {
    return text
        .toLowerCase()
        // dígrafos y "ü" se apartan antes de tocar las letras sueltas
        .replaceAll('ch', 'C')
        .replaceAll('rr', 'R')
        .replaceAll('gü', 'W')
        .replaceAll('ll', 'y')
        .replace(/qu(?=[eéií])/g, 'k')
        .replace(/gu(?=[eéií])/g, 'G')
        .replace(/[áéíóúàèìòùâêîôûäëïöü]/g, char => stripAccent(char))
        .replace(/c(?=[ei])/g, 's')
        .replace(/g(?=[ei])/g, 'j')
        .replaceAll('z', 's')
        .replaceAll('ç', 's')
        .replaceAll('c', 'k')
        .replaceAll('v', 'b')
        .replaceAll('h', '')
        .replaceAll('x', 'ks')
        .replaceAll('w', 'u')
        .replaceAll('y', 'i')
        .replaceAll('C', 'ch')
        .replaceAll('R', 'rr')
        .replaceAll('W', 'gu')
        .replaceAll('G', 'g');
}

/** Dónde empieza el núcleo dentro de la sílaba, saltándose el ataque. */
function nucleusOffset(syllable: string): number {
    let offset = 0;

    for (const unit of tokenize(syllable)) {
        if (unit.kind === 'vowel') return offset;
        offset += unit.text.length;
    }

    return offset;
}

/** Las vocales del núcleo de una sílaba, ya sin consonantes. */
function nucleusOf(syllable: string): string {
    return tokenize(syllable)
        .filter(unit => unit.kind === 'vowel')
        .map(unit => unit.text)
        .join('');
}

/**
 * Posición de la vocal que manda en el núcleo: la tónica, la abierta, o la
 * segunda de dos cerradas. Lo que va delante es semiconsonante ("tie-rra",
 * "sua-ve") y suena como ataque, no como rima.
 */
function peakIndex(nucleus: string): number {
    const chars = [ ...nucleus ];
    const accented = chars.findIndex(char => 'áéíóú'.includes(char));
    if (accented >= 0) return accented;

    const open = chars.findIndex(char => vowelKind(char) === 'open');
    return open >= 0 ? open : chars.length - 1;
}

/** La vocal que manda en el núcleo, ya sin tilde. */
function peak(nucleus: string): string {
    return stripAccent([ ...nucleus ][peakIndex(nucleus)]!);
}

/**
 * Rima consonante: todo lo que suena desde la vocal tónica hasta el final
 * ("casa" -> "asa", "corazón" -> "on"). Vacía si la palabra no tiene vocales.
 */
export function consonantRhyme(syllables: string[], stressed: number): string {
    const head = syllables[stressed] ?? '';
    const nucleus = nucleusOf(head);

    // arranca en la vocal tónica, no en el núcleo entero: "tierra" rima con
    // "guerra", y "suave" con "cabe"
    const start = nucleusOffset(head) + (nucleus ? peakIndex(nucleus) : 0);
    return phonemize(head.slice(start) + syllables.slice(stressed + 1).join(''));
}

/**
 * Rima asonante: solo las vocales desde la tónica, una por sílaba
 * ("tierra" -> "e-a", "cántaro" -> "a-o", "cantar" -> "a").
 */
export function asonantRhyme(syllables: string[], stressed: number): string {
    const vowels = syllables
        .slice(stressed)
        .map(nucleusOf)
        .filter(nucleus => nucleus.length > 0)
        .map(peak);

    if (!vowels.length) return '';

    // la "i" y la "u" finales átonas asuenan como "e" y "o" ("débil" con "verde")
    const last = vowels.length - 1;
    if (last > 0) vowels[last] = { i: 'e', u: 'o' }[vowels[last]!] ?? vowels[last]!;

    // en esdrújulas y sobresdrújulas solo cuentan la tónica y la final
    return (vowels.length > 2 ? [ vowels[0]!, vowels[last]! ] : vowels).join('-');
}
