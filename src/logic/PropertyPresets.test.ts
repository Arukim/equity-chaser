import { describe, it, expect } from 'vitest'
import {
  SUBURB_PRESETS, BUILDING_AGE_OPTIONS, PROPERTY_TYPE_OPTIONS,
  AREA_SIZE_OPTIONS, UPGRADE_CATALOGUE, VEHICLE_CATALOGUE,
  LIFESTYLE_CATALOGUE, getGrowthRates, getPresetSpendings,
} from './PropertyPresets'

describe('SUBURB_PRESETS', () => {
  it('contains all 6 required areas', () => {
    const ids = SUBURB_PRESETS.map((p) => p.id)
    ;['hills','shire','penrith','inner_west','northern_beaches','south_west']
      .forEach((id) => expect(ids).toContain(id))
  })
  it('every preset has low < mid < high growth rate', () => {
    for (const p of SUBURB_PRESETS) {
      expect(p.growthRates.low).toBeLessThan(p.growthRates.mid)
      expect(p.growthRates.mid).toBeLessThan(p.growthRates.high)
    }
  })
  it('every preset has a non-empty label', () => {
    for (const p of SUBURB_PRESETS) expect(p.label.length).toBeGreaterThan(0)
  })
})

describe('Option arrays', () => {
  it('PROPERTY_TYPE_OPTIONS has 4 entries', () => {
    expect(PROPERTY_TYPE_OPTIONS.map((o) => o.id)).toEqual(
      expect.arrayContaining(['apartment','duplex','townhouse','house'])
    )
    expect(PROPERTY_TYPE_OPTIONS).toHaveLength(4)
  })
  it('AREA_SIZE_OPTIONS has 4 entries', () => {
    expect(AREA_SIZE_OPTIONS.map((o) => o.id)).toEqual(
      expect.arrayContaining(['small','medium','large','xlarge'])
    )
    expect(AREA_SIZE_OPTIONS).toHaveLength(4)
  })
  it('BUILDING_AGE_OPTIONS has 5 entries', () => {
    expect(BUILDING_AGE_OPTIONS.map((o) => o.id)).toEqual(
      expect.arrayContaining(['new','recent','mid','mature','old'])
    )
    expect(BUILDING_AGE_OPTIONS).toHaveLength(5)
  })
})

describe('Catalogues shape', () => {
  it('UPGRADE_CATALOGUE: disabled, once, executionMonth=1, amount>0', () => {
    for (const item of UPGRADE_CATALOGUE) {
      expect(item.enabled).toBe(false)
      expect(item.frequency).toBe('once')
      expect(item.executionMonth).toBe(1)
      expect(item.amount).toBeGreaterThan(0)
    }
  })
  it('VEHICLE_CATALOGUE: car_purchase once linked to car_running monthly', () => {
    const p = VEHICLE_CATALOGUE.find((i) => i.id === 'car_purchase')!
    const r = VEHICLE_CATALOGUE.find((i) => i.id === 'car_running')!
    expect(p.linkedItemId).toBe('car_running')
    expect(p.frequency).toBe('once')
    expect(r.frequency).toBe('monthly')
    for (const i of VEHICLE_CATALOGUE) expect(i.enabled).toBe(false)
  })
  it('LIFESTYLE_CATALOGUE: all disabled, amount>0', () => {
    for (const item of LIFESTYLE_CATALOGUE) {
      expect(item.enabled).toBe(false)
      expect(item.amount).toBeGreaterThan(0)
    }
  })
})

describe('getGrowthRates', () => {
  const base = () => SUBURB_PRESETS.find((p) => p.id === 'hills')!.growthRates
  it('townhouse + mid returns suburb base unchanged', () => {
    const r = getGrowthRates('hills', 'townhouse', 'mid')
    expect(r.low).toBeCloseTo(base().low, 5)
    expect(r.mid).toBeCloseTo(base().mid, 5)
  })
  it('house +0.3, apartment -0.3', () => {
    const b = getGrowthRates('hills', 'townhouse', 'mid')
    expect(getGrowthRates('hills', 'house', 'mid').low).toBeCloseTo(b.low + 0.3, 5)
    expect(getGrowthRates('hills', 'apartment', 'mid').low).toBeCloseTo(b.low - 0.3, 5)
  })
  it('new +0.5, old -0.5', () => {
    const b = getGrowthRates('hills', 'townhouse', 'mid')
    expect(getGrowthRates('hills', 'townhouse', 'new').low).toBeCloseTo(b.low + 0.5, 5)
    expect(getGrowthRates('hills', 'townhouse', 'old').low).toBeCloseTo(b.low - 0.5, 5)
  })
  it('stacks house + new = +0.8', () => {
    const b = getGrowthRates('hills', 'townhouse', 'mid')
    expect(getGrowthRates('hills', 'house', 'new').low).toBeCloseTo(b.low + 0.8, 5)
  })
})

describe('getPresetSpendings', () => {
  it('house has no strata', () => {
    expect(getPresetSpendings('house','mid','medium',700000)
      .find((i) => i.category === 'strata')).toBeUndefined()
  })
  it('apartment has monthly strata > 0', () => {
    const s = getPresetSpendings('apartment','mid','medium',700000)
      .find((i) => i.category === 'strata')!
    expect(s.amount).toBeGreaterThan(0)
    expect(s.frequency).toBe('monthly')
  })
  it('all items enabled=true, not once-off, amount>0', () => {
    for (const item of getPresetSpendings('apartment','mid','medium',700000)) {
      expect(item.enabled).toBe(true)
      expect(item.frequency).not.toBe('once')
      expect(item.amount).toBeGreaterThan(0)
    }
  })
  it('maintenance scales with age: new < recent < mid < mature < old', () => {
    const m = (age: Parameters<typeof getPresetSpendings>[1]) =>
      getPresetSpendings('house', age, 'medium', 700000)
        .find((i) => i.id === 'preset_maintenance')!.amount
    expect(m('new')).toBeLessThan(m('recent'))
    expect(m('recent')).toBeLessThan(m('mid'))
    expect(m('mid')).toBeLessThan(m('mature'))
    expect(m('mature')).toBeLessThan(m('old'))
  })
  it('large strata > small strata for apartment', () => {
    const s = (sz: Parameters<typeof getPresetSpendings>[2]) =>
      getPresetSpendings('apartment','mid', sz, 700000)
        .find((i) => i.category === 'strata')!.amount
    expect(s('large')).toBeGreaterThan(s('small'))
  })
})
