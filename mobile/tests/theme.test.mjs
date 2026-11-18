import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function compile(relative, imports) {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)((id) => imports[id] ?? require(id), module, module.exports);
  return module.exports;
}
const tokens = compile('../src/constants/theme.ts', { 'react-native': { Platform: { select: () => 0 } } });

function setup({ saved = null, storageError = false } = {}) {
  let slots = [], cursor = 0, effects = [], scheme = 'light';
  const writes = [], overrides = [];
  const react = {
    createContext: () => ({}),
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value) => { slots[index] = value; }];
    },
    useRef: (initial) => {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
    useEffect: (callback, deps) => {
      const index = cursor++;
      if (!slots[index] || deps.some((value, i) => value !== slots[index][i])) effects.push(callback);
      slots[index] = deps;
    },
  };
  const module = compile('../src/providers/theme.tsx', {
    react,
    'react/jsx-runtime': { jsx: (_type, props) => props },
    'react-native': { Platform: { OS: 'ios' }, useColorScheme: () => scheme, Appearance: { setColorScheme: (value) => overrides.push(value) } },
    'expo-secure-store': {
      getItemAsync: async () => { if (storageError) throw Error('unavailable'); return saved; },
      setItemAsync: async (_key, value) => { writes.push(value); },
    },
    '@/constants/theme': tokens,
  });
  return {
    writes, overrides,
    setSystem: (next) => { scheme = next; },
    render: () => {
      cursor = 0;
      const result = module.AppThemeProvider({ children: null });
      const pending = effects; effects = [];
      pending.forEach((effect) => effect());
      return result.value;
    },
  };
}

test('restores a saved dark preference before marking the theme ready', async () => {
  const app = setup({ saved: 'dark' });
  assert.equal(app.render().ready, false);
  await Promise.resolve();
  const theme = app.render();
  assert.equal(theme.ready, true);
  assert.equal(theme.scheme, 'dark');
  assert.equal(theme.colors.surface, tokens.DarkColors.surface);
  assert.deepEqual(app.overrides, ['dark']);
});

test('system preference follows changes while an explicit preference stays fixed', async () => {
  const app = setup();
  app.render(); await Promise.resolve();
  assert.equal(app.render().scheme, 'light');
  app.setSystem('dark');
  const theme = app.render();
  assert.equal(theme.scheme, 'dark');
  await theme.setPreference('light');
  assert.equal(app.render().scheme, 'light');
  await app.render().setPreference('system');
  assert.equal(app.render().scheme, 'dark');
  assert.equal(app.overrides.at(-1), 'auto');
});

test('invalid or unavailable storage falls back to system and does not block startup', async () => {
  for (const options of [{ saved: 'invalid' }, { storageError: true }]) {
    const app = setup(options);
    app.setSystem('dark'); app.render(); await Promise.resolve();
    assert.equal(app.render().ready, true);
    assert.equal(app.render().scheme, 'dark');
  }
});

test('rapid selections persist in order', async () => {
  const app = setup();
  app.render(); await Promise.resolve();
  const theme = app.render();
  await Promise.all([theme.setPreference('dark'), theme.setPreference('light'), theme.setPreference('system')]);
  assert.deepEqual(app.writes, ['dark', 'light', 'system']);
  assert.equal(app.render().preference, 'system');
});

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test('text and actionable surfaces keep at least 4.5:1 contrast in both palettes', () => {
  for (const palette of [tokens.LightColors, tokens.DarkColors]) {
    for (const [fg, bg] of [['ink', 'surface'], ['ink', 'surfaceSunken'], ['inkMuted', 'surfaceChip'], ['onVolt', 'volt'], ['onVolt', 'voltStrong'], ['onInverse', 'surfaceInverse'], ['onInverse', 'inversePressed'], ['voltInk', 'voltSoft'], ['danger', 'dangerSoft']]) {
      const values = [luminance(palette[fg]), luminance(palette[bg])].sort((a, b) => b - a);
      assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, `${fg} on ${bg}`);
    }
  }
});
