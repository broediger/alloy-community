import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  useCanonicalField,
  useUpdateCanonicalField,
  useCreateCanonicalSubfield,
  useDeleteCanonicalSubfield,
  useReorderCanonicalSubfields,
  useCreateCanonicalFieldExample,
  useDeleteCanonicalFieldExample,
  useCreateCanonicalEnumValue,
  useUpdateCanonicalEnumValue,
  useDeleteCanonicalEnumValue,
  useReorderCanonicalEnumValues,
} from '../../hooks/useCanonical.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Select } from '../../components/ui/Select.js'
import { Badge } from '../../components/ui/Badge.js'
import { Dialog } from '../../components/ui/Dialog.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { useToast } from '../../components/ui/Toast.js'
import { getErrorMessage } from '../../lib/api.js'
import type { DataType, CanonicalSubfield, CanonicalEnumValue } from '../../lib/types.js'

const DATA_TYPES: Array<{ value: DataType; label: string }> = [
  { value: 'STRING', label: 'String' },
  { value: 'INTEGER', label: 'Integer' },
  { value: 'DECIMAL', label: 'Decimal' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'DATE', label: 'Date' },
  { value: 'DATETIME', label: 'DateTime' },
  { value: 'ENUM', label: 'Enum' },
  { value: 'OBJECT', label: 'Object' },
  { value: 'ARRAY', label: 'Array' },
]

