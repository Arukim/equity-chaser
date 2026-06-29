import type { SectionConfig } from './types'
import {
  SUBURB_PRESETS, PROPERTY_TYPE_OPTIONS, AREA_SIZE_OPTIONS,
  BUILDING_AGE_OPTIONS, PRESTIGE_OPTIONS, UPGRADE_CATALOGUE, VEHICLE_CATALOGUE, LIFESTYLE_CATALOGUE,
} from './PropertyPresets'

/**
 * Registry mapping optionsKey strings to their config arrays.
 * Used by FieldRenderer to look up chip-group / checkbox-grid options by name.
 * Adding a new chip-group source = add one entry here. Zero tsx changes.
 */
export const CONFIG_REGISTRY: Record<string, unknown[]> = {
  PROPERTY_TYPE_OPTIONS,
  AREA_SIZE_OPTIONS,
  BUILDING_AGE_OPTIONS,
  PRESTIGE_OPTIONS,
  SUBURB_PRESETS,
  UPGRADE_CATALOGUE,
  VEHICLE_CATALOGUE,
  LIFESTYLE_CATALOGUE,
}

/**
 * The full form structure declared as data.
 * Adding a new section, field, or disclosure = edit this array only.
 * The FormRenderer maps over this to build the entire left column.
 */
export const FORM_SECTIONS: SectionConfig[] = [
  {
    id: 'loan',
    title: 'Loan Details',
    fields: [
      { id: 'approvedLoanAmount', label: 'Approved Loan Amount', control: 'currency' },
      { id: 'loanRate',           label: 'Interest Rate',        control: 'percent', step: 0.01 },
      { id: 'minLvr',             label: 'Max LVR',              control: 'percent', step: 1, min: 50, max: 100 },
    ],
  },
  {
    id: 'property',
    title: 'Property Details',
    fields: [
      { id: 'propertyValue',   label: 'Property Value',    control: 'currency' },
      { id: 'depositRequired', label: 'Required Deposit',  control: 'percent', step: 1, min: 0, max: 50 },
      { id: 'isFirstHomeBuyer', label: 'First Home Buyer', control: 'toggle' },
    ],
  },
  {
    id: 'financial',
    title: 'Financial Details',
    fields: [
      { id: 'savings',       label: 'Current Savings', control: 'currency' },
      { id: 'monthlyBudget', label: 'Monthly Budget',  control: 'currency' },
      { id: 'wageGrowthRate', label: 'Annual Income Growth', control: 'percent', step: 0.1, min: 0, max: 15 },
    ],
  },
  {
    id: 'profile',
    title: 'Property Profile',
    fields: [
      { id: 'propertyType', label: 'Type', control: 'chip-group', optionsKey: 'PROPERTY_TYPE_OPTIONS' },
      { id: 'areaSize',     label: 'Size', control: 'chip-group', optionsKey: 'AREA_SIZE_OPTIONS' },
      { id: 'buildingAge',  label: 'Age',  control: 'chip-group', optionsKey: 'BUILDING_AGE_OPTIONS' },
      { id: 'locationPrestige', label: 'Prestige', control: 'chip-group', optionsKey: 'PRESTIGE_OPTIONS' },
      { id: 'suburbArea',   label: 'Area', control: 'chip-group', optionsKey: 'SUBURB_PRESETS' },
    ],
  },
  {
    id: 'upgrades',
    title: 'Upgrades & One-Off Costs',
    fields: [
      { id: 'enabledSpendingIds', label: 'Upgrades', control: 'checkbox-grid', optionsKey: 'UPGRADE_CATALOGUE' },
    ],
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle & Vehicle Costs',
    disclosure: { toggleLabel: 'Include Lifestyle & Vehicle Costs?', defaultOpen: false },
    fields: [
      { id: 'enabledSpendingIds', label: 'Vehicle', control: 'checkbox-grid', optionsKey: 'VEHICLE_CATALOGUE' },
      { id: 'enabledSpendingIds', label: 'Lifestyle & Education', control: 'checkbox-grid', optionsKey: 'LIFESTYLE_CATALOGUE' },
    ],
  },
  {
    id: 'renovation',
    title: 'Renovation / Holding Phase',
    disclosure: { toggleLabel: 'Planning Renovations / Holding Phase?', defaultOpen: false },
    fields: [
      { id: 'currentRent',      label: 'Current Rent While Renovating', control: 'currency' },
      { id: 'renovationMonths', label: 'Renovation Period (months)',    control: 'number', min: 0, max: 60 },
      { id: 'cpiRate',          label: 'CPI Inflation Rate',            control: 'percent', step: 0.1, min: 0, max: 15 },
    ],
  },
]
