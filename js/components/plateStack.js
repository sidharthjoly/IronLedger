// Renders a small "how to load the bar" visual: biggest plates closest to
// the collar, sized proportionally, one side shown (it's symmetric).

const PLATE_SETS = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

const BAR_WEIGHT = { kg: 20, lb: 45 };

function plateBreakdown(weight, unit) {
  const bar = BAR_WEIGHT[unit] || BAR_WEIGHT.kg;
  let perSide = (Number(weight) - bar) / 2;
  if (!(perSide > 0)) return [];
  const plates = PLATE_SETS[unit] || PLATE_SETS.kg;
  const result = [];
  for (const p of plates) {
    while (perSide >= p - 0.01) {
      result.push(p);
      perSide -= p;
    }
  }
  return result;
}

// Returns an HTML string. Caller drops it into a container element.
export function renderPlateStack(weight, unit) {
  if (weight === null || weight === undefined || Number.isNaN(weight)) {
    return '<p class="plate-stack-empty">No target weight yet — log a baseline session first.</p>';
  }

  const plates = plateBreakdown(weight, unit);
  const bar = BAR_WEIGHT[unit] || BAR_WEIGHT.kg;
  const maxPlate = Math.max(...(PLATE_SETS[unit] || PLATE_SETS.kg));

  if (plates.length === 0) {
    return `<div class="plate-stack"><div class="bar-sleeve"></div></div><p class="plate-stack-note">Bar only (${bar}${unit}) or below — no plates to load.</p>`;
  }

  const plateEls = plates
    .map((p) => {
      const heightPct = 40 + (p / maxPlate) * 60; // 40%-100% of stack height
      return `<div class="plate" style="height:${heightPct}%" data-weight="${p}"><span>${p}</span></div>`;
    })
    .join('');

  const listText = plates.join(' + ');

  return `
    <div class="plate-stack">
      <div class="bar-sleeve"></div>
      ${plateEls}
    </div>
    <p class="plate-stack-note">Per side: ${listText}${unit} <span class="dim">(+ ${bar}${unit} bar)</span></p>
  `;
}
