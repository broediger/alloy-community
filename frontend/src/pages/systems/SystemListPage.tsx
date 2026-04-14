import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useSystems, useCreateSystem, useUpdateSystem, useDeleteSystem } from '../../hooks/useSystems.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Select } from '../../components/ui/Select.js'
import { Dialog } from '../../components/ui/Dialog.js'
import { Table, type Column } from '../../components/ui/Table.js'
import { CoverageBar } from '../../components/ui/CoverageBar.js'
import { Badge } from '../../components/ui/Badge.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { ConfirmDialog } from '../../components/ConfirmDialog.js'
import { useToast } from '../../components/ui/Toast.js'
import { getErrorMessage, isApiError } from '../../lib/api.js'
import type { SystemListItem, SystemType } from '../../lib/types.js'

const SYSTEM_TYPES: Array<{ value: SystemType; label: string }> = [
  { value: 'REST', label: 'REST' },
  { value: 'SOAP', label: 'SOAP' },
  { value: 'EVENT', label: 'Event' },
  { value: 'FLAT_FILE', label: 'Flat File' },
  { value: 'OTHER', label: 'Other' },
]

export function SystemListPage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data, isLoading } = useSystems(workspaceId)
  const createMutation = useCreateSystem(workspaceId!)
  const updateMutation = useUpdateSystem(workspaceId!)
  const deleteMutation = useDeleteSystem(workspaceId!)

  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [systemType, setSystemType] = useState<SystemType>('REST')
  const [baseUrl, setBaseUrl] = useState('')

  const [editTarget, setEditTarget] = useState<SystemListItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSystemType, setEditSystemType] = useState<SystemType>('REST')
  const [editBaseUrl, setEditBaseUrl] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<SystemListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) return
    try {
      const sys = await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        systemType,
        baseUrl: baseUrl.trim() || undefined,
      })
      setDialogOpen(false)
      setName('')
      setDescription('')
      setBaseUrl('')
      toast('success', `System "${sys.name}" created`)
      navigate(`/workspaces/${workspaceId}/systems/${sys.id}`)
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      setDeleteError(null)
      toast('success', 'System deleted')
    } catch (err) {
      if (isApiError(err) && err.error.code === 'DELETE_CONFLICT') {
        setDeleteError(err.error.message)
      } else {
        toast('error', getErrorMessage(err))
        setDeleteTarget(null)
      }
    }
  }

  function openEditSystem(s: SystemListItem) {
    setEditTarget(s)
    setEditName(s.name)
    setEditDescription(s.description ?? '')
    setEditSystemType(s.systemType)
    setEditBaseUrl(s.baseUrl ?? '')
  }

  async function handleSaveEdit() {
    if (!editTarget || !editName.trim()) return
    try {
      await updateMutation.mutateAsync({
        systemId: editTarget.id,
        data: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          systemType: editSystemType,
          baseUrl: editBaseUrl.trim() || undefined,
        },
      })
      setEditTarget(null)
      toast('success', 'System updated')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  const columns: Column<SystemListItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (s) => <span className="font-medium">{s.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (s) => <Badge variant="info">{s.systemType}</Badge>,
    },
    {
      key: 'coverage',
      header: 'Coverage',
      render: (s) => (
        <CoverageBar mapped={s.mappedFieldCount} total={s.canonicalFieldCount} />
      ),
      className: 'w-40',
    },
    {
      key: 'fields',
      header: 'Mapped / Total',
      render: (s) => (
        <span>
          {s.mappedFieldCount} / {s.canonicalFieldCount}
        </span>
      ),
      className: 'text-center',
    },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              openEditSystem(s)
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteTarget(s)
              setDeleteError(null)
            }}
          >
            Delete
          </Button>
        </div>
      ),
      className: 'w-36',
    },
  ]

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Systems</h1>
          <p className="text-sm text-gray-500 mt-1">Connected applications and their field mappings</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Create System</Button>
      </div>

      <Input
        placeholder="Search systems..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      <Table
        columns={columns}
        data={(data?.items ?? []).filter((s) => {
          if (!search) return true
          const q = search.toLowerCase()
          return s.name.toLowerCase().includes(q) || s.systemType.toLowerCase().includes(q)
        })}
        keyFn={(s) => s.id}
        onRowClick={(s) => navigate(`/workspaces/${workspaceId}/systems/${s.id}`)}
        emptyMessage="No systems yet."
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create System"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dynamics 365"
          />
          <Select
            label="Type"
            options={SYSTEM_TYPES}
            value={systemType}
            onChange={(e) => setSystemType(e.target.value as SystemType)}
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
          <Input
            label="Base URL"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com"
          />
        </div>
      </Dialog>

      {/* Edit system dialog */}
      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit System"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || updateMutation.isPending}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Select
            label="Type"
            options={SYSTEM_TYPES}
            value={editSystemType}
            onChange={(e) => setEditSystemType(e.target.value as SystemType)}
          />
          <Input
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
          <Input
            label="Base URL"
            value={editBaseUrl}
            onChange={(e) => setEditBaseUrl(e.target.value)}
            placeholder="https://api.example.com"
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete System"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
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
