// Contraste (NFR-A11Y-3): paleta de acentos, tokens de texto de los dos temas y colores de tipo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACCENT_PALETTE, contrastRatio, onAccent } from '../../src/state/settings';
import { TYPE_COLORS, textOn } from '../../src/ui/colors';

const tokensCss = readFileSync(new URL('../../src/ui/styles/tokens.css', import.meta.url), 'utf8');

/** Variables hex de un bloque `[data-theme='x'] { … }` de tokens.css. */
function themeVars(theme: 'dark' | 'light'): Record<string, string> {
  const block = new RegExp(`\\[data-theme='${theme}'\\]\\s*\\{([^}]*)\\}`).exec(tokensCss);
  assert.ok(block, `falta el bloque ${theme}`);
  const vars: Record<string, string> = {};
  for (const m of block[1]!.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) vars[m[1]!] = m[2]!;
  return vars;
}

test('toda la paleta de acentos con --on-accent ≥ 4.5', () => {
  assert.equal(ACCENT_PALETTE.length, 10);
  for (const hex of ACCENT_PALETTE) {
    const ratio = contrastRatio(onAccent(hex), hex);
    assert.ok(ratio >= 4.5, `${hex} con ${onAccent(hex)}: ${ratio.toFixed(2)}`);
  }
  assert.equal(onAccent('#F2C811'), '#000000');
  assert.equal(onAccent('#7FBA00'), '#000000');
  assert.equal(onAccent('#107C10'), '#FFFFFF');
});

test('tokens de texto de los dos temas ≥ 4.5 sobre --bg y --bg-elev-1', () => {
  for (const theme of ['dark', 'light'] as const) {
    const v = themeVars(theme);
    for (const text of ['--text', '--text-2', '--text-3']) {
      for (const bg of ['--bg', '--bg-elev-1']) {
        assert.ok(v[text] && v[bg], `${theme}: faltan ${text} o ${bg}`);
        const ratio = contrastRatio(v[text]!, v[bg]!);
        assert.ok(ratio >= 4.5, `${theme} ${text} sobre ${bg}: ${ratio.toFixed(2)}`);
      }
    }
  }
});

test('los 21 colores de tipo con su texto ≥ 4.5', () => {
  const entries = Object.entries(TYPE_COLORS);
  assert.equal(entries.length, 21);
  for (const [name, hex] of entries) {
    const ratio = contrastRatio(textOn(hex), hex);
    assert.ok(ratio >= 4.5, `${name} ${hex}: ${ratio.toFixed(2)}`);
  }
});