export function CanonicalFieldDetailPage() {
  const { workspaceId, fieldId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: field, isLoading } = useCanonicalField(workspaceId, fieldId)
  const updateFieldMutation = useUpdateCanonicalField(workspaceId!)
  const createSubfieldMutation = useCreateCanonicalSubfield(workspaceId!, fieldId!)
  const deleteSubfieldMutation = useDeleteCanonicalSubfield(workspaceId!, fieldId!)
  const reorderSubfieldsMutation = useReorderCanonicalSubfields(workspaceId!, fieldId!)
  const createExampleMutation = useCreateCanonicalFieldExample(workspaceId!, fieldId!)
  const deleteExampleMutation = useDeleteCanonicalFieldExample(workspaceId!, fieldId!)
  const createEnumMutation = useCreateCanonicalEnumValue(workspaceId!, fieldId!)
  const updateEnumMutation = useUpdateCanonicalEnumValue(workspaceId!, fieldId!)
  const deleteEnumMutation = useDeleteCanonicalEnumValue(workspaceId!, fieldId!)
  const reorderEnumMutation = useReorderCanonicalEnumValues(workspaceId!, fieldId!)

  // Edit field
  const [editOpen, setEditOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editDataType, setEditDataType] = useState<DataType>('STRING')
  const [editNullable, setEditNullable] = useState(true)
  const [editTags, setEditTags] = useState('')

  // Add subfield
  const [subfieldOpen, setSubfieldOpen] = useState(false)
  const [sfName, setSfName] = useState('')
  const [sfDisplayName, setSfDisplayName] = useState('')
  const [sfDataType, setSfDataType] = useState<DataType>('STRING')

  // Add example
  const [exampleValue, setExampleValue] = useState('')

  // Add enum value
  const [enumCode, setEnumCode] = useState('')
  const [enumLabel, setEnumLabel] = useState('')

  // Edit enum value
  const [editEnumTarget, setEditEnumTarget] = useState<CanonicalEnumValue | null>(null)
  const [editEnumCode, setEditEnumCode] = useState('')
  const [editEnumLabel, setEditEnumLabel] = useState('')

  function openEdit() {
    if (!field) return
    setEditDisplayName(field.displayName)
    setEditDescription(field.description ?? '')
    setEditDataType(field.dataType)
    setEditNullable(field.nullable)
    setEditTags(field.tags.join(', '))
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    try {
      await updateFieldMutation.mutateAsync({
        fieldId: fieldId!,
        data: {
          displayName: editDisplayName.trim(),
          description: editDescription.trim() || undefined,
          dataType: editDataType,
          nullable: editNullable,
          tags: editTags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        },
      })
      setEditOpen(false)
      toast('success', 'Field updated')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleAddSubfield() {
    if (!sfName.trim() || !sfDisplayName.trim()) return
    try {
      await createSubfieldMutation.mutateAsync({
        name: sfName.trim(),
        displayName: sfDisplayName.trim(),
        dataType: sfDataType,
      })
      setSubfieldOpen(false)
      setSfName('')
      setSfDisplayName('')
      setSfDataType('STRING')
      toast('success', 'Subfield added')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleMoveSubfield(sf: CanonicalSubfield, direction: 'up' | 'down') {
    if (!field) return
    const sorted = [...field.subfields].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex((s) => s.id === sf.id)
    if (direction === 'up' && idx <= 0) return
    if (direction === 'down' && idx >= sorted.length - 1) return
    const newOrder = [...sorted]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]
    try {
      await reorderSubfieldsMutation.mutateAsync(newOrder.map((s) => s.id))
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleAddExample() {
    if (!exampleValue.trim()) return
    try {
      await createExampleMutation.mutateAsync(exampleValue.trim())
      setExampleValue('')
      toast('success', 'Example added')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleAddEnumValue() {
    if (!enumCode.trim() || !enumLabel.trim()) return
    try {
      await createEnumMutation.mutateAsync({
        code: enumCode.trim(),
        label: enumLabel.trim(),
      })
      setEnumCode('')
      setEnumLabel('')
      toast('success', 'Enum value added')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleMoveEnum(ev: CanonicalEnumValue, direction: 'up' | 'down') {
    if (!field) return
    const sorted = [...field.enumValues].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex((e) => e.id === ev.id)
    if (direction === 'up' && idx <= 0) return
    if (direction === 'down' && idx >= sorted.length - 1) return
    const newOrder = [...sorted]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]]
    try {
      await reorderEnumMutation.mutateAsync(newOrder.map((e) => e.id))
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  function openEditEnum(ev: CanonicalEnumValue) {
    setEditEnumTarget(ev)
    setEditEnumCode(ev.code)
    setEditEnumLabel(ev.label)
  }

  async function handleSaveEnum() {
    if (!editEnumTarget) return
    try {
      await updateEnumMutation.mutateAsync({
        enumValueId: editEnumTarget.id,
        data: { code: editEnumCode.trim(), label: editEnumLabel.trim() },
      })
      setEditEnumTarget(null)
      toast('success', 'Enum value updated')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  if (isLoading) return <Spinner />
  if (!field) return <div className="text-gray-500">Field not found</div>

  const sortedSubfields = [...field.subfields].sort((a, b) => a.position - b.position)
  const sortedEnumValues = [...field.enumValues].sort((a, b) => a.position - b.position)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() =>
              navigate(`/workspaces/${workspaceId}/canonical/entities/${field.entityId}`)
            }
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            &larr; Back to entity
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{field.displayName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{field.name}</span>
            <Badge variant="info">{field.dataType}</Badge>
            {field.isComposite && <Badge variant="warning">Composite</Badge>}
            {field.nullable && <Badge>Nullable</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              navigate(`/workspaces/${workspaceId}/trace/${fieldId}`)
            }
          >
            View Trace
          </Button>
          <Button variant="secondary" onClick={openEdit}>
            Edit
          </Button>
        </div>
      </div>

      {/* Description */}
      {field.description && (
        <p className="text-sm text-gray-600 mb-6">{field.description}</p>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase">Mappings</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{field.mappingCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase">Subfields</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{field.subfields.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase">Tags</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {field.tags.length > 0 ? (
              field.tags.map((t) => <Badge key={t}>{t}</Badge>)
            ) : (
              <span className="text-sm text-gray-400">None</span>
            )}
          </div>
        </div>
      </div>

      {/* Subfields (composite) */}
      {field.isComposite && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Subfields</h2>
            <Button size="sm" onClick={() => setSubfieldOpen(true)}>
              Add Subfield
            </Button>
          </div>
          {sortedSubfields.length === 0 ? (
            <p className="text-sm text-gray-500">No subfields yet.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {sortedSubfields.map((sf, idx) => (
                <div
                  key={sf.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-sm">{sf.displayName}</span>
                    <span className="text-gray-400 text-xs ml-2">{sf.name}</span>
                    <Badge variant="info" className="ml-2">
                      {sf.dataType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={idx === 0}
                      onClick={() => handleMoveSubfield(sf, 'up')}
                    >
                      &uarr;
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={idx === sortedSubfields.length - 1}
                      onClick={() => handleMoveSubfield(sf, 'down')}
                    >
                      &darr;
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSubfieldMutation.mutate(sf.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {field.compositionPattern && (
            <p className="text-xs text-gray-500 mt-2">
              Pattern: <code className="bg-gray-100 px-1 rounded">{field.compositionPattern}</code>
            </p>
          )}
        </section>
      )}

      {/* Enum values */}
      {field.dataType === 'ENUM' && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Enum Values</h2>
          </div>
          {sortedEnumValues.length > 0 && (
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 mb-3">
              {sortedEnumValues.map((ev, idx) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between px-4 py-2"
                >
                  <div className="text-sm">
                    <code className="bg-gray-100 px-1 rounded">{ev.code}</code>
                    <span className="text-gray-500 ml-2">{ev.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={idx === 0}
                      onClick={() => handleMoveEnum(ev, 'up')}
                    >
                      &uarr;
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={idx === sortedEnumValues.length - 1}
                      onClick={() => handleMoveEnum(ev, 'down')}
                    >
                      &darr;
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditEnum(ev)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteEnumMutation.mutate(ev.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Input
              label="Code"
              value={enumCode}
              onChange={(e) => setEnumCode(e.target.value)}
              placeholder="ACTIVE"
            />
            <Input
              label="Label"
              value={enumLabel}
              onChange={(e) => setEnumLabel(e.target.value)}
              placeholder="Active"
            />
            <Button
              size="sm"
              onClick={handleAddEnumValue}
              disabled={!enumCode.trim() || !enumLabel.trim()}
              className="shrink-0"
            >
              Add
            </Button>
          </div>
        </section>
      )}

      {/* Examples */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Examples</h2>
        {field.examples.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {field.examples.map((ex) => (
              <span
                key={ex.id}
                className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-sm"
              >
                {ex.value}
                <button
                  className="text-gray-400 hover:text-red-500 ml-1"
                  onClick={() => deleteExampleMutation.mutate(ex.id)}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Input
            placeholder="Add example value"
            value={exampleValue}
            onChange={(e) => setExampleValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddExample()
            }}
          />
          <Button
            size="sm"
            onClick={handleAddExample}
            disabled={!exampleValue.trim()}
            className="shrink-0"
          >
            Add
          </Button>
        </div>
      </section>

      {/* Edit field dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Field"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateFieldMutation.isPending}>
              {updateFieldMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Display Name"
            value={editDisplayName}
            onChange={(e) => setEditDisplayName(e.target.value)}
          />
          <Select
            label="Data Type"
            options={DATA_TYPES}
            value={editDataType}
            onChange={(e) => setEditDataType(e.target.value as DataType)}
          />
          <Input
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editNullable}
              onChange={(e) => setEditNullable(e.target.checked)}
              className="rounded border-gray-300"
            />
            Nullable
          </label>
          <Input
            label="Tags (comma-separated)"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
          />
        </div>
      </Dialog>

      {/* Add subfield dialog */}
      <Dialog
        open={subfieldOpen}
        onClose={() => setSubfieldOpen(false)}
        title="Add Subfield"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSubfieldOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddSubfield}
              disabled={!sfName.trim() || !sfDisplayName.trim() || createSubfieldMutation.isPending}
            >
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={sfName} onChange={(e) => setSfName(e.target.value)} />
          <Input
            label="Display Name"
            value={sfDisplayName}
            onChange={(e) => setSfDisplayName(e.target.value)}
          />
          <Select
            label="Data Type"
            options={DATA_TYPES}
            value={sfDataType}
            onChange={(e) => setSfDataType(e.target.value as DataType)}
          />
        </div>
      </Dialog>

      {/* Edit enum value dialog */}
      <Dialog
        open={!!editEnumTarget}
        onClose={() => setEditEnumTarget(null)}
        title="Edit Enum Value"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditEnumTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEnum} disabled={updateEnumMutation.isPending}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Code" value={editEnumCode} onChange={(e) => setEditEnumCode(e.target.value)} />
          <Input
            label="Label"
            value={editEnumLabel}
            onChange={(e) => setEditEnumLabel(e.target.value)}
          />
        </div>
      </Dialog>
    </div>
  )
}
