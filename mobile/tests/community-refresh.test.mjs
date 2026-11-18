import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function setup() {
  const changes = [], requests = [];
  let finish, reject;
  const imports = {
    react: { useState: () => [false, value => changes.push(value)], useRef: initial => ({ current: initial }) },
    '@tanstack/react-query': { useQueryClient: () => ({ refetchQueries: options => { requests.push(options); return new Promise((resolve, fail) => { finish = resolve; reject = fail; }); } }) },
  };
  const source = readFileSync(new URL('../src/hooks/use-community-refresh.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(id => imports[id], module, module.exports);
  return { hook: module.exports.useCommunityRefresh(), requests, changes, finish: () => finish(), reject: () => reject(Error('offline')) };
}
test('pull refresh keeps indicator active until active community queries finish and ignores repeated pulls', async () => {
  const state = setup();
  const first = state.hook.refresh();
  await state.hook.refresh();
  assert.deepEqual(state.requests, [{ queryKey: ['community'], type: 'active' }]);
  assert.deepEqual(state.changes, [true]);
  state.finish(); await first;
  assert.deepEqual(state.changes, [true, false]);
});
test('failed refresh resets indicator and allows retry', async () => {
  const state = setup();
  const first = state.hook.refresh(); state.reject();
  await assert.rejects(first, /offline/);
  const second = state.hook.refresh(); state.finish(); await second;
  assert.equal(state.requests.length, 2);
  assert.deepEqual(state.changes, [true, false, true, false]);
});
