import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HeaderToolbar } from './HeaderToolbar'
import { loadAllScenarios } from '../logic/ScenarioStorage'
import type { ScenarioInputs } from '../logic/types'

// ─── localStorage stub ────────────────────────────────────────────────────────

const store = new Map<string, string>()
const localStorageMock = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
}
vi.stubGlobal('localStorage', localStorageMock)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeInputs(overrides: Partial<ScenarioInputs> = {}): ScenarioInputs {
  return {
    approvedLoanAmount: 1_000_000, loanRate: 6.05, minLvr: 0.80,
    loanTermYears: 30, propertyValue: 800_000, depositRequired: 0.20,
    savings: 200_000, monthlyBudget: 6_000, wageGrowthRate: 1.5, isFirstHomeBuyer: false,
    propertyType: 'apartment', areaSize: 'medium', buildingAge: 'recent', locationPrestige: 'norm',
    suburbArea: 'hills', enabledSpendingIds: [], customSpendings: [],
    growthRateOverride: null, currentRent: 0, renovationMonths: 0, cpiRate: 3.5,
    spendingMonths: {},
    ...overrides,
  }
}

function renderToolbar(inputs: ScenarioInputs, onLoad = vi.fn()) {
  return render(
    <MemoryRouter>
      <HeaderToolbar currentInputs={inputs} onLoad={onLoad} />
    </MemoryRouter>,
  )
}

/** Ensures the scenario dropdown is open; safe to call even if already open. */
function ensureMenuOpen() {
  // If the "+ Save Current" button is already visible, the menu is open.
  const alreadyOpen = document.body.textContent?.includes('+ Save Current')
    || document.body.textContent?.includes('No saved scenarios')
    || document.querySelector('.scenario-menu') !== null
  if (!alreadyOpen) {
    fireEvent.click(screen.getByRole('button', { name: /💾 Scenarios/i }))
  }
}

function saveScenarioViaUI(name: string) {
  // Ensure menu is open → click "+ Save Current" → type name → click Save
  ensureMenuOpen()
  fireEvent.click(screen.getByText('+ Save Current'))
  const input = screen.getByPlaceholderText(/surry hills/i)
  fireEvent.change(input, { target: { value: name } })
  fireEvent.click(screen.getByText('Save'))
  // After save, the save-form is hidden but the dropdown stays open — good.
}

beforeEach(() => {
  localStorage.clear()
})

// ─── Suite 1: Regression — saves do NOT overwrite each other ─────────────────

describe('HeaderToolbar — save does not overwrite previous scenario', () => {
  it('two saves with different inputs produce two independent stored scenarios', () => {
    const inputsA = makeInputs({ propertyValue: 700_000 })
    const inputsB = makeInputs({ propertyValue: 900_000 })

    const { rerender } = renderToolbar(inputsA)
    saveScenarioViaUI('Scenario A')

    rerender(
      <MemoryRouter>
        <HeaderToolbar currentInputs={inputsB} onLoad={vi.fn()} />
      </MemoryRouter>,
    )
    saveScenarioViaUI('Scenario B')

    const all = loadAllScenarios()
    expect(all).toHaveLength(2)
    expect(all[0].inputs.propertyValue).not.toBe(all[1].inputs.propertyValue)
  })

  it('each saved scenario captures the inputs that were live at save time', () => {
    const inputsA = makeInputs({ propertyValue: 700_000 })
    const inputsB = makeInputs({ propertyValue: 900_000 })

    const { rerender } = renderToolbar(inputsA)
    saveScenarioViaUI('A')

    rerender(
      <MemoryRouter>
        <HeaderToolbar currentInputs={inputsB} onLoad={vi.fn()} />
      </MemoryRouter>,
    )
    saveScenarioViaUI('B')

    const all = loadAllScenarios()
    const savedA = all.find((s) => s.name === 'A')!
    const savedB = all.find((s) => s.name === 'B')!
    expect(savedA.inputs.propertyValue).toBe(700_000)
    expect(savedB.inputs.propertyValue).toBe(900_000)
  })
})

// ─── Suite 2: Update (overwrite) existing slot ───────────────────────────────

