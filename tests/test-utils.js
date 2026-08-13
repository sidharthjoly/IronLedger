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

// Polls a condition until it's truthy — needed once app.js's write paths
// became async (Supabase-or-localStorage): dispatching a DOM event no longer
// guarantees the resulting state change has landed by the very next line.
//
// Deliberately polls via queueMicrotask, not setTimeout: Chrome's
// `--dump-dom` (how CI reads these test pages' results) captures the DOM
// once the microtask queue drains after `load`, but does not wait for
// macrotasks/timers — a setTimeout-based retry loop never gets seen. Local
// (signed-out) storage calls resolve from already-fulfilled promises, so a
// bounded number of microtask turns is enough to drain them.
export function waitFor(conditionFn, { maxTicks = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    let ticks = 0;
    function check() {
      let result;
      try {
        result = conditionFn();
      } catch {
        result = false;
      }
      if (result) {
        resolve(result);
        return;
      }
      ticks++;
      if (ticks > maxTicks) {
        reject(new Error(`waitFor exceeded ${maxTicks} microtask ticks`));
        return;
      }
      queueMicrotask(check);
    }
    check();
  });
}
