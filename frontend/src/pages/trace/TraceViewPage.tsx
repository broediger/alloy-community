import { useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  Position,
  MarkerType,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTrace } from '../../hooks/useTrace.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { Button } from '../../components/ui/Button.js'
import type { TraceResponse } from '../../lib/types.js'

export function TraceViewPage() {
  const { workspaceId, fieldId } = useParams()
  const navigate = useNavigate()
  const { data: trace, isLoading, error } = useTrace(workspaceId, fieldId)

  const { nodes, edges } = useMemo(() => {
    if (!trace) return { nodes: [], edges: [] }
    return buildGraph(trace)
  }, [trace])

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.data?.navigateTo && typeof node.data.navigateTo === 'string') {
        navigate(node.data.navigateTo as string)
      }
    },
    [navigate]
  )

  if (isLoading) return <Spinner />

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-sm">Failed to load trace data.</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </div>
    )
  }

  if (!trace) return <div className="text-gray-500">Trace not found</div>

  // Empty state
  if (trace.systems.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() =>
              navigate(
                `/workspaces/${workspaceId}/canonical/fields/${fieldId}`
              )
            }
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            &larr; Back to field
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Trace: {trace.canonicalField.displayName}
          </h1>
        </div>
        <div className="text-center py-20 text-gray-500">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
            />
          </svg>
          <p className="text-lg font-medium">No mappings found</p>
          <p className="text-sm mt-1">
            This canonical field has no system mappings yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() =>
            navigate(
              `/workspaces/${workspaceId}/canonical/fields/${fieldId}`
            )
          }
          className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
        >
          &larr; Back to field
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Trace: {trace.canonicalField.displayName}
        </h1>
      </div>

      <div className="border border-gray-200 rounded-lg bg-white" style={{ height: '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          nodesDraggable={true}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          {trace.conflicts.length > 0 && (
            <Panel position="top-right">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-w-xs">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Conflicts ({trace.conflicts.length})
                </p>
                {trace.conflicts.map((c, i) => (
                  <div key={i} className="text-xs text-red-600 mb-1">
                    <span className="font-medium">{c.type}:</span> {c.description}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  )
}

function buildGraph(trace: TraceResponse): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Layout: horizontal flow — systems on left & right, canonical field in center
  const centerX = 500
  const centerY = 80
  const systemSpacingX = 400 // horizontal distance from center to system columns
  const mappingOffsetY = 80 // vertical gap between system node and its first mapping

  // ── Canonical field (center) ──
  nodes.push({
    id: `cf-${trace.canonicalField.id}`,
    position: { x: centerX - 90, y: centerY },
    data: {
      label: trace.canonicalField.displayName,
    },
    style: {
      background: '#3B82F6',
      color: 'white',
      border: '2px solid #2563EB',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '600',
      minWidth: '180px',
      textAlign: 'center' as const,
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  })

  // ── Systems (spread left/right of center) ──
  const systemCount = trace.systems.length
  let maxMappingBottomY = centerY // track how far down the mappings go

  trace.systems.forEach((sys, sIdx) => {
    // Place systems horizontally: first left, second right, etc.
    const side = sIdx % 2 === 0 ? -1 : 1
    const col = Math.floor(sIdx / 2)
    const sx = centerX + side * systemSpacingX - 80
    const sy = centerY + col * 300

    const systemNodeId = `sys-${sys.systemId}`

    const hasConflict = trace.conflicts.some((c) =>
      c.systems.some((cs) => cs.systemId === sys.systemId)
    )

    nodes.push({
      id: systemNodeId,
      position: { x: sx, y: sy },
      data: { label: sys.systemName },
      style: {
        background: hasConflict ? '#FEE2E2' : '#F3F4F6',
        color: hasConflict ? '#991B1B' : '#1F2937',
        border: `2px solid ${hasConflict ? '#EF4444' : '#D1D5DB'}`,
        borderRadius: '8px',
        padding: '10px 14px',
        fontSize: '13px',
        fontWeight: '500',
        minWidth: '160px',
        textAlign: 'center' as const,
      },
      sourcePosition: side === -1 ? Position.Right : Position.Left,
      targetPosition: side === -1 ? Position.Right : Position.Left,
    })

    edges.push({
      id: `e-cf-${sys.systemId}`,
      source: `cf-${trace.canonicalField.id}`,
      target: systemNodeId,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: hasConflict ? '#EF4444' : '#9CA3AF' },
    })

    // Mapping nodes stacked vertically below each system
    sys.mappings.forEach((m, mIdx) => {
      const mappingNodeId = `mapping-${m.mappingId}`
      const mx = sx
      const my = sy + mappingOffsetY + mIdx * 55

      const fieldLabel = m.systemFieldName
        ? `${m.entityName}.${m.systemFieldName}`
        : m.entityName

      nodes.push({
        id: mappingNodeId,
        position: { x: mx, y: my },
        data: {
          label: fieldLabel,
          navigateTo: m.systemFieldId
            ? `/workspaces/${trace.canonicalField.entityId}/system-fields/${m.systemFieldId}`
            : undefined,
        },
        style: {
          background: m.deprecated ? '#FEF3C7' : 'white',
          color: '#374151',
          border: `1px solid ${m.deprecated ? '#F59E0B' : '#E5E7EB'}`,
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '11px',
          minWidth: '140px',
          textAlign: 'center' as const,
          cursor: m.systemFieldId ? 'pointer' : 'default',
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      })

      edges.push({
        id: `e-sys-${m.mappingId}`,
        source: systemNodeId,
        target: mappingNodeId,
        style: { stroke: '#D1D5DB', strokeDasharray: m.deprecated ? '5 5' : undefined },
      })

      maxMappingBottomY = Math.max(maxMappingBottomY, my + 50)
    })
  })

  // ── Interface nodes (below everything, centered) ──
  const interfaceStartY = maxMappingBottomY + 60

  trace.interfaces.forEach((iface, iIdx) => {
    const ifaceNodeId = `iface-${iface.interfaceId}`
    const ix = centerX - 90
    const iy = interfaceStartY + iIdx * 70

    nodes.push({
      id: ifaceNodeId,
      position: { x: ix, y: iy },
      data: { label: iface.interfaceName },
      style: {
        background: '#EEF2FF',
        color: '#3730A3',
        border: '1px solid #C7D2FE',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '12px',
        minWidth: '180px',
        textAlign: 'center' as const,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    })

    const sourceId = `sys-${iface.sourceSystemId}`
    const targetId = `sys-${iface.targetSystemId}`

    if (trace.systems.some((s) => s.systemId === iface.sourceSystemId)) {
      edges.push({
        id: `e-iface-src-${iface.interfaceId}`,
        source: sourceId,
        target: ifaceNodeId,
        style: { stroke: '#818CF8' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#818CF8' },
      })
    }

    if (trace.systems.some((s) => s.systemId === iface.targetSystemId)) {
      edges.push({
        id: `e-iface-tgt-${iface.interfaceId}`,
        source: ifaceNodeId,
        target: targetId,
        style: { stroke: '#818CF8' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#818CF8' },
      })
    }
  })

  // ── Propagation chains (above everything) ──
  trace.propagationChains.forEach((chain, cIdx) => {
    const baseY = -60 - cIdx * 80

    chain.steps.forEach((step, stepIdx) => {
      const stepNodeId = `step-${step.stepId}`
      const stepX = centerX - 200 + stepIdx * 180
      const stepY = baseY

      nodes.push({
        id: stepNodeId,
        position: { x: stepX, y: stepY },
        data: {
          label: `${step.entityName}.${step.systemFieldName}`,
        },
        style: {
          background: '#F0FDF4',
          color: '#166534',
          border: '1px solid #BBF7D0',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '11px',
          minWidth: '120px',
          textAlign: 'center' as const,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })

      if (stepIdx > 0) {
        const prevStepId = `step-${chain.steps[stepIdx - 1].stepId}`
        edges.push({
          id: `e-chain-${chain.chainId}-${stepIdx}`,
          source: prevStepId,
          target: stepNodeId,
          style: { stroke: '#86EFAC' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#86EFAC' },
        })
      }
    })

    if (chain.steps.length > 0) {
      const systemNodeId = `sys-${chain.systemId}`
      if (trace.systems.some((s) => s.systemId === chain.systemId)) {
        edges.push({
          id: `e-chain-sys-${chain.chainId}`,
          source: systemNodeId,
          target: `step-${chain.steps[0].stepId}`,
          style: { stroke: '#86EFAC', strokeDasharray: '5 5' },
        })
      }
    }
  })

  return { nodes, edges }
}
