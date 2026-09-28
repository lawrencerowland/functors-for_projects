const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../apps/functor-atlas-project-example/index.html'), 'utf8');
const source = html.match(/<script id="atlas-model">([\s\S]*?)<\/script>/)[1];
const context = {};
vm.createContext(context);
vm.runInContext(source, context);
const M = context.AtlasModel;
const plain = value => JSON.parse(JSON.stringify(value));
const all = new Set(M.categories.map(c => c.id));
assert.equal(M.categories.length, 14);
assert.equal(M.nodes.length, 41);
assert.equal(M.edges.length, 62);
assert.equal(M.validate(), true);
const ids = new Set(M.nodes.map(n => n.id));
for (const edge of M.edges) {
  assert.ok(ids.has(edge.source) && ids.has(edge.target), `${edge.id}: real endpoints`);
  assert.ok(edge.description.length > 25, `${edge.id}: inspectable explanation`);
}
assert.throws(() => M.validate(M.nodes, [...M.edges, {id:'broken', source:'D1', target:'{T1,T2}', type:'mapping'}]), /Missing endpoint/);
assert.throws(() => M.validate([...M.nodes, M.nodes[0]], M.edges), /Duplicate object/);
assert.throws(() => M.validate(M.nodes, [...M.edges, M.edges[0]]), /Duplicate connection/);

