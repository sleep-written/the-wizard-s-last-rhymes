# The Wizard's Last Rhymes

Un diccionario de rimas del español para la terminal. Le das una palabra y te
dice cuántas sílabas tiene, a qué categorías pertenece, qué significa en cada
una, y con qué rima: en consonante y en asonante.

```
$ rhymes search cielo

cielo
2 sílabas

  Sustantivo (noun)
    · Sky  masculine
    · Heaven  masculine

  Rima consonante  elo  369 palabras
    Melo   celo   delo   felo   helo   jelo   lelo   melo   pelo   selo
    telo   velo   yelo   zelo   Chelo  Otelo  alelo  apelo  buelo  caelo
    chelo  cuelo  duelo  grelo  hielo  huelo  leelo  mielo  muelo  ocelo
    y 339 más

  Rima asonante  e-o  1147 palabras de 2 sílabas
    pueblo    duelo     ello      vuelcos   quetro    jechos    tiempos
    cheto     tercio    terio     yeco      cebos     cuelpos   seigo
    metro     templo    fémur     sieso     devo      cepo      setos
    sénior    teros     lejos     cetro     tenso     cuento    grueros
    cerno     ketchups
    y 1117 más

  c todas las consonantes  ·  a todas las asonantes  ·  q salir
```

Las listas se muestran recortadas; pulsando `c` o `a` se abre un paginador a
pantalla completa con el grupo entero y las acepciones de cada palabra.

## Requisitos

- **Node.js 24 o superior.** El proyecto corre el TypeScript tal cual, sin paso
  previo de compilación, con [`@bleed-believer/cli`][cli].
- **Alrededor de 1,5 GB de disco.** El volcado del diccionario ocupa cerca de
  1 GB y la base que sale de él, unos 360 MB. Ninguno de los dos está en el
  repositorio: se generan en la puesta en marcha.

## Puesta en marcha

```shell
# 1. dependencias
npm install

# 2. el diccionario: descarga el volcado y llena la base
npm run typeorm -- migration:run -d ./src/data-source.ts

# 3. a buscar
npm start -- search cielo
```

El segundo paso tarda un buen rato: baja un giga de JSON, lo lee línea a línea,
silabea cada entrada y calcula sus dos claves de rima. Informa del avance por el
camino, y se puede repetir sin miedo: el volcado ya descargado no se vuelve a
pedir, y las migraciones ya aplicadas no se vuelven a correr.

Para ver en qué estado está la base:

```shell
npm run typeorm -- migration:show -d ./src/data-source.ts
```

## Instalarlo como comando

Con el `--` de npm delante de cada búsqueda se hace pesado. Compilando el
proyecto queda un ejecutable con su almohadilla al principio, listo para
enlazarlo:

```shell
npm run build
npm link

rhymes search cielo
```

`npm link` apunta al repositorio, que es donde está `rae.db`; la base se busca
siempre junto a `dist`, así que el clon tiene que seguir en su sitio. Para
deshacerlo, `npm unlink -g the-wizard-s-last-rhymes`.

## Comandos

### `search <word>`

Busca una palabra. Muestra, por cada categoría gramatical en la que aparece,
hasta doce acepciones con sus marcas, y después sus dos grupos de rima:

- **Rima consonante.** Todo lo que suena desde la vocal tónica: `cielo` → `elo`.
  Son listas cortas y se muestran las palabras más breves primero.
- **Rima asonante.** Solo las vocales desde la tónica: `cielo` → `e-o`. Aquí hay
  decenas de miles de palabras y casi ninguna encaja en el verso que uno está
  escribiendo, así que la muestra se limita a las que además miden lo mismo que
  la palabra buscada, y sale al azar para que no toque siempre la misma.

De los grupos se apartan los prefijos, sufijos e infijos, que comparten clave
pero no son palabras, y las siglas, que en el volcado son las entradas escritas
enteras en mayúscula.

#### `--type <categoría>`, `-t`

Deja en las rimas solo las categorías que se pidan. Vale el nombre en español
o el código del volcado, con tildes o sin ellas, repitiendo el flag o separando
con comas:

