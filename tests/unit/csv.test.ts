// CSV seguro (§17, §22.1): comillas, comas, saltos de línea, BOM, anti-fórmulas y números.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, toCsv } from '../../src/data/csv';
import { countBy, mode, percentages } from '../../src/data/statsCounts';

const COLS = [{ key: 'name', label: 'Nombre' }, { key: 'n', label: 'Número' }] as const;

test('BOM al principio, separador coma y fin de línea \\r\\n', () => {
  const csv = toCsv([{ name: 'Pikachu', n: 25 }], COLS);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.equal(csv, '\uFEFF"Nombre","Número"\r\n"Pikachu","25"\r\n');
});

test('comillas internas duplicadas, comas y saltos de línea dentro de la celda', () => {
  assert.equal(csvCell('di "hola"'), '"di ""hola"""');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('línea 1\nlínea 2'), '"línea 1\nlínea 2"');
  const csv = toCsv([{ name: 'x,"y"\r\nz', n: 1 }], COLS);
  assert.ok(csv.endsWith('"x,""y""\r\nz","1"\r\n'));
});

test('anti-fórmulas: el texto que empieza por = + - @ tab o CR lleva prefijo', () => {
  assert.equal(csvCell('=SUMA()'), `"'=SUMA()"`);
  assert.equal(csvCell('+1'), `"'+1"`);
  assert.equal(csvCell('-1'), `"'-1"`);
  assert.equal(csvCell('@a'), `"'@a"`);
  assert.equal(csvCell('\tx'), `"'\tx"`);
  assert.equal(csvCell('\rx'), `"'\rx"`);
  assert.equal(csvCell('a=b'), '"a=b"');
});

test('los números se exportan como números, sin prefijo aunque sean negativos', () => {
  assert.equal(csvCell(-5), '"-5"');
  assert.equal(csvCell(12.5), '"12.5"');
  assert.equal(csvCell(0), '"0"');
  assert.equal(csvCell(Number.NaN), '""');
  assert.equal(csvCell(null), '""');
});

test('statsCounts: countBy con filtro y extra, mode con empates y porcentajes con 1 decimal', () => {
  const counts = countBy([
    { key: 'blue', members: [1, 2, 3] },
    { key: 'red', members: [4, 5, 6], extra: 0 },
    { key: 'green', members: [7], extra: 2 },
  ]);
  assert.deepEqual(counts.map((c) => c.count), [3, 3, 3]);
  assert.equal(mode(counts, (k) => k.toUpperCase())!.label, 'BLUE, RED y GREEN');
  const filtered = countBy([{ key: 'a', members: [1, 2, 3] }, { key: 'b', members: [4] }], new Set([1, 4]));
  assert.deepEqual(filtered, [{ key: 'a', count: 1 }, { key: 'b', count: 1 }]);
  assert.equal(mode(filtered)!.label, 'a y b');
  assert.equal(mode([{ key: 'a', count: 0 }]), null);
  const p = percentages([{ key: 'a', count: 1 }, { key: 'b', count: 2 }]);
  assert.deepEqual(p.map((x) => x.percent), [33.3, 66.7]);
  assert.ok(Math.abs(p.reduce((s, x) => s + x.percent, 0) - 100) <= 0.5);
});
