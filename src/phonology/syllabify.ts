import { isVowel, stripAccent, vowelKind } from './vowels.js';

export interface Unit {
    kind: 'consonant' | 'vowel';
    text: string;
}

/** Dígrafos: dos letras, un solo sonido, nunca se parten. */
const DIGRAPHS = new Set([ 'ch', 'll', 'rr' ]);

/** Grupos que se arrastran enteros a la sílaba siguiente ("a-brir", "co-pla"). */
const CLUSTERS = new Set([
    'pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr',
    'pl', 'bl', 'cl', 'gl', 'fl',
]);

/** Parte la palabra en letras, tratando dígrafos y "u" muda como una pieza. */
export function tokenize(word: string): Unit[] {
    const units: Unit[] = [];

    for (let i = 0; i < word.length;) {
        const pair = word.slice(i, i + 2);
        if (DIGRAPHS.has(pair)) {
            units.push({ kind: 'consonant', text: pair });
            i += 2;
            continue;
        }

        // la "u" de "que/qui/gue/gui" no suena: va pegada al ataque
        if ((pair === 'qu' || pair === 'gu') && 'eéií'.includes(word[i + 2] ?? '')) {
            units.push({ kind: 'consonant', text: pair });
            i += 2;
            continue;
        }

        // la "y" solo hace de vocal cuando no encabeza sílaba ("rey" frente a "yo")
        const char = word[i]!;
        const vowel = isVowel(char) || (char === 'y' && !isVowel(word[i + 1] ?? ''));
        units.push({ kind: vowel ? 'vowel' : 'consonant', text: char });
        i++;
    }

    return units;
}

/** Decide si dos vocales seguidas caben en el mismo núcleo o abren hiato. */
function glides(first: string, second: string): boolean {
    const a = vowelKind(first);
    const b = vowelKind(second);

    if (a === 'open' && b === 'open') return false;             // "a-é-re-o"
    if (a === 'closed-stressed') return false;                  // "rí-o"
    if (a === 'open' && b === 'closed-stressed') return false;  // "pa-ís"
    if (a === 'closed' && b === 'closed')                       // "chi-i-ta"
        return stripAccent(first) !== stripAccent(second);

    return true;
}

/** Agrupa una racha de vocales en núcleos: monoptongos, diptongos y triptongos. */
function nuclei(vowels: string[]): string[] {
    const groups: string[] = [];

    for (let i = 0; i < vowels.length;) {
        const first = vowels[i]!;
        const second = vowels[i + 1];
        const third = vowels[i + 2];

        if (second !== undefined && glides(first, second)) {
            // triptongo: cerrada + abierta + cerrada ("buey", "cam-biáis")
            if (
                third !== undefined && glides(second, third) &&
                vowelKind(first) === 'closed' &&
                vowelKind(second) === 'open' &&
                vowelKind(third) === 'closed'
            ) {
                groups.push(first + second + third);
                i += 3;
                continue;
            }

            groups.push(first + second);
            i += 2;
            continue;
        }

        groups.push(first);
        i += 1;
    }

    return groups;
}

/** Reparte las consonantes entre dos núcleos: [coda de la anterior, ataque de la siguiente]. */
function splitRun(run: string[]): [ string[], string[] ] {
    const size = run.length;
    if (size <= 1) return [ [], run ];

    const tail = run.at(-2)! + run.at(-1)!;
    if (size === 2) {
        return CLUSTERS.has(tail)
            ?   [ [], run ]
            :   [ [ run[0]! ], [ run[1]! ] ];
    }

    // con tres o más solo viajan juntas las dos últimas, y si forman grupo
    return CLUSTERS.has(tail)
        ?   [ run.slice(0, size - 2), run.slice(size - 2) ]
        :   [ run.slice(0, size - 1), run.slice(size - 1) ];
}

/** Silabea una palabra suelta. */
export function syllabify(word: string): string[] {
    const parts: Array<{ consonants: string[] } | { nucleus: string }> = [];
    let run: string[] = [];
    let vowels: string[] = [];

    const closeVowels = () => {
        for (const nucleus of nuclei(vowels)) parts.push({ nucleus });
        vowels = [];
    };

    for (const unit of tokenize(word)) {
        if (unit.kind === 'vowel') {
            if (run.length) {
                parts.push({ consonants: run });
                run = [];
            }
            vowels.push(unit.text);
        } else {
            if (vowels.length) closeVowels();
            run.push(unit.text);
        }
    }

    if (vowels.length) closeVowels();
    if (run.length) parts.push({ consonants: run });

    const syllables: string[] = [];
    let onset = '';

    for (const part of parts) {
        if ('nucleus' in part) {
            syllables.push(onset + part.nucleus);
            onset = '';
            continue;
        }

        // las consonantes iniciales de la palabra son ataque, no hay coda que repartir
        if (!syllables.length) {
            onset = part.consonants.join('');
            continue;
        }

        const [ coda, next ] = splitRun(part.consonants);
        syllables[syllables.length - 1] += coda.join('');
        onset = next.join('');
    }

    // lo que sobra al final es coda de la última sílaba
    if (onset) {
        if (syllables.length) syllables[syllables.length - 1] += onset;
        else syllables.push(onset);
    }

    return syllables;
}
