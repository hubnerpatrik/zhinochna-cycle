import { getMonthOffset, WEEKDAY_LABELS } from '../date-utils.js';
import { setText } from '../i18n.js';

export function appendCalendarHeader(calendar, year, month) {
  WEEKDAY_LABELS.forEach(day => {
    const weekday = document.createElement('div');
    weekday.className = 'calendar-weekday';
    setText(weekday, day);
    calendar.appendChild(weekday);
  });
  Array.from({ length: getMonthOffset(year, month) }, () => document.createElement('div'))
    .forEach(spacer => calendar.appendChild(spacer));
}
