// G3 가이드 위반 판정. 사용법: node harness/scripts/check-g3.mjs <run 폴더>
// 종료 코드: 0 통과 · 1 실패 · 2 실행 오류(판정 못 함 = 통과 아님)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRules, parseSpec, fetchFrames, checkG3, writeGate } from './lib.mjs';

const run = process.argv[2];
if (!run) {
  console.error('사용법: node harness/scripts/check-g3.mjs <run 폴더>');
  process.exit(2);
}

try {
  const rules = loadRules();
  const screens = parseSpec(readFileSync(join(run, 's2', 's2-screen-spec.md'), 'utf8'));
  const frames = await fetchFrames(join(run, 'design', 's4-screens.json'));
  const result = checkG3(screens, frames, rules);
  writeGate(run, 'g3.json', result);
  for (const v of result.violations) {
    console.log(`FAIL ${v.rule} [${v.frame ?? '-'}] ${v.nodeName ?? '-'} (${v.nodeId ?? '-'}): ${v.actual}`);
  }
  console.log(`G3 ${result.pass ? '통과' : `실패 (위반 ${result.violations.length}건)`}`);
  process.exit(result.pass ? 0 : 1);
} catch (e) {
  console.error(`G3 실행 오류: ${e.message}`);
  process.exit(2);
}
