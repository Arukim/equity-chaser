import type {
  PropertyType, AreaSize, BuildingAge, SuburbArea,
  SpendingItem, GrowthRates, OptionEntry,
} from './types'

// ─── Constants ────────────────────────────────────────────────────────────────

export const USABLE_EQUITY_LVR = 0.80

// ─── Suburb Presets ───────────────────────────────────────────────────────────
// To add a new suburb: append one object here. Zero tsx changes required.

export interface SuburbPreset {
  id: SuburbArea
  label: string
  growthRates: GrowthRates
}

export const SUBURB_PRESETS: SuburbPreset[] = [
  { id: 'hills',            label: 'Hills District',      growthRates: { low: 3.0, mid: 5.5, high: 8.0 } },
  { id: 'shire',            label: 'Sutherland Shire',    growthRates: { low: 2.5, mid: 5.0, high: 7.5 } },
  { id: 'penrith',          label: 'Penrith',             growthRates: { low: 3.0, mid: 5.5, high: 8.5 } },
  { id: 'inner_west',       label: 'Inner West',          growthRates: { low: 2.0, mid: 4.5, high: 7.0 } },
  { id: 'northern_beaches', label: 'Northern Beaches',    growthRates: { low: 2.0, mid: 4.5, high: 7.0 } },
  { id: 'south_west',       label: 'South West Corridor', growthRates: { low: 3.5, mid: 6.0, high: 9.0 } },
]

// ─── Option Arrays (chip-group data sources) ──────────────────────────────────

export const PROPERTY_TYPE_OPTIONS: OptionEntry[] = [
  { id: 'apartment',  label: 'Apartment' },
  { id: 'duplex',     label: 'Duplex' },
  { id: 'townhouse',  label: 'Townhouse' },
  { id: 'house',      label: 'House' },
]

export const AREA_SIZE_OPTIONS: OptionEntry[] = [
  { id: 'small',   label: 'Small <60m²' },
  { id: 'medium',  label: 'Medium 60–120m²' },
  { id: 'large',   label: 'Large 120–200m²' },
  { id: 'xlarge',  label: 'XL 200m²+' },
]

export const BUILDING_AGE_OPTIONS: OptionEntry[] = [
  { id: 'new',     label: 'New 0–3yr' },
  { id: 'recent',  label: 'Recent 3–10yr' },
  { id: 'mid',     label: 'Mid 10–20yr' },
  { id: 'mature',  label: 'Mature 20–30yr' },
  { id: 'old',     label: 'Old 30yr+' },
]

// ─── Spending Catalogues ──────────────────────────────────────────────────────

export const UPGRADE_CATALOGUE: SpendingItem[] = [
  { id: 'bathroom',   label: 'Bathroom Renovation', category: 'upgrade', frequency: 'once', amount: 15000, enabled: false, executionMonth: 1 },
  { id: 'kitchen',    label: 'Kitchen Renovation',  category: 'upgrade', frequency: 'once', amount: 25000, enabled: false, executionMonth: 1 },
  { id: 'aircon',     label: 'Aircon Replacement',  category: 'upgrade', frequency: 'once', amount: 5000,  enabled: false, executionMonth: 1 },
  { id: 'flooring',   label: 'Flooring Upgrade',    category: 'upgrade', frequency: 'once', amount: 10000, enabled: false, executionMonth: 1 },
  { id: 'paint',      label: 'Paint & Cosmetic',    category: 'upgrade', frequency: 'once', amount: 5000,  enabled: false, executionMonth: 1 },
  { id: 'electrical', label: 'Electrical Rewire',   category: 'upgrade', frequency: 'once', amount: 8000,  enabled: false, executionMonth: 1 },
  { id: 'hotwater',   label: 'Hot Water System',    category: 'upgrade', frequency: 'once', amount: 2500,  enabled: false, executionMonth: 1 },
  { id: 'roof',       label: 'Roof Repair/Replace', category: 'upgrade', frequency: 'once', amount: 12000, enabled: false, executionMonth: 1 },
  { id: 'deck',       label: 'Deck / Outdoor Area', category: 'upgrade', frequency: 'once', amount: 18000, enabled: false, executionMonth: 1 },
  { id: 'landscape',  label: 'Landscaping',         category: 'upgrade', frequency: 'once', amount: 12000, enabled: false, executionMonth: 1 },
]