```shell
rhymes search cielo --type sustantivo
rhymes search cielo -t noun,adj
rhymes search cielo -t verbo -t adjetivo
```

El filtro manda sobre lo que `search` aparta por su cuenta: pidiendo `--type
sufijo` salen los sufijos, que sin él nunca aparecen. Las categorías que hay las
lista el comando [`types`](#types).

Si la terminal es interactiva, al final se ofrece abrir el paginador:

| Tecla | Qué hace |
| --- | --- |
| `↑` `↓` | Una palabra arriba o abajo |
| `espacio` `av pág` | Página siguiente |
| `b` `re pág` | Página anterior |
| `inicio` `fin` | Al principio o al final de la lista |
| `c` `a` | Saltar a las consonantes o a las asonantes |
| `s` | En las asonantes, alternar entre todas y las de la misma medida |
| `q` `esc` | Salir |

### `types`

Las categorías gramaticales que admite `--type`, con su nombre en español, el
código con el que vienen en el volcado y cuántas palabras hay de cada una.
También se puede escribir `categorias`.

```shell
rhymes types
```

### `help [command...]`

Sin nada detrás, la portada con todos los comandos. Con el nombre de uno, su
ficha: qué recibe, qué es obligatorio y qué opciones admite.

```shell
rhymes help
rhymes help search
```

La ayuda se construye leyendo el `docs()` del propio `Commander`, así que un
comando nuevo aparece en ella sin tocar nada: basta con darle una `description`
al declararlo.

## Cómo se calculan las rimas

Todo esto vive en [`src/phonology`](./src/phonology) y se aplica una sola vez,
mientras se llena la base.

La rima es de oído y no de letra, así que la ortografía se reduce antes a una
clave de sonido: `vaca` y `baca` acaban en lo mismo, y también `haya` y `halla`.
Se asume seseo y yeísmo, que es como pronuncia la mayoría; distinguir `s` de `z`
o `ll` de `y` dejaría fuera rimas que cualquier poeta da por buenas.

Sobre esa clave:

- La **sílaba tónica** sale de la tilde, y si no la hay, de las reglas de
  acentuación: llana si la palabra acaba en vocal, `n` o `s`; aguda si no.
- La **rima consonante** arranca en la vocal tónica, no en el núcleo entero, que
  es lo que hace que `tierra` rime con `guerra` y `suave` con `cabe`.
- La **rima asonante** se queda con una vocal por sílaba desde la tónica. La `i`
  y la `u` finales átonas asuenan como `e` y `o` (`débil` con `verde`), y en las
  esdrújulas solo cuentan la tónica y la última (`cántaro` → `a-o`).
- En las **locuciones** la rima la pone la última palabra, que es donde cae el
  acento del sintagma; las sílabas, en cambio, son las de la locución entera.

Las entradas que no se pueden pronunciar —cifras, signos, abreviaturas— se
guardan igual, pero sin claves de rima.

## La base de datos

SQLite, vía TypeORM, en `rae.db`. De las 811.049 líneas del volcado salen
808.441 entradas —772.568 palabras distintas, porque una misma palabra aparece
una vez por cada categoría—, 875.726 acepciones y 15.192 grupos de rima.

Las entidades están en [`src/entities`](./src/entities): `Word` apunta a su
`WordType` y a sus dos `Rhyme`, y cuelgan de ella sus `Sense` (con sus `Tag`) y
sus `Syllable`. Las tres migraciones de [`src/migrations`](./src/migrations)
crean el esquema, lo llenan y, solo al final, construyen los índices: llenar una
tabla ya indexada cuesta mucho más que indexarla después.

## Los datos

El volcado `rae.jsonl` es el español de
[Wiktextract](https://kaikki.org/dictionary/Spanish/words/index.html), extraído
del Wikcionario. Se descarga solo la primera vez que se corren las migraciones.

## Licencia

MIT. Ver [LICENSE](./LICENSE).

[cli]: https://github.com/bleed-believer/cli
