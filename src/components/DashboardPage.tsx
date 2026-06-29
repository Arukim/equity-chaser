import { useState, useEffect, useMemo } from 'react'
import type { ScenarioInputs, SpendingItem, PropertyType, AreaSize, BuildingAge, SuburbArea } from '../logic/types'
import { calculateNSWStampDuty } from '../logic/StampDuty'
import { calculateMonthlyRepayment, calculateLVR, calculateOffsetBalance, calculateRepaymentSummary } from '../logic/LoanCalculator'
import { getGrowthRates, getPresetSpendings, UPGRADE_CATALOGUE, VEHICLE_CATALOGUE, LIFESTYLE_CATALOGUE } from '../logic/PropertyPresets'
import { calculateEquityForecast, calculateFinancialHealthWarnings, toMonthlyAmount } from '../logic/EquityProjection'
import { FORM_SECTIONS } from '../logic/uiConfig'
import { FormRenderer } from './FormRenderer'
import { ResultsMonitor } from './ResultsMonitor'
import { PresetSummaryBar } from './PresetSummaryBar'

function useLS<T>(key: string, def: T): [T, (v: T | ((p: T) => T)) => void] {
  const [s, set] = useState<T>(() => {
    try { const i = localStorage.getItem(key); return i ? JSON.parse(i) as T : def } catch { return def }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(s)) } catch { /* */ } }, [key, s])
  return [s, set]
}

