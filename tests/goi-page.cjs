'use strict';
// Controller/DOM regression checks, not a substitute for rendered browser QA.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps/geometry-of-interaction');
const html = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
const modelSource = fs.readFileSync(path.join(appDir, 'model.js'), 'utf8');
const controllerSource = fs.readFileSync(path.join(appDir, 'app.js'), 'utf8');
const baseUrl = 'https://example.test/Project-apps/apps/geometry-of-interaction/';
let checks = 0;
const openWindows = [];
function check(name, fn) { fn(); checks += 1; console.log('✓ ' + name); }
function page(url = baseUrl) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', virtualConsole });
  openWindows.push(dom.window);
  const w = dom.window;
  w.matchMedia = () => ({ matches: true });
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.eval(modelSource);
  w.eval(controllerSource);
  const get = id => { const el = w.document.getElementById(id); assert.ok(el, `missing #${id}`); return el; };
  return {
    w, dom, get, errors,
    click(id) { const el = get(id); assert.equal(el.disabled, false, `#${id} must be enabled`); el.click(); assert.deepEqual(errors, []); },
    change(id, value) { const el = get(id); el.value = value; assert.equal(el.value, value); el.dispatchEvent(new w.Event('change', { bubbles: true })); assert.deepEqual(errors, []); },
    routes() { return [...get('event-list').querySelectorAll('.event-route')].map(el => el.textContent); },
    title() { return get('status-title').textContent; }
  };
}
function requestReport(p) {
  p.click('next-event');
  p.click('next-event');
  assert.match(p.title(), /Waiting for your landing report/);
  assert.equal(p.get('report-action').hidden, false);
  assert.equal(p.get('next-event').disabled, true);
  assert.equal(p.get('show-remaining').disabled, true);
  assert.equal(p.routes().some(route => route.startsWith('A+:')), false);
}
function supply(p) {
  requestReport(p);
  p.click('supply-report');
  assert.match(p.title(), /Your report is now at A/);
  assert.equal(p.get('report-action').hidden, true);
  assert.equal(p.w.document.activeElement.id, 'next-event');
}
function finish(p) { supply(p); p.click('show-remaining'); }
function exteriorOnly(p) {
  assert.equal(p.get('full-diagram').style.display, 'none');
  assert.equal(p.get('full-diagram').hasAttribute('hidden'), true);
  assert.equal(p.get('external-diagram').hasAttribute('hidden'), false);
  assert.notEqual(p.get('external-diagram').style.display, 'none');
  assert.equal(p.get('policy-anatomy').hidden, true);
  assert.equal(p.get('view-external').getAttribute('aria-pressed'), 'true');
  assert.equal(p.get('show-internal-events').checked, false);
  assert.deepEqual([...p.get('external-diagram').querySelectorAll('[data-port]')].map(el => el.dataset.port).sort(), ['A+', 'A-', 'C+', 'C-']);
  for (const id of ['external-diagram', 'mobile-diagram', 'event-list', 'active-exchange', 'status-detail']) {
    assert.doesNotMatch(p.get(id).textContent, /B[+−⁺⁻-]|Landing coordinator|Delivery coordinator|Ask for a jetty exception|Offer the shore path/, `#${id} leaks an internal message`);
  }
  assert.ok(p.routes().every(route => !route.includes('B')));
}

