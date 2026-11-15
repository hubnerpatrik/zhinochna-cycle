import { DataValidationError, isPlainObject, normalizeApplicationData } from "./data-validation.js";
import { ISO_DATE_KEY_LENGTH } from './date-utils.js';

export const BACKUP_APP = "cycle-tracker";
export const BACKUP_VERSION = "0.10.0";
const BACKUP_JSON_INDENT = 2;
const MAX_MAP_SLUG_LENGTH = 50;

export class BackupFormatError extends Error {
  constructor(message, code = "malformed-data") {
    super(message);
    this.name = "BackupFormatError";
    this.code = code;
  }
}

export function createBackup(data, exportedAt = new Date().toISOString()) {
  const normalized = normalizeApplicationData(data, { strict: true });
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt,
    data: normalized,
  };
}

export function serializeBackup(data, exportedAt) {
  return JSON.stringify(createBackup(data, exportedAt), null, BACKUP_JSON_INDENT);
}

export function parseBackup(json) {
  let backup;
  try {
    backup = JSON.parse(json);
  } catch {
    throw new BackupFormatError("The selected file is not valid JSON.", "invalid-json");
  }

  if (!isPlainObject(backup) || backup.app !== BACKUP_APP || typeof backup.version !== "string") {
    throw new BackupFormatError("This file is not a supported Cycle Tracker backup.", "unsupported-format");
  }
  if (backup.version !== BACKUP_VERSION) {
    throw new BackupFormatError(`Backup version ${backup.version} is not supported.`, "unsupported-format");
  }

  try {
    return normalizeApplicationData(backup.data, { strict: true });
  } catch (error) {
    if (error instanceof DataValidationError) {
      throw new BackupFormatError(error.message, "malformed-data");
    }
    throw error;
  }
}

/**
 * The portable backup of one map, embedded in every map export. A map without
 * its own profile snapshot carries the exporting account's profile.
 */
export function serializeMapBackup(map, { accountProfile = {}, active = false, exportedAt } = {}) {
  const id = map.id || 'exported-map';
  const profileSnapshot = map.profileSnapshot || accountProfile;
  return serializeBackup({
    profile: profileSnapshot,
    maps: { [id]: { ...map, id, profileSnapshot } },
    activeMapId: active ? id : null,
  }, exportedAt);
}

/** Parses a backup that must hold exactly one map, as map imports require. */
export function parseMapBackup(json) {
  const state = parseBackup(json);
  if (Object.keys(state.maps).length !== 1) {
    throw new BackupFormatError("A shared-map backup must contain exactly one map.", "unsupported-format");
  }
  return state;
}

export function backupFilename(date = new Date(), mapName = "") {
  const mapSlug = String(mapName)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_MAP_SLUG_LENGTH);
  const mapPart = mapSlug ? `-${mapSlug}` : "";
  return `cycle-tracker${mapPart}-backup-${date.toISOString().slice(0, ISO_DATE_KEY_LENGTH)}.json`;
}
