// Inline-SVG progress charts: a working-weight trend line and a per-session
// volume-load bar chart. No charting library — small enough to hand-roll and
// keeps the app dependency-free. Each chart plots one measure (never a dual
// axis) and is keyed to session order on X, since irregular calendar gaps
// between logged sessions would otherwise stretch the line across mostly
// empty space.

const NS = 'http://www.w3.org/2000/svg';
const ACCENT = '#e8b93f';
const GRID = 'rgba(233, 230, 221, 0.10)';
const TEXT_DIM = '#9a9c9f';
const SURFACE = '#1b1d22';

const PADDING = { top: 16, right: 16, bottom: 28, left: 44 };
const WIDTH = 560;
const HEIGHT = 200;

// Rounds a numeric range to "nice" tick values (0, 5, 10, 25, 50, 100 steps).
function niceStep(rawStep) {
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const residual = rawStep / magnitude;
  let niceResidual;
  if (residual <= 1) niceResidual = 1;
  else if (residual <= 2) niceResidual = 2;
  else if (residual <= 5) niceResidual = 5;
  else niceResidual = 10;
  return niceResidual * magnitude;
}

function niceTicks(min, max, targetCount = 4) {
  if (max <= min) max = min + 1;
  const step = niceStep((max - min) / targetCount) || 1;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = niceMin; v <= niceMax + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);
  return { ticks, min: niceMin, max: niceMax };
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function ensureTooltip(container) {
  let tooltip = container.querySelector('.chart-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    container.appendChild(tooltip);
  }
  return tooltip;
}

function emptyMessage(container, text) {
  container.innerHTML = `<p class="chart-empty">${text}</p>`;
}

// Places the tooltip to the right of the pointer by default, flipping to the
// left when that would push it past the container's edge (otherwise the
// rightmost — often most interesting, most-recent — point's tooltip clips).
function positionTooltip(tooltip, container, clientX, clientY) {
  const containerRect = container.getBoundingClientRect();
  tooltip.style.left = `${clientX - containerRect.left + 12}px`;
  tooltip.style.top = `${clientY - containerRect.top - 10}px`;
  const tooltipRect = tooltip.getBoundingClientRect();
  if (tooltipRect.right > containerRect.right) {
    const flippedLeft = clientX - containerRect.left - tooltipRect.width - 12;
    tooltip.style.left = `${Math.max(0, flippedLeft)}px`;
  }
}

/**
 * points: [{ date, value }] in unit `unit`, sorted ascending by date.
 * A working-weight trend line — the AMRAP-style measure double progression
 * actually acts on, not volume.
 */
