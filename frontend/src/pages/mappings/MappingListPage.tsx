import { useState } from 'react'
import { useParams } from 'react-router'
import {
  useMappings,
  useCreateMapping,
  useUpdateMapping,
  useDeleteMapping,
  usePutTransformationRule,
} from '../../hooks/useMappings.js'
import { useCanonicalFields } from '../../hooks/useCanonical.js'
import { useSystems, useSystemEntities, useSystemFields } from '../../hooks/useSystems.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Select } from '../../components/ui/Select.js'
import { Dialog } from '../../components/ui/Dialog.js'
import { Badge } from '../../components/ui/Badge.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { ConfirmDialog } from '../../components/ConfirmDialog.js'
import { useToast } from '../../components/ui/Toast.js'
import { getErrorMessage } from '../../lib/api.js'
import type {
  Mapping,
  TransformationRuleType,
  PutTransformationRuleInput,
} from '../../lib/types.js'

const RULE_TYPES: Array<{ value: TransformationRuleType; label: string }> = [
  { value: 'RENAME', label: 'Rename' },
  { value: 'TYPE_CAST', label: 'Type Cast' },
  { value: 'VALUE_MAP', label: 'Value Map' },
  { value: 'COMPOSE', label: 'Compose' },
  { value: 'DECOMPOSE', label: 'Decompose' },
]

