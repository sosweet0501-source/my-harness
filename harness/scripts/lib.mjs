// 판정 스크립트 공통 모듈: 규칙 로드, 화면 설계서 파싱, Figma 추출, G1·G3 판정
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HARNESS = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const loadRules = () => readJson(join(HARNESS, 'rules.json'));

// "## 화면: 이름" 다음 "스토리: 1, 3" 줄을 읽는다.
export function parseSpec(text) {
  const screens = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const h = line.match(/^##\s*화면\s*:\s*(.+)$/);
    if (h) {
      cur = { name: h[1].trim(), stories: [] };
      screens.push(cur);
      continue;
    }
    const s = line.match(/^스토리\s*:\s*(.*)$/);
    if (s && cur) cur.stories = s[1].split(/[,\s]+/).filter(Boolean).map(Number).filter(Number.isInteger);
  }
  return screens;
}

// Figma REST paint → "#rrggbb" | "rgba(r,g,b,a)" | paint type (IMAGE, GRADIENT_LINEAR …)
function colorOf(paint) {
  if (paint.visible === false) return null;
  if (paint.type !== 'SOLID') return paint.type;
  const { r, g, b, a = 1 } = paint.color;
  const alpha = a * (paint.opacity ?? 1);
  const rgb = [r, g, b].map((v) => Math.round(v * 255));
  if (alpha >= 0.995) return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
  return `rgba(${rgb.join(',')},${Math.round(alpha * 100) / 100})`;
}

// Figma REST 노드 트리 → 평평한 노드 배열. [0]은 프레임 자신이다.
export function flattenFigma(root) {
  const out = [];
  const frame = root.name;
  (function walk(n, parents) {
    if (n.visible === false) return;
    const box = n.absoluteBoundingBox || {};
    const auto = n.layoutMode && n.layoutMode !== 'NONE';
    const node = {
      id: n.id,
      name: n.name,
      type: n.type,
      frame,
      parents,
      width: box.width ?? null,
      height: box.height ?? null,
      fills: (n.fills || []).map(colorOf).filter(Boolean),
      strokes: (n.strokes || []).map(colorOf).filter(Boolean),
      cornerRadius: n.rectangleCornerRadii ?? (typeof n.cornerRadius === 'number' ? Array(4).fill(n.cornerRadius) : null),
      effects: (n.effects || []).filter((e) => e.visible !== false).map((e) => ({ type: e.type })),
      itemSpacing: auto && n.primaryAxisAlignItems !== 'SPACE_BETWEEN' ? (n.itemSpacing ?? 0) : null,
      padding: auto ? [n.paddingTop ?? 0, n.paddingRight ?? 0, n.paddingBottom ?? 0, n.paddingLeft ?? 0] : null,
    };
    if (n.type === 'TEXT') {
      node.characters = n.characters ?? '';
      node.textStyles = [n.style || {}, ...Object.values(n.styleOverrideTable || {})].map((s) => ({
        fontFamily: s.fontFamily,
        fontWeight: s.fontWeight,
        letterSpacing: s.letterSpacing,
        textCase: s.textCase,
      }));
    }
    out.push(node);
    for (const c of n.children || []) walk(c, [...parents, n.name]);
  })(root, []);
  return out;
}

// {fileKey, frames:[{id,name}]} 목록 파일을 읽고 Figma에서 프레임을 직접 추출한다.
export async function fetchFrames(listFile) {
  const { fileKey, frames } = readJson(listFile);
  const token = process.env.FIGMA_TOKEN;
  if (!token) throw new Error('FIGMA_TOKEN 환경 변수가 없습니다.');
  if (!fileKey || !frames?.length) throw new Error(`${listFile}에 fileKey 또는 frames가 없습니다.`);
  const ids = frames.map((f) => f.id);
  const url = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodeURIComponent(ids.join(','))}`;
  const res = await fetch(url, { headers: { 'X-Figma-Token': token } });
  if (!res.ok) throw new Error(`Figma API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return ids.map((id) => {
    const doc = data.nodes?.[id]?.document;
    if (!doc) throw new Error(`Figma에서 프레임 ${id}를 찾지 못했습니다.`);
    return flattenFigma(doc);
  });
}

