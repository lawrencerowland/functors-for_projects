const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(new URL('../apps/grounded-theory-colimit/index.html','file://'+__filename),'utf8');
const ctx={};vm.createContext(ctx);vm.runInContext(html.match(/<script id="quotient-model">([\s\S]*?)<\/script>/)[1],ctx);
const {quotient,factor}=ctx.CodingQuotient;const plain=x=>JSON.parse(JSON.stringify(x));
// An independent graph traversal oracle, followed by exhaustive candidate/factor maps.
let graphs=0,maps=0;
for(let n=0;n<=4;n++){
 const ids=Array.from({length:n},(_,i)=>i),possible=[];
 for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)possible.push([a,b]);
 for(let mask=0;mask<2**possible.length;mask++){
  const edges=possible.filter((_,i)=>mask>>i&1),unseen=new Set(ids),oracle=[];
  while(unseen.size){const root=unseen.values().next().value;unseen.delete(root);const component=[root],queue=[root];while(queue.length){const a=queue.pop();for(const [u,v]of edges){const b=u===a?v:v===a?u:null;if(b!==null&&unseen.delete(b)){component.push(b);queue.push(b);}}}oracle.push(component.sort((a,b)=>a-b));}
  const groups=plain(quotient(ids,edges));assert.deepEqual(groups,oracle);graphs++;
  for(let code=0;code<2**n;code++){
   const labels=ids.map(i=>(code>>i&1)?'B':'A'),r=plain(factor(ids,edges,labels));
   const respects=edges.every(([a,b])=>labels[a]===labels[b]);assert.equal(r.valid,true);assert.equal(r.compatible,respects);
   let factorizations=0;
   for(let h=0;h<2**groups.length;h++)if(groups.every((g,i)=>g.every(id=>labels[id]===((h>>i&1)?'B':'A'))))factorizations++;
   assert.equal(factorizations,respects?1:0);
   if(respects){
    assert.equal(r.mapping.length,oracle.length);
    for(const [i,component] of oracle.entries()){
     const entry=r.mapping[i];assert.equal(entry.classIndex,i);assert.deepEqual(entry.members,component);
     for(const id of component)assert.equal(entry.label,labels[id]);
    }
   }else{
    assert.ok(edges.some(([a,b])=>a===r.witness[0]&&b===r.witness[1]));
    assert.deepEqual(r.values,r.witness.map(id=>labels[id]));assert.notEqual(...r.values);
   }
   maps++;
  }
 }
}
assert.equal(quotient([1,2,3],[[1,2]]).length,2);
assert.equal(quotient([1,2,3,4],[[1,2]]).length,3); // New evidence is not automatically absorbed.
assert.equal(quotient([1,2,3],[[1,2],[2,3]]).length,1);
assert.equal(quotient([1,2,3],[[1,2]]).length,2); // Undo recomputes the relation.
assert.throws(()=>quotient([1,1],[]));assert.throws(()=>quotient([1],[[1,2]]));
assert.equal(factor([1],[],[' ']).valid,false);
console.log(`PASS: ${graphs} identification graphs, ${maps} candidate maps, independently enumerated factorisations; new evidence, undo and invalid inputs.`);
