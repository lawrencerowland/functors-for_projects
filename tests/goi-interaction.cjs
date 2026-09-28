'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../apps/geometry-of-interaction/model.js'), 'utf8');
const context = { module: { exports: {} } };
vm.runInNewContext(source, context);
const M = context.module.exports;
const m = M.messages;
const plain = value => JSON.parse(JSON.stringify(value));
let scenarioInputs = 0;
let exhaustivePairs = 0;
let exhaustiveTriples = 0;
let wideTriples = 0;

// Independent execution oracle: flatten a whole chain of supplied atomic
// partial functions and walk its adjacent ports. It never calls compose or
// traceInteraction and never infers an environmental response.
function oracle(components, start) {
  let position = components[0].source.plus.includes(start) ? 0 : components.length - 1;
  let input = start;
  const seen = new Set();
  for (;;) {
    const key = JSON.stringify([position, input]);
    if (seen.has(key)) return { outcome: 'loop', exit: null };
    seen.add(key);
    const component = components[position];
    if (!Object.hasOwn(component.table, input)) return { outcome: 'missing', exit: null };
    const output = component.table[input];
    if (component.source.minus.includes(output)) {
      if (position === 0) return { outcome: 'exit', exit: output };
      position -= 1;
    } else {
      if (position === components.length - 1) return { outcome: 'exit', exit: output };
      position += 1;
    }
    input = output;
  }
}

function signature(component) {
  return JSON.stringify(Object.entries(component.table).sort(([a], [b]) => a.localeCompare(b)));
}

function assertSamePartialFunction(actual, expected) {
  assert.equal(actual.source.id, expected.source.id);
  assert.equal(actual.target.id, expected.target.id);
  assert.equal(signature(actual), signature(expected));
}

function assertWitness(trace, f, g) {
  const seen = new Set();
  trace.events.forEach((event, index) => {
    assert.equal(event.index, index);
    const component = event.side === 'left' ? f : g;
    assert.equal(event.component, component.id);
    assert.equal(event.inputInterface, event.from.split(':')[0]);
    assert.ok([...component.source.plus, ...component.target.minus].includes(event.from));
    assert.ok(!seen.has(`${event.side}:${event.from}`), 'trace appends each state once');
    seen.add(`${event.side}:${event.from}`);
    if (event.kind === 'route') {
      assert.equal(event.to, component.table[event.from]);
      assert.equal(event.outputInterface, event.to.split(':')[0]);
      assert.ok([...component.source.minus, ...component.target.plus].includes(event.to));
    } else {
      assert.equal(event.kind, 'missing');
      assert.equal(event.to, null);
      assert.equal(event.outputInterface, null);
      assert.equal(Object.hasOwn(component.table, event.from), false);
      assert.equal(index, trace.events.length - 1);
    }
    if (index) {
      const previous = trace.events[index - 1];
      assert.equal(previous.to, event.from, 'each hop is exactly the preceding output');
      assert.notEqual(previous.side, event.side, 'the two components alternate across B');
    } else assert.equal(event.from, trace.start);
  });
  const last = trace.events.at(-1);
  if (trace.outcome === 'exit') {
    assert.equal(trace.witness, null);
    assert.equal(last.to, trace.exit);
    assert.ok([...f.source.minus, ...g.target.plus].includes(trace.exit));
    assert.ok(trace.events.every(event => event.kind === 'route'));
  } else {
    assert.equal(trace.exit, null);
    const witness = trace.witness;
    if (witness.nested) {
      assert.equal(last.kind, 'missing');
      assert.equal(witness.nested.start, last.from);
      assert.equal(witness.nested.outcome, trace.outcome);
      assert.notEqual(witness.nested.outcome, 'exit');
    } else if (trace.outcome === 'missing') {
      assert.equal(last.kind, 'missing');
      assert.equal(witness.eventIndex, last.index);
      assert.equal(witness.input, last.from);
      assert.equal(witness.component, last.component);
    } else {
      assert.equal(trace.outcome, 'loop');
      assert.equal(witness.repeatEventIndex, trace.events.length);
      assert.ok(witness.firstEventIndex < witness.repeatEventIndex);
      const first = trace.events[witness.firstEventIndex];
      assert.equal(witness.state.side, first.side);
      assert.equal(witness.state.component, first.component);
      assert.equal(witness.state.input, first.from);
      assert.equal(last.to, first.from, 'loop closes on an exact repeated input');
      assert.notEqual(last.side, first.side);
      assert.deepEqual(plain(witness.cycle), plain(trace.events.slice(witness.firstEventIndex)));
    }
  }
}

