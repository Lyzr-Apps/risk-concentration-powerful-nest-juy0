'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import {
  FiAlertTriangle, FiMapPin, FiShield, FiActivity, FiTrendingUp,
  FiClock, FiSearch, FiChevronRight, FiChevronDown, FiDownload,
  FiRefreshCw, FiBarChart2, FiLayers, FiAlertCircle, FiCheckCircle,
  FiXCircle, FiInfo, FiMenu, FiX, FiHome, FiFileText, FiList
} from 'react-icons/fi'

// ============================================================
// CONSTANTS
// ============================================================
const AGENT_IDS = {
  RISK_COORDINATOR: '6995fe6832e31923e7a26a7d',
  ALERT_REMEDIATION: '6995fe695f53eff9118e8e56',
}

const GEOGRAPHIES = [
  'Florida - Southeast', 'Florida - Gulf Coast', 'Florida - Panhandle',
  'California - North', 'California - Southern', 'California - Bay Area',
  'Texas - Gulf Coast', 'Texas - North', 'Texas - Central',
  'Louisiana', 'Mississippi', 'Alabama - Gulf',
  'New York - Metro', 'New York - Long Island', 'New Jersey - Coast',
  'South Carolina - Coast', 'North Carolina - Coast',
  'Georgia - Coast', 'Virginia - Coast',
  'Oklahoma', 'Kansas', 'Nebraska',
  'Colorado - Front Range', 'Arizona - Phoenix Metro',
  'Washington - Puget Sound', 'Oregon - Coast',
  'Hawaii', 'Puerto Rico',
  'Midwest Tornado Alley', 'Northeast Corridor',
]

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
  Critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' },
  High: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  Medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' },
  low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
  Low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' },
}

function getSeverityStyle(severity: string) {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS['medium']
}

// ============================================================
// TYPES
// ============================================================
interface LobBreakdown {
  line_of_business: string
  policy_count: number
  insured_value: string
  percentage: number
}

interface ExposureSummary {
  total_policies: number
  total_insured_value: string
  concentration_score: number
  top_lob: string
  lob_breakdown: LobBreakdown[]
}

interface CatastropheContext {
  risk_rating: number
  risk_trend: string
  top_perils: string[]
  historical_loss_summary: string
  return_period_100yr: string
  return_period_250yr: string
}

interface ClimateIntelligence {
  climate_risk_score: number
  current_conditions: string
  active_warnings: string[]
  emerging_threats: string[]
  seasonal_outlook: string
}

interface ThresholdBreach {
  metric: string
  current_value: number
  threshold: number
  severity: string
  zone: string
}

interface RiskConcentrationData {
  geography: string
  overall_risk_rating: number
  executive_summary: string
  exposure_summary: ExposureSummary
  catastrophe_context: CatastropheContext
  climate_intelligence: ClimateIntelligence
  threshold_breaches: ThresholdBreach[]
  recommendations: string[]
}

interface RemedialAction {
  action_type: string
  description: string
  timeline: string
  expected_impact: string
}

interface AlertItem {
  alert_id: string
  severity: string
  zone: string
  peril_type: string
  exposure_value: string
  breach_description: string
  remedial_actions: RemedialAction[]
}

interface AlertSummaryData {
  total_alerts: number
  critical_count: number
  high_count: number
  medium_count: number
}

interface AlertRemediationData {
  analysis_geography: string
  alert_summary: AlertSummaryData
  alerts: AlertItem[]
  implementation_timeline: string
  overall_risk_reduction: string
}

interface HistoryEntry {
  id: string
  date: string
  geography: string
  alertCount: number
  highestSeverity: string
  status: 'Actioned' | 'Pending' | 'Dismissed'
  concentrationData?: RiskConcentrationData
  alertData?: AlertRemediationData
}

type Screen = 'dashboard' | 'analysis' | 'alerts' | 'history'

// ============================================================
// HELPER COMPONENTS
// ============================================================
function RiskGauge({ value, max = 10, label }: { value: number; max?: number; label: string }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct >= 70 ? 'text-red-600' : pct >= 40 ? 'text-orange-500' : 'text-green-600'
  const barColor = pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-orange-400' : 'bg-green-500'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`text-sm font-bold ${color}`}>{value}/{max}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = getSeverityStyle(severity)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text} border ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {severity}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-lg border border-border/40 p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="h-3 bg-muted rounded w-4/6" />
      </div>
    </div>
  )
}

function LoadingOverlay({ step }: { step: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-muted" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">{step}</p>
      <div className="grid grid-cols-3 gap-4 w-full max-w-3xl mt-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">{icon}</div>
      <h3 className="text-lg font-semibold font-serif">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  )
}

