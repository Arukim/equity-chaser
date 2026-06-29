import { Routes, Route } from 'react-router-dom'
import type { ScenarioInputs } from './logic/types'
import { HeaderToolbar } from './components/HeaderToolbar'
import { DashboardPage } from './components/DashboardPage'
import { ComparePage } from './components/ComparePage'
import './App.css'

// Sentinel inputs used when the user is on /compare and has no active form.
// HeaderToolbar only writes these to localStorage if the user clicks "+ Save Current".
const EMPTY_INPUTS: ScenarioInputs = {
  approvedLoanAmount: 0, loanRate: 0, minLvr: 0, loanTermYears: 30,
  propertyValue: 0, depositRequired: 0, savings: 0, monthlyBudget: 0,
  isFirstHomeBuyer: false, propertyType: 'apartment', areaSize: 'medium',
  buildingAge: 'recent', suburbArea: 'hills', enabledSpendingIds: [],
  customSpendings: [], growthRateOverride: null, currentRent: 0,
  renovationMonths: 0, cpiRate: 3.5,
}

function App() {
  return (
    <div className="app-shell">
      <HeaderToolbar
        currentInputs={EMPTY_INPUTS}
        onLoad={() => { /* noop on /compare — DashboardPage manages its own state */ }}
      />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/compare" element={<ComparePage />} />
      </Routes>
    </div>
  )
}

export default App
