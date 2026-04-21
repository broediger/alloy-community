import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  useCanonicalEntity,
  useCanonicalEntities,
  useCanonicalFields,
  useCreateCanonicalField,
  useDeleteCanonicalField,
  useUpdateCanonicalEntity,
} from '../../hooks/useCanonical.js'
import { api } from '../../lib/api.js'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Select } from '../../components/ui/Select.js'
import { Dialog } from '../../components/ui/Dialog.js'
import { Table, type Column } from '../../components/ui/Table.js'
import { Badge } from '../../components/ui/Badge.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { ConfirmDialog } from '../../components/ConfirmDialog.js'
import { useToast } from '../../components/ui/Toast.js'
import { getErrorMessage, isApiError } from '../../lib/api.js'
import type { CanonicalFieldListItem, DataType, FieldCardinality } from '../../lib/types.js'

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

export function CanonicalEntityDetailPage() {
  const { workspaceId, entityId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: entity, isLoading: entityLoading } = useCanonicalEntity(workspaceId, entityId)
  const { data: allEntities } = useCanonicalEntities(workspaceId)
  const [searchTerm, setSearchTerm] = useState('')
  const [dataTypeFilter, setDataTypeFilter] = useState('')
  const [mappedFilter, setMappedFilter] = useState('')

  const { data: fields, isLoading: fieldsLoading } = useCanonicalFields(workspaceId, {
    entityId,
    search: searchTerm || undefined,
    dataType: (dataTypeFilter as DataType) || undefined,
    mapped: mappedFilter || undefined,
  })

  const createFieldMutation = useCreateCanonicalField(workspaceId!)
  const deleteFieldMutation = useDeleteCanonicalField(workspaceId!)
  const updateEntityMutation = useUpdateCanonicalEntity(workspaceId!)
  const queryClient = useQueryClient()

  // Create field dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [fieldName, setFieldName] = useState('')
  const [fieldDisplayName, setFieldDisplayName] = useState('')
  const [fieldDataType, setFieldDataType] = useState<DataType>('STRING')
  const [fieldDescription, setFieldDescription] = useState('')
  const [fieldNullable, setFieldNullable] = useState(true)
  const [fieldIsComposite, setFieldIsComposite] = useState(false)
  const [fieldTags, setFieldTags] = useState('')
  const [fieldReferencedEntityId, setFieldReferencedEntityId] = useState('')
  const [fieldCardinality, setFieldCardinality] = useState<FieldCardinality | ''>('')
  const [fieldItemsDataType, setFieldItemsDataType] = useState<DataType | ''>('')
  const [enumValuesDraft, setEnumValuesDraft] = useState<Array<{ code: string; label: string }>>([])
  const [enumDraftCode, setEnumDraftCode] = useState('')
  const [enumDraftLabel, setEnumDraftLabel] = useState('')

  // Edit entity dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // Delete field
  const [deleteTarget, setDeleteTarget] = useState<CanonicalFieldListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteDetails, setDeleteDetails] = useState<Array<{ type: string; count: number }>>([])

  function resetCreateForm() {
    setFieldName('')
    setFieldDisplayName('')
    setFieldDataType('STRING')
    setFieldDescription('')
    setFieldNullable(true)
    setFieldIsComposite(false)
    setFieldTags('')
    setFieldReferencedEntityId('')
    setFieldCardinality('')
    setFieldItemsDataType('')
    setEnumValuesDraft([])
    setEnumDraftCode('')
    setEnumDraftLabel('')
  }

  function addEnumDraftValue() {
    const code = enumDraftCode.trim()
    const label = enumDraftLabel.trim()
    if (!code || !label) return
    if (enumValuesDraft.some((v) => v.code === code)) {
      toast('error', `Duplicate enum code: ${code}`)
      return
    }
    setEnumValuesDraft((prev) => [...prev, { code, label }])
    setEnumDraftCode('')
    setEnumDraftLabel('')
  }

  function removeEnumDraftValue(code: string) {
    setEnumValuesDraft((prev) => prev.filter((v) => v.code !== code))
  }

  async function handleCreateField() {
    if (!fieldName.trim() || !fieldDisplayName.trim()) return
    try {
      const created = await createFieldMutation.mutateAsync({
        entityId: entityId!,
        name: fieldName.trim(),
        displayName: fieldDisplayName.trim(),
        dataType: fieldDataType,
        description: fieldDescription.trim() || undefined,
        nullable: fieldNullable,
        isComposite: fieldIsComposite,
        tags: fieldTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        referencedEntityId: fieldReferencedEntityId || undefined,
        cardinality: fieldReferencedEntityId ? (fieldCardinality || undefined) : undefined,
        itemsDataType: fieldItemsDataType || undefined,
      })
      // If ENUM with drafted values, create each enum value. Failures are toast-only
      // — the field already exists and users can fix missing values on the detail page.
      if (fieldDataType === 'ENUM' && enumValuesDraft.length > 0) {
        const failed: string[] = []
        for (const { code, label } of enumValuesDraft) {
          try {
            await api.canonicalEnumValues.create(workspaceId!, created.id, { code, label })
          } catch {
            failed.push(code)
          }
        }
        // Invalidate so the field detail page shows the newly-created values
        queryClient.invalidateQueries({ queryKey: ['canonical-enum-values', workspaceId, created.id] })
        queryClient.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, created.id] })
        if (failed.length > 0) {
          toast('error', `Field created but some enum values failed: ${failed.join(', ')}`)
        } else {
          toast('success', `Field created with ${enumValuesDraft.length} enum value${enumValuesDraft.length === 1 ? '' : 's'}`)
        }
      } else {
        toast('success', 'Field created')
      }
      setCreateOpen(false)
      resetCreateForm()
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleDeleteField() {
    if (!deleteTarget) return
    try {
      await deleteFieldMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      setDeleteError(null)
      setDeleteDetails([])
      toast('success', 'Field deleted')
    } catch (err) {
      if (isApiError(err) && err.error.code === 'DELETE_CONFLICT') {
        setDeleteError(err.error.message)
        setDeleteDetails((err.error.details ?? []) as Array<{ type: string; count: number }>)
      } else {
        toast('error', getErrorMessage(err))
        setDeleteTarget(null)
      }
    }
  }

  function openEditEntity() {
    if (!entity) return
    setEditName(entity.name)
    setEditSlug(entity.slug)
    setEditDescription(entity.description ?? '')
    setEditOpen(true)
  }

  async function handleEditEntity() {
    try {
      await updateEntityMutation.mutateAsync({
        entityId: entityId!,
        data: {
          name: editName.trim(),
          slug: editSlug.trim(),
          description: editDescription.trim() || undefined,
        },
      })
      setEditOpen(false)
      toast('success', 'Entity updated')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  const columns: Column<CanonicalFieldListItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (f) => (
        <div>
          <span className="font-medium">{f.displayName}</span>
          <span className="text-gray-400 ml-2 text-xs">{f.name}</span>
        </div>
      ),
    },
    {
      key: 'dataType',
      header: 'Type',
      render: (f) => (
        <div className="flex items-center gap-1">
          <Badge variant="info">{f.dataType}</Badge>
          {f.isComposite && <Badge variant="warning">Composite</Badge>}
        </div>
      ),
    },
    {
      key: 'nullable',
      header: 'Nullable',
      render: (f) => (f.nullable ? 'Yes' : 'No'),
    },
    {
      key: 'mappings',
      header: 'Mappings',
      render: (f) => (
        <span className={f.mappingCount === 0 ? 'text-gray-400' : ''}>
          {f.mappingCount}
        </span>
      ),
      className: 'text-center',
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (f) =>
        f.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {f.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (f) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            setDeleteTarget(f)
            setDeleteError(null)
            setDeleteDetails([])
          }}
        >
          Delete
        </Button>
      ),
      className: 'w-20',
    },
  ]

  if (entityLoading) return <Spinner />
  if (!entity) return <div className="text-gray-500">Entity not found</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate(`/workspaces/${workspaceId}/canonical`)}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            &larr; Back to entities
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
          {entity.description && (
            <p className="text-sm text-gray-500 mt-1">{entity.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openEditEntity}>
            Edit Entity
          </Button>
          <Button onClick={() => setCreateOpen(true)}>Add Field</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-48 shrink-0">
          <Select
            options={[{ value: '', label: 'All types' }, ...DATA_TYPES]}
            value={dataTypeFilter}
            onChange={(e) => setDataTypeFilter(e.target.value)}
          />
        </div>
        <div className="w-40 shrink-0">
          <Select
            options={[
              { value: '', label: 'All' },
              { value: 'true', label: 'Mapped' },
              { value: 'false', label: 'Unmapped' },
            ]}
            value={mappedFilter}
            onChange={(e) => setMappedFilter(e.target.value)}
          />
        </div>
      </div>

      {fieldsLoading ? (
        <Spinner />
      ) : (
        <Table
          columns={columns}
          data={fields?.items ?? []}
          keyFn={(f) => f.id}
          onRowClick={(f) =>
            navigate(`/workspaces/${workspaceId}/canonical/fields/${f.id}`)
          }
          emptyMessage="No fields in this entity."
        />
      )}

      {/* Create field dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Canonical Field"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateField}
              disabled={
                !fieldName.trim() ||
                !fieldDisplayName.trim() ||
                createFieldMutation.isPending
              }
            >
              {createFieldMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name (slug)"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder="phone_number"
          />
          <Input
            label="Display Name"
            value={fieldDisplayName}
            onChange={(e) => setFieldDisplayName(e.target.value)}
            placeholder="Phone Number"
          />
          <Select
            label="Data Type"
            options={DATA_TYPES}
            value={fieldDataType}
            onChange={(e) => setFieldDataType(e.target.value as DataType)}
          />
          <Input
            label="Description"
            value={fieldDescription}
            onChange={(e) => setFieldDescription(e.target.value)}
            placeholder="Optional description"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fieldNullable}
                onChange={(e) => setFieldNullable(e.target.checked)}
                className="rounded border-gray-300"
              />
              Nullable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fieldIsComposite}
                onChange={(e) => setFieldIsComposite(e.target.checked)}
                className="rounded border-gray-300"
              />
              Composite
            </label>
          </div>
          <Input
            label="Tags (comma-separated)"
            value={fieldTags}
            onChange={(e) => setFieldTags(e.target.value)}
            placeholder="contact, personal"
          />

          {/* Enum values — only for ENUM dataType. Values are buffered locally and
              POSTed to /enum-values after the field is created. */}
          {fieldDataType === 'ENUM' && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Enum Values</p>
              {enumValuesDraft.length > 0 && (
                <div className="space-y-2 mb-3">
                  {enumValuesDraft.map((v) => (
                    <div
                      key={v.code}
                      className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm"
                    >
                      <span className="font-mono text-gray-900">{v.code}</span>
                      <span className="text-gray-400">—</span>
                      <span className="text-gray-700 flex-1">{v.label}</span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => removeEnumDraftValue(v.code)}
                        aria-label={`Remove ${v.code}`}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-end">
                <Input
                  label="Code"
                  value={enumDraftCode}
                  onChange={(e) => setEnumDraftCode(e.target.value)}
                  placeholder="ACTIVE"
                />
                <Input
                  label="Label"
                  value={enumDraftLabel}
                  onChange={(e) => setEnumDraftLabel(e.target.value)}
                  placeholder="Active"
                />
                <Button
                  size="sm"
                  onClick={addEnumDraftValue}
                  disabled={!enumDraftCode.trim() || !enumDraftLabel.trim()}
                  className="shrink-0"
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Relationship / collection */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Relationship / Collection</p>
            <div className="space-y-3">
              <Select
                label="Referenced Entity (e.g. 'addresses[] \u2192 Address')"
                options={[
                  { value: '', label: 'None (scalar / inline composite)' },
                  ...(allEntities?.items ?? []).map((e) => ({
                    value: e.id,
                    label: e.id === entityId ? `${e.name} (self)` : e.name,
                  })),
                ]}
                value={fieldReferencedEntityId}
                onChange={(e) => setFieldReferencedEntityId(e.target.value)}
              />
              {fieldReferencedEntityId && (
                <Select
                  label="Cardinality"
                  options={[
                    { value: '', label: 'Select cardinality' },
                    { value: 'ONE', label: '1:1 (single reference)' },
                    { value: 'MANY', label: '1:n (collection)' },
                  ]}
                  value={fieldCardinality}
                  onChange={(e) => setFieldCardinality(e.target.value as FieldCardinality | '')}
                />
              )}
              {fieldDataType === 'ARRAY' && !fieldReferencedEntityId && (
                <Select
                  label="Array Items Data Type (for primitive arrays like string[])"
                  options={[
                    { value: '', label: 'Select item type' },
                    ...DATA_TYPES.filter((d) => d.value !== 'ARRAY' && d.value !== 'OBJECT'),
                  ]}
                  value={fieldItemsDataType}
                  onChange={(e) => setFieldItemsDataType(e.target.value as DataType | '')}
                />
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Edit entity dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Entity"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditEntity} disabled={updateEntityMutation.isPending}>
              {updateEntityMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="Slug" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
          <Input
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
        </div>
      </Dialog>

      {/* Delete field confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteField}
        title="Delete Field"
        confirmLabel="Delete"
        loading={deleteFieldMutation.isPending}
      >
        {deleteError ? (
          <div>
            <p className="text-sm text-red-600 mb-2">{deleteError}</p>
            {deleteDetails.length > 0 && (
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                {deleteDetails.map((d) => (
                  <li key={d.type}>
                    {d.count} {d.type}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Delete <strong>{deleteTarget?.displayName}</strong>?
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
