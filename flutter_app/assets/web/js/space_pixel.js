/**
 * Nova Strike: 1989 - Pixel Toolkit
 * Bitmap 5x7 arcade font, cached sprite blitting, pixel circles and dither patterns.
 * Everything here draws onto a low-resolution buffer that is later scaled up with
 * nearest-neighbour filtering, so every "pixel" is a hard square like real arcade hardware.
 */

const PixelKit = {
  // Arcade palette (limited colours, as on period hardware)
  C: {
    black: '#000000',
    white: '#ffffff',
    grey: '#7c7c7c',
    darkGrey: '#3c3c3c',
    red: '#f83800',
    pink: '#f878f8',
    magenta: '#d800cc',
    orange: '#fca044',
    yellow: '#f8d878',
    gold: '#fcfc00',
    green: '#58f898',
    darkGreen: '#00a844',
    cyan: '#3cbcfc',
    aqua: '#00e8d8',
    blue: '#0058f8',
    navy: '#000088',
    purple: '#6844fc'
  },

  // 5x7 glyphs, one 5-bit row per entry (MSB = leftmost pixel)
  GLYPHS: {
    'A': [14, 17, 17, 31, 17, 17, 17], 'B': [30, 17, 17, 30, 17, 17, 30],
    'C': [14, 17, 16, 16, 16, 17, 14], 'D': [30, 17, 17, 17, 17, 17, 30],
    'E': [31, 16, 16, 30, 16, 16, 31], 'F': [31, 16, 16, 30, 16, 16, 16],
    'G': [14, 17, 16, 23, 17, 17, 15], 'H': [17, 17, 17, 31, 17, 17, 17],
    'I': [14, 4, 4, 4, 4, 4, 14], 'J': [7, 2, 2, 2, 2, 18, 12],
    'K': [17, 18, 20, 24, 20, 18, 17], 'L': [16, 16, 16, 16, 16, 16, 31],
    'M': [17, 27, 21, 21, 17, 17, 17], 'N': [17, 17, 25, 21, 19, 17, 17],
    'O': [14, 17, 17, 17, 17, 17, 14], 'P': [30, 17, 17, 30, 16, 16, 16],
    'Q': [14, 17, 17, 17, 21, 18, 13], 'R': [30, 17, 17, 30, 20, 18, 17],
    'S': [15, 16, 16, 14, 1, 1, 30], 'T': [31, 4, 4, 4, 4, 4, 4],
    'U': [17, 17, 17, 17, 17, 17, 14], 'V': [17, 17, 17, 17, 17, 10, 4],
    'W': [17, 17, 17, 21, 21, 21, 10], 'X': [17, 17, 10, 4, 10, 17, 17],
    'Y': [17, 17, 10, 4, 4, 4, 4], 'Z': [31, 1, 2, 4, 8, 16, 31],
    '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14],
    '2': [14, 17, 1, 2, 4, 8, 31], '3': [31, 2, 4, 2, 1, 17, 14],
    '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
    '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
    '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
    ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12],
    ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0],
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4],
    '-': [0, 0, 0, 31, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0],
    '/': [1, 2, 2, 4, 8, 8, 16], '(': [2, 4, 8, 8, 8, 4, 2],
    ')': [8, 4, 2, 2, 2, 4, 8], '[': [14, 8, 8, 8, 8, 8, 14],
    ']': [14, 2, 2, 2, 2, 2, 14], "'": [4, 4, 8, 0, 0, 0, 0],
    '%': [24, 25, 2, 4, 8, 19, 3], '#': [10, 10, 31, 10, 31, 10, 10],
    '=': [0, 0, 31, 0, 31, 0, 0], '*': [0, 21, 14, 31, 14, 21, 0],
    '_': [0, 0, 0, 0, 0, 0, 31], '$': [4, 15, 20, 14, 5, 30, 4],
    // Solid cursor triangles and arrows
    '>': [8, 12, 14, 15, 14, 12, 8], '<': [2, 6, 14, 30, 14, 6, 2],
    '^': [4, 14, 21, 4, 4, 4, 4]
  },

  GLYPH_W: 5,
  GLYPH_H: 7,
  ADVANCE: 6,

  _glyphCache: {},
  _spriteCache: {},

  glyph(ch, color) {
    const key = ch + color;
    let cv = this._glyphCache[key];
    if (cv) return cv;
    const rows = this.GLYPHS[ch] || this.GLYPHS['?'];
    cv = document.createElement('canvas');
    cv.width = this.GLYPH_W;
    cv.height = this.GLYPH_H;
    const g = cv.getContext('2d');
    g.fillStyle = color;
    for (let r = 0; r < this.GLYPH_H; r++) {
      for (let c = 0; c < this.GLYPH_W; c++) {
        if (rows[r] & (1 << (this.GLYPH_W - 1 - c))) g.fillRect(c, r, 1, 1);
      }
    }
    this._glyphCache[key] = cv;
    return cv;
  },

  textWidth(text, scale = 1) {
    return text.length ? (text.length * this.ADVANCE - 1) * scale : 0;
  },

  /**
   * Draw text in the bitmap font.
   * opts: scale (integer), align ('left' | 'center' | 'right'), shadow (colour for a 1px drop shadow)
   */
  text(ctx, text, x, y, color, opts = {}) {
    const scale = opts.scale || 1;
    const str = String(text).toUpperCase();
    let sx = Math.round(x);
    const w = this.textWidth(str, scale);
    if (opts.align === 'center') sx = Math.round(x - w / 2);
    else if (opts.align === 'right') sx = Math.round(x - w);
    const sy = Math.round(y);

    if (opts.shadow) {
      this._drawRun(ctx, str, sx + scale, sy + scale, opts.shadow, scale);
    }
    this._drawRun(ctx, str, sx, sy, color, scale);
  },

  _drawRun(ctx, str, x, y, color, scale) {
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch !== ' ') {
        ctx.drawImage(this.glyph(ch, color), x + i * this.ADVANCE * scale, y, this.GLYPH_W * scale, this.GLYPH_H * scale);
      }
    }
  },

  // --- Sprites -------------------------------------------------------------

  rotateMatrix(matrix, quarterTurns) {
    let m = matrix;
    for (let t = 0; t < ((quarterTurns % 4) + 4) % 4; t++) {
      const rows = m.length, cols = m[0].length;
      const out = [];
      for (let c = 0; c < cols; c++) {
        const row = [];
        for (let r = rows - 1; r >= 0; r--) row.push(m[r][c] || 0);
        out.push(row);
      }
      m = out;
    }
    return m;
  },

  /** Pre-render a palette-indexed matrix to a canvas (cached by key). */
  sprite(key, matrix, palette, opts = {}) {
    const cacheKey = key + (opts.flash ? ':flash' : '') + (opts.rot ? ':r' + opts.rot : '') + (opts.flipH ? ':f' : '');
    let cv = this._spriteCache[cacheKey];
    if (cv) return cv;
    const m = opts.rot ? this.rotateMatrix(matrix, opts.rot) : matrix;
    const rows = m.length;
    const cols = Math.max(...m.map(r => r.length));
    cv = document.createElement('canvas');
    cv.width = cols;
    cv.height = rows;
    const g = cv.getContext('2d');
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = m[r][opts.flipH ? cols - 1 - c : c];
        if (idx && palette[idx]) {
          g.fillStyle = opts.flash ? '#ffffff' : palette[idx];
          g.fillRect(c, r, 1, 1);
        }
      }
    }
    this._spriteCache[cacheKey] = cv;
    return cv;
  },

  /** Blit a cached sprite centred on (x, y) at an integer scale. */
  blit(ctx, cv, x, y, scale = 1) {
    const w = cv.width * scale, h = cv.height * scale;
    ctx.drawImage(cv, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  },

  // --- Primitives ----------------------------------------------------------

  /** Midpoint circle outline, 1px stepped. dotted=true skips every other point. */
  circle(ctx, cx, cy, r, color, dotted = false) {
    cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
    if (r <= 0) return;
    ctx.fillStyle = color;
    let x = r, y = 0, err = 1 - r, n = 0;
    while (x >= y) {
      if (!dotted || (n++ % 2 === 0)) {
        ctx.fillRect(cx + x, cy + y, 1, 1); ctx.fillRect(cx + y, cy + x, 1, 1);
        ctx.fillRect(cx - y, cy + x, 1, 1); ctx.fillRect(cx - x, cy + y, 1, 1);
        ctx.fillRect(cx - x, cy - y, 1, 1); ctx.fillRect(cx - y, cy - x, 1, 1);
        ctx.fillRect(cx + y, cy - x, 1, 1); ctx.fillRect(cx + x, cy - y, 1, 1);
      }
      y++;
      if (err < 0) err += 2 * y + 1;
      else { x--; err += 2 * (y - x) + 1; }
    }
  },

  /** Bresenham line, 1px stepped. */
  line(ctx, x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    ctx.fillStyle = color;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  },

  /** 1px rectangle outline. */
  box(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y + h - 1, w, 1);
    ctx.fillRect(x, y, 1, h);
    ctx.fillRect(x + w - 1, y, 1, h);
  },

  /** Arcade-style double-line panel with a solid fill. */
  panel(ctx, x, y, w, h, border, fill = '#000000') {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    this.box(ctx, x, y, w, h, border);
    this.box(ctx, x + 2, y + 2, w - 4, h - 4, border);
  },

  /** Segmented gauge: `segments` blocks of 3px with 1px gaps. */
  gauge(ctx, x, y, segments, ratio, color, emptyColor = '#3c3c3c') {
    const lit = Math.ceil(Math.max(0, Math.min(1, ratio)) * segments);
    for (let i = 0; i < segments; i++) {
      ctx.fillStyle = i < lit ? color : emptyColor;
      ctx.fillRect(x + i * 4, y, 3, 5);
    }
  },

  _dither: null,
  /** 50% checkerboard pattern used to darken the screen behind overlays. */
  dither(ctx) {
    if (!this._dither) {
      const cv = document.createElement('canvas');
      cv.width = 2; cv.height = 2;
      const g = cv.getContext('2d');
      g.fillStyle = '#000000';
      g.fillRect(0, 0, 1, 1);
      g.fillRect(1, 1, 1, 1);
      this._dither = cv;
    }
    return ctx.createPattern(this._dither, 'repeat');
  },

  /**
   * Build the striped arcade logo once: bitmap text, horizontal colour bands,
   * dark outline and a drop shadow.
   */
  buildLogo(lines, scale, bands, outline = '#000000', shadow = '#000088') {
    const lineH = this.GLYPH_H * scale + scale * 3;
    const w = Math.max(...lines.map(l => this.textWidth(l, scale))) + 6;
    const h = lines.length * lineH + 6;

    // 1. White text mask
    const mask = document.createElement('canvas');
    mask.width = w; mask.height = h;
    const mg = mask.getContext('2d');
    lines.forEach((l, i) => this.text(mg, l, w / 2, 2 + i * lineH, '#ffffff', { scale, align: 'center' }));

    // 2. Colour bands clipped to the mask
    const striped = document.createElement('canvas');
    striped.width = w; striped.height = h;
    const sg = striped.getContext('2d');
    for (let y = 0; y < h; y++) {
      const rowInLine = (y - 2) % lineH;
      sg.fillStyle = bands[Math.max(0, Math.min(bands.length - 1, Math.floor(rowInLine / (this.GLYPH_H * scale) * bands.length)))];
      sg.fillRect(0, y, w, 1);
    }
    sg.globalCompositeOperation = 'destination-in';
    sg.drawImage(mask, 0, 0);

    // 3. Solid-colour copies for outline and shadow
    const tint = (color) => {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const g = cv.getContext('2d');
      g.fillStyle = color;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(mask, 0, 0);
      return cv;
    };
    const outlineCv = tint(outline);
    const shadowCv = tint(shadow);

    const out = document.createElement('canvas');
    out.width = w + 4; out.height = h + 4;
    const og = out.getContext('2d');
    og.drawImage(shadowCv, 3, 3);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      og.drawImage(outlineCv, 1 + dx, 1 + dy);
    }
    og.drawImage(striped, 1, 1);
    return out;
  }
};

window.PixelKit = PixelKit;
