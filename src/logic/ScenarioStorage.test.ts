import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SavedScenario, ScenarioInputs } from './types'
import {
  saveScenario, loadAllScenarios, deleteScenario,
  exportAsJSON, importFromJSON,
} from './ScenarioStorage'

// ─── localStorage stub ────────────────────────────────────────────────────────

const store = new Map<string, string>()
const localStorageMock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
}
vi.stubGlobal('localStorage', localStorageMock)

// ─── Minimal valid inputs fixture ─────────────────────────────────────────────

const INPUTS: ScenarioInputs = {
  approvedLoanAmount: 1000000, loanRate: 6.05, minLvr: 0.95,
  loanTermYears: 30, propertyValue: 700000, depositRequired: 0.05,
  savings: 50000, monthlyBudget: 5000, isFirstHomeBuyer: true,
  propertyType: 'apartment', areaSize: 'medium', buildingAge: 'recent',
  suburbArea: 'hills', enabledSpendingIds: [], customSpendings: [],
  growthRateOverride: null, currentRent: 0, renovationMonths: 0, cpiRate: 3.5,
  spendingMonths: {},
}

function makeScenario(id: string, name: string): SavedScenario {
  return { schemaVersion: 1, id, name, createdAt: new Date().toISOString(), inputs: INPUTS }
}

beforeEach(() => {
  localStorage.clear()
})

describe('saveScenario / loadAllScenarios', () => {
  it('round-trips a single scenario', () => {
    const s = makeScenario('abc', 'Test Scenario')
    saveScenario(s)
    const loaded = loadAllScenarios()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('abc')
    expect(loaded[0].name).toBe('Test Scenario')
  })

  it('saves multiple scenarios independently', () => {
    saveScenario(makeScenario('id1', 'First'))
    saveScenario(makeScenario('id2', 'Second'))
    expect(loadAllScenarios()).toHaveLength(2)
  })

  it('overwriting same id replaces the scenario', () => {
    saveScenario(makeScenario('id1', 'Original'))
    saveScenario({ ...makeScenario('id1', 'Updated'), name: 'Updated' })
    const all = loadAllScenarios()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Updated')
  })

  it('loadAllScenarios returns [] when storage is empty', () => {
    expect(loadAllScenarios()).toEqual([])
  })
})

describe('deleteScenario', () => {
  it('removes scenario by id', () => {
    saveScenario(makeScenario('del1', 'To Delete'))
    saveScenario(makeScenario('keep1', 'To Keep'))
    deleteScenario('del1')
    const all = loadAllScenarios()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('keep1')
  })

  it('deleting non-existent id is a no-op', () => {
    saveScenario(makeScenario('x1', 'Exists'))
    deleteScenario('nope')
    expect(loadAllScenarios()).toHaveLength(1)
  })
})

describe('exportAsJSON / importFromJSON', () => {
  it('export → import round-trips all scenarios', () => {
    saveScenario(makeScenario('e1', 'Export 1'))
    saveScenario(makeScenario('e2', 'Export 2'))
    const json = exportAsJSON()
    localStorage.clear()
    const imported = importFromJSON(json)
    expect(imported).toHaveLength(2)
    expect(imported.map((s) => s.id)).toContain('e1')
  })

  it('importFromJSON deduplicates by id', () => {
    saveScenario(makeScenario('dup1', 'Existing'))
    const json = exportAsJSON(['dup1'])
    // import the same id again — should not create duplicate
    importFromJSON(json).forEach(saveScenario)
    expect(loadAllScenarios()).toHaveLength(1)
  })

  it('importFromJSON throws on corrupt JSON', () => {
    expect(() => importFromJSON('not json at all')).toThrow()
  })

  it('importFromJSON throws when data is not an array', () => {
    expect(() => importFromJSON(JSON.stringify({ not: 'array' }))).toThrow()
  })

  it('exportAsJSON filters by ids when provided', () => {
    saveScenario(makeScenario('f1', 'One'))
    saveScenario(makeScenario('f2', 'Two'))
    const json = exportAsJSON(['f1'])
    const parsed = JSON.parse(json) as SavedScenario[]
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('f1')
  })
})

describe('schema migration', () => {
  it('legacy scenario (no schemaVersion) is migrated to v1 on load', () => {
    // Simulate old data written directly to localStorage without schemaVersion
    const legacy = {
      id: 'legacy1', name: 'Legacy',
      createdAt: new Date().toISOString(),
      inputs: {
        // Old inputs missing new fields: cpiRate, currentRent, renovationMonths, isFirstHomeBuyer
        approvedLoanAmount: 800000, loanRate: 6.0, minLvr: 0.9,
        loanTermYears: 30, propertyValue: 600000, depositRequired: 0.1,
        savings: 40000, monthlyBudget: 4000,
        propertyType: 'house', areaSize: 'large', buildingAge: 'mid',
        suburbArea: 'shire', enabledSpendingIds: [], customSpendings: [],
        growthRateOverride: null,
      },
    }
    localStorage.setItem('equity-chaser:scenarios', JSON.stringify([legacy]))
    const loaded = loadAllScenarios()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].schemaVersion).toBe(1)
    expect(loaded[0].inputs.cpiRate).toBe(3.5)
    expect(loaded[0].inputs.currentRent).toBe(0)
    expect(loaded[0].inputs.renovationMonths).toBe(0)
    expect(loaded[0].inputs.isFirstHomeBuyer).toBe(false)
    expect(loaded[0].inputs.spendingMonths).toEqual({})
  })

  it('legacy scenario missing spendingMonths is migrated to empty object', () => {
    const legacy = {
      id: 'legacy2', name: 'Legacy No Months',
      createdAt: new Date().toISOString(),
      inputs: {
        approvedLoanAmount: 800000, loanRate: 6.0, minLvr: 0.9,
        loanTermYears: 30, propertyValue: 600000, depositRequired: 0.1,
        savings: 40000, monthlyBudget: 4000,
        propertyType: 'house', areaSize: 'large', buildingAge: 'mid',
        suburbArea: 'shire', enabledSpendingIds: [], customSpendings: [],
        growthRateOverride: null, currentRent: 0, renovationMonths: 0, cpiRate: 3.5,
        // spendingMonths intentionally absent
      },
    }
    localStorage.setItem('equity-chaser:scenarios', JSON.stringify([legacy]))
    const loaded = loadAllScenarios()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].inputs.spendingMonths).toEqual({})
  })

  it('scenario saved with spendingMonths round-trips correctly', () => {
    const withMonths = {
      ...INPUTS,
      spendingMonths: { bathroom: 6, car_purchase: 12 },
    }
    saveScenario({ schemaVersion: 1, id: 'months1', name: 'With Months', createdAt: new Date().toISOString(), inputs: withMonths })
    const loaded = loadAllScenarios()
    expect(loaded[0].inputs.spendingMonths).toEqual({ bathroom: 6, car_purchase: 12 })
  })

  it('corrupt localStorage entry does not crash — returns empty array', () => {
    localStorage.setItem('equity-chaser:scenarios', 'garbage}}}')
    expect(() => loadAllScenarios()).not.toThrow()
    expect(loadAllScenarios()).toEqual([])
  })
})
