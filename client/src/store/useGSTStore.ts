import { create } from 'zustand'
import type {
  FiraRecord,
  InvoiceRecord,
  MatchResult,
  Rfd01Statement3BExport,
  Rfd01Statement3BRow,
} from '../types'

export type AppStep = 'upload' | 'match' | 'rfd' | 'download'
export type TaxQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export interface GSTState {
  sessionId: string | null
  taxPeriod: string
  financialYear: string
  taxQuarter: TaxQuarter
  firas: FiraRecord[]
  invoices: InvoiceRecord[]
  matchResults: MatchResult[]
  rfdExport: Rfd01Statement3BExport | null
  statement3BRows: Rfd01Statement3BRow[] | null
  skippedMatchRowIds: string[]
  currentStep: AppStep
  setSessionId: (sessionId: string | null) => void
  setTaxPeriod: (taxPeriod: string) => void
  setFinancialYear: (fy: string) => void
  setTaxQuarter: (q: TaxQuarter) => void
  syncTaxPeriodFromQuarter: () => void
  setFiras: (firas: FiraRecord[]) => void
  setInvoices: (invoices: InvoiceRecord[]) => void
  setMatchResults: (matchResults: MatchResult[]) => void
  setRfdExport: (rfdExport: Rfd01Statement3BExport | null) => void
  setStatement3BRows: (rows: Rfd01Statement3BRow[] | null) => void
  addSkippedMatchRow: (id: string) => void
  removeSkippedMatchRow: (id: string) => void
  setCurrentStep: (step: AppStep) => void
  /** Clears uploads, matches, and report in the client store; keeps tax period / FY. */
  clearWorkflowData: () => void
  reset: () => void
}

const initialState = {
  sessionId: null as string | null,
  taxPeriod: 'Q3 FY 2024–25',
  financialYear: '2024–25',
  taxQuarter: 'Q3' as TaxQuarter,
  firas: [] as FiraRecord[],
  invoices: [] as InvoiceRecord[],
  matchResults: [] as MatchResult[],
  rfdExport: null as Rfd01Statement3BExport | null,
  statement3BRows: null as Rfd01Statement3BRow[] | null,
  skippedMatchRowIds: [] as string[],
  currentStep: 'upload' as AppStep,
}

export const useGSTStore = create<GSTState>((set, get) => ({
  ...initialState,
  setSessionId: (sessionId) => set({ sessionId }),
  setTaxPeriod: (taxPeriod) => set({ taxPeriod }),
  setFinancialYear: (financialYear) => set({ financialYear }),
  setTaxQuarter: (taxQuarter) => set({ taxQuarter }),
  syncTaxPeriodFromQuarter: () => {
    const { taxQuarter, financialYear } = get()
    set({ taxPeriod: `${taxQuarter} FY ${financialYear}` })
  },
  setFiras: (firas) => set({ firas }),
  setInvoices: (invoices) => set({ invoices }),
  setMatchResults: (matchResults) => set({ matchResults }),
  setRfdExport: (rfdExport) => set({ rfdExport }),
  setStatement3BRows: (statement3BRows) => set({ statement3BRows }),
  addSkippedMatchRow: (id) =>
    set((s) => ({
      skippedMatchRowIds: s.skippedMatchRowIds.includes(id)
        ? s.skippedMatchRowIds
        : [...s.skippedMatchRowIds, id],
    })),
  removeSkippedMatchRow: (id) =>
    set((s) => ({
      skippedMatchRowIds: s.skippedMatchRowIds.filter((x) => x !== id),
    })),
  setCurrentStep: (currentStep) => set({ currentStep }),
  clearWorkflowData: () =>
    set({
      firas: [],
      invoices: [],
      matchResults: [],
      rfdExport: null,
      statement3BRows: null,
      skippedMatchRowIds: [],
      sessionId: null,
      currentStep: 'upload',
    }),
  reset: () => set(initialState),
}))
