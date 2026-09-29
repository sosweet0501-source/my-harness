// 판정 스크립트 자체 검증. 사용법: node harness/scripts/test.mjs
// 깨끗한 샘플은 G1 통과 + G3 위반 0건, 위반 샘플은 딱 그 규칙 하나만 걸려야 한다.
import { join } from 'node:path';
import { HARNESS, readJson, loadRules, parseSpec, flattenFigma, checkG1, checkG3 } from './lib.mjs';

const rules = loadRules();
const clean = readJson(join(HARNESS, 'fixtures', 'clean.json'));
const { cases } = readJson(join(HARNESS, 'fixtures', 'violations.json'));

// 약식 → Figma REST 형식: "#rrggbb"/"rgba(..)"/"IMAGE" → paint, size → absoluteBoundingBox
function paint(s) {
  if (s === 'IMAGE' || s === 'VIDEO') return { type: s };
  const hex = s.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hex) {
    const [r, g, b] = hex.slice(1).map((h) => parseInt(h, 16) / 255);
    return { type: 'SOLID', color: { r, g, b, a: 1 } };
  }
  const rgba = s.match(/^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/);
  if (rgba) {
    const [r, g, b] = rgba.slice(1, 4).map((v) => Number(v) / 255);
    return { type: 'SOLID', color: { r, g, b, a: Number(rgba[4]) } };
  }
  return { type: s };
}

function expand(n) {
  const out = { ...n };
  if (n.size) {
    out.absoluteBoundingBox = { x: 0, y: 0, width: n.size[0], height: n.size[1] };
    delete out.size;
  }
  if (n.fills) out.fills = n.fills.map(paint);
  if (n.strokes) out.strokes = n.strokes.map(paint);
  if (n.children) out.children = n.children.map(expand);
  return out;
}

function findNode(frames, id) {
  const stack = [...frames];
  while (stack.length) {
    const n = stack.pop();
    if (n.id === id) return n;
    stack.push(...(n.children || []));
  }
  throw new Error(`fixture에 노드 ${id} 없음`);
}

function apply(base, ops) {
  const c = structuredClone(base);
  for (const op of ops) {
    if (op.op === 'removeFrame') c.frames.splice(op.index, 1);
    else if (op.op === 'spec') c.spec = c.spec.replace(op.from, op.to);
    else if (op.op === 'add') (findNode(c.frames, op.parent).children ??= []).push(op.node);
    else if (op.op === 'set') {
      const keys = op.path.split('.');
      let t = findNode(c.frames, op.id);
      for (const k of keys.slice(0, -1)) t = t[k] ??= {};
      t[keys.at(-1)] = op.value;
    } else throw new Error(`알 수 없는 op: ${op.op}`);
  }
  return c;
}

function judge(fx) {
  const frames = fx.frames.map((f) => flattenFigma(expand(f)));
  const screens = parseSpec(fx.spec);
  const g1 = checkG1(screens, frames, rules);
  const g3 = checkG3(screens, frames, rules);
  return {
    G1: g1.results.filter((r) => !r.pass).map((r) => r.id),
    G3: [...new Set(g3.violations.map((v) => v.rule))],
    g3: g3.violations,
  };
}

let failed = 0;
const report = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? `  → ${detail}` : ''}`);
};

const base = judge(clean);
report(base.G1.length === 0, '깨끗한 샘플 G1 통과', base.G1.join(', '));
report(base.G3.length === 0, '깨끗한 샘플 G3 위반 0건', base.g3.map((v) => `${v.rule} ${v.nodeId} ${v.actual}`).join('; '));

for (const cs of cases) {
  const got = judge(apply(clean, cs.ops))[cs.gate];
  const ok = got.length === 1 && got[0] === cs.rule;
  report(ok, `${cs.rule} (${cs.note})`, ok ? '' : `걸린 규칙: [${got.join(', ')}]`);
}

console.log(`\n${cases.length + 2}개 중 ${cases.length + 2 - failed}개 통과`);
process.exit(failed ? 1 : 0);
