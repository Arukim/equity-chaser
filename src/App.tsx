import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import type { ScenarioInputs } from './logic/types'
import { HeaderToolbar } from './components/HeaderToolbar'
import { DashboardPage } from './components/DashboardPage'
import { ComparePage } from './components/ComparePage'
import './App.css'

const EMPTY_INPUTS: ScenarioInputs = {
  approvedLoanAmount: 0, loanRate: 0, minLvr: 0, loanTermYears: 30,
  propertyValue: 0, depositRequired: 0, savings: 0, monthlyBudget: 0,
  isFirstHomeBuyer: false, propertyType: 'apartment', areaSize: 'medium',
  buildingAge: 'recent', suburbArea: 'hills', enabledSpendingIds: [],
  customSpendings: [], growthRateOverride: null, currentRent: 0,
  renovationMonths: 0, cpiRate: 3.5, spendingMonths: {},
}

/** Incremented each time a scenario is loaded so DashboardPage's effect fires. */
type LoadedPayload = { inputs: ScenarioInputs; nonce: number }

function App() {
  // Live snapshot of what the Dashboard currently has — kept in sync via onInputsChange.
  const [liveInputs, setLiveInputs] = useState<ScenarioInputs>(EMPTY_INPUTS)
  // When the user clicks Load in the toolbar, this payload is sent to DashboardPage.
  const [loaded, setLoaded] = useState<LoadedPayload | null>(null)

  function handleLoad(inputs: ScenarioInputs) {
    setLoaded((prev) => ({ inputs, nonce: (prev?.nonce ?? 0) + 1 }))
  }

  return (
    <div className="app-shell">
      <HeaderToolbar
        currentInputs={liveInputs}
        onLoad={handleLoad}
      />
      <Routes>
        <Route
          path="/"
          element={
            <DashboardPage
              onInputsChange={setLiveInputs}
              loaded={loaded}
            />
          }
        />
        <Route path="/compare" element={<ComparePage />} />
      </Routes>
    </div>
  )
}

export default App