export function checkG1(screens, frames, rules) {
  const g = rules.g1;
  const { width: W, height: H } = rules.frame;
  const specNames = screens.map((s) => s.name);
  const frameNames = frames.map((f) => f[0].name);
  const results = [];

  results.push({
    id: 'G1-1',
    pass: frames.length >= g.minFrames && frames.length <= g.maxFrames,
    detail: `프레임 ${frames.length}개 (허용 ${g.minFrames}~${g.maxFrames})`,
  });

  const badSize = frames.filter((f) => Math.round(f[0].width) !== W || Math.round(f[0].height) !== H);
  results.push({
    id: 'G1-2',
    pass: badSize.length === 0,
    detail: badSize.length ? badSize.map((f) => `${f[0].name}: ${f[0].width}×${f[0].height}`).join(', ') : `모두 ${W}×${H}`,
  });

  const unmatched = frameNames.filter((n) => !specNames.includes(n));
  results.push({
    id: 'G1-3',
    pass: specNames.length > 0 && unmatched.length === 0,
    detail: unmatched.length ? `설계서에 없는 프레임: ${unmatched.join(', ')}` : specNames.length ? '모두 일치' : '설계서에 "## 화면:" 없음',
  });

  const noStory = screens.filter((s) => !s.stories.some((n) => g.storyIds.includes(n)));
  results.push({
    id: 'G1-4',
    pass: screens.length > 0 && noStory.length === 0,
    detail: noStory.length ? `스토리 연결 없음: ${noStory.map((s) => s.name).join(', ')}` : screens.length ? '모두 연결' : '설계서에 "## 화면:" 없음',
  });

  return { gate: 'G1', pass: results.every((r) => r.pass), results };
}

