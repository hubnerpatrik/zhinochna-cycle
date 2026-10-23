const YEAR_KEY_LENGTH = 4;
const MONTH_KEY_START = 5;
const MONTH_KEY_END = 7;

function getSortedEntryDates(entries) {
  return Object.keys(entries || {}).sort();
}

export function buildMapMeta(map) {
  const dates = getSortedEntryDates(map.entries);
  const years = [...new Set(dates.map(date => date.slice(0, YEAR_KEY_LENGTH)))].sort();
  const months = [...new Set(dates.map(date => date.slice(MONTH_KEY_START, MONTH_KEY_END)))].sort();
  const values = Object.values(map.entries || {});
  const temperatureCount = values.filter(entry => entry?.temp != null).length;
  const periodCount = values.filter(entry => entry?.bleeding === "menstruation").length;
  const notesCount = values.filter(entry => Boolean(entry?.other?.trim())).length;

  return {
    ...map,
    dates,
    years,
    months,
    preview: `${dates.length} day${dates.length === 1 ? "" : "s"} · ${temperatureCount} temps · ${periodCount} period days · ${notesCount} notes`,
    dateRange: dates.length ? `${dates[0]} to ${dates.at(-1)}` : "No entries yet",
    lastActivity: map.closedAt || dates.at(-1) || map.createdAt,
  };
}

export function matchesFilter(map, year, month) {
  if (!year && !month) return true;
  return map.dates.some(date => {
    const sameYear = !year || date.startsWith(`${year}-`);
    const sameMonth = !month || date.slice(MONTH_KEY_START, MONTH_KEY_END) === month;
    return sameYear && sameMonth;
  });
}
