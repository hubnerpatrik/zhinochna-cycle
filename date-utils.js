// Calendar operations deliberately keep local dates separate from UTC ordinals.
export const MILLISECONDS_PER_DAY = 86_400_000;
export const ISO_DATE_KEY_LENGTH = 10;
export const LAST_MONTH_INDEX = 11;
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_PER_WEEK = 7;
const MONDAY_FIRST_OFFSET = 6;
const DATE_COMPONENT_DIGITS = 2;

export function normalize(date) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate;
}

/** Returns a timezone-independent ordinal for the date's local calendar day. */
export function calendarDayNumber(date) {
  const calendarDate = new Date(date);
  return Math.floor(Date.UTC(calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate()) / MILLISECONDS_PER_DAY);
}

/** Counts local calendar boundaries without assuming that every day has 24 hours. */
export function calendarDayDifference(later, earlier) {
  return calendarDayNumber(later) - calendarDayNumber(earlier);
}

export function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateKey(date) {
  const normalizedDate = normalize(date);
  return `${normalizedDate.getFullYear()}-${String(normalizedDate.getMonth() + 1).padStart(DATE_COMPONENT_DIGITS, "0")}-${String(normalizedDate.getDate()).padStart(DATE_COMPONENT_DIGITS, "0")}`;
}

/** Uses the latest dated graph entry when available, otherwise local today. */
export function getCalendarFocusDate(entries, today = new Date()) {
  const latestKey = Object.keys(entries || {})
    .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key))
    .sort()
    .at(-1);
  return latestKey ? parseDateKey(latestKey) : new Date(today);
}

export function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
export function getMonthOffset(year, month) { return (new Date(year, month, 1).getDay() + MONDAY_FIRST_OFFSET) % DAYS_PER_WEEK; }
