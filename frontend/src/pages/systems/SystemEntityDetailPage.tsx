import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSystemEntity, useCreateSystemField, useDeleteSystemField } from '../../hooks/useSystems.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Select } from '../../components/ui/Select.js'
import { Dialog } from '../../components/ui/Dialog.js'
import { Badge } from '../../components/ui/Badge.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { ConfirmDialog } from '../../components/ConfirmDialog.js'
import { useToast } from '../../components/ui/Toast.js'
import { getErrorMessage, isApiError } from '../../lib/api.js'
import type { SystemFieldWithMapping } from '../../lib/types.js'

const FIELD_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'object', label: 'Object' },
  { value: 'array', label: 'Array' },
]

export function SystemEntityDetailPage() {
  const { workspaceId, systemId, entityId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: entity, isLoading } = useSystemEntity(workspaceId, systemId, entityId)
  const createFieldMutation = useCreateSystemField(workspaceId!)
  const deleteFieldMutation = useDeleteSystemField(workspaceId!)

  const [addOpen, setAddOpen] = useState(false)
  const [fieldName, setFieldName] = useState('')
  const [fieldPath, setFieldPath] = useState('')
  const [fieldDataType, setFieldDataType] = useState('string')
  const [fieldRequired, setFieldRequired] = useState(false)
  const [fieldNullable, setFieldNullable] = useState(true)

  const [deleteTarget, setDeleteTarget] = useState<SystemFieldWithMapping | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleCreate() {
    if (!fieldName.trim()) return
    try {
      await createFieldMutation.mutateAsync({
        entityId: entityId!,
        name: fieldName.trim(),
        path: fieldPath.trim() || undefined,
        dataType: fieldDataType,
        required: fieldRequired,
        nullable: fieldNullable,
      })
      setAddOpen(false)
      setFieldName('')
      setFieldPath('')
      setFieldDataType('string')
      setFieldRequired(false)
      setFieldNullable(true)
      toast('success', 'Field created')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteFieldMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      setDeleteError(null)
      toast('success', 'Field deleted')
    } catch (err) {
      if (isApiError(err) && err.error.code === 'DELETE_CONFLICT') {
        setDeleteError(err.error.message)
      } else {
        toast('error', getErrorMessage(err))
        setDeleteTarget(null)
      }
    }
  }

  if (isLoading) return <Spinner />
  if (!entity) return <div className="text-gray-500">Entity not found</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate(`/workspaces/${workspaceId}/systems/${systemId}`)}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            &larr; Back to system
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
          <p className="text-sm text-gray-500 mt-1">/{entity.slug}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add Field</Button>
      </div>

      {entity.description && (
        <p className="text-sm text-gray-600 mb-6">{entity.description}</p>
      )}

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Fields</h2>

      {entity.fields.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">No fields in this entity.</div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {entity.fields.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div>
                  <span className="font-medium text-sm">{f.name}</span>
                  {f.path && (
                    <span className="text-xs text-gray-400 ml-2">{f.path}</span>
                  )}
                </div>
                <Badge variant="info">{f.dataType}</Badge>
                {f.required && <Badge variant="warning">Required</Badge>}
              </div>
              <div className="flex items-center gap-3">
                {f.mappedTo ? (
                  <button
                    onClick={() =>
                      navigate(
                        `/workspaces/${workspaceId}/canonical/fields/${f.mappedTo!.canonicalFieldId}`
                      )
                    }
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {f.mappedTo.canonicalFieldName}
                  </button>
                ) : (
                  <Badge variant="default">Unmapped</Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeleteTarget(f)
                    setDeleteError(null)
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add field dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add System Field"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!fieldName.trim() || createFieldMutation.isPending}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder="address1_line1"
          />
          <Input
            label="Path"
            value={fieldPath}
            onChange={(e) => setFieldPath(e.target.value)}
            placeholder="address.line1"
          />
          <Select
            label="Data Type"
            options={FIELD_TYPES}
            value={fieldDataType}
            onChange={(e) => setFieldDataType(e.target.value)}
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
                className="rounded border-gray-300"
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fieldNullable}
                onChange={(e) => setFieldNullable(e.target.checked)}
                className="rounded border-gray-300"
              />
              Nullable
            </label>
          </div>
        </div>
      </Dialog>

      {/* Delete field */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Field"
        confirmLabel="Delete"
        loading={deleteFieldMutation.isPending}
      >
        {deleteError ? (
          <p className="text-sm text-red-600">{deleteError}</p>
        ) : (
          <p className="text-sm text-gray-600">
            Delete <strong>{deleteTarget?.name}</strong>?
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
