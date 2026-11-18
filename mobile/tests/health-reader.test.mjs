import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as summary from '../src/lib/health-summary.ts';

function reader(platform = 'ios', fail = false) {
  const sample = (uuid, bundle, extra = {}) => ({uuid, sourceRevision:{source:{name:'Fonte',bundleIdentifier:bundle}},
    startDate:new Date('2026-11-01T10:00:00Z'),endDate:new Date('2026-11-01T10:30:00Z'),metadata:{},...extra});
  const external = sample('external','watch',{duration:{quantity:1700,unit:'s'},workoutActivityType:1,
    getStatistic:async()=>({sumQuantity:{quantity:123,unit:'kcal'}})});
  let reads = 0;
  const hk = {isHealthDataAvailable:()=>true,WorkoutActivityType:{running:1},
    queryWorkoutSamples:async()=>{reads++; if(fail)throw new Error('HealthKit indisponível'); return [external,sample('own','com.douglas.fitgen')];},
    queryQuantitySamples:async()=>[sample('weight','scale',{quantity:79.8}),sample('own-weight','com.douglas.fitgen',{quantity:80})]};
  const exports = {};
  const require = id => ({'expo-constants':{default:{executionEnvironment:'standalone'},ExecutionEnvironment:{StoreClient:'storeClient'}},
    'expo-secure-store':{getItemAsync:async()=> '1'},'react-native':{Platform:{OS:platform}},
    './health-summary':summary,'@kingstinct/react-native-healthkit':hk}[id]);
  const code = ts.transpileModule(fs.readFileSync(new URL('../src/lib/health.ts',import.meta.url),'utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{require,exports,__DEV__:false,Date,console});
  return {exports,reads:()=>reads};
}

test('native imports preserve original dates, active workout duration, calories and source; exclude own exports',async()=>{
  const {exports} = reader();
  const rows = await exports.readHealthImports();
  assert.equal(rows.length,2);
  assert.equal(rows[0].kind,'weight');
  assert.equal(rows[0].weight_kg,79.8);
  assert.equal(rows[0].started_at,'2026-11-01T10:00:00.000Z');
  assert.equal(rows[1].workout_name,'Corrida');
  assert.equal(rows[1].duration_seconds,1700);
  assert.equal(rows[1].calories,123);
  assert.equal(rows[1].source,'Fonte');
});

test('unavailable platforms do not invoke native reads; read failures reach the sync UI',async()=>{
  const android = reader('android');
  assert.equal((await android.exports.readHealthImports()).length,0);
  assert.equal(android.reads(),0);
  await assert.rejects(reader('ios',true).exports.readHealthImports(),/HealthKit indisponível/);
});
