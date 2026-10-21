// Date keys are calendar dates; UTC keeps month labels independent of device timezone.
export function formatMonthPeriod(startKey, endKey, locale = 'en-GB') {
  if (!startKey || !endKey) return '';
  const start = new Date(`${startKey}T12:00:00Z`);
  const end = new Date(`${endKey}T12:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return '';
  const month = date => date.toLocaleDateString(locale, { month: 'long', timeZone: 'UTC' });
  const firstYear = start.getUTCFullYear(), lastYear = end.getUTCFullYear();
  if (firstYear !== lastYear) return `${firstYear} ${month(start)} – ${lastYear} ${month(end)}`;
  return `${firstYear} ${month(start)}${start.getUTCMonth() === end.getUTCMonth() ? '' : ` – ${month(end)}`}`;
}
