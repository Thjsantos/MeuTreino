// Corpo humano genérico (frente e costas) com os músculos do exercício destacados.
// Desenho próprio, simplificado: cada forma é a metade esquerda e é espelhada para a direita.
// Uso: corpoSVG(['chest'], ['triceps', 'shoulders']) -> string de <svg>
(() => {
  // contorno (metade esquerda; o eixo do corpo é x = 100)
  const SILHUETA = 'M100 50 L92 50 L91 66 C80 70 66 72 58 78 C48 82 44 94 44 108 C42 128 40 146 38 164 L30 214 L26 238 L38 244 L42 236 L42 220 L52 166 C58 150 62 134 64 120 C70 138 72 150 70 162 C66 176 60 190 60 206 C61 240 64 270 68 300 C64 322 64 340 68 352 C72 368 74 380 76 390 L72 414 L96 414 L93 392 C91 360 92 330 93 304 C94 270 98 240 100 214 Z';

  // [músculo, path da metade esquerda]
  const FRENTE = [
    ['neck', 'M92 52 L100 52 L100 70 L90 68 Z'],
    ['traps', 'M90 68 L100 71 L100 80 C92 80 84 78 77 76 C81 72 85 70 90 68 Z'],
    ['shoulders', 'M58 78 C48 82 44 94 44 108 C46 116 54 118 60 114 C64 104 68 90 71 82 C67 78 62 77 58 78 Z'],
    ['chest', 'M99 88 L75 86 C68 94 68 108 76 118 C86 124 96 122 99 120 Z'],
    ['biceps', 'M44 114 C42 130 40 148 38 164 L52 166 C56 150 60 132 62 118 Z'],
    ['forearms', 'M38 169 L52 169 C49 187 45 205 41 221 L30 215 C33 199 36 185 38 169 Z'],
    ['abdominals', 'M99 126 L84 126 C82 142 82 160 84 178 C90 188 96 190 99 190 Z'],
    ['abductors', 'M63 186 L76 184 C78 198 76 212 72 224 C66 214 61 200 63 186 Z'],
    ['quadriceps', 'M71 188 L99 200 L97 282 C92 296 78 300 70 292 C64 268 62 236 63 208 C65 198 67 191 71 188 Z'],
    ['adductors', 'M99 206 L97 274 C92 268 88 252 88 236 C88 222 92 212 99 206 Z'],
    ['calves', 'M70 308 L90 308 C90 330 88 360 86 386 L76 386 C70 364 66 336 70 308 Z'],
  ];
  const COSTAS = [
    ['neck', 'M92 52 L100 52 L100 70 L90 68 Z'],
    ['traps', 'M90 68 L100 71 L100 104 C88 98 78 90 72 84 C78 78 84 72 90 68 Z'],
    ['shoulders', 'M58 78 C48 82 44 94 44 108 C46 116 54 118 60 114 C64 104 68 90 71 82 C67 78 62 77 58 78 Z'],
    ['middle back', 'M99 107 L87 105 C85 117 87 129 91 141 L99 147 Z'],
    ['lats', 'M74 98 C68 120 70 146 78 170 L88 176 C84 160 84 140 86 128 C84 116 82 104 74 98 Z'],
    ['lower back', 'M99 150 L91 144 C87 158 87 172 89 184 L99 190 Z'],
    ['triceps', 'M44 114 C42 130 40 148 38 164 L52 166 C56 150 60 132 62 118 Z'],
    ['forearms', 'M38 169 L52 169 C49 187 45 205 41 221 L30 215 C33 199 36 185 38 169 Z'],
    ['abductors', 'M63 186 L76 184 C78 198 76 212 72 224 C66 214 61 200 63 186 Z'],
    ['glutes', 'M99 192 L72 190 C64 202 66 218 78 230 C88 234 96 232 99 230 Z'],
    ['adductors', 'M99 236 L97 278 C92 270 90 256 90 246 C92 240 95 237 99 236 Z'],
    ['hamstrings', 'M98 234 L72 234 C64 254 64 278 70 294 C80 302 92 300 98 290 Z'],
    ['calves', 'M70 308 C64 328 66 354 76 376 L90 374 L92 312 C84 310 76 308 70 308 Z'],
  ];

  const espelho = ' transform="translate(200 0) scale(-1 1)"';
  const forma = (cls, m, d, extra = '') => `<path class="mus${cls}" data-m="${m}" d="${d}"${extra}/>`;

  // cabeça: a frente tem rosto, as costas têm cabelo (para não confundir as vistas)
  const CABECA_FRENTE = '<circle class="sil" cx="100" cy="28" r="24"/>'
    + '<ellipse class="det" cx="91" cy="26" rx="2.8" ry="3.4"/><ellipse class="det" cx="109" cy="26" rx="2.6" ry="3.2"/>'
    + '<path class="det-l" d="M100 31 L97 40 L103 40"/>';
  const CABECA_COSTAS = '<circle class="sil" cx="100" cy="28" r="24"/>'
    + '<path class="det" d="M76 28 A24 24 0 0 1 124 28 C121 41 111 48 100 48 C89 48 79 41 76 28 Z"/>';

  function vista(formas, cabeca, principais, secundarios, dx, titulo) {
    const cls = m => principais.includes(m) ? ' p' : secundarios.includes(m) ? ' s' : '';
    const corpo = `<path class="sil" d="${SILHUETA}"/><path class="sil" d="${SILHUETA}"${espelho}/>`;
    const mus = formas.map(([m, d]) => forma(cls(m), m, d) + forma(cls(m), m, d, espelho)).join('');
    return `<g transform="translate(${dx} 0)" role="img" aria-label="${titulo}">${corpo}${cabeca}${mus}`
      + `<text class="rotulo" x="100" y="438" text-anchor="middle">${titulo}</text></g>`;
  }

  window.corpoSVG = (principais = [], secundarios = []) => {
    const sec = secundarios.filter(m => !principais.includes(m));
    return `<svg class="corpo" viewBox="0 0 420 446" xmlns="http://www.w3.org/2000/svg" aria-label="Músculos trabalhados">`
      + vista(FRENTE, CABECA_FRENTE, principais, sec, 0, 'Frente')
      + vista(COSTAS, CABECA_COSTAS, principais, sec, 220, 'Costas')
      + `</svg>`;
  };
})();
