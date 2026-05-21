import { useMemo, useEffect, useState, useRef } from 'react'
import {
  Play,
  GitBranch,
  GitMerge,
  Layers,
  Search,
  Box,
  Users,
  ChevronRight,
  ChevronDown,
  Activity,
  Download,
  Image as ImageIcon
} from 'lucide-react'
import { toPng } from 'html-to-image'
import { fetchFlowMap, fetchFlows, type FlowListItem, type FlowMapResponse } from '../services/flowApi'
import { motion, AnimatePresence } from 'framer-motion'

type StepNode = FlowMapResponse['adimlar'][number] & {
  phaseOrder: number
}

type FlowGraph = {
  rootId: number | null
  nodeById: Map<number, StepNode>
  childrenById: Map<number, number[]>
}

function parsePhaseOrder(evre: string) {
  const match = evre.match(/^(\d+)/)
  return match ? Number(match[1]) : 999
}

function buildGraph(flowMap: FlowMapResponse | null): FlowGraph {
  if (!flowMap || flowMap.adimlar.length === 0) {
    return { rootId: null, nodeById: new Map(), childrenById: new Map() }
  }

  const nodes: StepNode[] = flowMap.adimlar
    .map((step) => ({ ...step, phaseOrder: parsePhaseOrder(step.evre) }))
    .sort((a, b) => {
      if (a.phaseOrder !== b.phaseOrder) return a.phaseOrder - b.phaseOrder
      if (a.sira !== b.sira) return a.sira - b.sira
      return a.adimId - b.adimId
    })

  const nodeById = new Map<number, StepNode>(nodes.map((node) => [node.adimId, node]))
  const childrenById = new Map<number, number[]>()

  for (const node of nodes) {
    const samePhaseNext = nodes
      .filter((candidate) => candidate.phaseOrder === node.phaseOrder && candidate.sira === node.sira + 1)
      .map((candidate) => candidate.adimId)

    if (samePhaseNext.length > 0) {
      childrenById.set(node.adimId, samePhaseNext)
      continue
    }

    const nextPhaseOrder = nodes
      .map((candidate) => candidate.phaseOrder)
      .filter((order) => order > node.phaseOrder)
      .sort((a, b) => a - b)[0]

    if (nextPhaseOrder === undefined) {
      childrenById.set(node.adimId, [])
      continue
    }

    const nextPhaseSteps = nodes
      .filter((candidate) => candidate.phaseOrder === nextPhaseOrder)
      .sort((a, b) => a.sira - b.sira)

    const minSira = nextPhaseSteps[0]?.sira
    const phaseEntryNodes = nextPhaseSteps
      .filter((candidate) => candidate.sira === minSira)
      .map((candidate) => candidate.adimId)

    childrenById.set(node.adimId, phaseEntryNodes)
  }

  const rootNode = nodes.find((node) => node.evre.toUpperCase().includes('ANA')) ?? nodes[0]

  return {
    rootId: rootNode?.adimId ?? null,
    nodeById,
    childrenById,
  }
}

function collectDescendants(nodeId: number, childrenById: Map<number, number[]>, bag: Set<number>) {
  const children = childrenById.get(nodeId) ?? []
  for (const childId of children) {
    if (!bag.has(childId)) {
      bag.add(childId)
      collectDescendants(childId, childrenById, bag)
    }
  }
}

