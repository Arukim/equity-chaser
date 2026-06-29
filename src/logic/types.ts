// ─── Property Classification ────────────────────────────────────────────────

export type PropertyType = 'apartment' | 'duplex' | 'townhouse' | 'house'
export type AreaSize = 'small' | 'medium' | 'large' | 'xlarge'
export type BuildingAge = 'new' | 'recent' | 'mid' | 'mature' | 'old'
export type SuburbArea =
  | 'hills'
  | 'shire'
  | 'penrith'
  | 'inner_west'
  | 'northern_beaches'
  | 'south_west'

// ─── Spending Items ──────────────────────────────────────────────────────────

export type SpendingCategory =
  | 'strata'
  | 'maintenance'
  | 'upgrade'
  | 'vehicle'
  | 'lifestyle'
  | 'education'
  | 'other'

export type SpendingFrequency = 'once' | 'monthly' | 'annual'

export interface SpendingItem {
  /** Unique stable identifier — referenced by enabledSpendingIds in state */
  id: string
  label: string
  category: SpendingCategory
  frequency: SpendingFrequency
  amount: number
  enabled: boolean
  /**
   * For frequency='once': which month (1-based) to deduct from offset.
   * Default 1 = at settlement. Only meaningful for once-off items.
   */
  executionMonth: number
  /**
   * When toggled on, also enable the item with this id (e.g. car purchase
   * auto-enables car running costs).
   */
  linkedItemId?: string
}

// ─── Growth Rates ────────────────────────────────────────────────────────────

export interface GrowthRates {
  low: number
  mid: number
  high: number
}

// ─── Equity Projection ──────────────────────────────────────────────────────

/** A point-in-time snapshot of equity position */
export interface EquitySnapshot {
  year: number
  propertyValue: number
  loanBalance: number
  /** propertyValue - loanBalance */
  grossEquity: number
  /** (propertyValue × 0.80) - loanBalance — actual borrowable funds */
  usableEquity: number
  /** Cumulative CPI-adjusted ongoing costs incurred to this point */
  totalCostsIncurred: number
  /** grossEquity - totalCostsIncurred */
  netEquityAfterCosts: number
  /** Remaining offset balance at this snapshot */
  offsetBalance: number
}

export interface ScenarioGrade {
  growthRate: number
  year5: EquitySnapshot
  year10: EquitySnapshot
}

export interface EquityForecast {
  low: ScenarioGrade
  mid: ScenarioGrade
  high: ScenarioGrade
}

// ─── Financial Health ────────────────────────────────────────────────────────

export type WarningType =
  | 'insufficient_buffer'
  | 'negative_cashflow'
  | 'high_lvr'
  | 'high_cost_ratio'
  | 'renovation_double_burn'

export interface FinancialHealthWarning {
  type: WarningType
  severity: 'danger' | 'warning'
  message: string
}

// ─── Scenario Storage ────────────────────────────────────────────────────────

/** All user-configurable inputs — snapshot of the entire form state */
export interface ScenarioInputs {
  approvedLoanAmount: number
  loanRate: number
  minLvr: number
  loanTermYears: number
  propertyValue: number
  depositRequired: number
  savings: number
  monthlyBudget: number
  isFirstHomeBuyer: boolean
  propertyType: PropertyType
  areaSize: AreaSize
  buildingAge: BuildingAge
  suburbArea: SuburbArea
  enabledSpendingIds: string[]
  customSpendings: SpendingItem[]
  growthRateOverride: number | null
  currentRent: number
  renovationMonths: number
  cpiRate: number
  /**
   * Per-item override of executionMonth for catalogue spending items.
   * Key = SpendingItem.id, value = month number (1-based).
   * Items not present here use their catalogue default executionMonth.
   */
  spendingMonths: Record<string, number>
}

/**
 * A named, persisted scenario.
 * schemaVersion is a literal — bump to 2 when ScenarioInputs adds new fields.
 * The migration handler in ScenarioStorage.ts fills in defaults for old records.
 */
export interface SavedScenario {
  schemaVersion: 1
  id: string
  name: string
  createdAt: string
  inputs: ScenarioInputs
}

// ─── UI Config ───────────────────────────────────────────────────────────────

/**
 * All control types the FieldRenderer registry knows how to draw.
 * Adding a brand-new control type requires one entry in the CONTROL_REGISTRY
 * inside FieldRenderer.tsx — no other tsx changes.
 */
export type ControlType =
  | 'chip-group'
  | 'checkbox-grid'
  | 'number'
  | 'currency'
  | 'percent'
  | 'toggle'

/** A generic option entry for chip-group and select controls */
export interface OptionEntry {
  id: string
  label: string
}

/** A single form field, declared as data */
export interface FieldConfig {
  /** Maps 1-to-1 with a key in ScenarioInputs */
  id: keyof ScenarioInputs
  label: string
  control: ControlType
  /** Name of the array in CONFIG_REGISTRY to map over (chip-group / checkbox-grid) */
  optionsKey?: string
  step?: number
  suffix?: string
  min?: number
  max?: number
}

/** A logical grouping of fields, optionally hidden behind a disclosure toggle */
export interface SectionConfig {
  id: string
  title: string
  /** When present, section starts collapsed and can be toggled open */
  disclosure?: {
    toggleLabel: string
    defaultOpen: boolean
  }
  fields: FieldConfig[]
}