export function renderWeightTrendChart(container, points, unit) {
  container.style.position = 'relative';
  if (!points || points.length < 2) {
    emptyMessage(container, 'Not enough sessions yet to plot a trend.');
    return;
  }

  // Unlike the volume bar chart, a zero baseline isn't forced here: bars encode
  // value as area (truncating the baseline misrepresents magnitude), but a line
  // encodes value as position, and a working-weight trend typically moves in
  // small increments against a large absolute number — forcing 0 into range
  // would flatten a real trend into an almost invisible line.
  const values = points.map((p) => p.value);
  const { ticks, min, max } = niceTicks(Math.min(...values), Math.max(...values));
  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;

  const xFor = (i) => PADDING.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yFor = (v) => PADDING.top + plotH - ((v - min) / (max - min || 1)) * plotH;

  const svg = svgEl('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'chart-svg', role: 'img', 'aria-label': 'Working weight trend over time' });

  // Gridlines + Y ticks (recessive hairlines, clean rounded values).
  ticks.forEach((t) => {
    const y = yFor(t);
    svg.appendChild(svgEl('line', { x1: PADDING.left, x2: WIDTH - PADDING.right, y1: y, y2: y, stroke: GRID, 'stroke-width': 1 }));
    const label = svgEl('text', { x: PADDING.left - 8, y: y + 3, 'text-anchor': 'end', class: 'chart-axis-label' });
    label.textContent = `${t}`;
    svg.appendChild(label);
  });

  // X tick labels: first, last, and midpoint (dense date labels overlap at this width).
  const xTickIdxs = points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  [...new Set(xTickIdxs)].forEach((i) => {
    const label = svgEl('text', { x: xFor(i), y: HEIGHT - PADDING.bottom + 16, 'text-anchor': 'middle', class: 'chart-axis-label' });
    label.textContent = formatDateShort(points[i].date);
    svg.appendChild(label);
  });

  // The line itself.
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p.value)}`).join(' ');
  svg.appendChild(svgEl('path', { d: pathD, fill: 'none', stroke: ACCENT, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

  // End-dot marker on the most recent point, with a surface ring so it reads
  // over the line, plus a transparent hit target per point for hover.
  const hitDots = [];
  points.forEach((p, i) => {
    const isLast = i === points.length - 1;
    if (isLast) {
      svg.appendChild(svgEl('circle', { cx: xFor(i), cy: yFor(p.value), r: 6, fill: SURFACE }));
      svg.appendChild(svgEl('circle', { cx: xFor(i), cy: yFor(p.value), r: 4, fill: ACCENT }));
    }
    const hit = svgEl('circle', { cx: xFor(i), cy: yFor(p.value), r: 12, fill: 'transparent', class: 'chart-hit' });
    svg.appendChild(hit);
    hitDots.push({ el: hit, x: xFor(i), point: p });
  });

  // Crosshair (hidden until hover).
  const crosshair = svgEl('line', { x1: 0, x2: 0, y1: PADDING.top, y2: HEIGHT - PADDING.bottom, stroke: TEXT_DIM, 'stroke-width': 1, class: 'chart-crosshair hidden' });
  svg.appendChild(crosshair);

  container.innerHTML = '';
  container.appendChild(svg);
  const tooltip = ensureTooltip(container);

  function showTooltip(clientX, clientY, dot) {
    crosshair.setAttribute('x1', dot.x);
    crosshair.setAttribute('x2', dot.x);
    crosshair.classList.remove('hidden');
    tooltip.innerHTML = `<div class="chart-tooltip-value">${dot.point.value}${unit}</div><div class="chart-tooltip-label">${formatDateShort(dot.point.date)}</div>`;
    tooltip.style.display = 'block';
    positionTooltip(tooltip, container, clientX, clientY);
  }

  svg.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = hitDots[0];
    let bestDist = Infinity;
    for (const d of hitDots) {
      const dist = Math.abs(d.x - relX);
      if (dist < bestDist) { bestDist = dist; nearest = d; }
    }
    showTooltip(e.clientX, e.clientY, nearest);
  });
  svg.addEventListener('pointerleave', () => {
    crosshair.classList.add('hidden');
    tooltip.style.display = 'none';
  });
}

/**
 * points: [{ date, value }] — total volume load (Σ weight×reps) per session.
 */
export function renderVolumeChart(container, points, unit) {
  container.style.position = 'relative';
  if (!points || points.length < 2) {
    emptyMessage(container, 'Not enough sessions yet to plot volume load.');
    return;
  }

  const values = points.map((p) => p.value);
  const { ticks, min, max } = niceTicks(0, Math.max(...values));
  const plotW = WIDTH - PADDING.left - PADDING.right;
  const plotH = HEIGHT - PADDING.top - PADDING.bottom;

  const bandWidth = plotW / points.length;
  const barWidth = Math.min(24, bandWidth * 0.6);
  const xFor = (i) => PADDING.left + bandWidth * i + bandWidth / 2;
  const yFor = (v) => PADDING.top + plotH - ((v - min) / (max - min || 1)) * plotH;

  const svg = svgEl('svg', { viewBox: `0 0 ${WIDTH} ${HEIGHT}`, class: 'chart-svg', role: 'img', 'aria-label': 'Volume load per session' });

  ticks.forEach((t) => {
    const y = yFor(t);
    svg.appendChild(svgEl('line', { x1: PADDING.left, x2: WIDTH - PADDING.right, y1: y, y2: y, stroke: GRID, 'stroke-width': 1 }));
    const label = svgEl('text', { x: PADDING.left - 8, y: y + 3, 'text-anchor': 'end', class: 'chart-axis-label' });
    label.textContent = `${Math.round(t)}`;
    svg.appendChild(label);
  });

  const xTickIdxs = points.length <= 3 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  [...new Set(xTickIdxs)].forEach((i) => {
    const label = svgEl('text', { x: xFor(i), y: HEIGHT - PADDING.bottom + 16, 'text-anchor': 'middle', class: 'chart-axis-label' });
    label.textContent = formatDateShort(points[i].date);
    svg.appendChild(label);
  });

  const baselineY = yFor(min);
  const bars = [];
  points.forEach((p, i) => {
    const x = xFor(i) - barWidth / 2;
    const y = yFor(p.value);
    const h = Math.max(0, baselineY - y);
    const rect = svgEl('rect', { x, y, width: barWidth, height: h, rx: 4, fill: ACCENT, class: 'chart-bar' });
    svg.appendChild(rect);
    bars.push({ el: rect, point: p });
  });

  container.innerHTML = '';
  container.appendChild(svg);
  const tooltip = ensureTooltip(container);

  function showTooltip(clientX, clientY, bar) {
    tooltip.innerHTML = `<div class="chart-tooltip-value">${Math.round(bar.point.value)}${unit}</div><div class="chart-tooltip-label">${formatDateShort(bar.point.date)}</div>`;
    tooltip.style.display = 'block';
    positionTooltip(tooltip, container, clientX, clientY);
  }

  bars.forEach(({ el, point }) => {
    el.addEventListener('pointermove', (e) => {
      bars.forEach((b) => b.el.classList.remove('chart-bar-active'));
      el.classList.add('chart-bar-active');
      showTooltip(e.clientX, e.clientY, { point });
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('chart-bar-active');
      tooltip.style.display = 'none';
    });
  });
}