// Independently stated scenario truth table, all policies, diagnostics and
// exterior inputs. A request asks for a report and then stops.
for (const landingPolicy of ['shore', 'jetty']) {
  for (const deliveryPolicy of ['boxes', 'pallet']) {
    for (const diagnostic of ['none', 'loop', 'missing']) {
      const { f, g } = M.createScenario({ landingPolicy, deliveryPolicy, diagnostic });
      const composite = M.compose(f, g);
      const expected = [
        [m.deliveryRequest, 'exit', m.survey],
        [m.clear, 'exit', m.deliverJetty],
        [m.storm, 'exit', m.holdC],
        [m.shoreOnly,
          diagnostic === 'missing' ? 'missing' : landingPolicy === 'shore' && deliveryPolicy === 'pallet' && diagnostic === 'loop' ? 'loop' : 'exit',
          diagnostic === 'missing' || landingPolicy === 'shore' && deliveryPolicy === 'pallet' && diagnostic === 'loop' ? null :
            landingPolicy === 'shore' && deliveryPolicy === 'boxes' ? m.deliverBoxes : m.holdC]
      ];
      for (const [input, outcome, exit] of expected) {
        const trace = M.traceInteraction(f, g, input);
        assert.equal(trace.outcome, outcome);
        assert.equal(trace.exit, exit);
        assert.deepEqual({ outcome: trace.outcome, exit: trace.exit }, oracle([f, g], input));
        assertWitness(trace, f, g);
        assert.equal(M.evaluate(composite, input), composite.traces[input]);
        assert.equal(Object.hasOwn(composite.table, input), outcome === 'exit');
        if (outcome === 'exit') assert.equal(composite.table[input], exit);
        scenarioInputs += 1;
      }
      const request = M.traceInteraction(f, g, m.deliveryRequest);
      assert.deepEqual(plain(request.events.map(event => [event.component, event.from, event.to])), [
        ['g', m.deliveryRequest, m.planRequest], ['f', m.planRequest, m.survey]
      ]);
      assert.equal(request.events.some(event => M.interfaces.A.plus.includes(event.from)), false, 'inspector never replies implicitly');
      for (const [input, output] of Object.entries(composite.table)) {
        assert.ok(!input.startsWith('B') && !output.startsWith('B'), 'hidden B is absent from exterior table');
      }
      for (const component of [f, g, composite]) {
        assertSamePartialFunction(M.compose(M.identity(component.source), component), component);
        assertSamePartialFunction(M.compose(component, M.identity(component.target)), component);
        for (const input of [...component.source.plus, ...component.target.minus]) {
          for (const withIdentity of [M.compose(M.identity(component.source), component), M.compose(component, M.identity(component.target))]) {
            assert.equal(M.evaluate(withIdentity, input).outcome, M.evaluate(component, input).outcome);
          }
        }
      }
    }
  }
}

const base = M.createScenario({ landingPolicy: 'shore', deliveryPolicy: 'pallet' });
assert.deepEqual(plain(M.traceInteraction(base.f, base.g, m.shoreOnly).events.map(event => event.to)), [m.shore, m.jettyRequest, m.holdB, m.holdC]);
const looping = M.createScenario({ landingPolicy: 'shore', deliveryPolicy: 'pallet', diagnostic: 'loop' });
const loopTrace = M.traceInteraction(looping.f, looping.g, m.shoreOnly);
assert.deepEqual(plain(loopTrace.events.map(event => event.to)), [m.shore, m.jettyRequest, m.shore]);
assert.equal(loopTrace.witness.firstEventIndex, 1);
assert.equal(loopTrace.witness.repeatEventIndex, 3);
const missing = M.createScenario({ diagnostic: 'missing' });
assert.equal(M.traceInteraction(missing.f, missing.g, m.shoreOnly).events.length, 1);
assert.deepEqual(plain(M.counterfactuals().map(({ landingPolicy, deliveryPolicy, outcome, exit }) => ({ landingPolicy, deliveryPolicy, outcome, exit }))), [
  { landingPolicy: 'shore', deliveryPolicy: 'boxes', outcome: 'exit', exit: m.deliverBoxes },
  { landingPolicy: 'shore', deliveryPolicy: 'pallet', outcome: 'exit', exit: m.holdC },
  { landingPolicy: 'jetty', deliveryPolicy: 'boxes', outcome: 'exit', exit: m.holdC },
  { landingPolicy: 'jetty', deliveryPolicy: 'pallet', outcome: 'exit', exit: m.holdC }
]);

