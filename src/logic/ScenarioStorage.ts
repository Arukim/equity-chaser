import type { SavedScenario, ScenarioInputs } from './types'

const STORAGE_KEY = 'equity-chaser:scenarios'
const CURRENT_SCHEMA_VERSION = 1 as const

// ─── Schema Migration ─────────────────────────────────────────────────────────

/**
 * Default values for fields added in schema v1.
 * When a new field is added in v2, add its default here and bump the version.
 */
const V1_DEFAULTS: Pick<ScenarioInputs, 'cpiRate' | 'currentRent' | 'renovationMonths' | 'isFirstHomeBuyer' | 'spendingMonths' | 'wageGrowthRate' | 'locationPrestige'> = {
  cpiRate: 3.5,
  currentRent: 0,
  renovationMonths: 0,
  isFirstHomeBuyer: false,
  spendingMonths: {},
  wageGrowthRate: 1.5,
  locationPrestige: 'norm',
}

/**
 * Migrates a raw unknown object from localStorage to the current schema version.
 * New fields missing from legacy data are filled with safe defaults.
 * This function must never throw — if the object is unrecoverable, return null.
 */
function migrateScenario(raw: unknown): SavedScenario | null {
  try {
    if (typeof raw !== 'object' || raw === null) return null
    const obj = raw as Record<string, unknown>
    if (!obj.id || !obj.name || !obj.inputs) return null

    const inputs = { ...V1_DEFAULTS, ...(obj.inputs as Partial<ScenarioInputs>) }

    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      id: String(obj.id),
      name: String(obj.name),
      createdAt: String(obj.createdAt ?? new Date().toISOString()),
      inputs: inputs as ScenarioInputs,
    }
  } catch {
    return null
  }
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

function readFromStorage(): SavedScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(migrateScenario).filter((s): s is SavedScenario => s !== null)
  } catch {
    return []
  }
}

function writeToStorage(scenarios: SavedScenario[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios))
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Saves or updates a scenario. If id already exists, it is replaced. */
export function saveScenario(scenario: SavedScenario): void {
  const existing = readFromStorage().filter((s) => s.id !== scenario.id)
  writeToStorage([...existing, scenario])
}

/** Loads and migrates all scenarios from localStorage. Never throws. */
export function loadAllScenarios(): SavedScenario[] {
  return readFromStorage()
}

/** Removes a scenario by id. No-op if id does not exist. */
export function deleteScenario(id: string): void {
  writeToStorage(readFromStorage().filter((s) => s.id !== id))
}

/**
 * Serialises scenarios to a JSON string.
 * @param ids - Optional subset of ids to export. Exports all if omitted.
 */
export function exportAsJSON(ids?: string[]): string {
  const all = readFromStorage()
  const subset = ids ? all.filter((s) => ids.includes(s.id)) : all
  return JSON.stringify(subset, null, 2)
}

/**
 * Parses and validates a JSON string of scenarios.
 * Throws if the JSON is invalid or not an array.
 * Migrates each item to the current schema.
 * Does not automatically save — caller decides whether to persist.
 */
export function importFromJSON(json: string): SavedScenario[] {
  const parsed: unknown = JSON.parse(json) // throws on invalid JSON
  if (!Array.isArray(parsed)) {
    throw new Error('Import data must be an array of scenarios')
  }
  return parsed.map(migrateScenario).filter((s): s is SavedScenario => s !== null)
}