export const VEHICLE_CATALOGUE: SpendingItem[] = [
  { id: 'car_purchase', label: '2nd Car Purchase',      category: 'vehicle', frequency: 'once',    amount: 25000, enabled: false, executionMonth: 1, linkedItemId: 'car_running' },
  { id: 'car_running',  label: '2nd Car Running Costs', category: 'vehicle', frequency: 'monthly', amount: 500,   enabled: false, executionMonth: 1 },
]

export const LIFESTYLE_CATALOGUE: SpendingItem[] = [
  { id: 'school_primary',   label: 'Private School (Primary)',   category: 'education', frequency: 'annual', amount: 15000, enabled: false, executionMonth: 1 },
  { id: 'school_secondary', label: 'Private School (Secondary)', category: 'education', frequency: 'annual', amount: 25000, enabled: false, executionMonth: 1 },
  { id: 'gym',              label: 'Gym Membership',             category: 'lifestyle', frequency: 'annual', amount: 1200,  enabled: false, executionMonth: 1 },
  { id: 'pet',              label: 'Pet Costs',                  category: 'lifestyle', frequency: 'annual', amount: 2400,  enabled: false, executionMonth: 1 },
]

// ─── Growth Rate Resolver ─────────────────────────────────────────────────────

const TYPE_MODIFIER: Record<PropertyType, number> = {
  house: 0.3, duplex: 0.0, townhouse: 0.0, apartment: -0.3,
}
const AGE_MODIFIER: Record<BuildingAge, number> = {
  new: 0.5, recent: 0.2, mid: 0.0, mature: -0.3, old: -0.5,
}

/**
 * Returns low/mid/high annual growth rate percentages combining the suburb
 * baseline with property type and building age modifiers.
 */
export function getGrowthRates(
  suburbArea: SuburbArea,
  propertyType: PropertyType,
  buildingAge: BuildingAge,
): GrowthRates {
  const base = SUBURB_PRESETS.find((p) => p.id === suburbArea)!.growthRates
  const modifier = TYPE_MODIFIER[propertyType] + AGE_MODIFIER[buildingAge]
  return { low: base.low + modifier, mid: base.mid + modifier, high: base.high + modifier }
}

// ─── Preset Spending Generator ────────────────────────────────────────────────

const BASE_STRATA: Partial<Record<PropertyType, number>> = {
  apartment: 900, duplex: 600, townhouse: 500,
}
const AREA_STRATA_MULTIPLIER: Record<AreaSize, number> = {
  small: 0.8, medium: 1.0, large: 1.2, xlarge: 1.5,
}
const COUNCIL_RATES: Record<PropertyType, number> = {
  apartment: 1800, duplex: 2200, townhouse: 2500, house: 3200,
}
const WATER_RATES: Record<PropertyType, number> = {
  apartment: 900, duplex: 1100, townhouse: 1200, house: 1400,
}
const INSURANCE: Record<PropertyType, number> = {
  apartment: 1200, duplex: 1800, townhouse: 2200, house: 3500,
}
const MAINTENANCE_RATE: Record<BuildingAge, number> = {
  new: 0.003, recent: 0.005, mid: 0.008, mature: 0.012, old: 0.015,
}

/**
 * Returns default ongoing spending items for a property configuration.
 * All items are enabled=true (baseline holding costs), none are once-off.
 */
export function getPresetSpendings(
  propertyType: PropertyType,
  buildingAge: BuildingAge,
  areaSize: AreaSize,
  propertyValue: number,
): SpendingItem[] {
  const items: SpendingItem[] = []
  const baseStrata = BASE_STRATA[propertyType]

  if (baseStrata !== undefined) {
    items.push({
      id: 'preset_strata', label: 'Strata Fee', category: 'strata',
      frequency: 'monthly',
      amount: Math.round(baseStrata * AREA_STRATA_MULTIPLIER[areaSize]),
      enabled: true, executionMonth: 1,
    })
  }
  items.push({ id: 'preset_council', label: 'Council Rates', category: 'maintenance', frequency: 'annual', amount: COUNCIL_RATES[propertyType], enabled: true, executionMonth: 1 })
  items.push({ id: 'preset_water', label: 'Water Rates', category: 'maintenance', frequency: 'annual', amount: WATER_RATES[propertyType], enabled: true, executionMonth: 1 })
  items.push({ id: 'preset_insurance', label: 'Building Insurance', category: 'maintenance', frequency: 'annual', amount: INSURANCE[propertyType], enabled: true, executionMonth: 1 })
  items.push({ id: 'preset_maintenance', label: 'General Maintenance', category: 'maintenance', frequency: 'annual', amount: Math.round(propertyValue * MAINTENANCE_RATE[buildingAge]), enabled: true, executionMonth: 1 })

  return items
}