// A third component requests the plan, then turns each proposed plan into an
// acknowledgement. It preserves the distinction between dispatch and reality.
const D = M.createInterface('D', ['jetty-plan-received', 'boxes-plan-received', 'hold-received'], ['ask']);
const h = M.createComponent({ id: 'h', source: M.interfaces.C, target: D, table: {
  [D.minus[0]]: m.deliveryRequest,
  [m.deliverJetty]: D.plus[0], [m.deliverBoxes]: D.plus[1], [m.holdC]: D.plus[2]
} });
for (const landingPolicy of ['shore', 'jetty']) for (const deliveryPolicy of ['boxes', 'pallet']) for (const diagnostic of ['none', 'loop', 'missing']) {
  const { f, g } = M.createScenario({ landingPolicy, deliveryPolicy, diagnostic });
  const left = M.compose(M.compose(f, g), h);
  const right = M.compose(f, M.compose(g, h));
  assertSamePartialFunction(left, right);
  for (const input of [...f.source.plus, ...h.target.minus]) {
    const expected = oracle([f, g, h], input);
    for (const component of [left, right]) {
      const actual = M.evaluate(component, input);
      assert.equal(actual.outcome, expected.outcome);
      assert.equal(actual.exit, expected.exit);
    }
  }
}

function allTinyComponents(id, source, target) {
  const inputs = [...source.plus, ...target.minus];
  const outputs = [...source.minus, ...target.plus];
  const choices = [undefined, ...outputs];
  return choices.flatMap((a, i) => choices.map((b, j) => {
    const table = {};
    if (a !== undefined) table[inputs[0]] = a;
    if (b !== undefined) table[inputs[1]] = b;
    return M.createComponent({ id: `${id}${i}${j}`, source, target, table });
  }));
}
const P = M.createInterface('P', ['same'], ['same']);
const Q = M.createInterface('Q', ['same'], ['same']);
const R = M.createInterface('R', ['same'], ['same']);
const S = M.createInterface('S', ['same'], ['same']);
const fsTiny = allTinyComponents('u', P, Q);
const gsTiny = allTinyComponents('v', Q, R);
const hsTiny = allTinyComponents('w', R, S);
const outcomesSeen = new Set();
for (const f of fsTiny) for (const g of gsTiny) {
  const fg = M.compose(f, g);
  for (const input of [...P.plus, ...R.minus]) {
    const expected = oracle([f, g], input);
    outcomesSeen.add(expected.outcome);
    const actual = M.traceInteraction(f, g, input);
    assert.equal(actual.outcome, expected.outcome);
    assert.equal(actual.exit, expected.exit);
    assertWitness(actual, f, g);
  }
  exhaustivePairs += 1;
  for (const h of hsTiny) {
    const left = M.compose(fg, h);
    const right = M.compose(f, M.compose(g, h));
    assertSamePartialFunction(left, right);
    for (const input of [...P.plus, ...S.minus]) {
      const expected = oracle([f, g, h], input);
      for (const component of [left, right]) {
        const actual = M.evaluate(component, input);
        assert.equal(actual.outcome, expected.outcome);
        assert.equal(actual.exit, expected.exit);
      }
    }
    exhaustiveTriples += 1;
  }
}
assert.deepEqual([...outcomesSeen].sort(), ['exit', 'loop', 'missing']);
for (const component of [...fsTiny, ...gsTiny, ...hsTiny]) {
  assertSamePartialFunction(M.compose(M.identity(component.source), component), component);
  assertSamePartialFunction(M.compose(component, M.identity(component.target)), component);
}

