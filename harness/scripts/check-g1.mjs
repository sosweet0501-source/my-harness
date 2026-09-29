// G1 키스크린 판정. 사용법: node harness/scripts/check-g1.mjs <run 폴더>
// 종료 코드: 0 통과 · 1 실패 · 2 실행 오류(판정 못 함 = 통과 아님)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRules, parseSpec, fetchFrames, checkG1, writeGate } from './lib.mjs';

const run = process.argv[2];
if (!run) {
  console.error('사용법: node harness/scripts/check-g1.mjs <run 폴더>');
  process.exit(2);
}

try {
  const rules = loadRules();
  const screens = parseSpec(readFileSync(join(run, 's2', 's2-screen-spec.md'), 'utf8'));
  const frames = await fetchFrames(join(run, 'design', 's3-keyscreens.json'));
  const result = checkG1(screens, frames, rules);
  writeGate(run, 'g1.json', result);
  for (const r of result.results) console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id} ${r.detail}`);
  console.log(`G1 ${result.pass ? '통과' : '실패'}`);
  process.exit(result.pass ? 0 : 1);
} catch (e) {
  console.error(`G1 실행 오류: ${e.message}`);
  process.exit(2);
}
