/* Finite Int(Pfn, disjoint union): typed routing with explicit partiality.
 * A -> B is a partial function A+ + B- -> A- + B+.
 * Composition follows the hidden B interface until it exits, is missing,
 * or repeats an exact state. No external input is manufactured.
 */
(function (root) {
  'use strict';

  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const freeze = Object.freeze;

  function checkId(id, kind) {
    if (typeof id !== 'string' || !id.length || /[:\u0000]/.test(id)) {
      throw new TypeError(`${kind} needs a nonempty ID without ':' or NUL`);
    }
  }

  function createInterface(id, plusNames, minusNames) {
    checkId(id, 'Interface');
    function qualify(names, polarity) {
      if (!Array.isArray(names)) throw new TypeError('Interface messages must be arrays');
      const result = names.map(name => {
        if (typeof name !== 'string' || !name.length || name.includes('\u0000')) {
          throw new TypeError('Message names must be nonempty strings without NUL');
        }
        return `${id}${polarity}:${name}`;
      });
      if (new Set(result).size !== result.length) throw new TypeError('Duplicate interface message');
      return freeze(result);
    }
    return freeze({ id, plus: qualify(plusNames, '+'), minus: qualify(minusNames, '-') });
  }

  function validateInterface(value) {
    if (!value || typeof value !== 'object') throw new TypeError('Missing typed interface');
    checkId(value.id, 'Interface');
    for (const [key, polarity] of [['plus', '+'], ['minus', '-']]) {
      if (!Array.isArray(value[key]) || new Set(value[key]).size !== value[key].length) {
        throw new TypeError('Interface messages must be distinct arrays');
      }
      for (const message of value[key]) {
        const prefix = `${value.id}${polarity}:`;
        if (typeof message !== 'string' || !message.startsWith(prefix) || message.length <= prefix.length || message.includes('\u0000')) {
          throw new TypeError(`Unqualified message in ${value.id}${polarity}`);
        }
      }
    }
    return freeze({ id: value.id, plus: freeze([...value.plus]), minus: freeze([...value.minus]) });
  }

  function sameInterface(a, b) {
    return a.id === b.id && ['plus', 'minus'].every(key =>
      a[key].length === b[key].length && a[key].every(message => b[key].includes(message)));
  }

  function createComponent({ id, name = id, source, target, table }) {
    checkId(id, 'Component');
    source = validateInterface(source);
    target = validateInterface(target);
    if (!table || typeof table !== 'object' || Array.isArray(table)) {
      throw new TypeError('A component table must be an object');
    }
    const inputs = new Set([...source.plus, ...target.minus]);
    const outputs = new Set([...source.minus, ...target.plus]);
    const checked = Object.create(null);
    for (const [from, to] of Object.entries(table)) {
      if (!inputs.has(from)) throw new TypeError(`Input ${from} is outside ${id}'s type`);
      if (!outputs.has(to)) throw new TypeError(`Output ${to} is outside ${id}'s type`);
      checked[from] = to;
    }
    return freeze({ id, name: String(name), source, target, table: freeze(checked) });
  }

  function assertComposable(f, g) {
    if (!f || !g || !sameInterface(f.target, g.source)) {
      throw new TypeError('Composition requires exactly matching middle interfaces');
    }
  }

  const interfaceLabel = message => message.slice(0, message.indexOf(':'));
  const exteriorInputs = (f, g) => [...f.source.plus, ...g.target.minus];

  function routeEvent(component, input, output, index, side) {
    return freeze({
      index, side, component: component.id, componentName: component.name,
      from: input, to: output,
      inputInterface: interfaceLabel(input),
      outputInterface: output === null ? null : interfaceLabel(output),
      kind: output === null ? 'missing' : 'route'
    });
  }

  function finish(start, outcome, exit, events, witness) {
    return freeze({ start, outcome, exit, events: freeze(events), witness });
  }

  function traceInteraction(f, g, start) {
    assertComposable(f, g);
    if (!exteriorInputs(f, g).includes(start)) {
      throw new TypeError('An interaction must start with an exterior A+ or C- input');
    }
    let side = f.source.plus.includes(start) ? 'left' : 'right';
    let input = start;
    const events = [];
    const visited = new Map();
    // Every transition has a finite, typed input. Exact-state repetition is
    // sufficient to establish divergence for these deterministic components.
    for (;;) {
      const component = side === 'left' ? f : g;
      const stateKey = `${side}\u0000${input}`;
      if (visited.has(stateKey)) {
        const firstEventIndex = visited.get(stateKey);
        return finish(start, 'loop', null, events, freeze({
          state: freeze({ side, component: component.id, input }),
          firstEventIndex, repeatEventIndex: events.length,
          cycle: freeze(events.slice(firstEventIndex))
        }));
      }
      visited.set(stateKey, events.length);
      if (!own(component.table, input)) {
        const eventIndex = events.length;
        events.push(routeEvent(component, input, null, eventIndex, side));
        // A composite is still a partial function. Its absent entry may retain
        // a witnessed internal loop; do not invent a new outer loop witness.
        const nested = component.traces && component.traces[input];
        const witness = { component: component.id, input, eventIndex };
        if (nested) witness.nested = nested;
        return finish(start, nested ? nested.outcome : 'missing', null, events, freeze(witness));
      }
      const output = component.table[input];
      events.push(routeEvent(component, input, output, events.length, side));
      const exits = side === 'left' ? f.source.minus : g.target.plus;
      if (exits.includes(output)) return finish(start, 'exit', output, events, null);
      input = output;
      side = side === 'left' ? 'right' : 'left';
    }
  }

  function evaluate(component, start) {
    if (![...component.source.plus, ...component.target.minus].includes(start)) {
      throw new TypeError('Input is outside this component\'s type');
    }
    if (component.traces) return component.traces[start];
    const output = own(component.table, start) ? component.table[start] : null;
    return finish(start, output === null ? 'missing' : 'exit', output,
      [routeEvent(component, start, output, 0, 'single')],
      output === null ? freeze({ component: component.id, input: start, eventIndex: 0 }) : null);
  }

  function compose(f, g) {
    assertComposable(f, g);
    const table = Object.create(null);
    const traces = Object.create(null);
    for (const input of exteriorInputs(f, g)) {
      const trace = traceInteraction(f, g, input);
      traces[input] = trace;
      if (trace.outcome === 'exit') table[input] = trace.exit;
    }
    const result = createComponent({
      id: `(${g.id} after ${f.id})`, name: `${g.name} after ${f.name}`,
      source: f.source, target: g.target, table
    });
    return freeze({ ...result, traces: freeze(traces) });
  }

  function identity(iface) {
    iface = validateInterface(iface);
    const table = Object.create(null);
    for (const input of [...iface.plus, ...iface.minus]) table[input] = input;
    return createComponent({ id: `id(${iface.id})`, name: `Identity on ${iface.id}`, source: iface, target: iface, table });
  }

  const interfaces = freeze({
    A: createInterface('A', ['clear', 'shore-only', 'storm'], ['survey']),
    B: createInterface('B', ['jetty', 'shore', 'hold'], ['plan-request', 'jetty-request']),
    C: createInterface('C', ['deliver-jetty', 'deliver-boxes', 'hold'], ['delivery-request'])
  });
  const messages = freeze({
    clear: 'A+:clear', shoreOnly: 'A+:shore-only', storm: 'A+:storm', survey: 'A-:survey',
    planRequest: 'B-:plan-request', jettyRequest: 'B-:jetty-request',
    jetty: 'B+:jetty', shore: 'B+:shore', holdB: 'B+:hold',
    deliveryRequest: 'C-:delivery-request', deliverJetty: 'C+:deliver-jetty',
    deliverBoxes: 'C+:deliver-boxes', holdC: 'C+:hold'
  });
  const labels = freeze({
    [messages.clear]: 'Jetty available',
    [messages.shoreOnly]: 'Jetty unavailable; shore path available',
    [messages.storm]: 'Both routes unavailable',
    [messages.survey]: 'Ask inspector for an access report',
    [messages.planRequest]: 'Request an unloading plan',
    [messages.jettyRequest]: 'Ask for a jetty exception',
    [messages.jetty]: 'Offer jetty unloading',
    [messages.shore]: 'Offer the shore path',
    [messages.holdB]: 'No unloading route offered',
    [messages.deliveryRequest]: 'Request a delivery plan',
    [messages.deliverJetty]: 'Plan jetty unloading',
    [messages.deliverBoxes]: 'Plan hand-carried boxes',
    [messages.holdC]: 'Hold delivery'
  });

  function createScenario(options = {}) {
    const landingPolicy = options.landingPolicy === undefined ? 'shore' : options.landingPolicy;
    const deliveryPolicy = options.deliveryPolicy === undefined ? 'boxes' : options.deliveryPolicy;
    const diagnostic = options.diagnostic === undefined ? 'none' : options.diagnostic;
    if (!['shore', 'jetty'].includes(landingPolicy)) throw new TypeError('Unknown landing policy');
    if (!['boxes', 'pallet'].includes(deliveryPolicy)) throw new TypeError('Unknown delivery policy');
    if (!['none', 'loop', 'missing'].includes(diagnostic)) throw new TypeError('Unknown diagnostic');
    const m = messages;
    const fTable = {
      [m.planRequest]: m.survey,
      [m.jettyRequest]: diagnostic === 'loop' ? m.shore : m.holdB,
      [m.clear]: m.jetty,
      [m.storm]: m.holdB
    };
    if (diagnostic !== 'missing') fTable[m.shoreOnly] = landingPolicy === 'shore' ? m.shore : m.holdB;
    const gTable = {
      [m.deliveryRequest]: m.planRequest,
      [m.jetty]: m.deliverJetty,
      [m.shore]: deliveryPolicy === 'boxes' ? m.deliverBoxes : m.jettyRequest,
      [m.holdB]: m.holdC
    };
    return freeze({
      f: createComponent({ id: 'f', name: 'Landing coordinator', source: interfaces.A, target: interfaces.B, table: fTable }),
      g: createComponent({ id: 'g', name: 'Delivery coordinator', source: interfaces.B, target: interfaces.C, table: gTable }),
      interfaces, options: freeze({ landingPolicy, deliveryPolicy, diagnostic }), messages, labels
    });
  }

  function counterfactuals(report = messages.shoreOnly, diagnostic = 'none') {
    if (!interfaces.A.plus.includes(report)) throw new TypeError('Counterfactuals require an explicitly supplied inspection report');
    return freeze(['shore', 'jetty'].flatMap(landingPolicy => ['boxes', 'pallet'].map(deliveryPolicy => {
      const { f, g } = createScenario({ landingPolicy, deliveryPolicy, diagnostic });
      const trace = traceInteraction(f, g, report);
      return freeze({ landingPolicy, deliveryPolicy, report, outcome: trace.outcome, exit: trace.exit, trace });
    })));
  }

  const model = freeze({ createInterface, createComponent, traceInteraction, compose, identity, evaluate,
    createScenario, counterfactuals, messages, labels, interfaces });
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
  root.GoIModel = model;
})(typeof window !== 'undefined' ? window : globalThis);