export default function FlowMapPage() {
  const [flows, setFlows] = useState<FlowListItem[]>([])
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null)
  const [flowMap, setFlowMap] = useState<FlowMapResponse | null>(null)
  const [flowSearch, setFlowSearch] = useState('')
  const [flowQuickFilter, setFlowQuickFilter] = useState<'ALL' | 'WITH_DESC' | 'NO_DESC'>('ALL')
  const [loadingFlows, setLoadingFlows] = useState(false)
  const [loadingMap, setLoadingMap] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openNodeIds, setOpenNodeIds] = useState<number[]>([])
  const [visibleNodeIds, setVisibleNodeIds] = useState<number[]>([])
  const [downloading, setDownloading] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleDownloadImage = async () => {
    if (!canvasRef.current || !flowMap) return

    try {
      setDownloading(true)
      // Delay slightly to ensure browser has completed layout updates and styling
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Check dark mode
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
                     document.body.classList.contains('dark') ||
                     document.documentElement.classList.contains('dark')

      const dataUrl = await toPng(canvasRef.current, {
        cacheBust: true,
        backgroundColor: isDark ? '#112038' : '#f8fbff',
        style: {
          borderRadius: '16px',
          padding: '24px',
          margin: '0',
          width: 'auto',
          height: 'auto',
          maxWidth: 'none',
          maxHeight: 'none',
        },
        pixelRatio: 2, // High resolution output
      })

      const flowName = flowMap.akisAdi || 'akis'
      const sanitizedFileName = `${flowName
        .replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_')}_akis_semasi.png`

      const link = document.createElement('a')
      link.download = sanitizedFileName
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Akış şeması indirilirken hata oluştu:', err)
      alert('Akış şeması görseli indirilirken bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const loadFlows = async () => {
      try {
        setLoadingFlows(true)
        setError(null)
        const data = await fetchFlows()
        if (!mounted) return

        setFlows(Array.isArray(data) ? data : [])
        if (Array.isArray(data) && data.length > 0) {
          setSelectedFlowId((prev) => prev ?? data[0].akisId)
        }
      } catch {
        if (mounted) {
          setError('Akış listesi alınamadı.')
        }
      } finally {
        if (mounted) {
          setLoadingFlows(false)
        }
      }
    }

    loadFlows()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedFlowId) {
      setFlowMap(null)
      setOpenNodeIds([])
      setVisibleNodeIds([])
      return
    }

    let mounted = true

    const loadMap = async () => {
      try {
        setLoadingMap(true)
        setError(null)
        const data = await fetchFlowMap(selectedFlowId)
        if (!mounted) return

        setFlowMap(data)
        const graph = buildGraph(data)
        if (graph.rootId) {
          setVisibleNodeIds([graph.rootId])
        } else {
          setVisibleNodeIds([])
        }
        setOpenNodeIds([])
      } catch {
        if (mounted) {
          setFlowMap(null)
          setVisibleNodeIds([])
          setOpenNodeIds([])
          setError('Flow map bilgisi alınamadı.')
        }
      } finally {
        if (mounted) {
          setLoadingMap(false)
        }
      }
    }

    loadMap()

    return () => {
      mounted = false
    }
  }, [selectedFlowId])

  const graph = useMemo(() => buildGraph(flowMap), [flowMap])
  const filteredFlows = useMemo(() => {
    const query = flowSearch.trim().toLocaleLowerCase('tr-TR')

    return flows.filter((flow) => {
      const flowName = flow.akisAdi.toLocaleLowerCase('tr-TR')
      const description = String(flow.aciklama ?? '').toLocaleLowerCase('tr-TR')
      const baseMatch = !query || flowName.includes(query) || description.includes(query) || String(flow.akisId).includes(query)

      if (!baseMatch) return false

      if (flowQuickFilter === 'WITH_DESC') {
        return String(flow.aciklama ?? '').trim().length > 0
      }

      if (flowQuickFilter === 'NO_DESC') {
        return String(flow.aciklama ?? '').trim().length === 0
      }

      return true
    })
  }, [flows, flowQuickFilter, flowSearch])

  const totalStepCount = flowMap?.adimlar.length ?? 0
  const totalComponentCount = useMemo(
    () => flowMap?.adimlar.reduce((sum, step) => sum + step.bilesenler.length, 0) ?? 0,
    [flowMap],
  )

  const handleToggleNode = (nodeId: number) => {
    const isOpen = openNodeIds.includes(nodeId)

    if (isOpen) {
      const descendants = new Set<number>()
      collectDescendants(nodeId, graph.childrenById, descendants)

      setOpenNodeIds((prev) => prev.filter((id) => id !== nodeId && !descendants.has(id)))
      setVisibleNodeIds((prev) => prev.filter((id) => id === nodeId || !descendants.has(id)))
      return
    }

    const children = graph.childrenById.get(nodeId) ?? []
    setOpenNodeIds((prev) => [...prev, nodeId])
    setVisibleNodeIds((prev) => Array.from(new Set([...prev, ...children])))
  }

  const renderNode = (nodeId: number) => {
    if (!visibleNodeIds.includes(nodeId)) return null

    const node = graph.nodeById.get(nodeId)
    if (!node) return null

    const children = (graph.childrenById.get(nodeId) ?? []).filter((id) => visibleNodeIds.includes(id))
    const isOpen = openNodeIds.includes(nodeId)

    // Type color theme settings
    let cardBorderClass = 'border-l-amber-500 dark:border-l-amber-600 bg-amber-50/10 dark:bg-amber-950/5';
    let iconColorClass = 'text-amber-500 dark:text-amber-400';
    let iconBgClass = 'bg-amber-100/50 dark:bg-amber-950/30';
    let StepIcon = Layers;

    if (node.tip === 'TETIKLEYICI' || nodeId === graph.rootId) {
      cardBorderClass = 'border-l-emerald-500 dark:border-l-emerald-600 bg-emerald-50/10 dark:bg-emerald-950/5';
      iconColorClass = 'text-emerald-500 dark:text-emerald-400';
      iconBgClass = 'bg-emerald-100/50 dark:bg-emerald-950/30';
      StepIcon = Play;
    } else if (node.evre.toLowerCase().includes('child') || node.tip === 'SUBFLOW') {
      cardBorderClass = 'border-l-indigo-500 dark:border-l-indigo-600 bg-indigo-50/10 dark:bg-indigo-950/5';
      iconColorClass = 'text-indigo-500 dark:text-indigo-400';
      iconBgClass = 'bg-indigo-100/50 dark:bg-indigo-950/30';
      StepIcon = GitBranch;
    } else if (node.tip === 'KARAR') {
      cardBorderClass = 'border-l-blue-500 dark:border-l-blue-600 bg-blue-50/10 dark:bg-blue-950/5';
      iconColorClass = 'text-blue-500 dark:text-blue-400';
      iconBgClass = 'bg-blue-100/50 dark:bg-blue-950/30';
      StepIcon = GitMerge;
    }

    return (
      <div key={nodeId} className="mind-node-wrapper">
        <motion.div
          layout
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => handleToggleNode(nodeId)}
          className={`mind-node relative flex flex-col gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 ${cardBorderClass} shadow-sm select-none cursor-pointer`}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconBgClass} ${iconColorClass}`}>
                <StepIcon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{node.adimAdi}</h4>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">{node.tip}</span>
              </div>
            </div>

            <div
              className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 dark:text-slate-400 transition shadow-sm shrink-0"
            >
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </div>
          </div>

          {/* Badges Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              {node.evre}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              Adım #{node.sira}
            </span>
            {node.bilesenler.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                {node.bilesenler.length} Bileşen
              </span>
            )}
          </div>

          {/* Components nested list */}
          <AnimatePresence initial={false}>
            {isOpen && node.bilesenler.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: 'hidden' }}
                onClick={(e) => e.stopPropagation()}
                className="mt-2 space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-2.5 w-full cursor-default"
              >
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Adım Bileşenleri</p>
                <div className="space-y-2">
                  {node.bilesenler.map((comp, idx) => (
                    <div
                      key={`${node.adimId}-${comp.etiket}-${idx}`}
                      className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50 hover:bg-slate-100/30 dark:hover:bg-slate-950/20 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-355">{comp.etiket}</span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-100/50 dark:bg-blue-950/50 text-blue-750 dark:text-blue-400 shrink-0">
                          {comp.tip}
                        </span>
                      </div>
                      {comp.yetkiliIsimleri.length > 0 ? (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {comp.yetkiliIsimleri.map((name, i) => {
                            const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                            return (
                              <div
                                key={i}
                                className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300 shadow-sm"
                              >
                                <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[8px] text-white flex items-center justify-center uppercase font-extrabold shrink-0">
                                  {initials}
                                </div>
                                <span>{name}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-550">
                          <Users className="w-3 h-3" />
                          <span>Yetkili atanmamış</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence initial={false}>
          {isOpen && children.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
              className="mind-children"
            >
              {children.map((childId) => renderNode(childId))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="dashboard flow-map-page">
      <div className="dashboard-shell">
        {/* Header Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-850/50">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-400/10 blur-2xl" />
          <div className="absolute -bottom-10 right-20 h-32 w-32 rounded-full bg-indigo-400/10 blur-2xl" />
          <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:bg-blue-500">
                  <GitBranch className="h-5 w-5" />
                </div>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Flow Treemap</h1>
              </div>
              <p className="text-sm font-semibold text-slate-550 dark:text-slate-450">
                Akış süreçlerini adım adım ve ilişkileriyle görselleştirin. Düğümlere tıklayarak detayları genişletin.
              </p>
            </div>
          </div>
        </section>

        <div className="flow-map-layout">
          <aside className="panel flow-map-sidebar shadow-sm border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 p-5">
            <div className="panel-header mb-4">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Akışlar</h2>
              <span className="text-xs font-bold text-slate-450 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                {filteredFlows.length} / {flows.length}
              </span>
            </div>

            <div className="flow-map-filter space-y-3">
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-10 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905"
                  type="search"
                  value={flowSearch}
                  placeholder="Akış ara (ad, ID)..."
                  onChange={(event) => setFlowSearch(event.target.value)}
                />
                <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="flow-map-filter-chips flex gap-2">
                <button
                  type="button"
                  className={`flow-map-filter-chip border text-xs font-bold px-3 py-1.5 rounded-full transition ${
                    flowQuickFilter === 'ALL'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10'
                      : 'bg-white border-slate-200 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 hover:border-slate-300'
                  }`}
                  onClick={() => setFlowQuickFilter('ALL')}
                >
                  Tümü
                </button>
                <button
                  type="button"
                  className={`flow-map-filter-chip border text-xs font-bold px-3 py-1.5 rounded-full transition ${
                    flowQuickFilter === 'WITH_DESC'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10'
                      : 'bg-white border-slate-200 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 hover:border-slate-300'
                  }`}
                  onClick={() => setFlowQuickFilter('WITH_DESC')}
                >
                  Açıklamalı
                </button>
                <button
                  type="button"
                  className={`flow-map-filter-chip border text-xs font-bold px-3 py-1.5 rounded-full transition ${
                    flowQuickFilter === 'NO_DESC'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10'
                      : 'bg-white border-slate-200 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 hover:border-slate-300'
                  }`}
                  onClick={() => setFlowQuickFilter('NO_DESC')}
                >
                  Açıklamasız
                </button>
              </div>

              {(flowSearch || flowQuickFilter !== 'ALL') && (
                <button
                  type="button"
                  className="w-full text-xs font-bold py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 transition dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-750"
                  onClick={() => {
                    setFlowSearch('')
                    setFlowQuickFilter('ALL')
                  }}
                >
                  Filtreyi Temizle
                </button>
              )}
            </div>

            {loadingFlows ? <p className="hint text-xs font-semibold text-slate-450 mt-4">Akışlar yükleniyor...</p> : null}
            {error ? <p className="error-text text-xs font-bold text-red-500 mt-4">{error}</p> : null}

            {!loadingFlows && flows.length === 0 ? <p className="hint text-xs font-semibold text-slate-450 mt-4">Kayıtlı akış bulunamadı.</p> : null}
            {!loadingFlows && flows.length > 0 && filteredFlows.length === 0 ? (
              <p className="hint text-xs font-semibold text-slate-450 mt-4">Filtreye uygun akış bulunamadı.</p>
            ) : null}

            <motion.div layout className="flow-map-list custom-scrollbar mt-4 space-y-2">
              <AnimatePresence initial={false}>
                {filteredFlows.map((flow) => {
                  const isSelected = selectedFlowId === flow.akisId;
                  return (
                    <motion.button
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ scale: 1.01, x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      key={flow.akisId}
                      type="button"
                      className={`w-full text-left p-3 rounded-2xl border transition-all duration-150 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/45 dark:border-blue-400 dark:bg-blue-950/20'
                          : 'border-slate-200 bg-white hover:border-slate-350 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700/80'
                      }`}
                      onClick={() => setSelectedFlowId(flow.akisId)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm font-bold truncate text-slate-800 dark:text-slate-100">{flow.akisAdi}</strong>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                          ID: {flow.akisId}
                        </span>
                      </div>
                      {flow.aciklama && (
                        <p className="text-xs text-slate-450 dark:text-slate-555 truncate mt-1">{flow.aciklama}</p>
                      )}
                    </motion.button>
                  )
                })}
              </AnimatePresence>
            </motion.div>
          </aside>

          <section className="flow-map-main flex-1 space-y-4">
            {loadingMap ? <p className="hint text-sm font-semibold text-slate-450">Flow map yükleniyor...</p> : null}

            {!loadingMap && !flowMap ? (
              <p className="hint text-sm font-semibold text-slate-450 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                Görselleştirmek için bir akış seçin.
              </p>
            ) : null}

            {!loadingMap && flowMap ? (
              <>
                <div className="flow-map-summary grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-l-4 border-l-indigo-500 flex items-center gap-4 transition hover:shadow-md">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Seçilen Akış</p>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 truncate">{flowMap.akisAdi}</h4>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-l-4 border-l-emerald-500 flex items-center gap-4 transition hover:shadow-md">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Toplam Adım</p>
                      <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalStepCount}</h4>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 border-l-4 border-l-blue-500 flex items-center gap-4 transition hover:shadow-md">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                      <Box className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Toplam Bileşen</p>
                      <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{totalComponentCount}</h4>
                    </div>
                  </div>
                </div>

                {/* Download Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        Akış Görselini İndir
                      </h4>
                      <p className="text-xs font-medium text-slate-450 dark:text-slate-500">
                        Akış şemasını yüksek çözünürlüklü PNG dosyası olarak kaydedin.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={downloading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-750 transition-all rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 select-none cursor-pointer group"
                  >
                    {downloading ? (
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <Download className="w-3.5 h-3.5 transition-transform group-hover:translate-y-0.5" />
                    )}
                    <span>{downloading ? 'Görsel Hazırlanıyor...' : 'PNG Olarak İndir'}</span>
                  </button>
                </div>

                <div className="mind-tree-canvas" ref={canvasRef}>
                  {graph.rootId ? renderNode(graph.rootId) : <p className="hint text-xs font-semibold text-slate-450">Kök adım bulunamadı.</p>}
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