try {
  check('a request stops outside the model; no control supplies an inspector report implicitly', () => {
    const p = page();
    assert.match(p.title(), /Ask for a delivery plan/);
    assert.deepEqual(p.routes(), ['C-:delivery-request']);
    assert.equal(p.get('report-action').hidden, true);
    assert.equal(p.get('step-back').disabled, true);
    assert.equal(p.get('show-remaining').disabled, true);
    p.get('supply-report').click(); // Direct event must also respect the boundary.
    p.get('show-remaining').click();
    assert.deepEqual(p.routes(), ['C-:delivery-request']);
    p.click('next-event');
    assert.equal(p.get('report-action').hidden, true);
    assert.match(p.routes().at(-1), /C-:delivery-request → B-:plan-request/);
    p.click('next-event');
    assert.match(p.title(), /Waiting for your landing report/);
    assert.equal(p.get('next-event').disabled, true);
    assert.equal(p.get('show-remaining').disabled, true);
    assert.equal(p.get('report-action').hidden, false);
    assert.match(p.get('event-list').textContent, /No inspection report has been supplied/);
    assert.ok(p.routes().every(route => !route.startsWith('A+:')));
    p.get('next-event').click();
    assert.ok(p.routes().every(route => !route.startsWith('A+:')));
  });

  check('an explicitly supplied shore report yields a boxes plan, with reversible episode steps', () => {
    const p = page();
    p.change('delivery-policy', 'boxes');
    supply(p);
    assert.equal(p.routes().at(-1), 'A+:shore-only');
    p.click('step-back');
    assert.match(p.title(), /Waiting for your landing report/);
    assert.ok(p.routes().every(route => !route.startsWith('A+:')));
    p.click('supply-report');
    p.click('next-event');
    assert.equal(p.routes().at(-1), 'A+:shore-only → B+:shore');
    p.click('next-event');
    assert.match(p.title(), /plan for hand-carried boxes/i);
    assert.equal(p.routes().at(-1), 'B+:shore → C+:deliver-boxes');
    assert.equal(p.get('next-event').disabled, true);
    assert.match(p.get('status-detail').textContent, /has not moved any books/);
    p.click('step-back');
    assert.equal(p.get('next-event').disabled, false);
    assert.equal(p.routes().at(-1), 'A+:shore-only → B+:shore');
    p.click('next-event');
    assert.match(p.title(), /hand-carried boxes/);
    p.click('reset');
    assert.deepEqual(p.routes(), ['C-:delivery-request']);
    assert.equal(p.get('delivery-policy').value, 'boxes');
    assert.equal(p.get('landing-report').value, 'shoreOnly');
  });

  check('the default pallet reaches hold; Try splitting into boxes starts a successful fresh conversation', () => {
    const p = page();
    assert.equal(p.get('delivery-policy').value, 'pallet');
    supply(p);
    const expected = ['A+:shore-only → B+:shore', 'B+:shore → B-:jetty-request', 'B-:jetty-request → B+:hold', 'B+:hold → C+:hold'];
    for (const route of expected) { p.click('next-event'); assert.equal(p.routes().at(-1), route); }
    assert.match(p.title(), /hold delivery/);
    assert.match(p.get('status-detail').textContent, /distinct from an undefined result/);
    assert.equal(p.get('witness').hidden, true);
    p.click('try-boxes');
    assert.equal(p.get('delivery-policy').value, 'boxes');
    assert.deepEqual(p.routes(), ['C-:delivery-request']);
    assert.equal(p.w.document.activeElement.id, 'delivery-policy');
    assert.equal(new URL(p.w.location.href).searchParams.get('delivery'), 'boxes');
    assert.equal(p.get('report-action').hidden, true);
    finish(p);
    assert.match(p.title(), /plan for hand-carried boxes/i);
    assert.equal(p.routes().at(-1), 'B+:shore → C+:deliver-boxes');
  });

  check('missing and looping diagnostics show distinct causes with the actual finite witnesses', () => {
    const missing = page();
    missing.change('diagnostic-mode', 'missing');
    finish(missing);
    assert.match(missing.title(), /no authored response/);
    assert.equal(missing.routes().at(-1), 'A+:shore-only → undefined');
    assert.match(missing.get('witness').textContent, /Missing rule witness: \(f, A\+:shore-only\), response event 1/);
    assert.equal(missing.get('witness').hidden, false);
    assert.equal(missing.get('diagnostics').open, true);
    assert.match(missing.get('composition-table').rows[1].cells[1].textContent, /Undefined.*Missing authored rule/);
    const loop = page();
    loop.change('delivery-policy', 'pallet');
    loop.change('diagnostic-mode', 'loop');
    finish(loop);
    assert.match(loop.title(), /same internal state repeats/);
    assert.deepEqual(loop.routes().slice(-3), ['A+:shore-only → B+:shore', 'B+:shore → B-:jetty-request', 'B-:jetty-request → B+:shore']);
    assert.match(loop.get('witness').textContent, /\(right, g, B\+:shore\).*First seen at event 2; encountered again at event 4\. Cycle length: 2 events/);
    assert.match(loop.get('composition-table').rows[1].cells[1].textContent, /Undefined.*Exact-state cycle/);
    assert.equal(loop.get('next-event').disabled, true);
    assert.equal(loop.routes().some(route => route.endsWith('C+:hold')), false);
  });

  check('external view hides B from desktop/mobile diagrams and history at every stage', () => {
    const p = page();
    p.change('delivery-policy', 'pallet');
    p.click('view-external');
    exteriorOnly(p);
    p.click('next-event'); exteriorOnly(p);
    assert.deepEqual(p.routes(), ['C-:delivery-request']);
    p.click('next-event'); exteriorOnly(p);
    assert.deepEqual(p.routes(), ['C-:delivery-request', 'A-:survey']);
    p.click('supply-report'); exteriorOnly(p);
    p.click('next-event'); exteriorOnly(p);
    p.click('show-remaining'); exteriorOnly(p);
    assert.deepEqual(p.routes(), ['C-:delivery-request', 'A-:survey', 'A+:shore-only', 'C+:hold']);
    p.get('show-internal-events').checked = true;
    p.get('show-internal-events').dispatchEvent(new p.w.Event('change', { bubbles: true }));
    assert.ok(p.routes().some(route => route.includes('B-:jetty-request')));
    p.click('view-full');
    assert.equal(p.get('full-diagram').hasAttribute('hidden'), false);
    assert.equal(p.get('external-diagram').hasAttribute('hidden'), true);
    p.click('view-external'); exteriorOnly(p);
  });

  check('counterfactuals and exterior table reflect current reports without supplying them', () => {
    const p = page();
    const results = () => [...p.get('counterfactual-body').querySelectorAll('td strong')].map(el => el.textContent);
    assert.deepEqual(results(), ['Plan hand-carried boxes', 'Hold delivery', 'Hold delivery', 'Hold delivery']);
    assert.equal(p.get('counterfactual-body').querySelectorAll('td.selected').length, 1);
    p.change('landing-report', 'clear');
    assert.deepEqual(results(), Array(4).fill('Plan jetty unloading'));
    assert.deepEqual(p.routes(), ['C-:delivery-request']);
    p.change('landing-report', 'storm');
    assert.deepEqual(results(), Array(4).fill('Hold delivery'));
    p.change('landing-report', 'shoreOnly');
    p.change('diagnostic-mode', 'loop');
    assert.deepEqual(results(), ['Plan hand-carried boxes', 'Undefined · cycle', 'Hold delivery', 'Hold delivery']);
    p.change('diagnostic-mode', 'missing');
    assert.deepEqual(results(), Array(4).fill('Undefined · missing rule'));
    assert.equal(p.get('composition-table').rows.length, 4);
    for (const code of p.get('composition-table').querySelectorAll('code')) assert.doesNotMatch(code.textContent, /^B/);
    assert.deepEqual(p.routes(), ['C-:delivery-request']);
  });

  check('URL choices survive reload; progression resets; invalid choices fall back safely', () => {
    const p = page();
    p.change('landing-policy', 'jetty');
    p.change('delivery-policy', 'pallet');
    p.change('landing-report', 'storm');
    p.change('diagnostic-mode', 'missing');
    p.click('view-external');
    finish(p);
    const saved = new URL(p.w.location.href);
    assert.equal(saved.searchParams.get('landing'), 'jetty');
    assert.equal(saved.searchParams.get('delivery'), 'pallet');
    assert.equal(saved.searchParams.get('report'), 'storm');
    assert.equal(saved.searchParams.get('diagnostic'), 'missing');
    assert.equal(saved.searchParams.get('view'), 'external');
    const reloaded = page(saved.href);
    for (const id of ['landing-policy', 'delivery-policy', 'landing-report', 'diagnostic-mode']) assert.equal(reloaded.get(id).value, p.get(id).value);
    exteriorOnly(reloaded);
    assert.match(reloaded.title(), /Ask for a delivery plan/);
    assert.deepEqual(reloaded.routes(), ['C-:delivery-request']);
    assert.equal(reloaded.get('diagnostics').open, true);
    p.click('reset');
    assert.equal(p.get('landing-policy').value, 'jetty');
    assert.equal(p.get('delivery-policy').value, 'pallet');
    assert.deepEqual(p.routes(), ['C-:delivery-request']);
    const invalid = page(baseUrl + '?landing=bad&delivery=bad&report=bad&diagnostic=bad&view=bad');
    assert.equal(invalid.get('landing-policy').value, 'shore');
    assert.equal(invalid.get('delivery-policy').value, 'pallet');
    assert.equal(invalid.get('landing-report').value, 'shoreOnly');
    assert.equal(invalid.get('diagnostic-mode').value, 'none');
    assert.equal(invalid.get('view-full').getAttribute('aria-pressed'), 'true');
    const hash = page(baseUrl + '#state=landing=jetty&delivery=pallet&report=clear&view=external');
    assert.equal(hash.get('landing-policy').value, 'jetty');
    assert.equal(hash.get('landing-report').value, 'clear');
    exteriorOnly(hash);
  });

  check('all reports and policy pairs produce their separately specified normal outcomes', () => {
    for (const landing of ['shore', 'jetty']) for (const delivery of ['boxes', 'pallet']) for (const report of ['clear', 'shoreOnly', 'storm']) {
      const p = page(`${baseUrl}?landing=${landing}&delivery=${delivery}&report=${report}`);
      finish(p);
      const expected = report === 'clear' ? /plan for jetty unloading/i : report === 'shoreOnly' && landing === 'shore' && delivery === 'boxes' ? /plan for hand-carried boxes/i : /hold delivery/i;
      assert.match(p.title(), expected);
      assert.equal(p.get('witness').hidden, true);
    }
  });

  check('local assets, navigation targets, script order and accessibility hooks exist', () => {
    const document = new JSDOM(html).window.document;
    const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate HTML IDs');
    assert.deepEqual([...document.querySelectorAll('script[src]')].map(el => el.getAttribute('src')), ['model.js', 'app.js']);
    for (const el of document.querySelectorAll('[src], link[href], a[href]')) {
      const reference = el.getAttribute('src') || el.getAttribute('href');
      if (/^(https?:|data:|mailto:)/.test(reference)) continue;
      assert.ok(!reference.startsWith('/'), 'assets must work under GitHub Pages subpaths');
      const [relative, fragment] = reference.split('#');
      const local = relative ? path.resolve(appDir, relative.split('?')[0]) : path.join(appDir, 'index.html');
      assert.ok(fs.existsSync(local), `missing local reference ${reference}`);
      if (fragment && path.extname(local) === '.html') {
        const target = local === path.join(appDir, 'index.html') ? document : new JSDOM(fs.readFileSync(local, 'utf8')).window.document;
        assert.ok(target.getElementById(fragment), `missing navigation target ${reference}`);
      }
    }
    assert.equal(document.querySelector('#live-status').getAttribute('aria-live'), 'polite');
    assert.ok(document.querySelector('a[href="../../index.html"]'));
    for (const select of document.querySelectorAll('select')) assert.ok(document.querySelector(`label[for="${select.id}"]`));
    for (const image of document.querySelectorAll('img')) assert.ok(image.hasAttribute('alt'));
    const illustration = fs.readFileSync(path.join(appDir, 'assets/island-reading-room.jpg'));
    assert.equal(illustration.subarray(0, 2).toString('hex'), 'ffd8');
  });

  check('retained matching lab parses and all twelve ports support Enter and Space', () => {
    const labHtml = fs.readFileSync(path.join(appDir, 'wiring-lab.html'), 'utf8');
    const lab = new JSDOM(labHtml, { url: baseUrl + 'wiring-lab.html', runScripts: 'outside-only' });
    openWindows.push(lab.window);
    const w = lab.window;
    // jsdom supplies no SVG path geometry. Stub only animation measurements;
    // readouts and route computation run unchanged and are the assertion target.
    w.SVGElement.prototype.getTotalLength = () => 100;
    w.SVGElement.prototype.getPointAtLength = () => ({ x: 0, y: 0 });
    w.requestAnimationFrame = () => 1;
    w.cancelAnimationFrame = () => {};
    for (const script of w.document.querySelectorAll('script:not([src])')) {
      new vm.Script(script.textContent);
      w.eval(script.textContent);
    }
    assert.match(w.document.getElementById('metaTitle').textContent, /g ∘ f/);
    assert.equal(w.document.getElementById('selF').options.length, 5);
    assert.equal(w.document.getElementById('selG').options.length, 5);
    const ports = [...w.document.querySelectorAll('#layerPorts [data-port]')];
    assert.equal(ports.length, 12);
    for (const port of ports) {
      assert.equal(port.getAttribute('role'), 'button');
      assert.equal(port.getAttribute('tabindex'), '0');
      assert.match(port.getAttribute('aria-label'), /Trace from/);
      for (const key of ['Enter', ' ']) {
        const event = new w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        port.dispatchEvent(event);
        assert.equal(event.defaultPrevented, true);
        assert.ok(w.document.getElementById('readout').textContent.startsWith(`Token launched from ${port.dataset.port}.`));
      }
    }
    assert.ok(w.document.querySelector('a[href="index.html"]'));
  });

  console.log(`GoI page passed: ${checks} controller/DOM checks, including 12 normal policy/report journeys and 24 keyboard-port launches. Rendered layout and real-browser behaviour require separate verification.`);
} finally {
  for (const window of openWindows) window.close();
}
