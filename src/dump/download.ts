import type { ReadableStream as WebReadableStream } from 'node:stream/web';

import { createWriteStream } from 'node:fs';
import { rename, rm, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

/** Volcado en español de Wiktextract, del que sale toda la base. */
export const DUMP_URL =
    'https://kaikki.org/dictionary/Spanish/words/kaikki.org-dictionary-Spanish-words.jsonl';

/** Con tamaño conocido se informa cada 5%; sin saberlo, cada 100 MB. */
const PROGRESS_STEP = 0.05;
const PROGRESS_BYTES = 100 * 1_048_576;

function megabytes(bytes: number): string {
    return `${(bytes / 1_048_576).toFixed(0)} MB`;
}

/**
 * Deja el volcado en `path`, descargándolo si todavía no está.
 *
 * Se baja a un archivo `.part` y solo se renombra al terminar, para que una
 * descarga cortada no deje un archivo truncado con el nombre bueno.
 *
 * El servidor lo sirve comprimido (el giga viaja en unos 90 MB), y entonces su
 * content-length cuenta bytes comprimidos, no los que acabamos escribiendo:
 * solo sirve para comparar cuando no hay compresión de por medio.
 */
export async function ensureDump(path: string): Promise<void> {
    const found = await stat(path).catch(() => null);
    if (found?.isFile()) {
        console.log(`  volcado ya presente (${megabytes(found.size)})`);
        return;
    }

    const partial = `${path}.part`;
    await rm(partial, { force: true });

    console.log(`  descargando ${DUMP_URL}`);
    const response = await fetch(DUMP_URL);
    if (!response.ok || !response.body) {
        throw new Error(`no se pudo descargar el volcado: HTTP ${response.status} ${response.statusText}`);
    }

    const compressed = (response.headers.get('content-encoding') ?? 'identity') !== 'identity';
    const expected = compressed ? 0 : Number(response.headers.get('content-length')) || 0;

    let received = 0;
    let nextReport = expected ? expected * PROGRESS_STEP : PROGRESS_BYTES;

    // fetch entrega el ReadableStream del DOM y fromWeb espera el de
    // node:stream/web; en tiempo de ejecución son el mismo objeto
    const source = Readable.fromWeb(response.body as WebReadableStream<Uint8Array>);

    // el contador va dentro del pipeline para no poner el flujo en modo
    // flowing por la espalda, y para que la contrapresión siga funcionando
    async function* count(chunks: AsyncIterable<Buffer>): AsyncGenerator<Buffer> {
        for await (const chunk of chunks) {
            received += chunk.length;
            yield chunk;

            if (received < nextReport) continue;
            nextReport += expected ? expected * PROGRESS_STEP : PROGRESS_BYTES;
            console.log(expected
                ?   `  ${(received / expected * 100).toFixed(0)}% (${megabytes(received)} de ${megabytes(expected)})`
                :   `  ${megabytes(received)} descargados`);
        }
    }

    try {
        // un corte a mitad rompe aquí igualmente: sin compresión porque faltan
        // bytes, y con ella porque el flujo comprimido queda incompleto
        await pipeline(source, count, createWriteStream(partial));
        if (expected && received !== expected) {
            throw new Error(`descarga incompleta: ${received} de ${expected} bytes`);
        }
    } catch (error) {
        // nunca dejar un archivo a medias con el nombre definitivo
        await rm(partial, { force: true });
        throw error;
    }

    await rename(partial, path);
    console.log(`  volcado descargado (${megabytes(received)})`);
}
