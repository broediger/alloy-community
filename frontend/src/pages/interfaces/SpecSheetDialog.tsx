import { useMemo } from 'react'
import { Dialog } from '../../components/ui/Dialog.js'
import { Badge } from '../../components/ui/Badge.js'
import { Button } from '../../components/ui/Button.js'
import type {
  InterfaceDetail,
  InterfaceFieldResolved,
  CanonicalFieldListItem,
  CanonicalEntityListItem,
  InterfaceFieldStatus,
} from '../../lib/types.js'

const COL_COUNT = 10

interface SpecSheetDialogProps {
  open: boolean
  onClose: () => void
  iface: InterfaceDetail
  canonicalFields: CanonicalFieldListItem[]
  canonicalEntities: CanonicalEntityListItem[]
}

const STATUS_VARIANT: Record<InterfaceFieldStatus, 'danger' | 'default' | 'warning'> = {
  MANDATORY: 'danger',
  OPTIONAL: 'default',
  EXCLUDED: 'warning',
}

function mappingLabel(
  mapping: InterfaceFieldResolved['sourceMapping'] | InterfaceFieldResolved['targetMapping']
) {
  if (!mapping) return null
  const prefix = mapping.entityName ? `${mapping.entityName}.` : ''
  return `${prefix}${mapping.systemFieldName}`
}

function ruleDetail(
  mapping: InterfaceFieldResolved['sourceMapping'] | InterfaceFieldResolved['targetMapping']
): string | null {
  const rule = mapping?.transformationRule
  if (!rule) return null
  switch (rule.type) {
    case 'RENAME':
      return 'Rename'
    case 'TYPE_CAST': {
      const from = (rule.config as any)?.from ?? '?'
      const to = (rule.config as any)?.to ?? '?'
      return `Type cast: ${from} \u2192 ${to}`
    }
    case 'VALUE_MAP': {
      const entries = rule.valueMapEntries ?? []
      if (entries.length === 0) return 'Value map (empty)'
      const lines = entries.slice(0, 8).map((e) => `${e.fromValue} \u2192 ${e.toValue}`)
      if (entries.length > 8) lines.push(`\u2026 +${entries.length - 8} more`)
      return lines.join('\n')
    }
    case 'COMPOSE':
      return `Compose (${(rule.composeRuleFields ?? []).length} fields)`
    case 'DECOMPOSE':
      return `Decompose (${(rule.decomposeRuleFields ?? []).length} fields)`
    default:
      return rule.type
  }
}