export function MappingListPage() {
  const { workspaceId } = useParams()
  const { toast } = useToast()

  // Filters
  const [filterCanonicalFieldId, setFilterCanonicalFieldId] = useState('')
  const [filterSystemId, setFilterSystemId] = useState('')
  const [filterEntityId, setFilterEntityId] = useState('')

  const { data: mappingsData, isLoading } = useMappings(workspaceId, {
    canonicalFieldId: filterCanonicalFieldId || undefined,
    systemId: filterSystemId || undefined,
    entityId: filterEntityId || undefined,
  })

  const { data: canonicalFields } = useCanonicalFields(workspaceId)
  const { data: systems } = useSystems(workspaceId)
  const { data: systemEntities } = useSystemEntities(
    workspaceId,
    filterSystemId || undefined
  )
  const { data: systemFields } = useSystemFields(workspaceId, {
    systemId: filterSystemId || undefined,
  })

  const createMutation = useCreateMapping(workspaceId!)
  const updateMutation = useUpdateMapping(workspaceId!)
  const deleteMutation = useDeleteMapping(workspaceId!)
  const putRuleMutation = usePutTransformationRule(workspaceId!)

  // Create mapping flow
  const [createOpen, setCreateOpen] = useState(false)
  const [newCanonicalFieldId, setNewCanonicalFieldId] = useState('')
  const [newSystemFieldId, setNewSystemFieldId] = useState('')
  const [newRuleType, setNewRuleType] = useState<TransformationRuleType | ''>('')

  // Rule editor
  const [ruleOpen, setRuleOpen] = useState(false)
  const [ruleMapping, setRuleMapping] = useState<Mapping | null>(null)
  const [ruleType, setRuleType] = useState<TransformationRuleType>('RENAME')
  const [valueMapEntries, setValueMapEntries] = useState<
    Array<{ fromValue: string; toValue: string; bidirectional: boolean }>
  >([])
  const [typeCastFrom, setTypeCastFrom] = useState('')
  const [typeCastTo, setTypeCastTo] = useState('')

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Mapping | null>(null)

  async function handleCreateMapping() {
    if (!newCanonicalFieldId) return
    try {
      await createMutation.mutateAsync({
        canonicalFieldId: newCanonicalFieldId,
        systemFieldId: newSystemFieldId || undefined,
        ruleType: (newRuleType as TransformationRuleType) || undefined,
      })
      setCreateOpen(false)
      setNewCanonicalFieldId('')
      setNewSystemFieldId('')
      setNewRuleType('')
      toast('success', 'Mapping created')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleToggleDeprecated(m: Mapping) {
    try {
      await updateMutation.mutateAsync({
        mappingId: m.id,
        data: { deprecated: !m.deprecated },
      })
      toast('success', m.deprecated ? 'Mapping activated' : 'Mapping deprecated')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  function openRuleEditor(m: Mapping) {
    setRuleMapping(m)
    setRuleType('RENAME')
    setValueMapEntries([])
    setTypeCastFrom('')
    setTypeCastTo('')
    setRuleOpen(true)
  }

  async function handleSaveRule() {
    if (!ruleMapping) return
    const data: PutTransformationRuleInput = { type: ruleType }
    if (ruleType === 'TYPE_CAST') {
      data.config = { from: typeCastFrom, to: typeCastTo }
    } else if (ruleType === 'VALUE_MAP') {
      data.entries = valueMapEntries
    }
    try {
      await putRuleMutation.mutateAsync({ mappingId: ruleMapping.id, data })
      setRuleOpen(false)
      setRuleMapping(null)
      toast('success', 'Transformation rule saved')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      toast('success', 'Mapping deleted')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  function addValueMapEntry() {
    setValueMapEntries([...valueMapEntries, { fromValue: '', toValue: '', bidirectional: false }])
  }

  function updateValueMapEntry(idx: number, field: string, value: string | boolean) {
    const updated = [...valueMapEntries]
    updated[idx] = { ...updated[idx], [field]: value }
    setValueMapEntries(updated)
  }

  function removeValueMapEntry(idx: number) {
    setValueMapEntries(valueMapEntries.filter((_, i) => i !== idx))
  }

  // Build name lookups
  const cfNameMap = new Map(
    (canonicalFields?.items ?? []).map((f) => [f.id, f.displayName])
  )
  const sfMap = new Map(
    (systemFields?.items ?? []).map((f) => [f.id, f.name])
  )

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mappings</h1>
          <p className="text-sm text-gray-500 mt-1">Field mappings between canonical and system fields</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create Mapping</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <Select
          options={[
            { value: '', label: 'All canonical fields' },
            ...(canonicalFields?.items ?? []).map((f) => ({
              value: f.id,
              label: f.displayName,
            })),
          ]}
          value={filterCanonicalFieldId}
          onChange={(e) => setFilterCanonicalFieldId(e.target.value)}
        />
        <Select
          options={[
            { value: '', label: 'All systems' },
            ...(systems?.items ?? []).map((s) => ({
              value: s.id,
              label: s.name,
            })),
          ]}
          value={filterSystemId}
          onChange={(e) => {
            setFilterSystemId(e.target.value)
            setFilterEntityId('')
          }}
        />
        <Select
          options={[
            { value: '', label: 'All entities' },
            ...(systemEntities?.items ?? []).map((e) => ({
              value: e.id,
              label: e.name,
            })),
          ]}
          value={filterEntityId}
          onChange={(e) => setFilterEntityId(e.target.value)}
          disabled={!filterSystemId}
        />
      </div>

      {/* Mapping list */}
      {(mappingsData?.items ?? []).length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">No mappings found.</div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {(mappingsData?.items ?? []).map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <span className="font-medium">
                    {m.canonicalFieldId ? cfNameMap.get(m.canonicalFieldId) ?? 'Unknown' : 'Subfield'}
                  </span>
                  <span className="text-gray-400 mx-2">&rarr;</span>
                  <span>
                    {m.systemField?.entity ? (
                      <>
                        <span className="text-gray-500">{m.systemField.entity.system?.name} / {m.systemField.entity.name}.</span>
                        {m.systemField.name}
                      </>
                    ) : m.systemFieldId ? (
                      sfMap.get(m.systemFieldId) ?? m.systemFieldId
                    ) : 'Composite'}
                  </span>
                </div>
                {m.deprecated && <Badge variant="warning">Deprecated</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openRuleEditor(m)}>
                  Rule
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleToggleDeprecated(m)}>
                  {m.deprecated ? 'Activate' : 'Deprecate'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(m)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create mapping dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Mapping"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateMapping}
              disabled={!newCanonicalFieldId || createMutation.isPending}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Canonical Field"
            options={[
              { value: '', label: 'Select a canonical field' },
              ...(canonicalFields?.items ?? []).map((f) => ({
                value: f.id,
                label: `${f.displayName} (${f.name})`,
              })),
            ]}
            value={newCanonicalFieldId}
            onChange={(e) => setNewCanonicalFieldId(e.target.value)}
          />
          <Select
            label="System Field (optional for compose/decompose)"
            options={[
              { value: '', label: 'Select a system field' },
              ...(systemFields?.items ?? []).map((f) => ({
                value: f.id,
                label: f.name,
              })),
            ]}
            value={newSystemFieldId}
            onChange={(e) => setNewSystemFieldId(e.target.value)}
          />
          <Select
            label="Rule Type Hint (optional)"
            options={[{ value: '', label: 'None' }, ...RULE_TYPES]}
            value={newRuleType}
            onChange={(e) => setNewRuleType(e.target.value as TransformationRuleType | '')}
          />
        </div>
      </Dialog>

      {/* Rule editor dialog */}
      <Dialog
        open={ruleOpen}
        onClose={() => setRuleOpen(false)}
        title="Transformation Rule"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRuleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule} disabled={putRuleMutation.isPending}>
              {putRuleMutation.isPending ? 'Saving...' : 'Save Rule'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Rule Type"
            options={RULE_TYPES}
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as TransformationRuleType)}
          />

          {ruleType === 'TYPE_CAST' && (
            <div className="space-y-3">
              <Input
                label="From Type"
                value={typeCastFrom}
                onChange={(e) => setTypeCastFrom(e.target.value)}
                placeholder="string"
              />
              <Input
                label="To Type"
                value={typeCastTo}
                onChange={(e) => setTypeCastTo(e.target.value)}
                placeholder="integer"
              />
            </div>
          )}

          {ruleType === 'VALUE_MAP' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">Value Map Entries</p>
                <Button size="sm" variant="secondary" onClick={addValueMapEntry}>
                  Add Entry
                </Button>
              </div>
              {valueMapEntries.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="From"
                    value={entry.fromValue}
                    onChange={(e) => updateValueMapEntry(idx, 'fromValue', e.target.value)}
                  />
                  <span className="text-gray-400">&rarr;</span>
                  <Input
                    placeholder="To"
                    value={entry.toValue}
                    onChange={(e) => updateValueMapEntry(idx, 'toValue', e.target.value)}
                  />
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={entry.bidirectional}
                      onChange={(e) =>
                        updateValueMapEntry(idx, 'bidirectional', e.target.checked)
                      }
                      className="rounded border-gray-300"
                    />
                    Bi
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeValueMapEntry(idx)}
                  >
                    &times;
                  </Button>
                </div>
              ))}
              {valueMapEntries.length === 0 && (
                <p className="text-sm text-gray-400">No entries yet.</p>
              )}
            </div>
          )}

          {(ruleType === 'COMPOSE' || ruleType === 'DECOMPOSE') && (
            <div className="text-sm text-gray-500">
              <p>
                Configure compose/decompose field mappings by selecting system fields and mapping
                them to canonical subfields. Use the mapping detail view for full configuration.
              </p>
            </div>
          )}

          {ruleType === 'RENAME' && (
            <p className="text-sm text-gray-500">
              No additional configuration needed. The field name difference is the mapping itself.
            </p>
          )}
        </div>
      </Dialog>

      {/* Delete mapping */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Mapping"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete this mapping? The transformation rule will also be
          removed.
        </p>
      </ConfirmDialog>
    </div>
  )
}
