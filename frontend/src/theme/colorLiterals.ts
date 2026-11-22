/**
 * Detector de colores escritos a mano (spec 017, RF-2, RNF-6; plan 5.6). Un color «literal» es un
 * hexadecimal, una función de color (`rgb()`, `hsl()`, `oklch()`, `color()`…) o un nombre de color
 * CSS. No lo son las palabras clave que no fijan un color (`transparent`, `currentColor`, `inherit`,
 * `initial`, `unset`, `revert`), la referencia a una variable (`var(--nombre)`, aunque el nombre sea
 * `--white`) ni `color-mix()` mientras sus colores sean variables o palabras clave.
 *
 * Funciones puras sobre texto: las pruebas las aplican al tema, a las paletas y a los CSS del proyecto
 * y de la librería. Sin React, sin DOM y sin reloj.
 */
export interface CssColorLiteral {
  property: string;
  literal: string;
}

const NAMED_COLORS = [
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
  'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
  'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta',
  'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
  'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
  'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
  'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow',
  'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
  'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
  'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue',
  'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
  'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
  'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
  'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
  'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
  'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
  'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
  'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
  'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
  'whitesmoke', 'yellow', 'yellowgreen',
];

const COLOR_FUNCTIONS = 'rgba?|hsla?|hwb|lab|lch|oklab|oklch|color';

/**
 * Una sola pasada: función de color (se extiende hasta su paréntesis de cierre), hexadecimal o nombre.
 * Los límites `(?<![\w-])` y `(?![\w-])` evitan tomar `red` dentro de `red-pulse` o `color` dentro de
 * `color-mix`.
 */
const LITERAL = new RegExp(
  [
    `(?<![\\w-])(?:${COLOR_FUNCTIONS})\\(`,
    '#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\\w-])',
    `(?<![\\w-])(?:${NAMED_COLORS.join('|')})(?![\\w-])`,
  ].join('|'),
  'gi',
);

/** Quita comentarios, cadenas, direcciones `url()` y el nombre de las variables (`var(--x` → `var(`). */
function clean(value: string): string {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""')
    .replace(/url\([^)]*\)/gi, 'url()')
    .replace(/var\(\s*--[\w-]*/gi, 'var(');
}

/** Los colores literales de un valor (o de un texto cualquiera), en el orden en que aparecen. */
export function findColorLiterals(value: string): string[] {
  const text = clean(value);
  const found: string[] = [];
  LITERAL.lastIndex = 0;
  for (let match = LITERAL.exec(text); match !== null; match = LITERAL.exec(text)) {
    let end = match.index + match[0].length;
    if (match[0].endsWith('(')) {
      // Función de color: se lleva todo hasta el paréntesis que la cierra.
      let depth = 1;
      while (end < text.length && depth > 0) {
        const char = text[end];
        if (char === '(') depth++;
        else if (char === ')') depth--;
        end++;
      }
    }
    found.push(text.slice(match.index, end));
    LITERAL.lastIndex = end;
  }
  return found;
}

const DECLARATION = /([a-zA-Z-][\w-]*)\s*:\s*([^;{}]+?)\s*(?=;|\})/g;

/**
 * Los colores literales de los valores de un CSS, cada uno con su propiedad. Solo mira declaraciones:
 * no los selectores (`#fad:hover`, `.red`), ni los nombres de propiedad, ni los comentarios.
 */
export function findColorLiteralsInCss(css: string): CssColorLiteral[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const result: CssColorLiteral[] = [];
  for (const match of withoutComments.matchAll(DECLARATION)) {
    for (const literal of findColorLiterals(match[2])) {
      result.push({ property: match[1], literal });
    }
  }
  return result;
}
