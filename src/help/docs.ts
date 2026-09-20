import type { CommandDoc, CommandDocFlag } from '@bleed-believer/commander';

/** Un token de la plantilla de posicionales, ya interpretado. */
export type Token =
    | { kind: 'literal'; names: string[] }
    | { kind: 'capture'; name: string; required: boolean; variadic: boolean };

/** El nombre que se teclea, con los alias que también valen. */
export type Literal = Extract<Token, { kind: 'literal' }>;

/** Un hueco de la plantilla: lo que el usuario pone de su cosecha. */
export type Capture = Extract<Token, { kind: 'capture' }>;

/** Lee un token de la plantilla: `install(i)`, `:word`, `:command*`… */
export function parseToken(token: string): Token {
    if (!token.startsWith(':')) {
        // los alias van entre paréntesis y separados por comas, que es como
        // los lee el parser: `install(i,add)` acepta las tres formas
        const paren = token.indexOf('(');
        const names = paren < 0
            ?   [ token ]
            :   [ token.slice(0, paren), ...token.slice(paren + 1, -1).split(',').filter(Boolean) ];

        return { kind: 'literal', names };
    }

    const body = token.slice(1);
    switch (body.at(-1)) {
        case '?':   return { kind: 'capture', name: body.slice(0, -1), required: false, variadic: false };
        case '*':   return { kind: 'capture', name: body.slice(0, -1), required: false, variadic: true  };
        case '+':   return { kind: 'capture', name: body.slice(0, -1), required: true,  variadic: true  };
        default:    return { kind: 'capture', name: body,              required: true,  variadic: false };
    }
}

/** Cómo se escribe un posicional: `<word>` si es obligatorio, `[word]` si no. */
export function usage(token: Capture): string {
    const rest = token.variadic ? '...' : '';
    return token.required ? `<${token.name}${rest}>` : `[${token.name}${rest}]`;
}

/** Cuántos valores admite un posicional, dicho en palabras. */
export function cardinality(token: Capture): string {
    if (token.variadic) return token.required ? 'uno o más' : 'ninguno o varios';
    return token.required ? 'obligatorio' : 'opcional';
}

/** Un comando del `docs()`, ya interpretado y listo para mostrarse. */
export interface CommandHelp {
    /** Lo que se teclea para llegar hasta él: `search`, o `pkg install`. */
    name: string;

    /** Los nombres válidos de cada token literal, alias incluidos. */
    literals: Literal[];

    /** Lo que recibe después del nombre, en orden. */
    args: Capture[];

    description: string | undefined;
    flags: CommandDocFlag[];
}

/**
 * Interpreta una entrada de `docs()`. Devuelve `null` cuando el comando no
 * tiene ningún token literal: el comodín que recoge lo que no existe no se
 * puede teclear, y por tanto tampoco se documenta.
 */
export function toHelp(doc: CommandDoc): CommandHelp | null {
    const tokens = doc.path.map(parseToken);
    const literals = tokens.filter(token => token.kind === 'literal');
    if (!literals.length) return null;

    return {
        name: literals.map(literal => literal.names[0]).join(' '),
        literals,
        args: tokens.filter(token => token.kind === 'capture'),
        description: doc.description,
        flags: doc.flags,
    };
}

/**
 * ¿Los nombres tecleados llevan hasta este comando? Basta con acertar el
 * principio, para que `help pkg` describa todo lo que cuelga de `pkg`.
 */
export function matches(help: CommandHelp, words: string[]): boolean {
    return words.length > 0
        && words.length <= help.literals.length
        && words.every((word, index) => help.literals[index]!.names.includes(word));
}