export function checkG3(screens, frames, rules) {
  const violations = [];
  const add = (rule, n, actual, allowed) =>
    violations.push({ rule, nodeId: n.id, nodeName: n.name, frame: n.frame, actual, allowed });

  // G3-screens: 설계서 화면과 프레임 목록이 정확히 일치해야 한다. (목록에서 화면을 빼거나 이름을 바꿔 검사를 피하지 못하게)
  const specNames = screens.map((s) => s.name);
  const frameNames = frames.map((f) => f[0].name);
  if (!specNames.length) violations.push({ rule: 'G3-screens', nodeId: null, nodeName: null, frame: null, actual: '설계서에 "## 화면:" 없음', allowed: '1개 이상' });
  for (const name of specNames.filter((n) => !frameNames.includes(n))) {
    violations.push({ rule: 'G3-screens', nodeId: null, nodeName: null, frame: name, actual: '프레임 없음', allowed: '설계서 화면마다 프레임 1개' });
  }
  for (const f of frames.filter((f) => !specNames.includes(f[0].name))) {
    add('G3-screens', f[0], '설계서에 없는 프레임', specNames);
  }

  // G3-size: 완성 화면도 전부 기준 프레임 크기여야 한다.
  const { width: W, height: H } = rules.frame;
  for (const f of frames) {
    if (Math.round(f[0].width) !== W || Math.round(f[0].height) !== H) add('G3-size', f[0], `${f[0].width}×${f[0].height}`, `${W}×${H}`);
  }
  const starts = (n, prefix) => n.name.startsWith(prefix);
  const inside = (n, prefix) => starts(n, prefix) || n.parents.some((p) => p.startsWith(prefix));
  const accent = rules.accent.color.toLowerCase();
  const { pii, saleRequest, visibility } = rules.service;

  for (const nodes of frames) {
    const root = nodes[0];
    let accentCount = 0;

    for (const n of nodes) {
      const paints = [...n.fills, ...n.strokes];

      // R-color
      for (const c of paints) {
        if (rules.colors.ignoreTypes.includes(c)) continue;
        const ok =
          rules.colors.allowed.includes(c.toLowerCase()) ||
          rules.colors.exceptions.some((e) => e.color === c && starts(n, e.namePrefix));
        if (!ok) add('R-color', n, c, rules.colors.allowed);
      }

      // R-accent
      if (paints.some((c) => c.toLowerCase() === accent)) accentCount++;
      if (n.fills.some((c) => c.toLowerCase() === accent) && inside(n, rules.accent.forbiddenInsideNamePrefix)) {
        add('R-accent', n, `${rules.accent.forbiddenInsideNamePrefix}* 안의 ${accent}`, '버튼에 액센트 금지');
      }

      // R-radius
      if (n.cornerRadius) {
        const sq = rules.radius.squircle;
        const short = Math.min(n.width ?? Infinity, n.height ?? Infinity);
        for (const r of new Set(n.cornerRadius)) {
          if (starts(n, sq.namePrefix)) {
            const want = (n.width ?? 0) * sq.ratio;
            if (Math.abs(r - want) > sq.tolerance) add('R-radius', n, r, `너비×${sq.ratio} = ${want}`);
            continue;
          }
          const full = rules.radius.fullWhenAtLeastHalfShortSide && r > 0 && r >= short / 2 - 0.5;
          if (!rules.radius.allowed.includes(r) && !full) add('R-radius', n, r, rules.radius.allowed);
        }
      }

      // R-spacing
      const spacings = [n.itemSpacing, ...(n.padding || [])].filter((v) => v !== null && v !== undefined);
      for (const s of new Set(spacings)) {
        if (!rules.spacing.allowed.includes(s)) add('R-spacing', n, s, rules.spacing.allowed);
      }

      // R-shadow
      const shadows = n.effects.filter((e) => rules.shadow.types.includes(e.type));
      if (shadows.length && !starts(n, rules.shadow.exceptionNamePrefix)) {
        add('R-shadow', n, shadows.map((e) => e.type).join(','), '그림자 0개');
      }

      if (n.type !== 'TEXT') continue;

      // R-font · R-tracking · R-caps
      for (const s of n.textStyles) {
        if (s.fontFamily !== undefined && !rules.font.families.includes(s.fontFamily)) add('R-font', n, s.fontFamily, rules.font.families);
        if (s.fontWeight !== undefined && !rules.font.weights.includes(s.fontWeight)) add('R-font', n, s.fontWeight, rules.font.weights);
        if (s.letterSpacing !== undefined && Math.abs(s.letterSpacing - rules.letterSpacing.allowed) > rules.letterSpacing.tolerance) {
          add('R-tracking', n, s.letterSpacing, rules.letterSpacing.allowed);
        }
        if (s.textCase && rules.textCase.forbidden.includes(s.textCase)) add('R-caps', n, s.textCase, 'ORIGINAL');
      }

      // S-A1 개인정보 형식
      for (const p of pii) {
        const m = n.characters.match(new RegExp(p.pattern));
        if (m) add('S-A1', n, `${p.label}: ${m[0]}`, '개인정보 형식 0개');
      }
    }

    if (accentCount > rules.accent.maxPerFrame) {
      add('R-accent', root, `액센트 ${accentCount}개`, `화면당 ${rules.accent.maxPerFrame}개 이하`);
    }

    // S-A2 판매 신청 화면에는 검수 대기 표시
    const texts = nodes.filter((n) => n.type === 'TEXT').map((n) => n.characters);
    if (texts.some((t) => t.includes(saleRequest.triggerText)) && !texts.some((t) => t.includes(saleRequest.requiredText))) {
      add('S-A2', root, `"${saleRequest.requiredText}" 표시 없음`, `"${saleRequest.requiredText}" 1개 이상`);
    }

    // S-B1 내 자산 등록 화면의 공개 범위 기본값
    if (root.name === visibility.frameName) {
      const vals = nodes.filter((n) => starts(n, visibility.namePrefix)).map((n) => n.name.slice(visibility.namePrefix.length).trim());
      if (vals.length !== 1 || vals[0] !== visibility.required) {
        add('S-B1', root, vals.length ? vals.join(', ') : '선택 표시 레이어 없음', `${visibility.namePrefix}${visibility.required} 1개`);
      }
    }
  }

  return { gate: 'G3', pass: violations.length === 0, violations };
}

export function writeGate(run, file, result) {
  const dir = join(run, 'gates');
  mkdirSync(dir, { recursive: true });
  const rules = loadRules();
  const body = { ...result, run, rulesVersion: rules.version, checkedAt: new Date().toISOString() };
  writeFileSync(join(dir, file), JSON.stringify(body, null, 2) + '\n');
}
