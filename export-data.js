import { t } from './i18n.js';
import { TEMP_FACTORS } from './core.js';

export const EXPORT_FIELDS = [
  'temp', 'measurementTime', 'tempFactors', 'bleeding', 'sediment', 'sensation',
  'stretch', 'visible', 'consistency', 'color', 'colorOther', 'cervixFirmness',
  'cervixHeight', 'cervixOpenness', 'sex', 'other', 'isFertile', 'isPeak',
  'markers', 'crossedRows', 'crossedChartTemps', 'tempFactorsOther', 'bleedingIntensity',
];
export const EXPORT_LABELS = ['Temperature', 'Measurement time', 'Influence factors', 'Bleeding', 'Clots', 'Sensation',
  'Slippery', 'Discharge', 'Consistency', 'Color', 'Other color', 'Firmness', 'Height', 'Openness',
  'Sex', 'Notes', 'Fertile range', 'Peak', 'Markers', 'Crossed rows', 'Crossed temperatures', 'Other influence factor', 'Period intensity'];
export const valueText = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
const ENUM_LABELS = { none: 'None', spotting: 'Spotting', menstruation: 'Period', dry: 'Dry', moist: 'Moist', wet: 'Wet',
  creamy: 'Creamy', slightlyStretchy: 'Slightly stretchy', stretchy: 'Stretchy', white: 'White',
  whiteTranslucent: 'White-translucent', translucent: 'Translucent', other: 'Other', hard: 'Hard', soft: 'Soft',
  low: 'Low', medium: 'Medium', high: 'High', closed: 'Closed', open: 'Open' };
export function observationText(key, value) {
  if (value == null) return '';
  if (key === 'temp' && Number.isFinite(value)) return `${value.toFixed(2)} °C`;
  if (key === 'visible') return t(value ? 'Present' : 'None');
  if (typeof value === 'boolean') return t(value ? 'Yes' : 'No');
  if (key === 'tempFactors') return t(TEMP_FACTORS[value] || value);
  if (key === 'bleedingIntensity') return t({ heavy: 'Heavy', medium: 'Moderate', light: 'Light', spotting: 'Spotting' }[value] || value);
  if (key === 'cervixHeight' && value === 'medium') return t('Middle');
  if (['bleeding', 'sensation', 'consistency', 'color', 'cervixFirmness', 'cervixHeight', 'cervixOpenness'].includes(key)) return t(ENUM_LABELS[value] || value);
  if (key === 'markers') return Object.entries(value).filter(([, marker]) => marker.value).map(([type, marker]) => `${type.toUpperCase()}: ${marker.value} (${marker.pointType})`).join(', ') || '—';
  return valueText(value);
}

export function sortedMapEntries(map) {
  return Object.entries(map.entries || {}).sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate));
}

export function mapExportRows(map) {
  return [['date', ...EXPORT_FIELDS], ...sortedMapEntries(map)
    .map(([date, entry]) => [date, ...EXPORT_FIELDS.map(key => entry[key])])];
}
