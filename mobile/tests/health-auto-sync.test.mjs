import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function setup({connected=true,matched=true}={}) {
  const options = [];
  const posts = [];
  const state = {currentState:'active'};
  let resumed = 0, cleanup, listener;
  state.addEventListener = (event, fn) => { assert.equal(event,'change');listener=fn;return {remove(){listener=null;}}; };
  const exports = {};
  const require = id => ({
    '@tanstack/react-query':{useQueryClient:()=>({invalidateQueries:async()=>{}}),useQuery:option=>{
      options.push(option);
      return option.queryKey[1] === 'account' ? {data:matched} : {refetch:()=>{resumed++;}};
    }},
    react:{useEffect:fn=>{cleanup=fn();}},'react-native':{AppState:state},
    '@/lib/api':{api:async(path,options)=>{posts.push(options.body);return {imported:options.body.samples.length};}},
    '@/lib/health':{healthAccountMatches:async()=>matched,isHealthEnabled:async()=>connected,
      readHealthImports:async()=>[{sample_id:'fixture'}]},
    '@/hooks/queries':{useHealthEnabled:()=>({data:connected})},
  }[id]);
  const code=ts.transpileModule(fs.readFileSync(new URL('../src/hooks/use-health-sync.ts',import.meta.url),'utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{require,exports,Date,Error});
  return {exports,options,posts,state,event:s=>listener?.(s),resumes:()=>resumed,cleanup:()=>cleanup?.()};
}

test('a connected account syncs on mount, resume and every minute in the foreground, without a button',async()=>{
  const run=setup();
  run.exports.useHealthAutoSync('account');
  const sync=run.options.find(o=>o.queryKey[1]==='sync');
  assert.equal(sync.enabled,true);
  assert.equal(sync.refetchInterval(),60000);
  run.state.currentState='background';
  assert.equal(sync.refetchInterval(),false);
  run.event('background');assert.equal(run.resumes(),0);
  run.event('active');assert.equal(run.resumes(),1);
  await sync.queryFn({signal:{aborted:false}});
  assert.equal(run.posts[0].user_id,'account');
  run.cleanup();run.event('active');assert.equal(run.resumes(),1);
});

test('disconnection and account mismatch prevent automatic import and resume listeners',async()=>{
  for(const configuration of [{connected:false},{matched:false}]) {
    const run=setup(configuration);
    run.exports.useHealthAutoSync('other-account');
    const sync=run.options.find(o=>o.queryKey[1]==='sync');
    assert.equal(sync.enabled,false);
    run.event('active');assert.equal(run.resumes(),0);
    await assert.rejects(sync.queryFn({signal:{aborted:false}}),/Conecte o Saúde/);
    assert.equal(run.posts.length,0);
  }
});
