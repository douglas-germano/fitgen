import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { ageFromBirthDate, answerError, cleanAnswers, displayAnswer, firstUnanswered, onboardingSteps } from '../src/lib/onboarding.ts';

const valid = Object.fromEntries(onboardingSteps.map(s => [s.key,
  s.kind === 'multi' ? s.options.slice(0, s.min ?? 0).map(o => o.value) :
  s.kind === 'single' ? s.options[0].value : s.kind === 'number' ? String(s.min) :
  s.kind === 'date' ? '01/01/1995' : s.kind === 'time' ? '' : s.key === 'name' ? 'Pessoa de teste' : '']));

test('all onboarding answers are validated, optional skips survive and review is reachable', () => {
  assert.equal(firstUnanswered(valid), onboardingSteps.length);
  assert.deepEqual(cleanAnswers(valid), valid);
  const steps = Object.fromEntries(onboardingSteps.map(s => [s.key, s]));
  for (const n of ['NaN','Infinity','-2','170abc','1e3','0']) assert.ok(answerError(steps.height, n));
  assert.equal(answerError(steps.weight, '72,5'), '');
  assert.ok(answerError(steps.days, []));
  assert.ok(answerError(steps.days, ['monday', 'monday']));
  assert.ok(answerError(steps.meals, ['breakfast']));
  assert.ok(answerError(steps.muscles, ['back','chest','legs','arms']));
  assert.ok(answerError(steps.gender, 'unknown'));
  assert.ok(answerError(steps.name, ' '));
  assert.equal(answerError(steps.training_time, '23:59'), '');
  assert.ok(answerError(steps.training_time, '24:00'));
  assert.equal(displayAnswer(steps.days, ['monday','sunday']), 'Segunda · Domingo');
  assert.equal(firstUnanswered({ ...valid, days: [] }), onboardingSteps.findIndex(s => s.key === 'days'));
  assert.deepEqual(cleanAnswers({ bogus: 'x', height: 'invalid', muscles: [], name: 12 }), { muscles: [] });
});

test('birth dates account for birthdays and reject impossible dates', () => {
  const today = new Date(2026, 10, 17);
  assert.equal(ageFromBirthDate('18/11/2000', today), 25);
  assert.equal(ageFromBirthDate('17/11/2000', today), 26);
  assert.equal(ageFromBirthDate('29/02/2024', today), 2);
  assert.equal(ageFromBirthDate('29/02/2023', today), undefined);
  assert.equal(ageFromBirthDate('31/04/2000', today), undefined);
});

function draftModule() {
  const values = new Map(); let failPointer = false;
  const store = {
    getItemAsync: async k => values.get(k) ?? null,
    deleteItemAsync: async k => { values.delete(k); },
    setItemAsync: async (k, v) => {
      if (failPointer && !/\.\d+\.\d+$/.test(k)) throw Error('interrupted');
      assert.ok(Buffer.byteLength(v, 'utf8') < 2048); values.set(k,v);
    },
  };
  const code = ts.transpileModule(fs.readFileSync(new URL('../src/lib/onboarding-draft.ts', import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod = {exports:{}};
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)((id) => id === './storage' ? store : {cleanAnswers,onboardingSteps},mod,mod.exports);
  return { ...mod.exports, fail: () => { failPointer = true; }, values };
}

test('encrypted draft chunks round-trip unicode, isolate accounts, and keep the previous committed answer on interruption', async () => {
  const draft = draftModule();
  const long = '💚'.repeat(290);
  await draft.writeOnboardingAnswer('user1','liked_foods',long);
  assert.equal((await draft.readOnboardingDraft('user1')).liked_foods, long);
  assert.deepEqual(await draft.readOnboardingDraft('user2'), {});
  draft.fail();
  await assert.rejects(draft.writeOnboardingAnswer('user1','liked_foods','new'));
  assert.equal((await draft.readOnboardingDraft('user1')).liked_foods, long);
  await draft.clearOnboardingDraft('user1');
  assert.deepEqual(await draft.readOnboardingDraft('user1'), {});
});