// Unequal cardinalities, empty polarities, repeated local names, and partial
// functions generated from a reproducible seed supplement the exhaustive 1+1
// objects above. The oracle executes all three atomic components directly.
let seed = 193;
function next(max) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; }
function names(size) { return Array.from({ length: size }, (_, i) => `m${i}`); }
function randomComponent(id, source, target) {
  const outputs = [...source.minus, ...target.plus];
  const table = {};
  for (const input of [...source.plus, ...target.minus]) {
    const choice = next(outputs.length + 1);
    if (choice < outputs.length) table[input] = outputs[choice];
  }
  return M.createComponent({ id, source, target, table });
}
for (let fixture = 0; fixture < 160; fixture += 1) {
  const objects = Array.from({ length: 4 }, (_, i) => M.createInterface(`X${i}`, names(next(4)), names(next(4))));
  const [f, g, h] = [0, 1, 2].map(i => randomComponent(`r${i}`, objects[i], objects[i + 1]));
  const left = M.compose(M.compose(f, g), h);
  const right = M.compose(f, M.compose(g, h));
  assertSamePartialFunction(left, right);
  for (const input of [...objects[0].plus, ...objects[3].minus]) {
    const expected = oracle([f, g, h], input);
    for (const component of [left, right]) {
      const actual = M.evaluate(component, input);
      assert.equal(actual.outcome, expected.outcome);
      assert.equal(actual.exit, expected.exit);
    }
  }
  wideTriples += 1;
}

// A terminating path longer than common animation caps is not a loop. A
// changed final route creates a genuine cycle and reports its exact witness.
const LongA = M.createInterface('LongA', ['start'], ['done']);
const LongB = M.createInterface('LongB', names(260), names(260));
const LongC = M.createInterface('LongC', [], []);
const longF = { [LongA.plus[0]]: LongB.plus[0] };
const longG = {};
for (let i = 0; i < 260; i += 1) {
  longF[LongB.minus[i]] = i === 259 ? LongA.minus[0] : LongB.plus[i + 1];
  longG[LongB.plus[i]] = LongB.minus[i];
}
const lf = M.createComponent({ id: 'long-f', source: LongA, target: LongB, table: longF });
const lg = M.createComponent({ id: 'long-g', source: LongB, target: LongC, table: longG });
const longExit = M.traceInteraction(lf, lg, LongA.plus[0]);
assert.equal(longExit.outcome, 'exit');
assert.equal(longExit.events.length, 521);
assertWitness(longExit, lf, lg);
longF[LongB.minus[259]] = LongB.plus[0];
const loopF = M.createComponent({ id: 'long-loop-f', source: LongA, target: LongB, table: longF });
const longLoop = M.traceInteraction(loopF, lg, LongA.plus[0]);
assert.equal(longLoop.outcome, 'loop');
assert.equal(longLoop.witness.cycle.length, 520);
assertWitness(longLoop, loopF, lg);

// Validate type boundaries, qualified names, UMD/browser export and immutability.
assert.equal(context.GoIModel, M);
const browser = { window: {} };
vm.runInNewContext(source, browser);
assert.equal(typeof browser.window.GoIModel.compose, 'function');
assert.equal(new Set(Object.values(m)).size, Object.values(m).length);
assert.equal(M.labels[m.deliverJetty], 'Plan jetty unloading');
assert.equal(M.labels[m.deliverBoxes], 'Plan hand-carried boxes');
assert.ok(Object.isFrozen(base.f) && Object.isFrozen(base.f.table) && Object.isFrozen(base.f.source.plus));
assert.throws(() => M.createInterface('A', ['duplicate', 'duplicate'], []), /Duplicate/);
assert.throws(() => M.createComponent({ id: 'bad', source: P, target: Q, table: { same: Q.plus[0] } }), /outside/);
assert.throws(() => M.createComponent({ id: 'bad', source: P, target: Q, table: { [P.plus[0]]: S.plus[0] } }), /outside/);
assert.throws(() => M.compose(base.g, base.f), /matching/);
assert.throws(() => M.traceInteraction(base.f, base.g, m.shore), /exterior/);
assert.throws(() => M.evaluate(base.f, m.deliveryRequest), /outside/);
assert.throws(() => M.counterfactuals(m.deliveryRequest), /inspection/);
assert.throws(() => M.createScenario({ landingPolicy: 'invented' }), /Unknown/);
assert.throws(() => M.createScenario({ deliveryPolicy: 'invented' }), /Unknown/);
assert.throws(() => M.createScenario({ diagnostic: 'invented' }), /Unknown/);
const mismatchedQ = M.createInterface('Q', ['different'], ['same']);
const wrong = M.createComponent({ id: 'wrong', source: mismatchedQ, target: R, table: {} });
assert.throws(() => M.compose(fsTiny[0], wrong), /matching/);

console.log(`GoI routing passed: ${scenarioInputs} scenario inputs; ${exhaustivePairs} exhaustive pairs; ${exhaustiveTriples} exhaustive triples; ${wideTriples} wider triples; identity laws; 521-hop termination and exact loop witnesses.`);
