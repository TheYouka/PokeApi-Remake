// Exportación de gráficas (§13.9, §17). Solo toca el DOM al llamarse.
// - serializeSvg: clona el SVG, sustituye todo color con var() por su valor calculado (literal),
//   quita clases y estilos con var(), añade un fondo con el --bg actual y serializa con XMLSerializer.
//   El archivo resultante se abre por separado sin depender de la hoja de estilos.
// - svgToPng: SVG → Blob → Image → <canvas> a 2× → toBlob('image/png'). null o excepción → rechazo.

const SVG_NS = 'http://www.w3.org/2000/svg';
const PAINT_ATTRS = ['fill', 'stroke', 'stop-color'] as const;
const FALLBACK_INK = '#000000';
const FALLBACK_BG = '#FFFFFF';

const literal = (v: string, fallback: string): string => {
  const t = v.trim();
  return t !== '' && !t.includes('var(') ? t : fallback;
};

export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...Array.from(svg.querySelectorAll('*'))];
  const dst = [clone, ...Array.from(clone.querySelectorAll('*'))];
  src.forEach((el, i) => {
    const c = dst[i];
    if (!c) return;
    const cs = getComputedStyle(el);
    for (const a of PAINT_ATTRS) {
      const v = c.getAttribute(a);
      if (v !== null && v.includes('var(')) c.setAttribute(a, literal(cs.getPropertyValue(a), FALLBACK_INK));
    }
    const tag = el.tagName.toLowerCase();
    if (tag === 'text' || tag === 'tspan') {
      if (c.getAttribute('fill') === null) c.setAttribute('fill', literal(cs.fill, FALLBACK_INK));
      c.setAttribute('font-family', literal(cs.fontFamily, 'sans-serif'));
    }
    c.removeAttribute('class');
    const style = c.getAttribute('style');
    if (style !== null && style.includes('var(')) c.removeAttribute('style');
  });
  const vb = svg.viewBox.baseVal;
  const width = vb && vb.width > 0 ? vb.width : svg.clientWidth;
  const height = vb && vb.height > 0 ? vb.height : svg.clientHeight;
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('x', String(vb?.x ?? 0));
  bg.setAttribute('y', String(vb?.y ?? 0));
  bg.setAttribute('width', String(width));
  bg.setAttribute('height', String(height));
  bg.setAttribute('fill', literal(getComputedStyle(document.documentElement).getPropertyValue('--bg'), FALLBACK_BG));
  const firstPaint = Array.from(clone.children).find((n) => !['title', 'desc', 'defs'].includes(n.tagName.toLowerCase()));
  clone.insertBefore(bg, firstPaint ?? null);
  // Red de seguridad: ningún var() puede llegar al archivo.
  return new XMLSerializer().serializeToString(clone).replace(/var\(--[\w-]+\)/g, FALLBACK_INK);
}

/** Tamaño del viewBox (lo usa el PNG). */
export function svgSize(svg: SVGSVGElement): { width: number; height: number } {
  const vb = svg.viewBox.baseVal;
  return vb && vb.width > 0 ? { width: vb.width, height: vb.height } : { width: svg.clientWidth, height: svg.clientHeight };
}

export function svgToPng(svgText: string, width: number, height: number, scale = 2): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    let url: string;
    try {
      url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }));
    } catch (e) {
      reject(e);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('canvas 2d no disponible');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('toBlob devolvió null'));
        }, 'image/png');
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('no se pudo cargar el SVG'));
    };
    img.src = url;
  });
}