describe('HeaderToolbar — update (overwrite) existing slot', () => {
  it('clicking ↺ on a slot shows the overwrite confirmation UI', () => {
    const inputs = makeInputs({ propertyValue: 700_000 })
    renderToolbar(inputs)
    saveScenarioViaUI('Slot A')

    // The menu stays open — find and click the update button
    const updateBtn = screen.getByTitle('Update this slot with current inputs')
    fireEvent.click(updateBtn)

    expect(screen.getByText('Overwrite?')).toBeTruthy()
    expect(screen.getByText('✓')).toBeTruthy()
  })

  it('confirming update overwrites the slot inputs while preserving id and name', () => {
    const inputsOld = makeInputs({ propertyValue: 700_000 })
    const inputsNew = makeInputs({ propertyValue: 999_000 })

    const { rerender } = renderToolbar(inputsOld)
    saveScenarioViaUI('My Slot')

    // Switch to new inputs
    rerender(
      <MemoryRouter>
        <HeaderToolbar currentInputs={inputsNew} onLoad={vi.fn()} />
      </MemoryRouter>,
    )

    ensureMenuOpen()
    fireEvent.click(screen.getByTitle('Update this slot with current inputs'))
    fireEvent.click(screen.getByText('✓'))

    const all = loadAllScenarios()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('My Slot')
    expect(all[0].inputs.propertyValue).toBe(999_000)
  })

  it('cancelling update (✕) dismisses the confirmation without changing storage', () => {
    const inputsOld = makeInputs({ propertyValue: 700_000 })
    const inputsNew = makeInputs({ propertyValue: 999_000 })

    const { rerender } = renderToolbar(inputsOld)
    saveScenarioViaUI('Stable Slot')

    rerender(
      <MemoryRouter>
        <HeaderToolbar currentInputs={inputsNew} onLoad={vi.fn()} />
      </MemoryRouter>,
    )

    ensureMenuOpen()
    fireEvent.click(screen.getByTitle('Update this slot with current inputs'))
    // Cancel
    fireEvent.click(screen.getByText('✕'))

    const all = loadAllScenarios()
    expect(all).toHaveLength(1)
    expect(all[0].inputs.propertyValue).toBe(700_000) // unchanged
    expect(screen.queryByText('Overwrite?')).toBeNull()
  })

  it('update preserves id, name, createdAt and only replaces inputs', () => {
    const inputsOld = makeInputs({ propertyValue: 700_000 })
    const inputsNew = makeInputs({ propertyValue: 850_000 })

    const { rerender } = renderToolbar(inputsOld)
    saveScenarioViaUI('Preserved Meta')

    const [before] = loadAllScenarios()

    rerender(
      <MemoryRouter>
        <HeaderToolbar currentInputs={inputsNew} onLoad={vi.fn()} />
      </MemoryRouter>,
    )

    ensureMenuOpen()
    fireEvent.click(screen.getByTitle('Update this slot with current inputs'))
    fireEvent.click(screen.getByText('✓'))

    const [after] = loadAllScenarios()
    expect(after.id).toBe(before.id)
    expect(after.name).toBe(before.name)
    expect(after.createdAt).toBe(before.createdAt)
    expect(after.inputs.propertyValue).toBe(850_000)
  })
})

// ─── Suite 3: spendingMonths are saved and applied on Load ───────────────────

describe('HeaderToolbar — spendingMonths round-trip', () => {
  it('spendingMonths are persisted in the stored scenario', () => {
    const inputs = makeInputs({ spendingMonths: { bathroom: 6, car_purchase: 12 } })
    renderToolbar(inputs)
    saveScenarioViaUI('With Months')

    const all = loadAllScenarios()
    expect(all).toHaveLength(1)
    expect(all[0].inputs.spendingMonths).toEqual({ bathroom: 6, car_purchase: 12 })
  })

  it('clicking Load calls onLoad with the full inputs including spendingMonths', () => {
    const inputs = makeInputs({ spendingMonths: { bathroom: 6 } })
    const onLoad = vi.fn()

    renderToolbar(inputs, onLoad)
    saveScenarioViaUI('Months Scenario')

    // The menu stays open after save — just click Load directly
    fireEvent.click(screen.getByText('Load'))

    expect(onLoad).toHaveBeenCalledOnce()
    const received = onLoad.mock.calls[0][0] as ScenarioInputs
    expect(received.spendingMonths).toEqual({ bathroom: 6 })
  })
})
