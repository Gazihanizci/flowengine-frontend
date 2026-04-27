import { useMemo, useEffect, useState } from 'react'
import { fetchFlowMap, fetchFlows, type FlowListItem, type FlowMapResponse } from '../services/flowApi'

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

    return (
      <div key={nodeId} className="mind-node-wrapper">
        <button
          type="button"
          className={`mind-node ${nodeId === graph.rootId ? 'root' : ''} ${isOpen ? 'open' : ''}`}
          onClick={() => handleToggleNode(nodeId)}
        >
          <div className="mind-node-title-row">
            <strong>{node.adimAdi}</strong>
            <span>{isOpen ? '-' : '+'}</span>
          </div>
          <div className="mind-node-meta-row">
            <span>{node.evre}</span>
            <span>#{node.sira}</span>
          </div>
          <div className="mind-node-meta-row">
            <span>Tip: {node.tip}</span>
            <span>Bilesen: {node.bilesenler.length}</span>
          </div>
        </button>

        {isOpen && node.bilesenler.length > 0 ? (
          <div className="mind-components">
            {node.bilesenler.map((component, index) => (
              <div key={`${node.adimId}-${component.etiket}-${index}`} className="mind-component-chip">
                <span className="tag">{component.tip}</span>
                <span>{component.etiket}</span>
                <small>
                  {component.yetkiliIsimleri.length > 0
                    ? component.yetkiliIsimleri.join(', ')
                    : 'Yetkili yok'}
                </small>
              </div>
            ))}
          </div>
        ) : null}

        {children.length > 0 && isOpen ? (
          <div className="mind-children">
            {children.map((childId) => renderNode(childId))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="dashboard flow-map-page">
      <div className="dashboard-shell">
        <div className="dashboard-top">
          <div>
            <h1>Flow Tree</h1>
            <p>İlk basta ANA adım görünür. Düğmelere bastıkça alt adımlar açılır.</p>
          </div>
        </div>

        <div className="flow-map-layout">
          <aside className="panel flow-map-sidebar">
            <div className="panel-header">
              <h2>Akışlar</h2>
              <span>
                {filteredFlows.length} / {flows.length} kayıt
              </span>
            </div>

            <div className="flow-map-filter">
              <label className="flow-map-search">
                <span>Akış Ara</span>
                <input
                  className="input"
                  type="search"
                  value={flowSearch}
                  placeholder="ID, akış adı, açıklama..."
                  onChange={(event) => setFlowSearch(event.target.value)}
                />
              </label>

              <div className="flow-map-filter-chips">
                <button
                  type="button"
                  className={`flow-map-filter-chip ${flowQuickFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFlowQuickFilter('ALL')}
                >
                  Tumu
                </button>
                <button
                  type="button"
                  className={`flow-map-filter-chip ${flowQuickFilter === 'WITH_DESC' ? 'active' : ''}`}
                  onClick={() => setFlowQuickFilter('WITH_DESC')}
                >
                  Aciklamali
                </button>
                <button
                  type="button"
                  className={`flow-map-filter-chip ${flowQuickFilter === 'NO_DESC' ? 'active' : ''}`}
                  onClick={() => setFlowQuickFilter('NO_DESC')}
                >
                  Aciklamasiz
                </button>
              </div>

              {(flowSearch || flowQuickFilter !== 'ALL') && (
                <button
                  type="button"
                  className="button secondary flow-map-clear"
                  onClick={() => {
                    setFlowSearch('')
                    setFlowQuickFilter('ALL')
                  }}
                >
                  Filtreyi Temizle
                </button>
              )}
            </div>

            {loadingFlows ? <p className="hint">Akislar yukleniyor...</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            {!loadingFlows && flows.length === 0 ? <p className="hint">Kayıtlı akış bulunamadı.</p> : null}
            {!loadingFlows && flows.length > 0 && filteredFlows.length === 0 ? (
              <p className="hint">Filtreye uygun akış bulunamadı.</p>
            ) : null}

            <div className="flow-map-list">
              {filteredFlows.map((flow) => (
                <button
                  key={flow.akisId}
                  type="button"
                  className={`flow-map-item ${selectedFlowId === flow.akisId ? 'selected' : ''}`}
                  onClick={() => setSelectedFlowId(flow.akisId)}
                >
                  <strong>{flow.akisAdi}</strong>
                  <span>ID: {flow.akisId}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="panel flow-map-main">
            {loadingMap ? <p className="hint">Flow map yükleniyor...</p> : null}

            {!loadingMap && !flowMap ? (
              <p className="hint">Görselleştirmek için bir akış seçin.</p>
            ) : null}

            {!loadingMap && flowMap ? (
              <>
                <div className="flow-map-summary">
                  <div className="summary-card">
                    <span>Akış</span>
                    <strong>{flowMap.akisAdi}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Toplam Adım</span>
                    <strong>{totalStepCount}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Toplam Bileşen</span>
                    <strong>{totalComponentCount}</strong>
                  </div>
                </div>

                <div className="mind-tree-canvas">
                  {graph.rootId ? renderNode(graph.rootId) : <p className="hint">Kök adım bulunamadı.</p>}
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}
