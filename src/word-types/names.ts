/** Categorías que no sirven para rimar: no son palabras que uno pueda usar. */
export const NOT_RHYMABLE = [ 'prefix', 'suffix', 'infix', 'interfix', 'character', 'punct', 'symbol' ];

/** Nombres legibles para las categorías, que el volcado trae en inglés. */
export const TYPE_NAMES: Record<string, string> = {
    adj: 'adjetivo',
    adv: 'adverbio',
    adv_phrase: 'locución adverbial',
    article: 'artículo',
    character: 'carácter',
    conj: 'conjunción',
    contraction: 'contracción',
    det: 'determinante',
    infix: 'infijo',
    interfix: 'interfijo',
    intj: 'interjección',
    name: 'nombre propio',
    noun: 'sustantivo',
    num: 'numeral',
    particle: 'partícula',
    phrase: 'locución',
    prefix: 'prefijo',
    prep: 'preposición',
    prep_phrase: 'locución preposicional',
    pron: 'pronombre',
    proverb: 'refrán',
    punct: 'signo',
    suffix: 'sufijo',
    symbol: 'símbolo',
    verb: 'verbo',
};

/** El nombre en español de una categoría; si no se conoce, el código tal cual. */
export function typeName(code: string): string {
    return TYPE_NAMES[code] ?? code;
}

/** Las categorías que se pueden pedir, en español y ordenadas. */
export function typeList(): string[] {
    const collator = new Intl.Collator('es');
    return Object.values(TYPE_NAMES).sort((a, b) => collator.compare(a, b));
}

/** Quita tildes y mayúsculas: al teclear una categoría no deberían hacer falta. */
function fold(text: string): string {
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');
}

/** Ambos nombres de cada categoría, el del volcado y el de aquí, ya plegados. */
const BY_NAME = new Map(Object.entries(TYPE_NAMES).flatMap(
    ([ code, name ]) => [ [ fold(code), code ] as const, [ fold(name), code ] as const ]));

/** Lo que se pidió en `--type`, ya traducido a códigos del volcado. */
export interface TypeSelection {
    /** Los códigos que hay que dejar pasar, sin repetir y en el orden tecleado. */
    codes: string[];

    /** Los mismos, en español, para decir por pantalla qué se está filtrando. */
    names: string[];

    /** Lo que se tecleó y no corresponde a ninguna categoría. */
    unknown: string[];
}

/**
 * Interpreta los valores de `--type`. Vale el nombre en español y el código
 * en inglés, con tildes o sin ellas, y varios por flag separados por comas.
 */
export function resolveTypes(inputs: string[]): TypeSelection {
    const codes: string[] = [];
    const unknown: string[] = [];

    const wanted = inputs
        .flatMap(input => input.split(','))
        .map(input => input.trim())
        .filter(Boolean);

    for (const input of wanted) {
        const code = BY_NAME.get(fold(input));
        if (!code) unknown.push(input);
        else if (!codes.includes(code)) codes.push(code);
    }

    return { codes, names: codes.map(typeName), unknown };
}