function MetricTile({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card rounded-lg border border-border/40 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
      </div>
      <div className="mt-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold font-serif mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ============================================================
// GEOGRAPHY INPUT COMPONENT
// ============================================================
function GeographyInput({ value, onChange, onSubmit, loading, placeholder }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; loading: boolean; placeholder?: string
}) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!value.trim()) return GEOGRAPHIES.slice(0, 10)
    return GEOGRAPHIES.filter(g => g.toLowerCase().includes(value.toLowerCase()))
  }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative flex gap-3 w-full">
      <div className="relative flex-1">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onSubmit(); setShowSuggestions(false) } }}
          placeholder={placeholder || 'Enter geography (e.g., Florida - Southeast)'}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filtered.map(g => (
              <button
                key={g}
                onClick={() => { onChange(g); setShowSuggestions(false) }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/20 transition-colors flex items-center gap-2"
              >
                <FiMapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                {g}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => { if (value.trim()) { onSubmit(); setShowSuggestions(false) } }}
        disabled={loading || !value.trim()}
        className="px-5 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap flex items-center gap-2"
      >
        {loading ? <FiRefreshCw className="w-4 h-4 animate-spin" /> : <FiBarChart2 className="w-4 h-4" />}
        Analyze Concentration
      </button>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function Page() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebar, setMobileSidebar] = useState(false)

  // Analysis state
  const [geography, setGeography] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState('')
  const [concentrationData, setConcentrationData] = useState<RiskConcentrationData | null>(null)
  const [analysisError, setAnalysisError] = useState('')

  // Alert state
  const [alertGeography, setAlertGeography] = useState('')
  const [alertLoading, setAlertLoading] = useState(false)
  const [alertData, setAlertData] = useState<AlertRemediationData | null>(null)
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null)
  const [alertError, setAlertError] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string[]>([])

  // History state
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historySearch, setHistorySearch] = useState('')
  const [selectedHistory, setSelectedHistory] = useState<HistoryEntry | null>(null)

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('catrisk_history')
      if (stored) setHistory(JSON.parse(stored))
    } catch { /* empty */ }
  }, [])

  const saveHistory = useCallback((entries: HistoryEntry[]) => {
    setHistory(entries)
    try { localStorage.setItem('catrisk_history', JSON.stringify(entries)) } catch { /* empty */ }
  }, [])

  // ============================================================
  // AGENT CALLS
  // ============================================================
  const handleAnalyzeConcentration = useCallback(async (geo: string) => {
    if (!geo.trim()) return
    setLoading(true)
    setAnalysisError('')
    setConcentrationData(null)

    const steps = [
      'Analyzing exposure data...',
      'Fetching catastrophe context...',
      'Checking climate conditions...',
      'Aggregating risk profile...',
    ]
    let stepIdx = 0
    setLoadingStep(steps[0])
    const interval = setInterval(() => {
      stepIdx++
      if (stepIdx < steps.length) setLoadingStep(steps[stepIdx])
    }, 3000)

    try {
      const result = await callAIAgent(
        `Analyze risk concentration for ${geo}. Provide complete exposure data, catastrophe context, and climate intelligence with threshold breach analysis.`,
        AGENT_IDS.RISK_COORDINATOR
      )

      clearInterval(interval)

      if (result.success && result.response?.result) {
        const data = result.response.result as unknown as RiskConcentrationData
        setConcentrationData(data)
        setAlertGeography(data.geography || geo)
        setScreen('analysis')

        // Save to history
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          geography: data.geography || geo,
          alertCount: Array.isArray(data.threshold_breaches) ? data.threshold_breaches.length : 0,
          highestSeverity: Array.isArray(data.threshold_breaches) && data.threshold_breaches.length > 0
            ? data.threshold_breaches.reduce((max, b) => {
                const order: Record<string, number> = { critical: 3, Critical: 3, high: 2, High: 2, medium: 1, Medium: 1 }
                return (order[b.severity] || 0) > (order[max] || 0) ? b.severity : max
              }, data.threshold_breaches[0].severity)
            : 'None',
          status: 'Pending',
          concentrationData: data,
        }
        saveHistory([entry, ...history].slice(0, 50))
      } else {
        setAnalysisError(result.error || result.response?.message || 'Analysis failed. Please try again.')
      }
    } catch (err) {
      clearInterval(interval)
      setAnalysisError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }

    setLoading(false)
    setLoadingStep('')
  }, [history, saveHistory])

  const handleGenerateAlerts = useCallback(async (geo: string) => {
    if (!geo.trim()) return
    setAlertLoading(true)
    setAlertError('')
    setAlertData(null)
    setSelectedAlert(null)

    try {
      const contextMsg = concentrationData
        ? `Analyze concentration risk profile and generate alerts with remedial actions for ${geo}. Context: Overall risk rating ${concentrationData.overall_risk_rating}/10, concentration score ${concentrationData.exposure_summary?.concentration_score || 'N/A'}, ${Array.isArray(concentrationData.threshold_breaches) ? concentrationData.threshold_breaches.length : 0} threshold breaches detected.`
        : `Analyze concentration risk profile and generate alerts with remedial actions for ${geo}.`

      const result = await callAIAgent(contextMsg, AGENT_IDS.ALERT_REMEDIATION)

      if (result.success && result.response?.result) {
        const data = result.response.result as unknown as AlertRemediationData
        setAlertData(data)
        setScreen('alerts')

        // Update history
        const updated = history.map(h =>
          h.geography === geo && h.status === 'Pending'
            ? { ...h, alertData: data, alertCount: data.alert_summary?.total_alerts || 0, highestSeverity: data.alert_summary?.critical_count > 0 ? 'Critical' : data.alert_summary?.high_count > 0 ? 'High' : 'Medium' }
            : h
        )
        saveHistory(updated)
      } else {
        setAlertError(result.error || result.response?.message || 'Alert generation failed. Please try again.')
      }
    } catch (err) {
      setAlertError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    }

    setAlertLoading(false)
  }, [concentrationData, history, saveHistory])

  const exportAlerts = useCallback(() => {
    if (!alertData) return
    const blob = new Blob([JSON.stringify(alertData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alerts-${alertData.analysis_geography || 'report'}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [alertData])

  const filteredAlerts = useMemo(() => {
    if (!alertData?.alerts || !Array.isArray(alertData.alerts)) return []
    if (severityFilter.length === 0) return alertData.alerts
    return alertData.alerts.filter(a => severityFilter.includes(a.severity?.toLowerCase()))
  }, [alertData, severityFilter])

  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return history
    return history.filter(h => h.geography.toLowerCase().includes(historySearch.toLowerCase()))
  }, [history, historySearch])

  // ============================================================
  // NAVIGATION
  // ============================================================
  const navItems: { id: Screen; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiHome className="w-5 h-5" /> },
    { id: 'analysis', label: 'Concentration Analysis', icon: <FiBarChart2 className="w-5 h-5" /> },
    { id: 'alerts', label: 'Alerts & Actions', icon: <FiAlertTriangle className="w-5 h-5" /> },
    { id: 'history', label: 'History', icon: <FiClock className="w-5 h-5" /> },
  ]

  // ============================================================
  // DASHBOARD SCREEN
  // ============================================================
  const dashboardHotspots = [
    { zone: 'Florida - Southeast', risk: 8.7, perils: 'Hurricane, Flood', tiv: '$42.3B' },
    { zone: 'California - North', risk: 7.9, perils: 'Wildfire, Earthquake', tiv: '$38.1B' },
    { zone: 'Texas - Gulf Coast', risk: 7.2, perils: 'Hurricane, Hail', tiv: '$29.6B' },
    { zone: 'Louisiana', risk: 6.8, perils: 'Hurricane, Flood', tiv: '$18.4B' },
    { zone: 'Oklahoma', risk: 6.1, perils: 'Tornado, Hail', tiv: '$12.7B' },
  ]

  const recentAlertsFeed = [
    { id: '1', severity: 'Critical', zone: 'FL-Southeast', msg: 'Wind exposure TIV exceeds $40B threshold', time: '2h ago' },
    { id: '2', severity: 'High', zone: 'CA-North', msg: 'Wildfire season risk score elevated to 8.2/10', time: '5h ago' },
    { id: '3', severity: 'High', zone: 'TX-Gulf', msg: 'Hurricane season accumulation above limit', time: '1d ago' },
    { id: '4', severity: 'Medium', zone: 'LA', msg: 'Flood zone concentration increase 12% YoY', time: '1d ago' },
    { id: '5', severity: 'Medium', zone: 'OK', msg: 'Tornado corridor policy growth exceeds plan', time: '2d ago' },
  ]

  // Map region data for visualization
  const mapRegions = [
    { name: 'FL', x: 78, y: 72, risk: 8.7, size: 28 },
    { name: 'CA', x: 8, y: 40, risk: 7.9, size: 26 },
    { name: 'TX', x: 42, y: 68, risk: 7.2, size: 24 },
    { name: 'LA', x: 60, y: 68, risk: 6.8, size: 18 },
    { name: 'OK', x: 48, y: 50, risk: 6.1, size: 16 },
    { name: 'NY', x: 80, y: 28, risk: 5.4, size: 14 },
    { name: 'NJ', x: 82, y: 34, risk: 5.0, size: 12 },
    { name: 'SC', x: 76, y: 54, risk: 4.8, size: 12 },
    { name: 'CO', x: 32, y: 40, risk: 4.2, size: 12 },
    { name: 'WA', x: 12, y: 12, risk: 3.8, size: 10 },
  ]

  function renderDashboard() {
    return (
      <div className="space-y-6">
        {/* Quick Query Bar */}
        <div className="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
          <h2 className="text-lg font-semibold font-serif mb-3">Quick Analysis</h2>
          <GeographyInput
            value={geography}
            onChange={setGeography}
            onSubmit={() => handleAnalyzeConcentration(geography)}
            loading={loading}
          />
        </div>

        {/* Metric Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricTile icon={<FiLayers className="w-5 h-5" />} label="Total Insured Value" value="$186.4B" sub="Across all geographies" />
          <MetricTile icon={<FiAlertCircle className="w-5 h-5" />} label="Hotspot Zones" value="5" sub="Above concentration threshold" />
          <MetricTile icon={<FiAlertTriangle className="w-5 h-5" />} label="Active Alerts" value="12" sub="3 critical, 4 high, 5 medium" />
          <MetricTile icon={<FiTrendingUp className="w-5 h-5" />} label="Portfolio Growth" value="+8.3%" sub="Year over year" />
        </div>

        {/* Main Content: Map + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Geographic Heatmap */}
          <div className="lg:col-span-2 bg-card rounded-lg border border-border/40 p-6 shadow-sm">
            <h3 className="text-lg font-semibold font-serif mb-4 flex items-center gap-2">
              <FiMapPin className="w-5 h-5 text-primary" />
              Geographic Concentration Heatmap
            </h3>
            <div className="relative bg-secondary/30 rounded-lg overflow-hidden" style={{ height: 360 }}>
              {/* Simplified US map visualization */}
              <svg viewBox="0 0 100 80" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                {/* US outline simplified */}
                <path d="M 5 15 L 18 10 L 30 12 L 45 10 L 55 8 L 65 10 L 80 8 L 90 15 L 92 25 L 88 35 L 85 40 L 82 50 L 80 55 L 78 65 L 75 72 L 68 75 L 58 72 L 50 70 L 42 72 L 35 68 L 25 65 L 18 60 L 10 50 L 8 40 L 5 30 Z"
                  fill="hsl(35 20% 88%)" stroke="hsl(27 61% 26%)" strokeWidth="0.5" opacity="0.4" />
                {/* Risk concentration circles */}
                {mapRegions.map(r => {
                  const opacity = Math.min(0.3 + (r.risk / 10) * 0.7, 1)
                  const fillColor = r.risk >= 7 ? 'rgba(239,68,68,' : r.risk >= 5 ? 'rgba(249,115,22,' : 'rgba(234,179,8,'
                  return (
                    <g key={r.name}>
                      <circle cx={r.x} cy={r.y} r={r.size / 2.5} fill={`${fillColor}${opacity})`}
                        stroke={r.risk >= 7 ? 'rgba(239,68,68,0.8)' : 'rgba(249,115,22,0.6)'} strokeWidth="0.3" />
                      <text x={r.x} y={r.y + 1} textAnchor="middle" fontSize="3" fontWeight="bold"
                        fill="hsl(30 22% 14%)">{r.name}</text>
                    </g>
                  )
                })}
              </svg>
              {/* Legend */}
              <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border/40 text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400" /> High</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400" /> Medium</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400" /> Low</span>
                </div>
              </div>
            </div>
            {/* Top Hotspots Table */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Concentration Zones</h4>
              <div className="space-y-2">
                {dashboardHotspots.map((h, i) => (
                  <button key={i} onClick={() => { setGeography(h.zone); handleAnalyzeConcentration(h.zone) }}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                      <div>
                        <p className="text-sm font-semibold">{h.zone}</p>
                        <p className="text-xs text-muted-foreground">{h.perils}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold">{h.tiv}</span>
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${h.risk >= 7 ? 'bg-red-100 text-red-700' : h.risk >= 5 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {h.risk}
                      </div>
                      <FiChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Alerts Feed */}
          <div className="bg-card rounded-lg border border-border/40 p-6 shadow-sm">
            <h3 className="text-lg font-semibold font-serif mb-4 flex items-center gap-2">
              <FiAlertTriangle className="w-5 h-5 text-destructive" />
              Recent Alerts
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {recentAlertsFeed.map(a => (
                <div key={a.id} className={`p-3 rounded-lg border ${getSeverityStyle(a.severity).border} ${getSeverityStyle(a.severity).bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <SeverityBadge severity={a.severity} />
                    <span className="text-xs text-muted-foreground">{a.time}</span>
                  </div>
                  <p className="text-xs font-medium mt-1">{a.zone}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.msg}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setScreen('alerts')}
              className="w-full mt-4 text-sm font-medium text-primary hover:underline flex items-center justify-center gap-1">
              View All Alerts <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // ANALYSIS SCREEN
  // ============================================================
  function renderAnalysis() {
    return (
      <div className="space-y-6">
        {/* Query Bar */}
        <div className="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
          <h2 className="text-lg font-semibold font-serif mb-3">Concentration Analysis</h2>
          <GeographyInput
            value={geography}
            onChange={setGeography}
            onSubmit={() => handleAnalyzeConcentration(geography)}
            loading={loading}
          />
        </div>

        {/* Loading State */}
        {loading && <LoadingOverlay step={loadingStep} />}

        {/* Error State */}
        {analysisError && !loading && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
            <FiXCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Analysis Failed</p>
              <p className="text-xs text-muted-foreground mt-1">{analysisError}</p>
              <button onClick={() => handleAnalyzeConcentration(geography)}
                className="text-xs font-medium text-primary hover:underline mt-2 flex items-center gap-1">
                <FiRefreshCw className="w-3 h-3" /> Retry Analysis
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {concentrationData && !loading && (
          <>
            {/* Executive Summary */}
            <div className="bg-card rounded-lg border border-border/40 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold font-serif flex items-center gap-2">
                    <FiMapPin className="w-5 h-5 text-primary" />
                    {concentrationData.geography || geography}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{concentrationData.executive_summary || ''}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Risk</p>
                    <p className={`text-3xl font-bold font-serif ${(concentrationData.overall_risk_rating || 0) >= 7 ? 'text-red-600' : (concentrationData.overall_risk_rating || 0) >= 5 ? 'text-orange-500' : 'text-green-600'}`}>
                      {concentrationData.overall_risk_rating || 0}<span className="text-sm text-muted-foreground">/10</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAlertGeography(concentrationData.geography || geography)
                      handleGenerateAlerts(concentrationData.geography || geography)
                    }}
                    className="px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors flex items-center gap-2"
                  >
                    <FiAlertTriangle className="w-4 h-4" />
                    Generate Alerts & Actions
                  </button>
                </div>
              </div>
            </div>

            {/* Three Column Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Exposure Breakdown */}
              <div className="bg-card rounded-lg border border-border/40 p-6 shadow-sm">
                <h4 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-4">
                  <FiLayers className="w-4 h-4" /> Exposure Breakdown
                </h4>
                {concentrationData.exposure_summary && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary/40 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Policies</p>
                        <p className="text-xl font-bold font-serif">{(concentrationData.exposure_summary.total_policies || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-secondary/40 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">Total Insured Value</p>
                        <p className="text-xl font-bold font-serif">{concentrationData.exposure_summary.total_insured_value || 'N/A'}</p>
                      </div>
                    </div>

                    <RiskGauge value={concentrationData.exposure_summary.concentration_score || 0} max={100} label="Concentration Score" />

                    {concentrationData.exposure_summary.top_lob && (
                      <p className="text-xs text-muted-foreground">Top LOB: <span className="font-semibold text-foreground">{concentrationData.exposure_summary.top_lob}</span></p>
                    )}

                    {/* LOB Breakdown */}
                    {Array.isArray(concentrationData.exposure_summary.lob_breakdown) && concentrationData.exposure_summary.lob_breakdown.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">LOB Distribution</p>
                        {concentrationData.exposure_summary.lob_breakdown.map((lob, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium">{lob.line_of_business}</span>
                              <span className="text-muted-foreground">{lob.percentage}% - {lob.insured_value}</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary/70 rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(lob.percentage, 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Catastrophe Context */}
              <div className="bg-card rounded-lg border border-border/40 p-6 shadow-sm">
                <h4 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-4">
                  <FiAlertCircle className="w-4 h-4" /> Catastrophe Context
                </h4>
                {concentrationData.catastrophe_context && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-secondary/40 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">Cat Risk Rating</p>
                        <p className={`text-xl font-bold font-serif ${(concentrationData.catastrophe_context.risk_rating || 0) >= 7 ? 'text-red-600' : 'text-orange-500'}`}>
                          {concentrationData.catastrophe_context.risk_rating || 0}/10
                        </p>
                      </div>
                      <div className="bg-secondary/40 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">Risk Trend</p>
                        <p className="text-lg font-bold font-serif flex items-center justify-center gap-1">
                          {(concentrationData.catastrophe_context.risk_trend || '').toLowerCase().includes('increas') ? (
                            <FiTrendingUp className="w-4 h-4 text-red-500" />
                          ) : (
                            <FiActivity className="w-4 h-4 text-green-500" />
                          )}
                          <span className="text-sm">{concentrationData.catastrophe_context.risk_trend || 'N/A'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Top Perils */}
                    {Array.isArray(concentrationData.catastrophe_context.top_perils) && concentrationData.catastrophe_context.top_perils.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top Perils</p>
                        <div className="flex flex-wrap gap-1.5">
                          {concentrationData.catastrophe_context.top_perils.map((p, i) => (
                            <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Historical Loss */}
                    {concentrationData.catastrophe_context.historical_loss_summary && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Historical Losses</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{concentrationData.catastrophe_context.historical_loss_summary}</p>
                      </div>
                    )}

                    {/* Return Periods */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                        <p className="text-xs text-red-600 font-semibold">1-in-100 Year</p>
                        <p className="text-sm font-bold">{concentrationData.catastrophe_context.return_period_100yr || 'N/A'}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                        <p className="text-xs text-red-600 font-semibold">1-in-250 Year</p>
                        <p className="text-sm font-bold">{concentrationData.catastrophe_context.return_period_250yr || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Climate Intelligence */}
              <div className="bg-card rounded-lg border border-border/40 p-6 shadow-sm">
                <h4 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-4">
                  <FiActivity className="w-4 h-4" /> Climate Intelligence
                </h4>
                {concentrationData.climate_intelligence && (
                  <div className="space-y-4">
                    <div className="bg-secondary/40 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Climate Risk Score</p>
                        <p className={`text-xl font-bold font-serif ${(concentrationData.climate_intelligence.climate_risk_score || 0) >= 7 ? 'text-red-600' : 'text-orange-500'}`}>
                          {concentrationData.climate_intelligence.climate_risk_score || 0}/10
                        </p>
                      </div>
                    </div>

                    {concentrationData.climate_intelligence.current_conditions && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Current Conditions</p>
                        <p className="text-xs text-muted-foreground">{concentrationData.climate_intelligence.current_conditions}</p>
                      </div>
                    )}

                    {/* Active Warnings */}
                    {Array.isArray(concentrationData.climate_intelligence.active_warnings) && concentrationData.climate_intelligence.active_warnings.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active Warnings</p>
                        <div className="space-y-1.5">
                          {concentrationData.climate_intelligence.active_warnings.map((w, i) => (
                            <div key={i} className="flex items-start gap-2 p-2 bg-orange-50 rounded border border-orange-200">
                              <FiAlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-orange-700">{w}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Emerging Threats */}
                    {Array.isArray(concentrationData.climate_intelligence.emerging_threats) && concentrationData.climate_intelligence.emerging_threats.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Emerging Threats</p>
                        <div className="space-y-1.5">
                          {concentrationData.climate_intelligence.emerging_threats.map((t, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <FiInfo className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                              <p className="text-xs">{t}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {concentrationData.climate_intelligence.seasonal_outlook && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Seasonal Outlook</p>
                        <p className="text-xs text-muted-foreground">{concentrationData.climate_intelligence.seasonal_outlook}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Threshold Breaches */}
            {Array.isArray(concentrationData.threshold_breaches) && concentrationData.threshold_breaches.length > 0 && (
              <div className="bg-card rounded-lg border border-border/40 p-6 shadow-sm">
                <h4 className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-2 mb-4">
                  <FiAlertTriangle className="w-4 h-4" /> Threshold Breaches ({concentrationData.threshold_breaches.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {concentrationData.threshold_breaches.map((b, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${getSeverityStyle(b.severity).border} ${getSeverityStyle(b.severity).bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <SeverityBadge severity={b.severity} />
                        <span className="text-xs text-muted-foreground">{b.zone}</span>
                      </div>
                      <p className="text-sm font-semibold">{b.metric}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>Current: <span className="font-bold text-foreground">{b.current_value}</span></span>
                        <span>|</span>
                        <span>Threshold: <span className="font-bold text-foreground">{b.threshold}</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {Array.isArray(concentrationData.recommendations) && concentrationData.recommendations.length > 0 && (
              <div className="bg-card rounded-lg border border-border/40 p-6 shadow-sm">
                <h4 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-2 mb-4">
                  <FiCheckCircle className="w-4 h-4" /> Recommendations
                </h4>
                <div className="space-y-2">
                  {concentrationData.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <p className="text-sm">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!concentrationData && !loading && !analysisError && (
          <EmptyState
            icon={<FiBarChart2 className="w-6 h-6" />}
            title="Select a Geography to Analyze"
            description="Enter a geography above and click Analyze Concentration to view exposure data, catastrophe context, and climate intelligence."
          />
        )}
      </div>
    )
  }

  // ============================================================
  // ALERTS SCREEN
  // ============================================================
  function renderAlerts() {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
          <h2 className="text-lg font-semibold font-serif mb-3">Alerts & Remedial Actions</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <GeographyInput
                value={alertGeography}
                onChange={setAlertGeography}
                onSubmit={() => handleGenerateAlerts(alertGeography)}
                loading={alertLoading}
                placeholder="Enter geography for alert analysis"
              />
            </div>
          </div>
          {/* Severity Filters */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs font-medium text-muted-foreground">Filter:</span>
            {['critical', 'high', 'medium'].map(s => (
              <button key={s} onClick={() => setSeverityFilter(prev => prev.includes(s) ? prev.filter(f => f !== s) : [...prev, s])}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${severityFilter.includes(s) ? `${getSeverityStyle(s).bg} ${getSeverityStyle(s).text} ${getSeverityStyle(s).border}` : 'bg-secondary text-muted-foreground border-border/40'}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
            {severityFilter.length > 0 && (
              <button onClick={() => setSeverityFilter([])} className="text-xs text-primary hover:underline">Clear</button>
            )}
          </div>
        </div>

        {/* Loading */}
        {alertLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div className="absolute inset-0 rounded-full border-4 border-destructive border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Generating alerts and remedial actions...</p>
          </div>
        )}

        {/* Error */}
        {alertError && !alertLoading && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
            <FiXCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">Alert Generation Failed</p>
              <p className="text-xs text-muted-foreground mt-1">{alertError}</p>
              <button onClick={() => handleGenerateAlerts(alertGeography)}
                className="text-xs font-medium text-primary hover:underline mt-2 flex items-center gap-1">
                <FiRefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          </div>
        )}

        {/* Alert Results */}
        {alertData && !alertLoading && (
          <>
            {/* Summary Bar */}
            <div className="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold font-serif">{alertData.analysis_geography || alertGeography}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Risk reduction: {alertData.overall_risk_reduction || 'N/A'} | Timeline: {alertData.implementation_timeline || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="text-center px-3 py-1 bg-secondary/40 rounded-lg">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold font-serif">{alertData.alert_summary?.total_alerts || 0}</p>
                    </div>
                    <div className="text-center px-3 py-1 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs text-red-600">Critical</p>
                      <p className="text-lg font-bold text-red-700">{alertData.alert_summary?.critical_count || 0}</p>
                    </div>
                    <div className="text-center px-3 py-1 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-xs text-orange-600">High</p>
                      <p className="text-lg font-bold text-orange-700">{alertData.alert_summary?.high_count || 0}</p>
                    </div>
                    <div className="text-center px-3 py-1 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs text-yellow-600">Medium</p>
                      <p className="text-lg font-bold text-yellow-700">{alertData.alert_summary?.medium_count || 0}</p>
                    </div>
                  </div>
                  <button onClick={exportAlerts} className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors flex items-center gap-1">
                    <FiDownload className="w-3.5 h-3.5" /> Export
                  </button>
                </div>
              </div>
            </div>

            {/* Two Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: Alert Cards */}
              <div className="lg:col-span-2 space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredAlerts.length > 0 ? filteredAlerts.map(a => (
                  <button key={a.alert_id} onClick={() => setSelectedAlert(a)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${selectedAlert?.alert_id === a.alert_id ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'} ${getSeverityStyle(a.severity).border} ${getSeverityStyle(a.severity).bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <SeverityBadge severity={a.severity} />
                      <span className="text-xs text-muted-foreground font-mono">{a.alert_id}</span>
                    </div>
                    <p className="text-sm font-semibold">{a.zone}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.peril_type} | {a.exposure_value}</p>
                    <p className="text-xs mt-1 line-clamp-2">{a.breach_description}</p>
                    <p className="text-xs text-primary font-medium mt-2 flex items-center gap-1">
                      {Array.isArray(a.remedial_actions) ? a.remedial_actions.length : 0} remedial actions <FiChevronRight className="w-3 h-3" />
                    </p>
                  </button>
                )) : (
                  <EmptyState icon={<FiCheckCircle className="w-6 h-6" />} title="No Alerts Match Filter" description="Adjust the severity filter above or clear it to see all alerts." />
                )}
              </div>

              {/* Right: Remedial Action Detail */}
              <div className="lg:col-span-3">
                {selectedAlert ? (
                  <div className="bg-card rounded-lg border border-border/40 p-6 shadow-sm sticky top-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <SeverityBadge severity={selectedAlert.severity} />
                        <h4 className="text-lg font-bold font-serif mt-2">{selectedAlert.zone}</h4>
                        <p className="text-sm text-muted-foreground">{selectedAlert.peril_type} | Exposure: {selectedAlert.exposure_value}</p>
                      </div>
                      <button onClick={() => setSelectedAlert(null)} className="p-2 hover:bg-secondary rounded-lg"><FiX className="w-4 h-4" /></button>
                    </div>

                    <div className="bg-secondary/30 rounded-lg p-3 mb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Breach Description</p>
                      <p className="text-sm">{selectedAlert.breach_description}</p>
                    </div>

                    <h5 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">Remedial Actions</h5>
                    {Array.isArray(selectedAlert.remedial_actions) && selectedAlert.remedial_actions.length > 0 ? (
                      <div className="space-y-3">
                        {selectedAlert.remedial_actions.map((ra, i) => (
                          <div key={i} className="border border-border/40 rounded-lg p-4 bg-secondary/20">
                            <div className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{i + 1}</span>
                              <div className="flex-1">
                                <p className="text-sm font-semibold">{ra.action_type}</p>
                                <p className="text-xs text-muted-foreground mt-1">{ra.description}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-xs flex items-center gap-1">
                                    <FiClock className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-muted-foreground">Timeline:</span> {ra.timeline}
                                  </span>
                                  <span className="text-xs flex items-center gap-1">
                                    <FiTrendingUp className="w-3 h-3 text-green-500" />
                                    <span className="text-muted-foreground">Impact:</span> {ra.expected_impact}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No remedial actions specified.</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-card rounded-lg border border-border/40 p-6 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                    <FiList className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">Select an alert from the left panel to view detailed remedial actions.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!alertData && !alertLoading && !alertError && (
          <EmptyState
            icon={<FiShield className="w-6 h-6" />}
            title="Portfolio Concentration Within Acceptable Limits"
            description="Enter a geography and click the button above to generate alerts and remedial action recommendations for underwriting teams."
          />
        )}
      </div>
    )
  }

  // ============================================================
  // HISTORY SCREEN
  // ============================================================
  function renderHistory() {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg border border-border/40 p-5 shadow-sm">
          <h2 className="text-lg font-semibold font-serif mb-3">Analysis History</h2>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              placeholder="Search by geography..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {filteredHistory.length > 0 ? (
          <div className="bg-card rounded-lg border border-border/40 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Geography</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alerts</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Severity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map(h => (
                  <tr key={h.id} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 text-sm">{new Date(h.date).toLocaleDateString()} <span className="text-xs text-muted-foreground">{new Date(h.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
                    <td className="px-4 py-3 text-sm font-medium">{h.geography}</td>
                    <td className="px-4 py-3 text-sm">{h.alertCount}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={h.highestSeverity} /></td>
                    <td className="px-4 py-3">
                      <select value={h.status}
                        onChange={e => {
                          const updated = history.map(item => item.id === h.id ? { ...item, status: e.target.value as HistoryEntry['status'] } : item)
                          saveHistory(updated)
                        }}
                        className="text-xs px-2 py-1 rounded border border-input bg-background">
                        <option value="Pending">Pending</option>
                        <option value="Actioned">Actioned</option>
                        <option value="Dismissed">Dismissed</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedHistory(h)} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
                        View <FiChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<FiClock className="w-6 h-6" />}
            title="No Analysis History"
            description={historySearch ? 'No history entries match your search.' : 'Analysis sessions will appear here after you run concentration analyses.'}
          />
        )}

        {/* History Detail Drawer */}
        {selectedHistory && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedHistory(null)} />
            <div className="relative bg-background w-full max-w-xl h-full overflow-y-auto shadow-xl border-l border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold font-serif">Analysis Detail</h3>
                <button onClick={() => setSelectedHistory(null)} className="p-2 hover:bg-secondary rounded-lg"><FiX className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-semibold">{new Date(selectedHistory.date).toLocaleString()}</p>
                  </div>
                  <div className="bg-secondary/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Geography</p>
                    <p className="text-sm font-semibold">{selectedHistory.geography}</p>
                  </div>
                  <div className="bg-secondary/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Alert Count</p>
                    <p className="text-sm font-semibold">{selectedHistory.alertCount}</p>
                  </div>
                  <div className="bg-secondary/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-semibold">{selectedHistory.status}</p>
                  </div>
                </div>

                {selectedHistory.concentrationData && (
                  <>
                    <div className="border-t border-border/40 pt-4">
                      <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Executive Summary</h4>
                      <p className="text-sm text-muted-foreground">{selectedHistory.concentrationData.executive_summary}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Risk Rating</h4>
                      <RiskGauge value={selectedHistory.concentrationData.overall_risk_rating || 0} max={10} label="Overall Risk" />
                    </div>
                    {Array.isArray(selectedHistory.concentrationData.recommendations) && selectedHistory.concentrationData.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Recommendations</h4>
                        <ul className="space-y-1.5">
                          {selectedHistory.concentrationData.recommendations.map((r, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                              <span className="w-4 h-4 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {selectedHistory.alertData && (
                  <div className="border-t border-border/40 pt-4">
                    <h4 className="text-sm font-bold text-destructive uppercase tracking-wider mb-2">Alert Summary</h4>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center p-2 bg-secondary/40 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold">{selectedHistory.alertData.alert_summary?.total_alerts || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-600">Critical</p>
                        <p className="font-bold text-red-700">{selectedHistory.alertData.alert_summary?.critical_count || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded-lg">
                        <p className="text-xs text-orange-600">High</p>
                        <p className="font-bold text-orange-700">{selectedHistory.alertData.alert_summary?.high_count || 0}</p>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded-lg">
                        <p className="text-xs text-yellow-600">Medium</p>
                        <p className="font-bold text-yellow-700">{selectedHistory.alertData.alert_summary?.medium_count || 0}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <button onClick={() => {
                    setGeography(selectedHistory.geography)
                    setConcentrationData(selectedHistory.concentrationData || null)
                    setSelectedHistory(null)
                    setScreen('analysis')
                  }} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    View Full Analysis
                  </button>
                  <button onClick={() => {
                    const updated = history.filter(h => h.id !== selectedHistory.id)
                    saveHistory(updated)
                    setSelectedHistory(null)
                  }} className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // RENDER
  // ============================================================
  const screenRenderers: Record<Screen, () => React.ReactNode> = {
    dashboard: renderDashboard,
    analysis: renderAnalysis,
    alerts: renderAlerts,
    history: renderHistory,
  }

  const screenTitles: Record<Screen, string> = {
    dashboard: 'Risk Dashboard',
    analysis: 'Concentration Analysis',
    alerts: 'Alerts & Actions',
    history: 'Analysis History',
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileSidebar && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileSidebar(false)} />
        </div>
      )}

      {/* Sidebar */}
      <aside className={`
        ${mobileSidebar ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        fixed lg:relative z-50 lg:z-0
        ${sidebarOpen ? 'w-64' : 'w-16'}
        h-full bg-sidebar border-r border-sidebar-border
        transition-all duration-300 flex flex-col
      `}>
        {/* Logo */}
        <div className={`p-4 border-b border-sidebar-border flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <FiShield className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold font-serif tracking-wide">Travelers CatRisk</h1>
                <p className="text-[10px] text-muted-foreground">Concentration & Alert Platform</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <FiShield className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
          )}
          <button onClick={() => { setSidebarOpen(!sidebarOpen); setMobileSidebar(false) }}
            className="hidden lg:block p-1 hover:bg-sidebar-accent rounded">
            <FiMenu className="w-4 h-4 text-sidebar-foreground" />
          </button>
          <button onClick={() => setMobileSidebar(false)}
            className="lg:hidden p-1 hover:bg-sidebar-accent rounded">
            <FiX className="w-4 h-4 text-sidebar-foreground" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setScreen(item.id); setMobileSidebar(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                screen === item.id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent'
              } ${!sidebarOpen ? 'justify-center' : ''}`}
              title={!sidebarOpen ? item.label : undefined}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-sidebar-border">
            <p className="text-[10px] text-muted-foreground text-center">Travelers Insurance</p>
            <p className="text-[10px] text-muted-foreground text-center">Risk Intelligence Platform v1.0</p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border/40 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileSidebar(true)} className="lg:hidden p-2 hover:bg-secondary rounded-lg">
              <FiMenu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold font-serif">{screenTitles[screen]}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {screenRenderers[screen]()}
        </div>
      </main>
    </div>
  )
}
