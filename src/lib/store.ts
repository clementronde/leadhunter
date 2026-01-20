import { create } from 'zustand'
import { Company, LeadFilters, SearchScan, DashboardStats, LeadStatus } from '@/types'

// ============================================
// Leads Store
// ============================================
interface LeadsState {
  // Data
  leads: Company[]
  selectedLead: Company | null
  filters: LeadFilters
  
  // UI State
  isLoading: boolean
  error: string | null
  
  // Actions
  setLeads: (leads: Company[]) => void
  addLead: (lead: Company) => void
  updateLead: (id: string, updates: Partial<Company>) => void
  deleteLead: (id: string) => void
  selectLead: (lead: Company | null) => void
  setFilters: (filters: LeadFilters) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useLeadsStore = create<LeadsState>((set) => ({
  leads: [],
  selectedLead: null,
  filters: {},
  isLoading: false,
  error: null,
  
  setLeads: (leads) => set({ leads }),
  
  addLead: (lead) => set((state) => ({ 
    leads: [lead, ...state.leads] 
  })),
  
  updateLead: (id, updates) => set((state) => ({
    leads: state.leads.map((lead) =>
      lead.id === id ? { ...lead, ...updates } : lead
    ),
    selectedLead: state.selectedLead?.id === id 
      ? { ...state.selectedLead, ...updates }
      : state.selectedLead
  })),
  
  deleteLead: (id) => set((state) => ({
    leads: state.leads.filter((lead) => lead.id !== id),
    selectedLead: state.selectedLead?.id === id ? null : state.selectedLead
  })),
  
  selectLead: (lead) => set({ selectedLead: lead }),
  
  setFilters: (filters) => set({ filters }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
}))

// ============================================
// Scanner Store
// ============================================
interface ScannerState {
  scans: SearchScan[]
  currentScan: SearchScan | null
  isScanning: boolean
  
  setScans: (scans: SearchScan[]) => void
  addScan: (scan: SearchScan) => void
  updateScan: (id: string, updates: Partial<SearchScan>) => void
  setCurrentScan: (scan: SearchScan | null) => void
  setScanning: (scanning: boolean) => void
}

export const useScannerStore = create<ScannerState>((set) => ({
  scans: [],
  currentScan: null,
  isScanning: false,
  
  setScans: (scans) => set({ scans }),
  
  addScan: (scan) => set((state) => ({ 
    scans: [scan, ...state.scans],
    currentScan: scan
  })),
  
  updateScan: (id, updates) => set((state) => ({
    scans: state.scans.map((scan) =>
      scan.id === id ? { ...scan, ...updates } : scan
    ),
    currentScan: state.currentScan?.id === id
      ? { ...state.currentScan, ...updates }
      : state.currentScan
  })),
  
  setCurrentScan: (scan) => set({ currentScan: scan }),
  
  setScanning: (isScanning) => set({ isScanning }),
}))

// ============================================
// Dashboard Store
// ============================================
interface DashboardState {
  stats: DashboardStats | null
  isLoading: boolean
  
  setStats: (stats: DashboardStats) => void
  setLoading: (loading: boolean) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  isLoading: false,
  
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
}))

// ============================================
// UI Store (Modals, Sidebar, etc.)
// ============================================
interface UIState {
  sidebarOpen: boolean
  selectedView: 'table' | 'kanban'
  showAddLeadModal: boolean
  showScanModal: boolean
  
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSelectedView: (view: 'table' | 'kanban') => void
  setShowAddLeadModal: (show: boolean) => void
  setShowScanModal: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedView: 'table',
  showAddLeadModal: false,
  showScanModal: false,
  
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSelectedView: (selectedView) => set({ selectedView }),
  setShowAddLeadModal: (showAddLeadModal) => set({ showAddLeadModal }),
  setShowScanModal: (showScanModal) => set({ showScanModal }),
}))
