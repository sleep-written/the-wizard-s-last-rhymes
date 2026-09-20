/** Pone la inicial en mayúscula, respetando los acentos. */
export function capitalize(text: string): string {
    return text.charAt(0).toLocaleUpperCase('es') + text.slice(1);
}

/** Une un número con su sustantivo, en singular o en plural. */
export function plural(count: number, one: string, many: string): string {
    return `${count.toLocaleString('es')} ${count === 1 ? one : many}`;
}
