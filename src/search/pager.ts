import { emitKeypressEvents } from 'node:readline';
import { styleText } from 'node:util';

import { capitalize } from './text.js';

/** Lo que se muestra de cada palabra en la lista. */
export interface WordDetail {
    /** Sus categorías, ya en español. */
    types: string[];
    definitions: string[];
}

/** Una de las listas entre las que el paginador puede alternar. */
export interface PagerList {
    /** Tecla que salta a esta lista. */
    key: string;
    label: string;
    /** La clave de rima. */
    value: string;
    /** Todas las palabras del grupo, ya ordenadas. */
    words: string[];
    /** Las que además miden lo mismo que la palabra buscada. */
    subset?: {
        label: string;
        words: string[];
    };
}

export interface PagerOptions {
    title: string;
    /** Aclaración junto al título: el filtro de categorías, si lo hay. */
    note?: string;
    lists: PagerList[];
    /** Trae el detalle de las palabras visibles; solo se pide lo que se ve. */
    load(names: string[]): Promise<Map<string, WordDetail>>;
    input?: NodeJS.ReadStream;
    output?: NodeJS.WriteStream;
}

/** Cuántas acepciones se muestran bajo cada palabra. */
const DEFINITIONS = 3;

/** Sangría de las definiciones. */
const INDENT = '    ';

/** Marca de cada acepción. */
const BULLET = '- ';

/** Una línea ya maquetada, sin colores: el color lo pone el render. */
export type Line =
    | { kind: 'head'; name: string; types: string }
    | { kind: 'body'; text: string }
    | { kind: 'note'; text: string }
    | { kind: 'blank' };

/** Parte un texto largo en líneas que quepan, respetando la sangría. */
export function wrap(text: string, width: number): string[] {
    const usable = Math.max(1, width - INDENT.length);
    const lines: string[] = [];
    let line = '';

    for (const word of text.split(/\s+/).filter(Boolean)) {
        if (!line.length) line = word;
        else if (line.length + 1 + word.length <= usable) line += ` ${word}`;
        else { lines.push(line); line = word; }
    }

    if (line.length) lines.push(line);
    return lines;
}

/** Maqueta el bloque de una palabra: su nombre con el tipo, y debajo las acepciones. */
export function block(name: string, detail: WordDetail | undefined, width: number): Line[] {
    const types = detail?.types.join(', ') ?? '';
    const lines: Line[] = [ { kind: 'head', name, types } ];

    for (const definition of detail?.definitions.slice(0, DEFINITIONS) ?? []) {
        const capitalized = capitalize(definition);

        // el guión solo encabeza la acepción: lo que sigue va alineado debajo
        const [ head, ...tail ] = wrap(capitalized, width - BULLET.length);
        if (head === undefined) continue;

        lines.push({ kind: 'body', text: BULLET + head });
        for (const text of tail) lines.push({ kind: 'body', text: ' '.repeat(BULLET.length) + text });
    }

    const rest = (detail?.definitions.length ?? 0) - DEFINITIONS;
    if (rest > 0) {
        const noun = rest === 1 ? 'acepción' : 'acepciones';
        lines.push({ kind: 'note', text: `... y ${rest} ${noun} más` });
    }

    lines.push({ kind: 'blank' });
    return lines;
}

/**
 * Llena una pantalla desde `offset`. Devuelve las líneas y cuántas palabras
 * consumió, que es el paso que da la tecla de página siguiente.
 */
export function page(
    names: string[],
    details: Map<string, WordDetail>,
    width: number,
    height: number,
): { lines: Line[]; used: number } {
    const lines: Line[] = [];
    let used = 0;

    for (const name of names) {
        if (lines.length >= height) break;
        lines.push(...block(name, details.get(name), width));
        used++;
    }

    return { lines: lines.slice(0, height), used: Math.max(1, used) };
}

/** Navegador a pantalla completa para listas que no caben en la terminal. */
export class Pager {
    readonly #title: string;
    readonly #note: string | undefined;
    readonly #lists: PagerList[];
    readonly #load: PagerOptions['load'];
    readonly #input: NodeJS.ReadStream;
    readonly #output: NodeJS.WriteStream;
    readonly #cache = new Map<string, WordDetail>();

    #current = 0;
    #offset = 0;
    #wholeGroup = true;
    #step = 1;
    #queue = Promise.resolve();
    #done?: () => void;

    constructor(options: PagerOptions) {
        this.#title = options.title;
        this.#note = options.note;
        this.#lists = options.lists;
        this.#load = options.load;
        this.#input = options.input ?? process.stdin;
        this.#output = options.output ?? process.stdout;
    }