// Independent endpoint oracle: text order cannot silently drop stakeholder updates,
// cost accrual, telemetry, work decomposition or any original explicit relation.
const expectedRelations = [
 ['T1','T2'],['T2','T4'],['T3','T4'],['S1','S2'],['S2','S3'],['S3','S4'],
 ['R1','T1'],['R2','T2'],['C1','S1'],['C2','S2'],['K1','K2'],['V2','D1'],
 ['P2','P1'],['P3','P2'],['O1','O2'],['O2','O3'],['M1','M1'],['Z1','Z3'],
 ['G1','D1'],['G2','D1'],['A1','A2'],['U1','U2']
];
const pairs = edges => edges.map(e => `${e.source}|${e.target}`).sort();
assert.deepEqual(plain(pairs(M.edges.filter(e => e.type === 'relation'))), expectedRelations.map(p => p.join('|')).sort());
const mappingOracle = {
 F:['T1|S1','T2|S2','T3|S3','T4|S4'], L:['T1|C1','T2|C2','T3|C3','T4|C4'],
 Res:['T1|R1','T2|R2','T3|R3','T4|R4'], Q:['T4|V2'], Ord:['T1|O1','T2|O2','T3|O2','T4|O3'],
 Strat:['G1|D1','G2|D1'], J:['T3|P1','T2|P2'], H:['K1|T2','K2|T3'],
 'Ω':['K1|C2','K2|C3'], 'Δ':['T2|T2′'], 'Φ':['O3|M1'], Tel:['T2|Z1','T3|Z2'],
 Assign:['T1|A1','T2|A2','T3|A3','T4|A4'], Qual:['T2|U1','T4|U2']
};
for (const [family, expected] of Object.entries(mappingOracle)) {
  assert.deepEqual(plain(pairs(M.edges.filter(e => e.family === family))), expected.sort(), family);
}
const w = M.edges.filter(e => e.family === 'W');
assert.deepEqual(plain(pairs(w)), ['D1|T1','D1|T2','D1|T3','D1|T4','D2|T3']);
assert.ok(w.every(e => e.type === 'membership' && /W\(D[12]\) = \{/.test(e.description)));
assert.deepEqual(plain(M.taskSets), {D1:['T1','T2','T3','T4'],D2:['T3']});
assert.equal(M.edges.find(e => e.id === 'schedule-overlap').directed, false);
assert.equal(M.edges.find(e => e.id === 'quality-tradeoff').directed, false);
assert.match(M.edges.find(e => e.id === 'pert-aggregation').description, /neither its inputs nor a rule/);
assert.match(M.edges.find(e => e.id === 'daily-histogram').description, /no telemetry is fetched or computed/);

// Filters must hide incident edges too, including the whole expanded task set.
for (const category of all) {
 const active = new Set([...all].filter(c => c !== category));
 const result = M.visibleGraph(active);
 const visibleIds = new Set(result.nodes.map(n => n.id));
 assert.ok(result.nodes.every(n => n.category !== category));
 assert.ok(result.edges.every(e => visibleIds.has(e.source) && visibleIds.has(e.target)));
}
assert.deepEqual(plain(M.visibleGraph(new Set())), {nodes:[], edges:[]});
const onlyW = M.visibleGraph(new Set(['D','T']), 'membership');
assert.equal(onlyW.edges.length, 5);
for (const kind of ['relation','mapping','membership']) assert.ok(M.visibleGraph(all,kind).edges.every(e => e.type === kind));

// Layouts produce finite, separated object positions; dragging is a translation
// of exactly one category and remains unchanged when observations are recomputed.
for (const mode of ['together','separated','circular']) {
 const pos = M.layout(mode), before = plain(pos);
 assert.equal(Object.keys(pos).length, 41);
 assert.deepEqual(plain(pos), plain(M.layout(mode)), 'deterministic layout');
 for (const n of M.nodes) assert.ok(Number.isFinite(pos[n.id].x) && Number.isFinite(pos[n.id].y));
 for (const category of M.categories) {
  const group = M.nodes.filter(n => n.category === category.id);
  for (let i=0;i<group.length;i++) for (let j=i+1;j<group.length;j++) {
   const a=pos[group[i].id],b=pos[group[j].id];
   assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>48, `${mode}: node circles must not overlap`);
  }
 }
 M.moveGroup(pos,'T',123,-57);
 for (const n of M.nodes) {
  assert.deepEqual(plain(pos[n.id]), n.category === 'T' ? {x:before[n.id].x+123,y:before[n.id].y-57} : before[n.id]);
 }
 M.visibleGraph(all); // Visibility reads cannot restart movement or reset positions.
 assert.equal(pos.T1.x, before.T1.x+123);
 M.moveGroup(pos,'T',-123,57);
 for (const n of M.nodes) assert.ok(Math.abs(pos[n.id].x-before[n.id].x)<1e-9 && Math.abs(pos[n.id].y-before[n.id].y)<1e-9);
}
// One-node, two-node and collinear regions all have positive-area closed hulls
// enclosing every node's padded corners. This catches the former missing hulls.
for (const points of [[{x:0,y:0}],[{x:0,y:0},{x:0,y:80}],[{x:0,y:0},{x:60,y:0},{x:120,y:0}]]) {
 const hull = M.regionHull(points,40);
 assert.ok(hull.length >= 4);
 const area = hull.reduce((s,p,i) => {const q=hull[(i+1)%hull.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2;
 assert.ok(area > 0);
 for (const p of points) for (const [x,y] of [[p.x-40,p.y-40],[p.x+40,p.y-40],[p.x+40,p.y+40],[p.x-40,p.y+40]]) {
  for (let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];assert.ok((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0])>=-1e-8);}
 }
}
assert.equal(M.regionHull([]).length,0);

// No graph rendering success is allowed to masquerade as a checked functor.
assert.equal(M.lawsChecked,false);
assert.ok(M.edges.every(e => e.type !== 'functor' && e.type !== 'morphism'));
for (const e of M.edges.filter(e => e.type === 'mapping')) assert.match(e.description,/identities and composition are not checked/);
assert.match(html,/functor laws are not checked/);
assert.match(html,/not verified mathematical categories/);
assert.match(html,/href="\.\.\/functor-atlas\/index.html"/);
assert.match(html,/href="\.\.\/\.\.\/index.html#apps"/);
assert.match(html,/id="object-picker"/);
assert.match(html,/id="edge-picker"/);
assert.match(html,/keydown/);
assert.doesNotMatch(html,/<script[^>]*src="https?:/); // Works offline without a graph CDN.
console.log('PASS: 41 objects, 62 explicit connections, all 15 mapping/set families, endpoint and filter coverage, three stable layouts, isolated region dragging, singleton/pair hulls, and unverified-law boundary.');
