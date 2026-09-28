/* A deliberately stepped UI: external inspection replies are supplied by the user. */
(function () {
  'use strict';
  const M = window.GoIModel;
  const $ = id => document.getElementById(id);
  const safe = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const short = message => message ? message.slice(message.indexOf(':') + 1).replaceAll('-', ' ') : '';
  const port = message => message ? message.slice(0, message.indexOf(':')) : '';
  const valid = (value, options, fallback) => options.includes(value) ? value : fallback;
  const params = new URLSearchParams(location.search || (location.hash.startsWith('#state=') ? location.hash.slice(7) : ''));
  const state = {
    landingPolicy: valid(params.get('landing'), ['shore', 'jetty'], 'shore'),
    deliveryPolicy: valid(params.get('delivery'), ['boxes', 'pallet'], 'pallet'),
    report: valid(params.get('report'), ['clear', 'shoreOnly', 'storm'], 'shoreOnly'),
    diagnostic: valid(params.get('diagnostic'), ['none', 'loop', 'missing'], 'none'),
    view: valid(params.get('view'), ['full', 'external'], 'full'),
    revealInternal: params.get('internal') === 'show', requestCount: 0, responseCount: 0, supplied: false
  };
  let scenario, request, response, composite;
  function buildModel() {
    scenario = M.createScenario(state);
    request = M.traceInteraction(scenario.f, scenario.g, M.messages.deliveryRequest);
    response = M.traceInteraction(scenario.f, scenario.g, M.messages[state.report]);
    composite = M.compose(scenario.f, scenario.g);
  }
  const label = message => scenario.labels[message] || message;
  const finishedRequest = () => state.requestCount === request.events.length;
  const finishedResponse = () => state.supplied && state.responseCount === response.events.length;
  const activeTrace = () => state.supplied ? response : request;
  const activeCount = () => state.supplied ? state.responseCount : state.requestCount;
  function saveChoices() {
    const url = new URL(location.href);
    url.searchParams.set('landing', state.landingPolicy);
    url.searchParams.set('delivery', state.deliveryPolicy);
    url.searchParams.set('report', state.report);
    url.searchParams.set('diagnostic', state.diagnostic);
    url.searchParams.set('view', state.view);
    if (state.revealInternal) url.searchParams.set('internal', 'show'); else url.searchParams.delete('internal');
    if (url.hash.startsWith('#state=')) url.hash = '';
    try { history.replaceState(null, '', url); } catch (_) { /* Direct-file browsers may restrict history. */ }
  }
  function announce(text) { $('live-status').textContent = text; }
  function resetConversation(message) {
    state.requestCount = 0; state.responseCount = 0; state.supplied = false;
    buildModel(); render(); saveChoices();
    announce(message || 'Conversation reset. The delivery request is ready.');
  }
  function changeChoice(key, value) {
    state[key] = value;
    resetConversation('Choice changed. A fresh conversation starts with the delivery request.');
  }
  function currentEvent() {
    const count = activeCount();
    return count ? activeTrace().events[count - 1] : null;
  }
  function status() {
    if (!state.supplied) {
      if (finishedRequest()) return {
        stage: 'Episode 1 complete / Waiting outside the model', title: 'Waiting for your landing report.',
        detail: 'The survey question has exited at A⁻. Select a report above, then supply it explicitly to begin the second episode.'
      };
      if (!state.requestCount) return {
        stage: 'Episode 1 / An external request', title: 'Ask for a delivery plan.',
        detail: 'The project’s request is at C⁻. Take the first step to let the delivery coordinator respond.'
      };
      return {
        stage: 'Episode 1 / A question travels left', title: state.view === 'external' ? 'The composed policy is working.' : 'Delivery asks landing for a plan.',
        detail: state.view === 'external' ? 'The request has entered. There is no exterior result yet; take the next exchange.' : 'The request is now at B⁻. The landing coordinator needs an inspection result before offering a route.'
      };
    }
    if (!state.responseCount) return {
      stage: 'Episode 2 / A supplied external report', title: 'Your report is now at A⁺.',
      detail: `“${label(response.start)}.” The next exchange applies the landing coordinator’s rule.`
    };
    if (!finishedResponse()) return {
      stage: 'Episode 2 / The policies interact', title: state.view === 'external' ? 'No exterior result yet.' : 'A reply becomes the next input.',
      detail: state.view === 'external' ? 'The supplied report is being processed inside the composed policy. Continue to see whether an exterior result emerges.' : 'Follow the highlighted message to the next coordinator. Its authored rule determines the next response.'
    };
    if (response.outcome === 'missing') return {
      stage: 'Episode 2 / Undefined: missing rule', title: 'This input has no authored response.',
      detail: state.view === 'external' ? 'The supplied report produces no exterior output. The partial function has no entry for this input; the diagnostic retains the missing-rule cause.' : `${response.witness.component} has no rule for ${response.witness.input}. The interaction stops without an exterior result.`
    };
    if (response.outcome === 'loop') return {
      stage: 'Episode 2 / Undefined: internal cycle', title: 'The same internal state repeats.',
      detail: state.view === 'external' ? 'The supplied report produces no exterior output. The exact-state diagnostic detects an internal cycle, so the partial function has no entry for this input.' : 'The fixed pallet asks again for a jetty exception; landing offers the same shore path again. This deterministic conversation cannot reach an exterior result.'
    };
    if (response.exit === M.messages.holdC) return {
      stage: 'Episode 2 complete / Exterior result', title: 'The proposed result is: hold delivery.',
      detail: 'The current pair of policies yields no usable unloading offer. “Hold” is an explicit C⁺ output, distinct from an undefined result.'
    };
    return {
      stage: 'Episode 2 complete / Exterior result', title: response.exit === M.messages.deliverBoxes ? 'A plan for hand-carried boxes.' : 'A plan for jetty unloading.',
      detail: 'A proposed plan has exited at C⁺. The model has completed this exchange; it has not moved any books or certified a route.'
    };
  }
  function renderStatus() {
    const text = status();
    $('stage-label').textContent = text.stage;
    $('status-title').textContent = text.title;
    $('status-detail').textContent = text.detail;
    const event = currentEvent();
    let current = '';
    if (state.view === 'full' && event) current = `${event.component} · ${label(event.from)} → ${event.to ? label(event.to) : 'No rule defined'}`;
    if (state.view === 'external' && ((state.supplied && finishedResponse()) || (!state.supplied && finishedRequest()))) {
      current = `${label(activeTrace().start)} → ${activeTrace().exit ? label(activeTrace().exit) : 'Undefined exterior result'}`;
    }
    $('active-exchange').textContent = current;
    $('next-event').disabled = (!state.supplied && finishedRequest()) || finishedResponse();
    $('step-back').disabled = !state.supplied && state.requestCount === 0;
    $('show-remaining').disabled = !state.supplied || finishedResponse();
    $('report-action').hidden = state.supplied || !finishedRequest();
    $('report-prompt').textContent = `The survey question has reached the outside world. You will supply: “${label(M.messages[state.report])}.”`;
    const count = state.requestCount + (state.supplied ? 1 + state.responseCount : 0);
    const total = request.events.length + 1 + response.events.length;
    $('progress-dots').innerHTML = Array.from({ length: total }, (_, i) => `<span${i < count ? ' class="done"' : ''}></span>`).join('');
    const showWitness = finishedResponse() && response.outcome !== 'exit';
    $('witness').hidden = !showWitness;
    if (showWitness) {
      const w = response.witness;
      $('witness').textContent = response.outcome === 'loop'
        ? `Exact repeated state: (${w.state.side}, ${w.state.component}, ${w.state.input}). First seen at event ${w.firstEventIndex + 1}; encountered again at event ${w.repeatEventIndex + 1}. Cycle length: ${w.cycle.length} events. No exterior output.`
        : `Missing rule witness: (${w.component}, ${w.input}), response event ${w.eventIndex + 1}. No exterior output.`;
      $('diagnostics').open = true;
    }
  }
  function renderDiagram() {
    const full = state.view === 'full';
    $('full-diagram').toggleAttribute('hidden', !full);
    $('external-diagram').toggleAttribute('hidden', full);
    // SVG elements do not uniformly implement the HTML hidden property.
    $('full-diagram').style.display = full ? '' : 'none';
    $('external-diagram').style.display = full ? 'none' : '';
    $('view-full').setAttribute('aria-pressed', String(full));
    $('view-external').setAttribute('aria-pressed', String(!full));
    $('type-formula').innerHTML = full ? '<b>f : A → B &nbsp; g : B → C</b><br>g ∘ f : A⁺ ⊔ C⁻ ⇀ A⁻ ⊔ C⁺' : '<b>g ∘ f : A → C</b><br>A⁺ ⊔ C⁻ ⇀ A⁻ ⊔ C⁺';
    $('view-explanation').textContent = full ? 'Each box applies one rule. Internal replies become the other box’s next input.' : 'Only A and C are visible. Hiding preserves exterior results and partiality.';
    $('f-policy-label').textContent = state.landingPolicy === 'shore' ? 'Shore path allowed' : 'Jetty required';
    $('g-policy-label').textContent = state.deliveryPolicy === 'boxes' ? 'Boxes allowed' : 'Fixed pallet';
    $('policy-anatomy').hidden = !full;
    $('reading-key').innerHTML = full
      ? '<strong>Reading the signs.</strong> A, B and C are interfaces, each with a + and a − side. In this example, + carries reports, offers and plans to the right; − carries questions to the left. The signs describe interface roles, not success and failure. A component can send a reply in either direction.'
      : '<strong>Reading the exterior.</strong> A⁺ receives the inspection report; A⁻ returns a survey question. C⁻ receives a project request; C⁺ returns a proposed plan. The middle interface is hidden, and no internal message is part of the exterior function.';
    const event = currentEvent();
    const trace = activeTrace();
    const completed = activeCount() === trace.events.length;
    const visibleMessages = full ? (event ? [event.from, event.to].filter(Boolean) : [trace.start]) : [trace.start, completed ? trace.exit : null].filter(Boolean);
    document.querySelectorAll('.diagram-stage [data-port]').forEach(el => {
      const on = visibleMessages.some(message => port(message) === el.dataset.port);
      el.classList.toggle('active', on);
      const suffix = el.ownerSVGElement.id === 'external-diagram' ? '-exterior' : '';
      el.setAttribute('marker-end', `url(#arrow-${on ? 'active' : 'muted'}${suffix})`);
    });
    $('node-f').classList.toggle('active', !!event && event.component === 'f');
    $('node-g').classList.toggle('active', !!event && event.component === 'g');
    ['Aplus', 'Aminus', 'Bplus', 'Bminus', 'Cplus', 'Cminus'].forEach(key => {
      const id = key.replace('plus', '+').replace('minus', '-');
      const message = visibleMessages.find(value => port(value) === id);
      $(`message-${key}`).textContent = message ? short(message) : '';
      if ($(`exterior-${key}`)) $(`exterior-${key}`).textContent = message ? short(message) : '';
    });
    const node = (id, title, subtitle) => `<div class="mobile-node${event && event.component === id ? ' active' : ''}"><strong>${safe(title)}</strong><p>${safe(subtitle)}</p></div>`;
    $('mobile-diagram').innerHTML = full
      ? `<div class="mobile-ports"><span><strong>A⁺ →</strong> Access report</span><span><strong>← A⁻</strong> Survey question</span></div>${node('f', 'f · Landing coordinator', state.landingPolicy === 'shore' ? 'Shore path allowed' : 'Jetty required')}<div class="mobile-wire"><strong>B⁺ ↓</strong> Offers to delivery &nbsp; / &nbsp; <strong>B⁻ ↑</strong> Questions to landing</div>${node('g', 'g · Delivery coordinator', state.deliveryPolicy === 'boxes' ? 'Hand-carried boxes allowed' : 'Fixed pallet only')}<div class="mobile-ports"><span><strong>C⁻ ↑</strong> Project request</span><span><strong>↓ C⁺</strong> Proposed plan</span></div>`
      : '<div class="mobile-ports"><span><strong>A⁺ →</strong> Access report</span><span><strong>← A⁻</strong> Survey question</span></div><div class="mobile-node"><strong>g ∘ f · Composed delivery policy</strong><p>Only the exterior input and result</p></div><div class="mobile-ports"><span><strong>C⁻ ↑</strong> Project request</span><span><strong>↓ C⁺</strong> Proposed plan</span></div>';
  }
  function renderTimeline() {
    const internal = state.view === 'full' || state.revealInternal;
    $('internal-events-label').hidden = state.view === 'full';
    $('show-internal-events').checked = state.revealInternal;
    $('timeline-title').textContent = internal ? 'The conversation so far' : 'The exterior so far';
    const events = [];
    function externalInput(message, episode) {
      events.push({ role: `Episode ${episode} · External input`, text: label(message), route: message });
    }
    function episode(trace, count, num) {
      externalInput(trace.start, num);
      if (internal) {
        trace.events.slice(0, count).forEach(event => events.push({
          role: `${event.component} · ${event.componentName}`,
          text: `${label(event.from)} → ${event.to ? label(event.to) : 'No authored response'}`,
          route: `${event.from} → ${event.to || 'undefined'}`, warning: event.kind === 'missing'
        }));
      } else if (count === trace.events.length && trace.exit) {
        events.push({ role: `Episode ${num} · External output`, text: label(trace.exit), route: trace.exit });
      }
      if (count === trace.events.length && trace.outcome === 'loop') events.push({ role: 'No exterior result', text: internal ? 'Exact internal state repeated. Further exchanges would repeat the same cycle.' : 'Undefined: an internal cycle prevents an exterior result.', warning: true });
      if (!internal && count === trace.events.length && trace.outcome === 'missing') events.push({ role: 'No exterior result', text: 'Undefined: a missing rule prevents an exterior result.', warning: true });
    }
    episode(request, state.requestCount, 1);
    if (finishedRequest() && !state.supplied) events.push({ role: 'Waiting for you', text: 'No inspection report has been supplied.' });
    if (state.supplied) episode(response, state.responseCount, 2);
    $('event-list').innerHTML = events.map((event, index) => `<li${index === events.length - 1 ? ' class="current"' : ''}><span class="event-role">${safe(event.role)}</span><span${event.warning ? ' class="event-warning"' : ''}>${safe(event.text)}</span>${event.route ? `<span class="event-route">${safe(event.route)}</span>` : ''}</li>`).join('');
  }
  function renderPolicy(component, target) {
    const inputs = [...component.source.plus, ...component.target.minus];
    $(target).innerHTML = inputs.map(from => {
      const to = component.table[from];
      return `<tr><td>${safe(label(from))}<code>${safe(from)}</code></td><td${!to ? ' class="undefined"' : ''}>${to ? safe(label(to)) : 'Undefined — no rule'}${to ? `<code>${safe(to)}</code>` : ''}</td></tr>`;
    }).join('');
  }
  function renderTables() {
    renderPolicy(scenario.f, 'f-policy-table'); renderPolicy(scenario.g, 'g-policy-table');
    $('composition-table').innerHTML = [...scenario.interfaces.A.plus, ...scenario.interfaces.C.minus].map(input => {
      const trace = composite.traces[input];
      return `<tr><td>${safe(label(input))}<code>${safe(input)}</code></td><td${trace.outcome !== 'exit' ? ' class="undefined"' : ''}>${trace.exit ? safe(label(trace.exit)) : 'Undefined'}${trace.exit ? `<code>${safe(trace.exit)}</code>` : `<span class="diagnostic-note">${trace.outcome === 'loop' ? 'Exact-state cycle' : 'Missing authored rule'}</span>`}</td></tr>`;
    }).join('');
    const rows = M.counterfactuals(M.messages[state.report], state.diagnostic);
    $('counterfactual-caption').textContent = `Hypothetical input: ${label(M.messages[state.report])}.`;
    $('counterfactual-note').textContent = state.diagnostic === 'none' ? 'These are hypothetical model results, not a supplied inspection or a completed delivery.' : `The selected ${state.diagnostic === 'loop' ? 'cycle' : 'missing-rule'} diagnostic also applies to this comparison. These are hypothetical model results.`;
    $('counterfactual-body').innerHTML = ['shore', 'jetty'].map(landing => `<tr><th scope="row">${landing === 'shore' ? 'Allow shore path' : 'Require jetty'}</th>${['boxes', 'pallet'].map(delivery => {
      const result = rows.find(row => row.landingPolicy === landing && row.deliveryPolicy === delivery);
      const chosen = landing === state.landingPolicy && delivery === state.deliveryPolicy;
      const title = result.exit ? label(result.exit) : result.outcome === 'loop' ? 'Undefined · cycle' : 'Undefined · missing rule';
      const note = result.outcome === 'loop' ? 'The same internal state repeats.' : result.outcome === 'missing' ? 'No rule accepts this report.' : result.exit === M.messages.holdC ? 'An explicit hold is returned.' : 'A proposed delivery plan is returned.';
      return `<td${chosen ? ' class="selected"' : ''}><strong>${safe(title)}</strong><small>${safe(note)}</small>${chosen ? '<span class="chosen-mark">Current policies</span>' : ''}</td>`;
    }).join('')}</tr>`).join('');
  }
  function render() {
    $('landing-policy').value = state.landingPolicy;
    $('delivery-policy').value = state.deliveryPolicy;
    $('landing-report').value = state.report;
    $('diagnostic-mode').value = state.diagnostic;
    renderDiagram(); renderStatus(); renderTimeline(); renderTables();
  }
  $('landing-policy').addEventListener('change', event => changeChoice('landingPolicy', event.target.value));
  $('delivery-policy').addEventListener('change', event => changeChoice('deliveryPolicy', event.target.value));
  $('landing-report').addEventListener('change', event => changeChoice('report', event.target.value));
  $('diagnostic-mode').addEventListener('change', event => changeChoice('diagnostic', event.target.value));
  $('next-event').addEventListener('click', () => {
    if (state.supplied) { if (!finishedResponse()) state.responseCount++; }
    else if (!finishedRequest()) state.requestCount++;
    render();
    const event = currentEvent();
    const detail = state.view === 'full' && event ? ` ${event.componentName}: ${label(event.from)}; ${event.to ? label(event.to) : 'no authored response'}.` : ` Exchange ${activeCount()} completed.`;
    announce(`${status().title}${detail}`);
  });
  $('supply-report').addEventListener('click', () => {
    if (!finishedRequest() || state.supplied) return;
    state.supplied = true; state.responseCount = 0; render();
    announce(`External report supplied: ${label(response.start)}. Take the next exchange.`);
    $('next-event').focus();
  });
  $('show-remaining').addEventListener('click', () => {
    if (!state.supplied) return;
    state.responseCount = response.events.length; render(); announce(status().title);
  });
  $('step-back').addEventListener('click', () => {
    if (state.supplied && state.responseCount > 0) state.responseCount--;
    else if (state.supplied) state.supplied = false;
    else if (state.requestCount > 0) state.requestCount--;
    render(); announce(`Stepped back. ${status().title}`);
  });
  $('reset').addEventListener('click', () => resetConversation());
  $('try-boxes').addEventListener('click', () => {
    changeChoice('deliveryPolicy', 'boxes');
    $('experiment').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    $('delivery-policy').focus({ preventScroll: true });
    announce('The delivery policy now allows hand-carried boxes. The conversation has reset.');
  });
  ['full', 'external'].forEach(view => $(`view-${view}`).addEventListener('click', () => {
    state.view = view; if (view === 'external') state.revealInternal = false;
    render(); saveChoices(); announce(view === 'full' ? 'Internal exchange is visible.' : 'Only the exterior A and C interfaces are shown.');
  }));
  $('show-internal-events').addEventListener('change', event => {
    state.revealInternal = event.target.checked; renderTimeline(); saveChoices();
  });
  buildModel(); render();
  if (state.diagnostic !== 'none') $('diagnostics').open = true;
})();
