// Corpo humano genérico (frente e costas) com os músculos do exercício destacados.
// Desenho próprio, simplificado: cada forma é a metade esquerda e é espelhada para a direita.
// Uso: corpoSVG(['chest'], ['triceps', 'shoulders']) -> string de <svg>
(() => {
  // contorno (metade esquerda; o eixo do corpo é x = 100)
  const SILHUETA = 'M100 56 L91 56 L89 72 C78 75 66 79 57 84 C47 90 45 104 45 120 L41 160 L37 204 L35 216 L52 218 L56 206 L60 162 L66 128 C68 150 76 168 74 186 C72 204 73 240 76 270 C77 286 76 292 78 302 C76 330 77 372 80 396 L77 418 L97 418 L96 396 C94 350 93 322 93 298 C95 270 98 232 100 196 Z';

  // [músculo, path da metade esquerda, espelhar?]
  const FRENTE = [
    ['neck', 'M91 56 L100 56 L100 76 L89 74 Z'],
    ['traps', 'M89 74 L100 77 L100 84 L80 86 L70 86 Z'],
    ['shoulders', 'M70 85 C58 85 48 93 46 106 C46 114 52 118 58 116 C66 110 72 100 78 90 Z'],
    ['chest', 'M99 90 L79 92 C73 102 75 114 82 120 C90 124 97 122 99 120 Z'],
    ['biceps', 'M47 118 C45 130 46 144 50 154 L62 154 C65 142 66 128 62 118 C56 118 52 118 47 118 Z'],
    ['forearms', 'M46 157 L62 157 C61 174 58 192 55 208 L38 208 C41 190 44 172 46 157 Z'],
    ['abdominals', 'M99 124 L86 124 C85 142 85 160 88 176 C92 182 97 182 99 182 Z'],
    ['abductors', 'M70 172 L82 180 C82 196 80 212 78 222 C72 214 70 196 70 172 Z'],
    ['quadriceps', 'M82 184 L99 188 L99 282 C93 288 84 288 80 280 C76 250 76 214 82 184 Z'],
    ['adductors', 'M99 190 L99 270 C94 266 91 254 91 238 C91 220 94 202 99 190 Z'],
    ['calves', 'M81 302 L94 302 C94 328 93 358 91 390 L82 390 C80 358 79 328 81 302 Z'],
  ];
  const COSTAS = [
    ['neck', 'M91 56 L100 56 L100 76 L89 74 Z'],
    ['traps', 'M89 74 L100 76 L100 136 C88 124 76 108 70 87 Z'],
    ['shoulders', 'M70 85 C58 85 48 93 46 106 C46 114 52 118 58 116 C66 110 72 100 78 90 Z'],
    ['middle back', 'M99 104 L86 100 C80 110 82 126 90 138 L99 144 Z'],
    ['lats', 'M80 112 C72 126 70 146 78 166 L92 170 C88 156 86 140 86 124 Z'],
    ['lower back', 'M99 146 L88 142 C86 156 86 168 90 178 L99 182 Z'],
    ['triceps', 'M47 118 C45 130 46 144 50 154 L62 154 C65 142 66 128 62 118 C56 118 52 118 47 118 Z'],
    ['forearms', 'M46 157 L62 157 C61 174 58 192 55 208 L38 208 C41 190 44 172 46 157 Z'],
    ['abductors', 'M70 172 L82 180 C82 196 80 212 78 222 C72 214 70 196 70 172 Z'],
    ['glutes', 'M99 184 L80 184 C72 194 73 210 82 220 C90 224 97 222 99 220 Z'],
    ['adductors', 'M99 224 L99 270 C94 266 91 254 91 240 C91 232 94 226 99 224 Z'],
    ['hamstrings', 'M99 224 L82 224 C77 244 78 268 82 290 C90 294 96 292 99 288 Z'],
    ['calves', 'M81 302 C77 322 79 350 86 372 L98 370 L98 306 C92 304 86 302 81 302 Z'],
  ];

  const lado = (cls, m, d, extra = '') =>
    `<path class="mus${cls}" data-m="${m}" d="${d}"${extra}/>`;
  const espelho = ' transform="translate(200 0) scale(-1 1)"';

  function vista(shapes, principais, secundarios, dx, rotulo) {
    const cls = m => principais.includes(m) ? ' p' : secundarios.includes(m) ? ' s' : '';
    const sil = `<path class="sil" d="${SILHUETA}"/><path class="sil" d="${SILHUETA}"${espelho}/><circle class="sil" cx="100" cy="34" r="22"/>`;
    const mus = shapes.map(([m, d]) => lado(cls(m), m, d) + lado(cls(m), m, d, espelho)).join('');
    return `<g transform="translate(${dx} 0)" role="img" aria-label="${rotulo}">${sil}${mus}</g>`;
  }

  window.corpoSVG = (principais = [], secundarios = []) => {
    const sec = secundarios.filter(m => !principais.includes(m));
    return `<svg class="corpo" viewBox="0 0 420 424" xmlns="http://www.w3.org/2000/svg" aria-label="Músculos trabalhados">`
      + vista(FRENTE, principais, sec, 0, 'Corpo visto de frente')
      + vista(COSTAS, principais, sec, 220, 'Corpo visto de costas')
      + `</svg>`;
  };
})();
