import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/lib/outdoor-location.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function setup(platform, { taskAvailable = true, registrationFails = false } = {}) {
  const calls = [];
  const exports = {};
  const modules = {
    'expo-location': {
      Accuracy: { High: 4 },
      ActivityType: { Fitness: 3 },
      requestForegroundPermissionsAsync: async () => ({ granted: true, ios: { scope: 'whenInUse', accuracy: 'full' } }),
      getBackgroundPermissionsAsync: async () => ({ granted: false }),
      hasServicesEnabledAsync: async () => true,
      async startLocationUpdatesAsync(task, options) {
        calls.push({ task, options });
        if (registrationFails) throw new Error('Background location mode is unavailable');
      },
      async watchPositionAsync() {
        calls.push({ watcher: true });
        return { remove() {} };
      },
    },
    'expo-task-manager': {
      defineTask() {},
      isAvailableAsync: async () => taskAvailable,
    },
    'react-native': { Platform: { OS: platform } },
    './outdoor-recording': {},
  };
  vm.runInNewContext(outputText, { require: (id) => modules[id], exports });
  return { ...exports, calls };
}

test('an iPhone workout starts background GPS with While Using the App permission', async () => {
  const location = setup('ios');
  await location.requestOutdoorLocation();

  assert.equal(await location.startOutdoorLocation('owner', 'session', () => {}), true);
  assert.equal(location.calls.length, 1);
  assert.equal(location.calls[0].task, 'fitgen-outdoor-location');
  assert.equal(location.calls[0].options.showsBackgroundLocationIndicator, true);
  assert.equal(location.calls[0].options.pausesUpdatesAutomatically, false);
  assert.equal(location.calls[0].options.foregroundService, undefined);
});

test('a missing or failed background task falls back to foreground GPS', async () => {
  for (const options of [{ taskAvailable: false }, { registrationFails: true }]) {
    const location = setup('ios', options);
    assert.equal(await location.startOutdoorLocation('owner', 'session', () => {}), false);
    assert.equal(location.calls.at(-1).watcher, true);
  }
});

test('Android still uses the location foreground service', async () => {
  const location = setup('android');
  assert.equal(await location.startOutdoorLocation('owner', 'session', () => {}), true);
  assert.equal(location.calls[0].options.foregroundService.killServiceOnDestroy, true);
});