export function DashboardPage() {
  const [approvedLoanAmount, setApprovedLoanAmount] = useLS<number>('approvedLoanAmount', 1000000)
  const [loanRate, setLoanRate]     = useLS<number>('loanRate', 6.05)
  const [minLvr, setMinLvr]         = useLS<number>('minLvr', 0.95)
  const [loanTermYears]             = useLS<number>('loanTermYears', 30)
  const [propertyValue, setPropVal] = useLS<number>('propertyValue', 700000)
  const [depositRequired, setDep]   = useLS<number>('depositRequired', 0.05)
  const [isFHB, setIsFHB]           = useLS<boolean>('isFirstHomeBuyer', true)
  const [savings, setSavings]       = useLS<number>('savings', 50000)
  const [budget, setBudget]         = useLS<number>('monthlyBudget', 5000)
  const [propType, setPropType]     = useLS<PropertyType>('propertyType', 'apartment')
  const [areaSize, setAreaSize]     = useLS<AreaSize>('areaSize', 'medium')
  const [buildAge, setBuildAge]     = useLS<BuildingAge>('buildingAge', 'recent')
  const [suburb, setSuburb]         = useLS<SuburbArea>('suburbArea', 'hills')
  const [enabledIds, setEnabledIds] = useLS<string[]>('enabledSpendingIds', [])
  const [customItems]               = useLS<SpendingItem[]>('customSpendings', [])
  const [execMonths, setExecMonths] = useLS<Record<string, number>>('spendingMonths', {})
  const [growthOverride]            = useLS<number | null>('growthRateOverride', null)
  const [rent, setRent]             = useLS<number>('currentRent', 0)
  const [renoMo, setRenoMo]         = useLS<number>('renovationMonths', 0)
  const [cpi, setCpi]               = useLS<number>('cpiRate', 3.5)

  const stampDuty  = useMemo(() => calculateNSWStampDuty(propertyValue, isFHB), [propertyValue, isFHB])
  const loan       = useMemo(() => Math.min(propertyValue * minLvr, propertyValue * (1 - depositRequired)), [propertyValue, minLvr, depositRequired])
  const lvr        = useMemo(() => calculateLVR(loan, propertyValue), [loan, propertyValue])
  const offset     = useMemo(() => calculateOffsetBalance(savings, propertyValue, loan, stampDuty), [savings, propertyValue, loan, stampDuty])
  const repayment  = useMemo(() => calculateMonthlyRepayment(loan, loanRate, loanTermYears), [loan, loanRate, loanTermYears])
  const repSummary = useMemo(() => calculateRepaymentSummary(loan, repayment, loanRate, offset, budget), [loan, repayment, loanRate, offset, budget])

  const presets      = useMemo(() => getPresetSpendings(propType, buildAge, areaSize, propertyValue), [propType, buildAge, areaSize, propertyValue])
  const catalogue    = useMemo(() => [...UPGRADE_CATALOGUE, ...VEHICLE_CATALOGUE, ...LIFESTYLE_CATALOGUE, ...customItems], [customItems])
  const allSpendings = useMemo<SpendingItem[]>(() => [
    ...presets,
    ...catalogue.map((i) => ({ ...i, enabled: enabledIds.includes(i.id), executionMonth: execMonths[i.id] ?? i.executionMonth })),
  ], [presets, catalogue, enabledIds, execMonths])

  const ongoing        = useMemo(() => allSpendings.filter((s) => s.enabled && s.frequency !== 'once'), [allSpendings])
  const oneOffs        = useMemo(() => allSpendings.filter((s) => s.enabled && s.frequency === 'once'), [allSpendings])
  const ongoingMonthly = useMemo(() => ongoing.reduce((s, i) => s + toMonthlyAmount(i), 0), [ongoing])
  const oneOffTotal    = useMemo(() => oneOffs.reduce((s, i) => s + i.amount, 0), [oneOffs])
  const usableNow      = useMemo(() => propertyValue * 0.80 - loan, [propertyValue, loan])

  const growthRates = useMemo(() =>
    growthOverride !== null
      ? { low: growthOverride, mid: growthOverride, high: growthOverride }
      : getGrowthRates(suburb, propType, buildAge),
  [suburb, propType, buildAge, growthOverride])

  const forecast = useMemo(() => calculateEquityForecast({
    propertyValue, loanAmount: loan, annualRate: loanRate,
    initialOffsetBalance: offset, monthlyRepayment: repayment, monthlyBudget: budget,
    ongoingItems: ongoing, oneOffItems: oneOffs, growthRates,
    cpiRate: cpi, currentRent: rent, renovationMonths: renoMo,
  }), [propertyValue, loan, loanRate, offset, repayment, budget, ongoing, oneOffs, growthRates, cpi, rent, renoMo])

  const warnings = useMemo(() => calculateFinancialHealthWarnings({
    initialOffsetBalance: offset, monthlyRepayment: repayment,
    baseMonthlyOngoing: ongoingMonthly, monthlyBudget: budget, lvr,
    currentRent: rent, renovationMonths: renoMo,
  }), [offset, repayment, ongoingMonthly, budget, lvr, rent, renoMo])

  function handleChange<K extends keyof ScenarioInputs>(key: K, value: ScenarioInputs[K]) {
    const m: Partial<Record<keyof ScenarioInputs, (v: unknown) => void>> = {
      approvedLoanAmount: (v) => setApprovedLoanAmount(v as number),
      loanRate:           (v) => setLoanRate(v as number),
      minLvr:             (v) => setMinLvr(v as number),
      propertyValue:      (v) => setPropVal(v as number),
      depositRequired:    (v) => setDep(v as number),
      isFirstHomeBuyer:   (v) => setIsFHB(v as boolean),
      savings:            (v) => setSavings(v as number),
      monthlyBudget:      (v) => setBudget(v as number),
      propertyType:       (v) => setPropType(v as PropertyType),
      areaSize:           (v) => setAreaSize(v as AreaSize),
      buildingAge:        (v) => setBuildAge(v as BuildingAge),
      suburbArea:         (v) => setSuburb(v as SuburbArea),
      currentRent:        (v) => setRent(v as number),
      renovationMonths:   (v) => setRenoMo(v as number),
      cpiRate:            (v) => setCpi(v as number),
    }
    m[key]?.(value)
  }

  function handleToggle(id: string, linkedId?: string) {
    setEnabledIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      if (linkedId) {
        if (next.includes(id) && !next.includes(linkedId)) return [...next, linkedId]
        if (!next.includes(id) && next.includes(linkedId)) return next.filter((x) => x !== linkedId)
      }
      return next
    })
  }

  function handleMonthChange(id: string, month: number) {
    setExecMonths((prev) => ({ ...prev, [id]: month }))
  }

  const inputs: ScenarioInputs = {
    approvedLoanAmount, loanRate, minLvr, loanTermYears, propertyValue, depositRequired,
    savings, monthlyBudget: budget, isFirstHomeBuyer: isFHB, propertyType: propType,
    areaSize, buildingAge: buildAge, suburbArea: suburb, enabledSpendingIds: enabledIds,
    customSpendings: customItems, growthRateOverride: growthOverride,
    currentRent: rent, renovationMonths: renoMo, cpiRate: cpi,
  }

  return (
    <div className="dashboard">
      <div className="dashboard__left">
        <FormRenderer
          sections={FORM_SECTIONS} values={inputs} onChange={handleChange}
          onToggleSpending={handleToggle} onExecutionMonthChange={handleMonthChange}
          allSpendings={allSpendings}
        />
        <PresetSummaryBar monthlyOngoing={ongoingMonthly} oneOffTotal={oneOffTotal} />
      </div>
      <div className="dashboard__right">
        <ResultsMonitor
          monthlyRepayment={repayment} offsetBalance={offset} stampDuty={stampDuty}
          actualLoanAmount={loan} lvr={lvr} usableEquityNow={usableNow}
          repaymentMonths={repSummary.monthsTaken} totalInterest={repSummary.totalInterest}
          totalPayments={repSummary.totalPayments} warnings={warnings}
          forecast={forecast} monthlyOngoingBase={ongoingMonthly}
        />
      </div>
    </div>
  )
}