    get #list(): PagerList {
        return this.#lists[this.#current]!;
    }

    /** Las palabras que tocan según el filtro de medida. */
    get #words(): string[] {
        const { words, subset } = this.#list;
        return this.#wholeGroup || !subset ? words : subset.words;
    }

    get #width(): number {
        return Math.max(20, this.#output.columns ?? 80);
    }

    /** Líneas de lista visibles: el alto menos cabecera y pie. */
    get #visible(): number {
        return Math.max(1, (this.#output.rows ?? 24) - 5);
    }

    /** Abre el paginador y resuelve cuando el usuario sale. */
    async run(start = 0): Promise<void> {
        this.#current = Math.max(0, start);

        emitKeypressEvents(this.#input);
        if (this.#input.isTTY) this.#input.setRawMode(true);
        this.#input.resume();

        const onKey = this.#onKey.bind(this);
        const onResize = () => this.#draw();
        this.#input.on('keypress', onKey);
        this.#output.on('resize', onResize);

        // pantalla alterna: al salir, la terminal queda como estaba
        this.#output.write('\x1b[?1049h\x1b[?25l');
        this.#draw();

        try {
            await new Promise<void>(resolve => { this.#done = resolve; });
        } finally {
            this.#input.off('keypress', onKey);
            this.#output.off('resize', onResize);
            if (this.#input.isTTY) this.#input.setRawMode(false);
            this.#input.pause();
            this.#output.write('\x1b[?25h\x1b[?1049l');
        }
    }

    /** Encola un repintado: los renders son asíncronos y no deben solaparse. */
    #draw(): void {
        this.#queue = this.#queue.then(() => this.#render()).catch(() => {});
    }

    #onKey(_: string, key: { name?: string; ctrl?: boolean } | undefined): void {
        if (!key) return;

        switch (true) {
            case key.ctrl && key.name === 'c':
            case key.name === 'q':
            case key.name === 'escape':
                this.#done?.();
                return;

            case key.name === 'down':      this.#scroll(1); break;
            case key.name === 'up':        this.#scroll(-1); break;
            case key.name === 'space':
            case key.name === 'pagedown':  this.#scroll(this.#step); break;
            case key.name === 'b':
            case key.name === 'pageup':    this.#scroll(-this.#step); break;
            case key.name === 'home':      this.#offset = 0; break;
            case key.name === 'end':       this.#scroll(this.#words.length); break;

            case key.name === 's': {
                if (!this.#list.subset) return;
                this.#wholeGroup = !this.#wholeGroup;
                this.#offset = 0;
                break;
            }

            default: {
                const index = this.#lists.findIndex(list => list.key === key.name);
                if (index < 0 || index === this.#current) return;
                this.#current = index;
                this.#offset = 0;
            }
        }

        this.#draw();
    }

    #scroll(by: number): void {
        const last = Math.max(0, this.#words.length - 1);
        this.#offset = Math.max(0, Math.min(this.#offset + by, last));
    }

    /** Detalle de las palabras pedidas, tirando de caché para lo ya visto. */
    async #details(names: string[]): Promise<Map<string, WordDetail>> {
        const missing = names.filter(name => !this.#cache.has(name));
        if (missing.length) {
            for (const [ name, detail ] of await this.#load(missing)) this.#cache.set(name, detail);
        }

        return this.#cache;
    }

    async #render(): Promise<void> {
        const list = this.#list;
        const words = this.#words;
        const visible = this.#visible;

        // como poco una línea por palabra, así que con esas basta para llenar
        const slice = words.slice(this.#offset, this.#offset + visible);
        const details = await this.#details(slice);
        const { lines, used } = page(slice, details, this.#width, visible);
        this.#step = used;

        const measure = !this.#wholeGroup && list.subset ? ` ${styleText('dim', list.subset.label)}` : '';
        const position = words.length
            ? `palabra ${(this.#offset + 1).toLocaleString('es')} de ${words.length.toLocaleString('es')}`
            : 'vacío';

        const others = this.#lists
            .filter(other => other !== list)
            .map(other => `${styleText('bold', other.key)} ${other.label.toLowerCase()}`);
        const toggle = list.subset
            ? [ `${styleText('bold', 's')} ${this.#wholeGroup ? list.subset.label : 'todas'}` ]
            : [];

        const body = lines.map(line => {
            switch (line.kind) {
                case 'head': return `${styleText('green', line.name)}`
                    + (line.types ? ` ${styleText('cyan', `(${line.types})`)}` : '');
                case 'body': return INDENT + styleText('white', line.text);
                case 'note': return INDENT + styleText('gray', line.text);
                case 'blank': return '';
            }
        });

        const out = [
            `${styleText([ 'bold', 'underline' ], this.#title)}  ${styleText([ 'bold', 'magenta' ], list.label)}`
                + `  ${styleText('yellow', list.value)}`
                + `  ${styleText('dim', `${words.length.toLocaleString('es')} palabras`)}${measure}`
                + (this.#note ? `  ${styleText('dim', this.#note)}` : ''),
            '',
            ...body,
            ...Array(Math.max(0, visible - body.length)).fill(''),
            '',
            styleText('dim', [
                '↑↓ palabra', 'espacio página', 'inicio/fin', ...others, ...toggle, `${styleText('bold', 'q')} salir`,
            ].join('  ·  ') + `   ${position}`),
        ];

        // \x1b[H al inicio y \x1b[K por línea: se repinta sin parpadeo
        this.#output.write('\x1b[H' + out.map(line => `${line}\x1b[K`).join('\n'));
    }
}