export function SpecSheetDialog({
  open,
  onClose,
  iface,
  canonicalFields,
  canonicalEntities,
}: SpecSheetDialogProps) {
  const groups = useMemo(() => {
    const cfEntityMap = new Map<string, string>()
    const cfDescMap = new Map<string, string | null>()
    for (const cf of canonicalFields) {
      cfEntityMap.set(cf.id, cf.entityId)
      cfDescMap.set(cf.id, cf.description ?? null)
    }
    const entityNameMap = new Map<string, string>()
    for (const e of canonicalEntities) {
      entityNameMap.set(e.id, e.name)
    }

    const linked = iface.fields.filter((f) => f.canonicalFieldId)
    const unlinked = iface.fields.filter((f) => !f.canonicalFieldId)

    const entityGroups = new Map<string, { name: string; fields: InterfaceFieldResolved[] }>()
    for (const f of linked) {
      const entityId = cfEntityMap.get(f.canonicalFieldId!) ?? 'unknown'
      const entityName = entityNameMap.get(entityId) ?? 'Unknown Entity'
      if (!entityGroups.has(entityId)) {
        entityGroups.set(entityId, { name: entityName, fields: [] })
      }
      entityGroups.get(entityId)!.fields.push(f)
    }

    const sorted = [...entityGroups.values()].sort((a, b) => a.name.localeCompare(b.name))
    return { entityGroups: sorted, unlinked, cfDescMap }
  }, [iface.fields, canonicalFields, canonicalEntities])

  const totalFields = iface.fields.length
  const linkedCount = groups.entityGroups.reduce((acc, g) => acc + g.fields.length, 0)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Spec Sheet \u2014 ${iface.name}`}
      fullWidth
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 pb-3 border-b border-gray-200">
        <span>
          <span className="font-medium text-gray-900">{iface.sourceSystem?.name}</span>
          <span className="text-gray-400 mx-2">&rarr;</span>
          <span className="font-medium text-gray-900">{iface.targetSystem?.name}</span>
        </span>
        <Badge variant={iface.direction === 'EVENT' ? 'warning' : 'info'}>
          {iface.direction}
        </Badge>
        <span>{totalFields} fields ({linkedCount} canonical, {groups.unlinked.length} interface)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-300">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Path</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Length</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Null</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rule</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
            </tr>
          </thead>
          <tbody>
            {groups.entityGroups.map((group) => (
              <EntityGroup
                key={group.name}
                name={group.name}
                fields={group.fields}
                descMap={groups.cfDescMap}
              />
            ))}
            {groups.unlinked.length > 0 && (
              <>
                <tr>
                  <td
                    colSpan={COL_COUNT}
                    className="px-3 py-2 bg-gray-100 text-gray-700 font-semibold text-xs uppercase tracking-wide border-t border-gray-300"
                  >
                    Interface Fields (Transport / Metadata)
                  </td>
                </tr>
                {groups.unlinked.map((f) => (
                  <UnlinkedRow key={f.id} field={f} />
                ))}
              </>
            )}
            {totalFields === 0 && (
              <tr>
                <td colSpan={COL_COUNT} className="px-3 py-8 text-center text-gray-400">
                  No fields in this interface.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Dialog>
  )
}

function EntityGroup({
  name,
  fields,
  descMap,
}: {
  name: string
  fields: InterfaceFieldResolved[]
  descMap: Map<string, string | null>
}) {
  return (
    <>
      <tr>
        <td
          colSpan={COL_COUNT}
          className="px-3 py-2 bg-green-100 text-green-800 font-semibold text-xs uppercase tracking-wide border-t border-green-200"
        >
          {name}
        </td>
      </tr>
      {fields.map((f) => (
        <LinkedRow key={f.id} field={f} description={descMap.get(f.canonicalFieldId!) ?? null} />
      ))}
    </>
  )
}

function LinkedRow({
  field: f,
  description,
}: {
  field: InterfaceFieldResolved
  description: string | null
}) {
  const hasMissing = !f.sourceMapping || !f.targetMapping
  const srcRule = ruleDetail(f.sourceMapping)
  const tgtRule = ruleDetail(f.targetMapping)
  const ruleText = srcRule ?? tgtRule

  return (
    <tr className={`border-b border-gray-100 ${hasMissing ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
      <td className="px-3 py-1.5 font-medium text-gray-900">
        {f.canonicalField?.displayName ?? f.canonicalFieldId}
      </td>
      <td className="px-3 py-1.5 text-gray-500 font-mono text-xs">
        {f.canonicalField?.name}
      </td>
      <td className="px-3 py-1.5">
        {f.sourceMapping ? (
          <span className="text-gray-700">{mappingLabel(f.sourceMapping)}</span>
        ) : (
          <Badge variant="warning">Missing</Badge>
        )}
      </td>
      <td className="px-3 py-1.5">
        {f.targetMapping ? (
          <span className="text-gray-700">{mappingLabel(f.targetMapping)}</span>
        ) : (
          <Badge variant="warning">Missing</Badge>
        )}
      </td>
      <td className="px-3 py-1.5">
        <Badge variant="info">{f.canonicalField?.dataType}</Badge>
      </td>
      <td className="px-3 py-1.5 text-gray-500 text-xs">
        {f.maxLength ?? '\u2014'}
      </td>
      <td className="px-3 py-1.5">
        <Badge variant={STATUS_VARIANT[f.status]}>{f.status}</Badge>
      </td>
      <td className="px-3 py-1.5 text-gray-500">{f.nullable ? 'Yes' : 'No'}</td>
      <td className="px-3 py-1.5 text-xs whitespace-pre-wrap max-w-[200px]">
        {ruleText ? (
          <span className="text-gray-700">{ruleText}</span>
        ) : (
          <span className="text-gray-300">&mdash;</span>
        )}
      </td>
      <td className="px-3 py-1.5 text-gray-500 text-xs max-w-xs truncate" title={description ?? ''}>
        {description ?? '\u2014'}
      </td>
    </tr>
  )
}

function UnlinkedRow({ field: f }: { field: InterfaceFieldResolved }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-1.5 font-medium text-gray-900">
        {f.displayName ?? f.name}
      </td>
      <td className="px-3 py-1.5 text-gray-500 font-mono text-xs">{f.name}</td>
      <td className="px-3 py-1.5 text-gray-300">&mdash;</td>
      <td className="px-3 py-1.5 text-gray-300">&mdash;</td>
      <td className="px-3 py-1.5">
        {f.dataType && <Badge variant="info">{f.dataType}</Badge>}
      </td>
      <td className="px-3 py-1.5 text-gray-500 text-xs">
        {f.maxLength ?? '\u2014'}
      </td>
      <td className="px-3 py-1.5">
        <Badge variant={STATUS_VARIANT[f.status]}>{f.status}</Badge>
      </td>
      <td className="px-3 py-1.5 text-gray-500">{f.nullable ? 'Yes' : 'No'}</td>
      <td className="px-3 py-1.5 text-gray-300">&mdash;</td>
      <td className="px-3 py-1.5 text-gray-500 text-xs max-w-xs truncate" title={f.description ?? ''}>
        {f.description ?? '\u2014'}
      </td>
    </tr>
  )
}
