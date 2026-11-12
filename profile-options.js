export const PROFILE_GOALS = {
  avoid: 'Avoid pregnancy',
  achieve: 'Achieve pregnancy',
  observation: 'Observation only',
};

export const MEASUREMENT_METHODS = {
  oral: 'Oral',
  vaginal: 'Vaginal',
  rectal: 'Rectal',
};

// Measurement settings belong to a map: each map keeps the values it was recorded with.
export const MAP_SETTINGS_FIELDS = Object.freeze(['age', 'usualMeasurementTime', 'goal', 'measurementMethod']);
// Account identity shown with a user's own maps.
export const PROFILE_IDENTITY_FIELDS = Object.freeze(['name', 'consultantName', 'photo']);

export function pickMapSettings(source) {
  return Object.fromEntries(MAP_SETTINGS_FIELDS.map(field => [field, String(source?.[field] ?? '')]));
}
