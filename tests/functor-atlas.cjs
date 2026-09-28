const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '../apps/functor-atlas/index.html'), 'utf8');
function openAtlas() {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test/apps/functor-atlas/index.html' });
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  dom.window.matchMedia = () => ({ matches: false });
  dom.window.eval(html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
  return dom;
}
function button(document, label) {
  const found = [...document.querySelectorAll('button')].find(b => b.textContent === label);
  assert.ok(found, `Button exists: ${label}`);
  return found;
}

test('every advertised composition has matching declared types, including the opposite risk category', () => {
  const dom = openAtlas();
  try {
    const { document } = dom.window;
    const types = new Map([...document.querySelectorAll('#funBar button')].map(b => {
      const [id, source, target] = b.textContent.match(/^(.*): (.*) → (.*)$/).slice(1);
      return [id, { source, target }];
    }));
    button(document, 'Which Translations Compose?').click();
    const rows = [...document.querySelectorAll('#panel tbody tr')];
    assert.ok(rows.length >= 5);
    for (const row of rows) {
      const [expression, declaredType] = [...row.cells].map(c => c.textContent);
      const ids = expression.split(' ∘ ').reverse();
      const first = types.get(ids[0]);
      assert.ok(first, `Unknown translation in ${expression}`);
      let target = first.target;
      for (const id of ids.slice(1)) {
        const next = types.get(id);
        assert.ok(next, `Unknown translation ${id}`);
        assert.equal(target, next.source, `Type mismatch in ${expression}`);
        target = next.target;
      }
      assert.equal(declaredType, `${first.source} → ${target}`, expression);
    }
    assert.notEqual(types.get('Res').target, types.get('L').source);
    assert.notEqual(types.get('Assign').target, types.get('Qual').source);
    assert.match(document.querySelector('#panel').textContent, /does not type-check/);
  } finally { dom.window.close(); }
});

test('task drafts render literal user text, label their heuristic status, and clear stale output on empty input', () => {
  const dom = openAtlas();
  try {
    const { document } = dom.window;
    document.querySelector('#cat_D').click();
    assert.match(document.querySelector('#panel').textContent, /not a Kan extension/);
    const input = document.querySelector('#delivInput');
    input.value = '  <img src=x onerror="alert(1)"> & Authentication  ';
    button(document, 'Draft Task Labels').click();
    const items = [...document.querySelectorAll('#draftOut li')];
    assert.equal(items.length, 3);
    assert.equal(items[0].textContent, 'Analyse <img src=x onerror="alert(1)"> & Authentication');
    assert.equal(document.querySelectorAll('#draftOut img, #draftOut script').length, 0);
    input.value = '  ';
    button(document, 'Draft Task Labels').click();
    assert.equal(document.querySelector('#draftOut').textContent, '');
    assert.equal(document.activeElement, input);
  } finally { dom.window.close(); }
});

test('keyboard selection, example navigation, and search reset work without hidden views', () => {
  const dom = openAtlas();
  try {
    const { document, KeyboardEvent, Event } = dom.window;
    const search = document.querySelector('#searchInput');
    search.value = 'deliverables';
    search.dispatchEvent(new Event('input'));
    assert.equal(document.querySelector('#cat_T').style.display, 'none');
    const deliverables = document.querySelector('#cat_D');
    assert.equal(deliverables.tabIndex, 0);
    deliverables.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(document.activeElement, document.querySelector('#panel'));
    assert.ok(document.querySelector('#draftBtn'));
    button(document, 'Reset View').click();
    assert.equal(search.value, '');
    assert.ok([...document.querySelectorAll('.card')].every(c => c.style.display !== 'none'));
    button(document, 'Illustrative snapshot: Off').click();
    for (const translation of document.querySelectorAll('#funBar button')) {
      translation.click();
      assert.match(document.querySelector('#panel').textContent, /Manually chosen and incomplete/);
    }
    document.querySelector('#cat_D').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    assert.ok(document.querySelector('#draftBtn'));
    assert.equal(document.querySelector('.site-nav a').getAttribute('href'), '../../index.html#apps');
    assert.ok(document.querySelector('.site-nav a[href="../functor-atlas-project-example/index.html"]'));
  } finally { dom.window.close(); }
});
