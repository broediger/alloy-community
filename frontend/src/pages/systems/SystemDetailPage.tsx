import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  useSystem,
  useUpdateSystem,
  useCreateSystemEntity,
  useDeleteSystemEntity,
} from '../../hooks/useSystems.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Select } from '../../components/ui/Select.js'
import { Textarea } from '../../components/ui/Textarea.js'
import { Dialog } from '../../components/ui/Dialog.js'
import { Table, type Column } from '../../components/ui/Table.js'
import { Badge } from '../../components/ui/Badge.js'
import { CoverageBar } from '../../components/ui/CoverageBar.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { ConfirmDialog } from '../../components/ConfirmDialog.js'
import { useToast } from '../../components/ui/Toast.js'
import { getErrorMessage, isApiError } from '../../lib/api.js'
import type { SystemEntitySummary, SystemType } from '../../lib/types.js'

const SYSTEM_TYPE_OPTIONS = [
  { value: 'REST', label: 'REST' },
  { value: 'SOAP', label: 'SOAP' },
  { value: 'EVENT', label: 'EVENT' },
  { value: 'FLAT_FILE', label: 'FLAT_FILE' },
  { value: 'OTHER', label: 'OTHER' },
]

export function SystemDetailPage() {
  const { workspaceId, systemId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: system, isLoading } = useSystem(workspaceId, systemId)
  const updateMutation = useUpdateSystem(workspaceId!)
  const createEntityMutation = useCreateSystemEntity(workspaceId!, systemId!)
  const deleteEntityMutation = useDeleteSystemEntity(workspaceId!, systemId!)

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSystemType, setEditSystemType] = useState<SystemType>('REST')
  const [editBaseUrl, setEditBaseUrl] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [entityDialogOpen, setEntityDialogOpen] = useState(false)
  const [entityName, setEntityName] = useState('')
  const [entitySlug, setEntitySlug] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<SystemEntitySummary | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openEdit() {
    if (!system) return
    setEditName(system.name)
    setEditDescription(system.description ?? '')
    setEditSystemType(system.systemType)
    setEditBaseUrl(system.baseUrl ?? '')
    setEditNotes(system.notes ?? '')
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    try {
      await updateMutation.mutateAsync({
        systemId: systemId!,
        data: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          systemType: editSystemType,
          baseUrl: editBaseUrl.trim() || undefined,
          notes: editNotes.trim() || undefined,
        },
      })
      setEditOpen(false)
      toast('success', 'System updated')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  function handleEntityNameChange(value: string) {
    setEntityName(value)
    setEntitySlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    )
  }

  async function handleCreateEntity() {
    if (!entityName.trim() || !entitySlug.trim()) return
    try {
      await createEntityMutation.mutateAsync({
        name: entityName.trim(),
        slug: entitySlug.trim(),
      })
      setEntityDialogOpen(false)
      setEntityName('')
      setEntitySlug('')
      toast('success', 'Entity created')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleDeleteEntity() {
    if (!deleteTarget) return
    try {
      await deleteEntityMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      setDeleteError(null)
      toast('success', 'Entity deleted')
    } catch (err) {
      if (isApiError(err) && err.error.code === 'DELETE_CONFLICT') {
        setDeleteError(err.error.message)
      } else {
        toast('error', getErrorMessage(err))
        setDeleteTarget(null)
      }
    }
  }

  const entityColumns: Column<SystemEntitySummary>[] = [
    {
      key: 'name',
      header: 'Entity',
      render: (e) => <span className="font-medium">{e.name}</span>,
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (e) => <span className="text-gray-500">{e.slug}</span>,
    },
    {
      key: 'fields',
      header: 'Mapped / Total',
      render: (e) => (
        <span>
          {e.mappedFieldCount} / {e.fieldCount}
        </span>
      ),
      className: 'text-center',
    },
    {
      key: 'coverage',
      header: 'Coverage',
      render: (e) => <CoverageBar mapped={e.mappedFieldCount} total={e.fieldCount} />,
      className: 'w-40',
    },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(ev) => {
            ev.stopPropagation()
            setDeleteTarget(e)
            setDeleteError(null)
          }}
        >
          Delete
        </Button>
      ),
      className: 'w-20',
    },
  ]

  if (isLoading) return <Spinner />
  if (!system) return <div className="text-gray-500">System not found</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate(`/workspaces/${workspaceId}/systems`)}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            &larr; Back to systems
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{system.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="info">{system.systemType}</Badge>
            {system.baseUrl && (
              <span className="text-sm text-gray-500">{system.baseUrl}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openEdit}>
            Edit System
          </Button>
          <Button onClick={() => setEntityDialogOpen(true)}>Add Entity</Button>
        </div>
      </div>

      {system.description && (
        <p className="text-sm text-gray-600 mb-2">{system.description}</p>
      )}
      {system.notes && (
        <p className="text-sm text-gray-400 italic mb-6">{system.notes}</p>
      )}
      {!system.description && !system.notes && <div className="mb-6" />}

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Entities</h2>
      <Table
        columns={entityColumns}
        data={system.entities}
        keyFn={(e) => e.id}
        onRowClick={(e) =>
          navigate(`/workspaces/${workspaceId}/systems/${systemId}/entities/${e.id}`)
        }
        emptyMessage="No entities in this system."
      />

      {/* Edit system dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit System"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Select
            label="System Type"
            options={SYSTEM_TYPE_OPTIONS}
            value={editSystemType}
            onChange={(e) => setEditSystemType(e.target.value as SystemType)}
          />
          <Input
            label="Base URL"
            value={editBaseUrl}
            onChange={(e) => setEditBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1"
          />
          <Input
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
          <Textarea
            label="Notes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={3}
            placeholder="Additional notes about this system..."
          />
        </div>
      </Dialog>

      {/* Create entity dialog */}
      <Dialog
        open={entityDialogOpen}
        onClose={() => setEntityDialogOpen(false)}
        title="Create System Entity"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEntityDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEntity}
              disabled={!entityName.trim() || !entitySlug.trim() || createEntityMutation.isPending}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={entityName}
            onChange={(e) => handleEntityNameChange(e.target.value)}
            placeholder="Lead"
          />
          <Input
            label="Slug"
            value={entitySlug}
            onChange={(e) => setEntitySlug(e.target.value)}
            placeholder="lead"
          />
        </div>
      </Dialog>

      {/* Delete entity */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteEntity}
        title="Delete Entity"
        confirmLabel="Delete"
        loading={deleteEntityMutation.isPending}
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
