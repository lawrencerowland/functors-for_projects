const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../apps/fibration-milestone-linking/index.html'), 'utf8');
const source = html.match(/<script id="campaign-model">([\s\S]*?)<\/script>/)[1];
const sandbox = {};
vm.runInNewContext(source, sandbox);
const M = sandbox.CampaignModel;
const json = x => JSON.parse(JSON.stringify(x));
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('✓ ' + name); }
check('all eight constraint combinations and all three policies preserve baseline identifiers, edges and references', () => {
 for (let mask=0;mask<8;mask++) for (const policy of Object.keys(M.POLICIES)) {
  const state={privacy:!!(mask&1),time:!!(mask&2),budget:!!(mask&4),scope:'shared',policy};
  const m=M.build(state);
  assert.equal(m.checks.referencesResolved,true);assert.equal(m.checks.baselineIdsRetained,true);
  assert.equal(m.summary.added,state.privacy?{minimal:7,strict:10,pivot:11}[policy]:0);
  assert.equal(m.conflict,state.privacy&&state.time&&state.budget);
  assert.equal(m.context.inherited.length,3);
  for(const t of m.tasks.filter(t=>t.status==='direct'))assert.doesNotMatch(t.reason,/No declared rule directly flags/);
  assert.equal(m.context.additions.length,(state.privacy?4:0)+(state.time?1:0)+(state.budget?1:0));
  for (const base of Object.values(M.REGION_BASE_PLANS)) for(const task of base.tasks) {
    const current=m.tasks.find(t=>t.id===task.id);assert.equal(current.name,task.name);assert.deepEqual(json(current.depends),json(task.depends));
  }
  for(const p of m.plans){assert.equal(p.gates[0].status,'unverified');assert.equal(p.gates[1].status,m.conflict?'conflict':'unverified');}
 }
});
check('shared response alternatives are both feasible, singly feasible, or jointly conflicting for the stated reasons',()=>{
 assert.deepEqual(json(M.build({privacy:true}).feasible.map(x=>x.id)),['patch','aggregate']);
 const budget=M.build({privacy:true,budget:true});assert.deepEqual(json(budget.feasible.map(x=>x.id)),['aggregate']);assert.equal(budget.recommendation,null);
 const timing=M.build({privacy:true,time:true});assert.deepEqual(json(timing.feasible.map(x=>x.id)),['patch']);
 const tight=M.build({privacy:true,time:true,budget:true});assert.equal(tight.conflict,true);assert.equal(tight.options[0].withinBudget,false);assert.equal(tight.options[0].withinWindow,true);assert.equal(tight.options[1].withinBudget,true);assert.equal(tight.options[1].withinWindow,false);
 assert.equal(M.build({privacy:true,policy:'pivot',budget:true}).recommendation.id,'aggregate');
 assert.equal(M.build({privacy:true,policy:'pivot',time:true}).recommendation,null);
});
check('an observation without shared authorisation stays local and does not silently change the shared context',()=>{
 const m=M.build({privacy:true,scope:'local'});
 assert.equal(m.shared,false);assert.deepEqual(json(m.context.bits),[0,0,0]);assert.equal(m.summary.added,3);assert.equal(m.conflict,false);
 for(const p of m.plans.filter(x=>x.id!=='asia'))assert.ok(p.tasks.every(t=>t.status==='unflagged'&&!t.added));
 assert.equal(M.build({scope:'shared'}).shared,false);
});
check('reviews traverse declared dependencies and leave an unrelated event branch unchanged',()=>{
 for(let mask=0;mask<8;mask++) for(const policy of Object.keys(M.POLICIES)){
  const m=M.build({privacy:!!(mask&1),time:!!(mask&2),budget:!!(mask&4),policy});
  assert.equal(m.tasks.find(t=>t.id==='n5').status,'unflagged');
  assert.equal(m.tasks.find(t=>t.id==='n5').evidence,'not supplied');
 }
 const p=M.build({privacy:true});assert.equal(p.tasks.find(t=>t.id==='a4').status,'downstream');assert.equal(p.tasks.find(t=>t.id==='e5').status,'downstream');assert.equal(p.tasks.find(t=>t.id==='a2').status,'downstream');
 const t=M.build({time:true});assert.equal(t.tasks.find(t=>t.id==='e1').status,'direct');assert.equal(t.tasks.find(t=>t.id==='e6').status,'downstream');
 const b=M.build({budget:true});assert.equal(b.tasks.find(t=>t.id==='n3').status,'direct');assert.equal(b.tasks.find(t=>t.id==='n6').status,'downstream');
 assert.doesNotMatch(t.tasks.find(x=>x.id==='e1').reason,/No declared rule directly flags/);
 assert.doesNotMatch(b.tasks.find(x=>x.id==='n3').reason,/No declared rule directly flags/);
 const synthetic=[{id:'a',depends:[]},{id:'b',depends:['a']},{id:'c',depends:['b']},{id:'d',depends:[]}];
 assert.deepEqual([...M.dependents(synthetic,new Set(['a']))],['b','c']);
});
check('every gate has resolved named prerequisites and shared conflicts reach all declared measurement gates',()=>{
 for(const policy of Object.keys(M.POLICIES)){
  const m=M.build({privacy:true,time:true,budget:true,policy}),ids=new Set([...m.tasks.map(t=>t.id),'shared-response']);
  for(const p of m.plans)for(const g of p.gates){for(const id of g.requires)assert.ok(ids.has(id));assert.match(g.predicate,/accepted/i);}
  assert.deepEqual(json(m.sharedTask.depends),['e1']);
  assert.ok(m.plans.every(p=>p.gates[1].requires.includes('shared-response')&&p.gates[1].status==='conflict'));
 }
});
check('acceptance follows declared required edges and never treats unflagged as accepted',()=>{
 const records=[{id:'shared',status:'conflict'},{id:'local',status:'unflagged'}];
 assert.equal(M.evaluateRequirements(['shared'],records),'conflict');
 assert.equal(M.evaluateRequirements(['local'],records),'unverified');
 assert.equal(M.evaluateRequirements(['absent'],records),'unresolved reference');
});
check('session audit snapshots and task deltas change with every policy, scope and independent control',()=>{
 let s=M.createSession();
 const patches=[{privacy:true},{policy:'strict'},{policy:'pivot'},{time:true},{budget:true},{scope:'local'},{scope:'shared'},{privacy:false},{policy:'minimal'}];
 for(const patch of patches){const old=s.model;s=M.transition(s,patch);const e=s.events.at(-1);assert.deepEqual(json(e.after),json(M.snapshot(s.model)));assert.deepEqual(json(e.before),json(M.snapshot(old)));assert.deepEqual(json(e.deltas),json(M.taskDeltas(old,s.model)));}
 let p=M.transition(M.createSession(),{privacy:true});p=M.transition(p,{policy:'strict'});assert.equal(p.events.at(-1).deltas.added.length,3);assert.equal(p.events.at(-1).after.controls.policy,'strict');
 p=M.transition(p,{policy:'pivot'});assert.equal(p.events.at(-1).deltas.added.length,4);assert.equal(p.events.at(-1).deltas.removed.length,3);assert.equal(p.events.at(-1).after.summary.added,11);
 const serialized=JSON.parse(JSON.stringify({current:M.snapshot(p.model),events:p.events}));assert.equal(serialized.current.controls.policy,'pivot');assert.equal(serialized.current.summary.added,11);
 const reset=M.resetSession(p);assert.deepEqual(json(reset.model.state),json(M.DEFAULTS));assert.equal(reset.model.summary.added,0);assert.equal(reset.events.length,1);assert.equal(reset.events[0].deltas.removed.length,11);assert.equal(reset.events[0].after.controls.policy,'minimal');
});
check('the finite base has identity and composable forgetting arrows, without claiming a total-category proof',()=>{
 const objects=Array.from({length:8},(_,n)=>[n&1,(n>>1)&1,(n>>2)&1]);
 for(const a of objects){assert.equal(M.baseArrow(a,a),true);for(const b of objects)for(const c of objects)if(M.baseArrow(a,b)&&M.baseArrow(b,c)){
  assert.equal(M.baseArrow(a,c),true);assert.deepEqual(json(M.composeBase({from:a,to:b},{from:b,to:c})),{from:a,to:c});
 }}
 assert.throws(()=>M.composeBase({from:[1,0,0],to:[0,0,0]},{from:[1,1,0],to:[0,0,0]}));
});
check('page provides canonical navigation, bounded claims, native accessible controls and query/hash redirect',()=>{
 assert.match(html,/href="\.\.\/\.\.\/index\.html#apps"/);assert.match(html,/solway_firth_tunnel_fibration_demo\.html/);assert.match(html,/fibration candidate/);assert.match(html,/id="privacy" type="checkbox"/);assert.match(html,/id="time" type="checkbox"/);assert.match(html,/id="budget" type="checkbox"/);assert.match(html,/role="img" aria-labelledby="diagram-title diagram-desc"/);
 const redirect=fs.readFileSync(path.join(__dirname,'../apps/fibration_example_v2/index.html'),'utf8');assert.match(redirect,/location\.search \+ location\.hash/);assert.match(redirect,/id="destination"/);
});
console.log(`Milestone model: ${checks} checks passed (24 constraint/policy scenarios plus scope, graph, audit and reset cases).`);
