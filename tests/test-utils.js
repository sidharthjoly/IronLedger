// Minimal assertion runner shared by every test page. Deliberately not a real
// test framework — the app has no build step, so tests are plain HTML pages
// executed in a real browser (headless Chrome in CI, any browser locally) and
// their results are read back out of the DOM. See tests/run.sh.

export function makeRunner() {
  const out = [];
  let pass = 0;
  let fail = 0;

  function assert(name, cond, extra) {
    if (cond) {
      pass++;
      out.push(`PASS: ${name}`);
    } else {
      fail++;
      out.push(`FAIL: ${name}${extra !== undefined ? ' -> ' + JSON.stringify(extra) : ''}`);
    }
  }

  function summary() {
    return `${out.join('\n')}\n\n${pass} passed, ${fail} failed`;
  }

  function report(elId = 'out') {
    const el = document.getElementById(elId);
    if (el) el.textContent = summary();
    return { pass, fail };
  }

  return { assert, summary, report };
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
