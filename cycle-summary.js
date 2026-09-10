const DAY = 86400000;
const dayNumber = key => Date.parse(`${key}T00:00:00Z`) / DAY;
export const manualFields = [
  ['firstMucus', 'First mucus'],
  ['qualityMucus', 'First high-quality mucus'],
  ['qualityDays', 'High-quality mucus days'],
  ['mucusPeak', 'Mucus peak'],
  ['cervixPeak', 'Cervix peak'],
];

export function cycleStarts(entries) {
  return Object.keys(entries).sort().filter(key => {
    if (entries[key].bleeding !== 'menstruation') return false;
    const previous = new Date((dayNumber(key) - 1) * DAY).toISOString().slice(0, 10);
    return entries[previous]?.bleeding !== 'menstruation';
  });
}

// Local maps belong to this installation's profile. Shared/imported maps have
// locked profile snapshots and must never contribute to the owner's history.
export function buildCycleHistory(maps, activeMapId) {
  const active = maps[activeMapId];
  if (!active) return [];
  const eligible = active.profileSnapshotLocked
    ? [active]
    : Object.values(maps).filter(map => !map.profileSnapshotLocked);
  const observations = new Map();
  for (const map of eligible) {
    for (const [key, entry] of Object.entries(map.entries ?? {})) {
      if (!observations.has(key)) observations.set(key, new Set());
      // An empty calendar cell is not an explicit denial of menstruation.
      if (entry.bleeding != null) observations.get(key).add(entry.bleeding);
    }
  }
  const merged = Object.fromEntries([...observations].map(([key, values]) => [key, {
    bleeding: values.has('menstruation') ? 'menstruation' : 'none',
  }]));
  const starts = cycleStarts(merged);
  return starts.slice(0, -1).map((start, index) => {
    const end = starts[index + 1];
    const length = dayNumber(end) - dayNumber(start);
    let issue = null;
    for (let day = dayNumber(start); day <= dayNumber(end); day++) {
      const key = new Date(day * DAY).toISOString().slice(0, 10);
      const values = observations.get(key);
      if (!values) { issue = 'gap'; break; }
      if (values.has('menstruation') && values.size > 1) { issue = 'conflict'; break; }
    }
    return { start, end, length: issue ? null : length, issue };
  });
}

export function calculateSummary(entries, start, manual = {}, cycleHistory = null) {
  const starts = cycleStarts(entries);
  const index = starts.indexOf(start);
  const historicalCycle = cycleHistory?.find(cycle => cycle.start === start);
  const next = historicalCycle?.end ?? starts[index + 1];
  const length = cycleHistory !== null ? historicalCycle?.length ?? null
    : index >= 0 && next ? dayNumber(next) - dayNumber(start) : null;
  const count = manual.historyCount === 12 ? 12 : 6;
  const previous = cycleHistory?.filter(cycle => cycle.end <= start).slice(-count);
  const history = previous ? previous.map(cycle => cycle.length).filter(value => value !== null)
    : index < 0 ? [] : starts.slice(Math.max(0, index - count), index)
    .map(key => dayNumber(starts[starts.indexOf(key) + 1]) - dayNumber(key));
  const min = history.length ? Math.min(...history) : null;
  const max = history.length ? Math.max(...history) : null;
  const keys = Object.keys(entries).sort().filter(key => key >= start && (!next || key < next));
  const markerDay = value => {
    const matching = keys.filter(key => entries[key].markers?.bbt?.value === value);
    return matching.length === 1 ? dayNumber(matching[0]) - dayNumber(start) + 1 : null;
  };
  const firstHigh = markerDay('1');
  const lastInfertile = history.length === count ? min - (count === 6 ? 21 : 20) : null;
  return {
    length, count, available: history.length, min, max,
    historyIncomplete: Boolean(previous?.some(cycle => cycle.issue)),
    bbtRise: markerDay('4') ?? markerDay('3'),
    mucusPlus4: manual.mucusPeak ? manual.mucusPeak + 4 : null,
    cervixPlus4: manual.cervixPeak ? manual.cervixPeak + 4 : null,
    bbtPhase: length && firstHigh && firstHigh <= length ? length - firstHigh + 1 : null,
    mucusPhase: length && manual.mucusPeak && manual.mucusPeak <= length ? length - manual.mucusPeak : null,
    lastInfertile,
  };
}

export function summaryRows(manual, result) {
  const day = value => value == null ? '—' : `Day ${value}`;
  const days = value => value == null ? '—' : `${value} days`;
  return [
    ...manualFields.slice(0, 4).map(([key, label]) => [label, key === 'qualityDays' ? days(manual[key]) : day(manual[key])]),
    ['BBT rise · 3rd / 4th day', day(result.bbtRise)],
    ['Mucus peak + 4', day(result.mucusPlus4)],
    ['Cervix peak + 4', day(result.cervixPlus4)],
    ['Second phase · BBT', days(result.bbtPhase)],
    ['Second phase · mucus', days(result.mucusPhase)],
    ['Cycle length', days(result.length)],
    ['Longest cycle', days(result.max)],
    ['Shortest cycle', days(result.min)],
    ['Last infertile day · formula', result.lastInfertile != null && result.lastInfertile < 1 ? 'None' : day(result.lastInfertile)],
  ];
}
